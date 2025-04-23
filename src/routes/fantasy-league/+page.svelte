<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { checkAuth } from '$lib/auth';
	import { supabase } from '$lib/supabase';
	import { getAvailableDraftParticipants, getCurrentRoundDetails, nextTurn, type AvailableParticipants } from '$lib/fantasy';
	import type { Tables } from '$lib/database.types';
	import type { QueryData } from '@supabase/supabase-js';
	import type { CurrentRoundDetails } from '$lib/types';

	const currentPicksQuery = supabase
			.from('fantasy_predictions')
			.select('event_id, user_id, position, participant:participant_id(country, artist, song)')
	type CurrentPicks = QueryData<typeof currentPicksQuery>;

	let userId = $state<string | null>(null);
	let activeFantasyEvent = $state<Tables<'fantasy_events'> | null>(null);
	let isRegistered = $state<boolean>(false);
	let draftAvailable = $state<boolean>(false);
	let availableParticipants = $state<AvailableParticipants>([]);
	let selectedPick = $state<string>('');
	let position = $state<number>(0);
	let usersWithPredictions: { id: string, name: string }[] = [];
	let currentPredictions = $state<Record<string, CurrentPicks>>({});
	let currentRoundDetails = $state<CurrentRoundDetails>();

	$effect(() => {
		const userDetails = checkAuth('/'); // redirect if not logged in
    if (userDetails) userId = userDetails.userId;
	});

	onMount(async () => {
		if (!userId) return;

		// Load active fantasy event
		const { data: event } = await supabase
			.from('fantasy_events')
			.select('*')
			.eq('active', true)
			.limit(1)
			.single();

		if (!event) return;

		activeFantasyEvent = event;

		if (activeFantasyEvent.draft_open) draftAvailable = true;

		// Check if user is already registered
		const { data: regData } = await supabase
			.from('fantasy_users')
			.select('*')
			.eq('user_id', userId)
			.eq('event_id', activeFantasyEvent.id)
			.single();

		isRegistered = !!regData;

		if (isRegistered) {
			// If registered, load current predictions
			await getCurrentPredictions();
			currentRoundDetails = await getCurrentRoundDetails(activeFantasyEvent.id);
			// If draft is open, load prediction form
			if (activeFantasyEvent.draft_open) {
				availableParticipants = await getAvailableDraftParticipants(activeFantasyEvent.id);
			}
		}
	});

	async function registerForFantasy() {
		if (!userId || !activeFantasyEvent) return;
		await supabase
			.from('fantasy_users')
			.insert({ user_id: userId, event_id: activeFantasyEvent.id })
			.then(() => {
				isRegistered = true;
			});
	}

	async function getCurrentPredictions() {
		const { data: predictions } = await supabase
			.from('fantasy_predictions')
			.select('event_id, user_id, position, participant:participant_id(country, artist, song)')
			.eq('event_id', activeFantasyEvent!.id)
		
		if (!predictions) return;

		const users = new Set(predictions.map(p => p.user_id));

		const { data: public_users } = await supabase
		.from('public_users')
		.select('*')
		.in('id', activeFantasyEvent!.turn_order);

		const getNameWithId = (id: string) => public_users?.find((user) => user.id === id)?.username;

		for (const user of Array.from(users)) {
			const currentUserPredictions = predictions.filter((p) => p.user_id === user)
			currentPredictions[user] = currentUserPredictions;
			usersWithPredictions.push({
				id: user,
				name: getNameWithId(user) || ''
			});
		}
	}

	function handleSubmit(node: HTMLFormElement) {
    async function onSubmit(e: SubmitEvent) {
      e.preventDefault();
      await submitPick();
    }

    node.addEventListener('submit', onSubmit);

    return {
      destroy() {
        node.removeEventListener('submit', onSubmit);
      }
    }
  }

	async function submitPick() {
		if (!activeFantasyEvent?.id) {
      console.error('You must have event selected before voting.');
      return;
    }
		if (!userId) {
      console.error('You must have logged in before picking predictions.');
      return;
    }
		if (!selectedPick) {
			alert('You must pick a song to register the pick.');
			return;
		}
		if (!position || position < 1) {
      alert('You must predict a valid position for the song.');
      return;
    }

		// Check that the predictions are still open
		const { data: fantasyEvent } = await supabase
			.from('fantasy_events')
			.select('active, draft_open, turn_order, current_turn')
			.eq('id', activeFantasyEvent.id)
			.single();

		if (!fantasyEvent) return;
		
		if (!fantasyEvent.active || !fantasyEvent.draft_open) {
			alert('This fantasy event is not open for draft anymore.');
		}
		
		// Check from back-end that the picked song is still available
		const { data: predictions } = await supabase
			.from('fantasy_predictions')
			.select('event_id, participant_id, user_id')
			.eq('event_id', activeFantasyEvent.id);

		if (predictions?.some((p) => p.participant_id === selectedPick)) {
			alert('That song has been already picked by someone.');
			// Clear the form values
			selectedPick = '';
			position = 0;
			// Fetch new list of available predictions
			availableParticipants = await getAvailableDraftParticipants(activeFantasyEvent.id);
			return;
		}

		const currentUserPicks = predictions?.filter(p => p.user_id === userId);

		const { data: fantasyRules } = await supabase
			.from('fantasy_rules')
			.select('team_size')
			.single();

		if (currentUserPicks && fantasyRules && currentUserPicks.length > fantasyRules.team_size) {
			alert('Your fantasy team is already full.');
      return;
		}

		if (fantasyEvent.turn_order[fantasyEvent.current_turn] !== userId) {
      alert('It is not currently your turn to pick.');
      return;
    }

		// Save the prediction to supabase
		const { status } = await supabase.from('fantasy_predictions').insert({
			event_id: activeFantasyEvent.id,
			user_id: userId,
			participant_id: selectedPick,
			position
		});

		// Clear the form values
		selectedPick = '';
		position = 0;

		if (status !== 201) {
			alert('Something went wrong with saving the pick. Please try again.');
			return;
		}

		// Advance to next turn
		await nextTurn(activeFantasyEvent.id);
		// Update the page
		location.reload();
	}
