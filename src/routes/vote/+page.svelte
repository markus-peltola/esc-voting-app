<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { checkAuth } from '$lib/auth';
	import type { Tables } from '$lib/database.types';

	let userId: string | null = null;
	let events: Tables<'events'>[] = $state([]);
	let selectedEventId: string | null = $state(null);
  let selectedEventName: string | null = $state(null);
	let participants: { id: string, name: string, runningOrder: number | null }[] = $state([]);
	const votes: string[] = $state<string[]>(Array(10).fill(''));
  let isFormValid = $derived(votes.every((v) => v !== ''));

	const POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

	onMount(async () => {
		const userDetails = checkAuth();
		if (userDetails) userId = userDetails.userId;

		const { data: eventData, error } = await supabase
			.from('events')
			.select('*')
			.eq('active', true);

		if (error) {
			console.error('Error loading events:', error);
			return;
		}

		events = eventData;
    events.sort((a, b) => a.title.localeCompare(b.title))
	});

	async function loadParticipants(eventId: string) {
		selectedEventId = eventId;
    const selectedEvent = events.find((e) => e.id === eventId);
    selectedEventName = `${selectedEvent?.title}  (${selectedEvent?.year})`;
		const { data, error } = await supabase
			.from('event_participants')
			.select('participant_id, running_order, participants(country, artist, song)')
			.eq('event_id', eventId)

		if (error) {
			console.error('Error loading participants:', error);
			return;
		}

		// Flatten to { id, name }
		participants = data.map((p) => ({
			id: p.participant_id,
			name: `(${p.participants.country}) ${p.participants.artist} - ${p.participants.song}`,
      runningOrder: p.running_order
		}));
    participants.sort((a, b) => (a.runningOrder || 0) - (b.runningOrder || 0));
	}

  function handleSubmit(node: HTMLFormElement) {
    async function onSubmit(e: SubmitEvent) {
      e.preventDefault();
      await submitVotes();
    }

    node.addEventListener('submit', onSubmit);

    return {
      destroy() {
        node.removeEventListener('submit', onSubmit);
      }
    }
  }
	
	async function submitVotes() {
    if (!selectedEventId) {
      console.error('You must have event selected before voting.');
      return;
    }
    if (!userId) {
      console.error('You must have logged in before voting.');
      return;
    }
    if (votes.some((vote) => !vote)) {
      alert('You must vote for 10 songs.');
      return;
    }

    // Check that no song gets double votes
    const selectedSongs = votes.map((participantId) => {
      const participant = participants.find((p) => p.id === participantId);
      return participant?.name
    });
    const uniqueSongs = new Set(selectedSongs);
    if (uniqueSongs.size !== selectedSongs.length) {
      alert('You cannot give points to the same song more than once.');
      return;
    }

    // If the user has already voted on this event, delete previous votes
		const { data } = await supabase.from('votes').select('id').eq('user_id', userId).eq('event_id', selectedEventId);
		if (data?.length) {
			const previousVoteIds = data.map((vote) => vote.id as string);
			try {
				await supabase.from('votes').delete().in('id', previousVoteIds);
			} catch (e) {
				console.error('User had previous votes on this event and deletion of those votes failed.');
				return;
			}
		}

		const payload = votes.map((participantId, index) => ({
			user_id: userId,
			event_id: selectedEventId,
			participant_id: participantId,
			points: POINTS[index]
		}));

		const { error } = await supabase.from('votes').insert(payload);
		if (error) {
			console.error('Error submitting votes:', error);
		} else {
			alert('Votes submitted!');
			goto('/your-votes');
		}
	}
  
  function availableOptions(index: number) {
    return participants.filter((participant) => !votes.includes(participant.id) || votes[index] === participant.id);
  }

  function handleVoteChange(index: number, selectedParticipantId: string) {
    votes[index] = selectedParticipantId;
  }
</script>

<main class=container>
  <h1>Vote for {selectedEventName || "Eurovision"}</h1>

  {#if !selectedEventId}
    <h2>Select Event</h2>
    {#each events as event}
      <button class="btn btn-primary" onclick={() => loadParticipants(event.id)}>{event.title}</button>
    {/each}
  {:else}
    <h2>Submit Your Votes</h2>
    <form use:handleSubmit>
      {#each POINTS as point, i}
        <label>
          {point} points:
          <select value={votes[i]} onchange={(e) => handleVoteChange(i, (e.target as HTMLSelectElement).value)}>
            <option value="" disabled selected>Select song</option>
            {#each availableOptions(i) as p}
              <option value={p.id} selected={votes[i] === p.id}>{p.name}</option>
            {/each}
          </select>
        </label>
      {/each}
      <button class="btn btn-primary" type="submit" disabled={!isFormValid}>Submit Votes</button>
    </form>
  {/if}
</main>

<style>
	button {
		padding: 0.75rem 1.25rem;
    margin-top: 1.75em;
		width: fit-content;
	}
</style>
