<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import type { Event, ParticipantListItem } from '../../types';

	let userId: string | null = null;
	let events: Event[] = $state([]);
	let selectedEventId: string | null = $state(null);
  let selectedEventName: string | null = $state(null);
	let participants: { id: string, name: string, runningOrder: number }[] = $state([]);
	const votes: string[] = $state<string[]>(Array(10).fill(''));

	const POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

	onMount(async () => {
		userId = localStorage.getItem('user_id');
		if (!userId) goto('/');

		const { data: eventData, error } = await supabase
			.from('events')
			.select('*')
			.eq('active', true);

		if (error) {
			console.error('Error loading events:', error);
			return;
		}

		events = eventData as Event[];
    events.sort((a, b) => a.title.localeCompare(b.title))
	});

	async function loadParticipants(eventId: string) {
		selectedEventId = eventId;
    const selectedEvent = events.find((e) => e.id === eventId);
    selectedEventName = `${selectedEvent?.title}  (${selectedEvent?.year})`;
		const { data, error } = await supabase
			.from('event_participants')
			.select('participant_id, running_order, participants(country, artist, song)')
			.eq('event_id', eventId);

		if (error) {
			console.error('Error loading participants:', error);
			return;
		}

    const safeData = data as unknown as ParticipantListItem[];

		// Flatten to { id, name }
		participants = safeData.map((p) => ({
			id: p.participant_id,
			name: `(${p.participants.country}) ${p.participants.artist} - ${p.participants.song}`,
      runningOrder: p.running_order
		}));
    participants.sort((a, b) => a.runningOrder - b.runningOrder);
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
    if (!selectedEventId){
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
			console.log('Removing the previous votes.')
			const previousVoteIds = data.map((vote) => vote.id as string);
			console.log(previousVoteIds);
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

  function handleVoteChange(index: number, selectedParticipantId: string) {
    const selectedParticipant = participants.find((p) => p.id === selectedParticipantId);
    if (!selectedParticipant) return;

    // Remove that country's previous selection (if it existst)
    for (let i = 0; i < votes.length; i++) {
      if (i !== index) {
        const selected = participants.find((p) => p.id === votes[i]);
        if (selected?.name === selectedParticipant.name) {
          votes[i] = '';
        }
      }
    }

    // Apply new selection
    votes[index] = selectedParticipantId;
  }
</script>

<main class=container>
  <h1>Vote for {selectedEventName || "Eurovision"}</h1>

  {#if !selectedEventId}
    <h2>Select Event</h2>
    {#each events as event}
      <button class="event-button" onclick={() => loadParticipants(event.id)}>{event.title}</button>
    {/each}
  {:else}
    <h2>Submit Your Votes</h2>
    <form use:handleSubmit>
      {#each POINTS as point, i}
        <label>
          {point} points:
          <select value={votes[i]} onchange={(e) => handleVoteChange(i, (e.target as HTMLSelectElement).value)}>
            <option value="" disabled selected>Select song</option>
            {#each participants as p}
              <option value={p.id} selected={votes[i] === p.id}>{p.name}</option>
            {/each}
          </select>
        </label>
      {/each}
      <button type="submit">Submit Votes</button>
    </form>
  {/if}
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		max-width: 600px;
		margin: 0 auto;
		font-family: system-ui, sans-serif;
	}

	h1, h2 {
		text-align: center;
		margin-bottom: 1rem;
	}

	button {
		padding: 0.75rem 1.25rem;
    margin-top: 1.75em;
		border: none;
		border-radius: 6px;
		background-color: #2c73d2;
		color: white;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;
	}

	button:hover {
		background-color: #1b4f9c;
	}

	form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	select {
    width: 100%;
		padding: 0.5rem;
		border-radius: 6px;
		border: 1px solid #ccc;
		font-size: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		font-weight: bold;
		font-size: 0.95rem;
	}

	/* Event buttons */
	.event-button {
		margin: 0.5rem;
		padding: 0.75rem 1.25rem;
		font-size: 1rem;
		background-color: #2c73d2;
		border: 1px solid #ccc;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.event-button:hover {
		background-color: #1b4f9c;
	}
</style>