</script>

<main class="container">
	<h1>Fantasy League</h1>

	<button class="btn btn-primary back-btn" onclick={() => goto('/user')}>Back</button>

	{#if !activeFantasyEvent}
		<p>There are currently no open fantasy leagues.</p>
	{:else}
		<h2>{activeFantasyEvent.title}</h2>

		{#if isRegistered}
			<p>✅ You are registered for this fantasy league.</p>
			{#if draftAvailable}
				<h3>Draft details</h3>
				<ul>
					<li>Participants: {currentRoundDetails?.users.map(u => u.username).join(', ')}</li>
					<li>Round: {currentRoundDetails?.round.toString()}</li>
					<li>Current turn: {currentRoundDetails?.currentTurn.name}</li>
				</ul>
			{:else}
				<p>Please wait for the draft to open.</p>
			{/if}
		{:else}
			{#if draftAvailable}
				<p>Current Fantasy League draft is already open. You can not register to it anymore.</p>
			{:else}
				<p>You are not yet registered to this fantasy league. Press the button below to register.</p>
				<button class="btn btn-primary" onclick={registerForFantasy}>Register</button>
			{/if}
		{/if}

		{#if isRegistered && draftAvailable}
			<h3>Draft your artist</h3>
			{#if currentRoundDetails?.currentTurn.id == userId}
				<form use:handleSubmit>
					<label for="song-select">Select song:</label>
					<select id="song-select" class="form-select" bind:value={selectedPick}>
						<option value='' disabled selected>Select a participant</option>
						{#each availableParticipants as p}
							<option value={p.participant.id}>
								{p.participant.country} – {p.participant.artist} – {p.participant.song}
							</option>
						{/each}
					</select>
					<label for="position" class="col-form-label">Predict the final position of the song:</label>
					<input id="position" type="number" class="form-control" bind:value={position}>
					<button type="submit" class="btn btn-primary">Register prediction</button>
				</form>
			{:else}
				<p>Wait for your turn to pick a song.</p>
			{/if}
		{/if}

		{#if Object.keys(currentPredictions).length}
			<h3>Current picks</h3>
			{#each usersWithPredictions as user}
				<h4>{user.name}</h4>
				<div class="table-responsive">
					<table class="table table-sm table-bordered picks-table">
						<thead>
							<tr>
								<th scope="col">Country</th>
								<th scope="col">Artist</th>
								<th scope="col">Song</th>
								<th scope="col">Pos</th>
							</tr>
						</thead>
						<tbody>
							{#each currentPredictions[user.id] as prediction}
								<tr>
									<td>{prediction.participant.country}</td>
									<td>{prediction.participant.artist}</td>
									<td>{prediction.participant.song}</td>
									<td>{prediction.position}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		{/if}
	{/if}
</main>
