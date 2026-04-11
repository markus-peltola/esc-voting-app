<script lang="ts">
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import { validateVotes, getAvailableParticipants } from '$lib/utils/vote-validation';
	import { VOTING_CONFIG } from '$lib/config/voting';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let events = $state<any[]>([]);
	let selectedEventId = $state<string | null>(null);
	let selectedEvent = $state<any | null>(null);
	let participants = $state<any[]>([]);
	let votes = $state<string[]>(Array(10).fill(''));
	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	// Derived state
	let isFormValid = $derived(votes.every((v) => v !== ''));

	// Load active events on mount
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
			.eq('status', 'active')
			.eq('type', 'voting')
			.order('year', { ascending: false });

		if (eventError) {
			console.error('Error loading events:', eventError);
			error = 'Failed to load events';
			return;
		}

		events = eventData || [];
	}

	async function selectEvent(eventId: string) {
		selectedEventId = eventId;
		selectedEvent = events.find((e) => e.id === eventId) || null;
		votes = Array(10).fill('');
		error = '';
		success = '';
		loading = true;

		// Load participants for this event
		const { data: participantData, error: participantError } = await data.supabase
			.from('event_participants')
			.select(`
				participant_id,
				running_order,
				participant:participants (
					id,
					country,
					artist,
					song
				)
			`)
			.eq('event_id', eventId)
			.order('running_order', { ascending: true });

		if (participantError) {
			console.error('Error loading participants:', participantError);
			error = 'Failed to load participants';
			loading = false;
			return;
		}

		// Flatten the data
		participants = (participantData || []).map((item: any) => ({
			id: item.participant.id,
			country: item.participant.country,
			artist: item.participant.artist,
			song: item.participant.song,
			runningOrder: item.running_order
		}));

		loading = false;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		success = '';

		if (!selectedEventId || !data.session?.user) {
			error = 'You must be logged in and select an event';
			return;
		}

		// Validate votes using our utility function
		const validation = validateVotes(votes);
		if (!validation.isValid) {
			error = validation.error || 'Invalid votes';
			return;
		}

		loading = true;

		try {
			// Delete previous votes for this event
			const { error: deleteError } = await data.supabase
				.from('votes')
				.delete()
				.eq('user_id', data.session.user.id)
				.eq('event_id', selectedEventId);

			if (deleteError) {
				throw deleteError;
			}

			// Insert new votes with points
			const votesPayload = votes.map((participantId, index) => ({
				user_id: data.session.user.id,
				event_id: selectedEventId,
				participant_id: participantId,
				points: VOTING_CONFIG.POINTS[index]
			}));

			const { error: insertError } = await data.supabase
				.from('votes')
				.insert(votesPayload);

			if (insertError) {
				throw insertError;
			}

			success = '✅ Votes submitted successfully!';
			setTimeout(() => {
				goto('/my-votes');
			}, 1500);
		} catch (err: any) {
			console.error('Error submitting votes:', err);
			error = err.message || 'Failed to submit votes';
		} finally {
			loading = false;
		}
	}

	function getAvailableOptions(index: number) {
		return getAvailableParticipants(participants, votes, index);
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation supabase={data.supabase} currentPage="vote" />

	<main class="container-eurovision py-8">
		<!-- Event Selection -->
		{#if events.length === 0}
			<div class="card-eurovision p-8 text-center">
				<div class="text-6xl mb-4">🎤</div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2">No Active Events</h2>
				<p class="text-gray-600">There are no voting events currently active. Check back later!</p>
			</div>
		{:else}
			<!-- Only show event selection if there are multiple events -->
			{#if events.length > 1}
				<div class="mb-8">
					<label for="event-select" class="block text-sm font-semibold text-gray-700 mb-3">
						Select Event to Vote:
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

			<!-- Voting Form -->
			{#if selectedEventId && participants.length > 0}
				<div class="card-eurovision p-6 md:p-8 animate-slide-up">
					<div class="mb-6">
						<h2 class="text-2xl font-bold text-gray-800 mb-2">
							{selectedEvent?.title} ({selectedEvent?.year})
						</h2>
						<p class="text-gray-600">
							Select your top 10 songs in order. 1st place gets 12 points, 10th place gets 1 point.
						</p>
					</div>

					<!-- Error/Success Messages -->
					{#if error}
						<div class="mb-6 p-4 bg-danger-50 border-2 border-danger-200 text-danger-700 rounded-lg animate-slide-up">
							{error}
						</div>
					{/if}

					{#if success}
						<div class="mb-6 p-4 bg-success-500 text-white rounded-lg animate-slide-up font-semibold">
							{success}
						</div>
					{/if}

					<form onsubmit={handleSubmit} class="space-y-4">
						{#each votes as vote, index}
							<div class="flex items-center gap-4">
								<!-- Position Badge -->
								<div class="flex-shrink-0 w-16">
									<div class="bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-lg py-2 px-3 text-center">
										<div class="text-xs font-semibold">#{index + 1}</div>
										<div class="text-lg font-bold">{VOTING_CONFIG.POINTS[index]}pts</div>
									</div>
								</div>

								<!-- Song Select -->
								<select
									bind:value={votes[index]}
									required
									disabled={loading}
									class="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<option value="">Select a song...</option>
									{#each getAvailableOptions(index) as participant}
										<option value={participant.id}>
											{participant.country} - {participant.artist} - {participant.song}
										</option>
									{/each}
								</select>
							</div>
						{/each}

						<!-- Submit Button -->
						<div class="pt-6 flex gap-4">
							<button
								type="submit"
								disabled={!isFormValid || loading}
								class="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? 'Submitting...' : '🎉 Submit Votes'}
							</button>
							<button
								type="button"
								onclick={() => goto('/my-votes')}
								class="btn-primary"
							>
								View My Votes
							</button>
						</div>
					</form>
				</div>
			{:else if selectedEventId && loading}
				<div class="card-eurovision p-8 text-center">
					<div class="skeleton h-8 w-64 mx-auto mb-4"></div>
					<div class="skeleton h-4 w-96 mx-auto"></div>
				</div>
			{/if}
		{/if}
	</main>
</div>
