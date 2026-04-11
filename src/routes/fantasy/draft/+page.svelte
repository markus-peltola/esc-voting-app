<script lang="ts">
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import { calculateNextTurn, isUserTurn, getUserPickCount } from '$lib/utils/draft-turn';
	import { FANTASY_CONFIG } from '$lib/config/fantasy';
	import { subscribeToDraft } from '$lib/services/realtime.service';
	import { authStore } from '$lib/stores/auth.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state('');
	let success = $state('');
	let events = $state<any[]>([]);
	let selectedEventId = $state<string | null>(null);
	let selectedEvent = $state<any | null>(null);
	let draftState = $state<any | null>(null);
	let participants = $state<any[]>([]);
	let predictions = $state<any[]>([]);
	let userProfiles = $state<Map<string, string>>(new Map()); // user_id -> username
	let totalParticipants = $state<number>(0); // Total participants in event
	let isRegistered = $state(false);
	let selectedParticipantId = $state<string>('');
	let predictedPosition = $state<number>(1);
	let submitting = $state(false);

	// Real-time state
	let realtimeNotification = $state<string | null>(null);
	let wasMyTurnBefore = $state(false);
	let unsubscribe: (() => void) | null = null;

	// Derived states
	let isMyTurn = $derived(
		draftState && data.session?.user
			? isUserTurn(data.session.user.id, draftState.current_turn_index, draftState.turn_order)
			: false
	);

	let myPickCount = $derived(
		draftState && data.session?.user
			? getUserPickCount(
					data.session.user.id,
					draftState.current_round,
					draftState.current_turn_index,
					draftState.turn_order,
					draftState.is_forward
			  )
			: 0
	);

	let currentTurnUsername = $derived(
		draftState && draftState.turn_order.length > 0
			? userProfiles.get(draftState.turn_order[draftState.current_turn_index]) || 'Unknown'
			: 'Unknown'
	);

	$effect(() => {
		loadEvents();
	});

	// Auto-select event if there's only one
	$effect(() => {
		if (events.length === 1 && !selectedEventId) {
			selectEvent(events[0].id);
		}
	});

	async function loadEvents() {
		const { data: eventData, error: eventError } = await data.supabase
			.from('events')
			.select('*')
			.eq('type', 'fantasy')
			.eq('status', 'active')
			.order('year', { ascending: false });

		if (eventError) {
			console.error('Error loading events:', eventError);
			error = 'Failed to load events';
			loading = false;
			return;
		}

		events = eventData || [];
		loading = false;
	}

	async function selectEvent(eventId: string) {
		selectedEventId = eventId;
		selectedEvent = events.find((e) => e.id === eventId) || null;
		error = '';
		success = '';
		loading = true;

		try {
			// Load draft state
			const { data: draftData, error: draftError } = await data.supabase
				.from('fantasy_drafts')
				.select('*')
				.eq('event_id', eventId)
				.single();

			if (draftError) throw draftError;
			draftState = draftData;

			// Check if user is registered by looking at turn_order
			isRegistered = draftState.turn_order.includes(data.session!.user.id);

			// Load profiles for all users in the draft
			const { data: profilesData } = await data.supabase
				.from('profiles')
				.select('id, username')
				.in('id', draftState.turn_order);

			const profilesMap = new Map<string, string>();
			for (const profile of profilesData || []) {
				profilesMap.set(profile.id, profile.username);
			}
			userProfiles = profilesMap;

			// Load all participants and count them
			const { data: participantData, error: participantError } = await data.supabase
				.from('event_participants')
				.select(`
					participant:participants (
						id,
						country,
						artist,
						song
					)
				`)
				.eq('event_id', eventId);

			if (participantError) throw participantError;

			// Store total count
			totalParticipants = participantData?.length || 0;

			// Get already selected participants
			const { data: allPredictions } = await data.supabase
				.from('fantasy_predictions')
				.select('participant_id')
				.eq('event_id', eventId);

			const selectedIds = (allPredictions || []).map((p) => p.participant_id);

			participants = (participantData || [])
				.map((item: any) => item.participant)
				.filter((p: any) => !selectedIds.includes(p.id));

			// Load all predictions with usernames
			const { data: predictionsData, error: predictionsError } = await data.supabase
				.from('fantasy_predictions')
				.select(`
					id,
					user_id,
					predicted_position,
					pick_order,
					created_at,
					participant:participants (
						id,
						country,
						artist,
						song
					),
					profile:profiles (
						username
					)
				`)
				.eq('event_id', eventId)
				.order('pick_order', { ascending: true });

			if (predictionsError) throw predictionsError;

			predictions = (predictionsData || []).map((p: any) => ({
				id: p.id,
				user_id: p.user_id,
				username: p.profile.username,
				predicted_position: p.predicted_position,
				pick_order: p.pick_order,
				participant: p.participant
			}));

			// Set up real-time subscriptions
			setupRealtime(eventId);
		} catch (err: any) {
			console.error('Error loading draft:', err);
			error = err.message || 'Failed to load draft';
		} finally {
			loading = false;
		}
	}

	function setupRealtime(eventId: string) {
		// Cleanup previous subscription
		if (unsubscribe) {
			unsubscribe();
		}

		// Store current turn state
		wasMyTurnBefore = isMyTurn;

		// Subscribe to real-time updates
		unsubscribe = subscribeToDraft(data.supabase, eventId, {
			onPredictionInsert: async (payload) => {
				console.log('New pick made!', payload);

				// Show notification if someone else made a pick
				if (payload.new.user_id !== data.session?.user.id) {
					// Reload data to get updated state
					await reloadDraftData(eventId);

					// Show notification
					realtimeNotification = `${currentTurnUsername} made a pick!`;
					setTimeout(() => {
						realtimeNotification = null;
					}, 3000);
				}
			},
			onDraftUpdate: async (payload) => {
				console.log('Draft state updated!', payload);

				// Reload draft state
				await reloadDraftData(eventId);

				// Check if it became our turn
				if (!wasMyTurnBefore && isMyTurn) {
					realtimeNotification = "🎯 It's your turn!";
					setTimeout(() => {
						realtimeNotification = null;
					}, 5000);

					// Play a sound notification (optional)
					playNotificationSound();
				}

				wasMyTurnBefore = isMyTurn;
			}
		});
	}

	async function reloadDraftData(eventId: string) {
		try {
			// Reload draft state
			const { data: draftData } = await data.supabase
				.from('fantasy_drafts')
				.select('*')
				.eq('event_id', eventId)
				.single();

			if (draftData) {
				draftState = draftData;

				// Reload profiles for all users in the draft
				const { data: profilesData } = await data.supabase
					.from('profiles')
					.select('id, username')
					.in('id', draftData.turn_order);

				const profilesMap = new Map<string, string>();
				for (const profile of profilesData || []) {
					profilesMap.set(profile.id, profile.username);
				}
				userProfiles = profilesMap;
			}

			// Reload participants
			const { data: participantData } = await data.supabase
				.from('event_participants')
				.select(`
					participant:participants (
						id,
						country,
						artist,
						song
					)
				`)
				.eq('event_id', eventId);

			// Update total count
			totalParticipants = participantData?.length || 0;

			// Get already selected participants
			const { data: allPredictions } = await data.supabase
				.from('fantasy_predictions')
				.select('participant_id')
				.eq('event_id', eventId);

			const selectedIds = (allPredictions || []).map((p) => p.participant_id);

			participants = (participantData || [])
				.map((item: any) => item.participant)
				.filter((p: any) => !selectedIds.includes(p.id));

			// Reload predictions
			const { data: predictionsData } = await data.supabase
				.from('fantasy_predictions')
				.select(`
					id,
					user_id,
					predicted_position,
					pick_order,
					created_at,
					participant:participants (
						id,
						country,
						artist,
						song
					),
					profile:profiles (
						username
					)
				`)
				.eq('event_id', eventId)
				.order('pick_order', { ascending: true });

			predictions = (predictionsData || []).map((p: any) => ({
				id: p.id,
				user_id: p.user_id,
				username: p.profile.username,
				predicted_position: p.predicted_position,
				pick_order: p.pick_order,
				participant: p.participant
			}));
		} catch (err) {
			console.error('Error reloading draft data:', err);
		}
	}

	function playNotificationSound() {
		// Optional: Play a notification sound
		// You can add an audio element or use the Web Audio API
		try {
			const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSR0HTKXh8bllHAU2jdXzzIIyBSF1xe/glEIKE1y06+qnVhMJQ5zd8sFuJAUuhM/z1YU1Bhxqvu7mnEsdCEqk4PK8aB0FNIzU8tGAMQYfcsLu45ZFCxVbtOrsp1cUCkGa3PLEcSYEK4DN89qJOQcZaLns56JQEgtNp+LwuGkeBlJy');
			audio.volume = 0.3;
			audio.play().catch(() => {
				// Ignore autoplay errors
			});
		} catch (e) {
			// Ignore sound errors
		}
	}

	// Cleanup on component unmount or event change
	$effect(() => {
		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	});

	async function startDraft() {
		if (!selectedEventId || !draftState) return;

		try {
			loading = true;
			error = '';

			// Update draft status to 'open'
			const { error: updateError } = await data.supabase
				.from('fantasy_drafts')
				.update({ status: 'open' })
				.eq('event_id', selectedEventId);

			if (updateError) throw updateError;

			success = '✅ Draft started! Players can now make their picks.';
			setTimeout(() => { success = ''; }, 3000);
			await selectEvent(selectedEventId);
		} catch (err: any) {
			error = err.message || 'Failed to start draft';
		} finally {
			loading = false;
		}
	}

	async function submitPick(e: SubmitEvent) {
		e.preventDefault();
		if (!selectedEventId || !data.session?.user || !draftState) return;

		error = '';
		success = '';
		submitting = true;

		try {
			// Verify it's the user's turn
			if (!isUserTurn(data.session.user.id, draftState.current_turn_index, draftState.turn_order)) {
				error = "It's not your turn!";
				return;
			}

			// Insert the prediction
			const { error: insertError } = await data.supabase
				.from('fantasy_predictions')
				.insert({
					user_id: data.session.user.id,
					event_id: selectedEventId,
					participant_id: selectedParticipantId,
					predicted_position: predictedPosition,
					pick_order: predictions.length + 1
				});

			if (insertError) throw insertError;

			// Calculate next turn using preserved logic
			const nextTurn = calculateNextTurn({
				currentTurnIndex: draftState.current_turn_index,
				round: draftState.current_round,
				isForward: draftState.is_forward,
				turnOrder: draftState.turn_order,
				teamSize: draftState.team_size
			});

			// Update draft state
			if (nextTurn.draftClosed) {
				await data.supabase
					.from('fantasy_drafts')
					.update({
						status: 'closed',
						current_turn_index: nextTurn.currentTurnIndex,
						current_round: nextTurn.round,
						is_forward: nextTurn.isForward
					})
					.eq('event_id', selectedEventId);
			} else {
				await data.supabase
					.from('fantasy_drafts')
					.update({
						current_turn_index: nextTurn.currentTurnIndex,
						current_round: nextTurn.round,
						is_forward: nextTurn.isForward
					})
					.eq('event_id', selectedEventId);
			}

			// Reset form and reload
			selectedParticipantId = '';
			predictedPosition = 1;
			await selectEvent(selectedEventId);
		} catch (err: any) {
			console.error('Error submitting pick:', err);
			error = err.message || 'Failed to submit pick';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation supabase={data.supabase} currentPage="fantasy-draft" />

	<!-- Real-time Notification Toast -->
	{#if realtimeNotification}
		<div class="fixed top-20 right-4 z-50 animate-slide-up">
			<div class="bg-gradient-to-r from-purple-600 to-accent-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-pulse-glow">
				<span class="text-2xl">🔔</span>
				<div>
					<p class="font-bold text-lg">{realtimeNotification}</p>
					<p class="text-sm opacity-90">Real-time update</p>
				</div>
			</div>
		</div>
	{/if}

	<main class="container-eurovision py-8">
		{#if loading && events.length === 0}
			<div class="card-eurovision p-8">
				<div class="skeleton h-6 w-48 mb-4"></div>
				<div class="skeleton h-12 w-full"></div>
			</div>
		{:else if events.length === 0}
			<div class="card-eurovision p-8 text-center">
				<div class="text-6xl mb-4">🎲</div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2">No Active Fantasy Events</h2>
				<p class="text-gray-600">No fantasy leagues are currently active.</p>
			</div>
		{:else}
			<!-- Only show event selection if there are multiple events -->
			{#if events.length > 1}
				<div class="mb-8">
					<label for="event-select" class="block text-sm font-semibold text-gray-700 mb-3">
						Select Fantasy Event:
					</label>
					<select
						id="event-select"
						bind:value={selectedEventId}
						onchange={(e) => selectEvent(e.currentTarget.value)}
						class="w-full md:w-auto px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-lg font-medium"
					>
						<option value="">Choose an event...</option>
						{#each events as event}
							<option value={event.id}>{event.title} ({event.year})</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if selectedEventId && draftState}
				<div class="space-y-6">
					<!-- Draft Status Card -->
					<div class="card-eurovision p-6">
						<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
							<div>
								<div class="flex items-center gap-3 mb-1">
									<h2 class="text-xl font-bold text-gray-800">
										{selectedEvent?.title} Draft
									</h2>
									{#if draftState.status === 'open'}
										<span class="inline-flex items-center gap-1 px-2 py-1 bg-danger-500 text-white text-xs font-bold rounded animate-pulse">
											<span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
											LIVE
										</span>
									{/if}
								</div>
								<div class="flex flex-wrap gap-4 text-sm text-gray-600">
									<span>Round: <strong>{draftState.current_round}</strong> / {draftState.team_size}</span>
									<span>Direction: <strong>{draftState.is_forward ? '→ Forward' : '← Backward'}</strong></span>
									<span>Status: <strong class="text-primary-600">{draftState.status}</strong></span>
								</div>
							</div>
							{#if isMyTurn}
								<div class="animate-pulse-glow bg-accent-500 text-white px-4 py-2 rounded-lg font-bold">
									🎯 YOUR TURN!
								</div>
							{:else}
								<div class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold">
									{currentTurnUsername}'s Turn
								</div>
							{/if}
						</div>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="p-4 bg-danger-50 border-2 border-danger-200 text-danger-700 rounded-lg">
							{error}
						</div>
					{/if}

					<!-- Success Message -->
					{#if success}
						<div class="p-4 bg-success-500 text-white rounded-lg font-semibold">
							{success}
						</div>
					{/if}

					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Pick Form -->
						{#if !isRegistered}
							<!-- User is not in this draft -->
							<div class="card-eurovision p-6 text-center">
								<div class="text-4xl mb-3">🚫</div>
								<h3 class="text-lg font-bold text-gray-800 mb-2">Not Participating</h3>
								<p class="text-gray-600">You are not registered for this draft.</p>
							</div>
						{:else if draftState.status === 'pending'}
							<!-- Draft hasn't started yet -->
							<div class="card-eurovision p-6 text-center">
								<div class="text-4xl mb-3">⏰</div>
								<h3 class="text-lg font-bold text-gray-800 mb-2">Draft Not Started</h3>
								<p class="text-gray-600 mb-4">Waiting for admin to start the draft.</p>
								{#if authStore.isAdmin}
									<button onclick={startDraft} class="btn-accent" disabled={loading}>
										{loading ? 'Starting...' : '▶️ Start Draft'}
									</button>
								{/if}
							</div>
						{:else if draftState.status === 'closed'}
							<!-- Draft is complete -->
							<div class="card-eurovision p-6 text-center">
								<div class="text-4xl mb-3">🏁</div>
								<h3 class="text-lg font-bold text-gray-800 mb-2">Draft Complete</h3>
								<p class="text-gray-600 mb-4">All picks have been made!</p>
								<button onclick={() => goto('/fantasy/results')} class="btn-primary">
									View Results →
								</button>
							</div>
						{:else if draftState.status === 'open' && isMyTurn}
							<!-- User's turn to pick -->
							<div class="card-eurovision p-6">
								<h3 class="text-lg font-bold text-gray-800 mb-4">Make Your Pick</h3>
								<p class="text-sm text-gray-600 mb-4">
									You have {myPickCount} / {draftState.team_size} picks
								</p>

								<form onsubmit={submitPick} class="space-y-4">
									<div>
										<label for="participant" class="block text-sm font-semibold text-gray-700 mb-2">
											Select Participant:
										</label>
										<select
											id="participant"
											bind:value={selectedParticipantId}
											required
											disabled={submitting}
											class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
										>
											<option value="">Choose a participant...</option>
											{#each participants as participant}
												<option value={participant.id}>
													{participant.country} - {participant.artist} - {participant.song}
												</option>
											{/each}
										</select>
									</div>

									<div>
										<label for="position" class="block text-sm font-semibold text-gray-700 mb-2">
											Predicted Final Position:
										</label>
										<input
											id="position"
											type="number"
											bind:value={predictedPosition}
											required
											min="1"
											max={totalParticipants}
											disabled={submitting}
											class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
											placeholder="1-{totalParticipants}"
										/>
										<p class="text-xs text-gray-500 mt-1">
											Position 1 = Winner, {totalParticipants} = Last place, 0 = Did Not Qualify
										</p>
									</div>

									<button
										type="submit"
										disabled={!selectedParticipantId || submitting}
										class="btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{submitting ? 'Submitting...' : '🎯 Submit Pick'}
									</button>
								</form>
							</div>
						{:else}
							<!-- Waiting for turn -->
							<div class="card-eurovision p-6 text-center">
								<div class="text-4xl mb-3">⏳</div>
								<h3 class="text-lg font-bold text-gray-800 mb-2">Waiting for Your Turn</h3>
								<p class="text-gray-600">
									You have {myPickCount} / {draftState.team_size} picks
								</p>
							</div>
						{/if}

						<!-- Recent Picks -->
						<div class="card-eurovision p-6">
							<h3 class="text-lg font-bold text-gray-800 mb-4">Recent Picks</h3>
							<div class="space-y-2 max-h-96 overflow-y-auto">
								{#each predictions.slice().reverse().slice(0, 10) as prediction}
									<div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
										<div class="flex justify-between items-start">
											<div class="flex-1">
												<p class="font-semibold text-gray-800">{prediction.username}</p>
												<p class="text-sm text-gray-600">
													{prediction.participant.country} - {prediction.participant.artist}
												</p>
											</div>
											<span class="bg-primary-100 text-primary-700 px-2 py-1 rounded text-xs font-semibold">
												Pos {prediction.predicted_position}
											</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</main>
</div>
