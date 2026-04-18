<script lang="ts">
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import { aggregateResults } from '$lib/utils/results-aggregation';
	import { VOTING_CONFIG } from '$lib/config/voting';
	import { flags } from '$lib/flags';
	import type { PageData } from './$types';

	function getFlagCodeByCountryName(countryName: string): string | null {
		const entry = Object.values(flags).find(f => f.name === countryName);
		return entry?.code.toLowerCase() || null;
	}

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state('');
	let events = $state<any[]>([]);
	let selectedEventId = $state<string | null>(null);
	let selectedEvent = $state<any | null>(null);
	let results = $state<any[]>([]);
	let revealedRows = $state<Set<number>>(new Set());
	let allRevealed = $state(false);

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
			.eq('type', 'voting')
			.eq('status', 'closed')
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
		revealedRows = new Set();
		allRevealed = false;
		error = '';
		loading = true;

		try {
			// Load participants for this event
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

			// Load all votes for this event
			const { data: votesData, error: votesError } = await data.supabase
				.from('votes')
				.select('participant_id, points')
				.eq('event_id', eventId);

			if (votesError) throw votesError;

			// Flatten participants and add flags
			const participants = (participantData || []).map((item: any) => ({
				id: item.participant.id,
				country: item.participant.country,
				artist: item.participant.artist,
				song: item.participant.song,
				flagCode: getFlagCodeByCountryName(item.participant.country)
			}));

			// Use our preserved aggregation logic
			results = aggregateResults(participants, votesData || []);
		} catch (err: any) {
			console.error('Error loading results:', err);
			error = err.message || 'Failed to load results';
			results = [];
		} finally {
			loading = false;
		}
	}

	function toggleReveal(index: number) {
		if (index < VOTING_CONFIG.TOP_HIDDEN_COUNT) {
			const newRevealed = new Set(revealedRows);
			if (newRevealed.has(index)) {
				newRevealed.delete(index);
			} else {
				newRevealed.add(index);
			}
			revealedRows = newRevealed;

			// Auto-switch to "Hide All" if all top rows are now revealed
			const topCount = Math.min(VOTING_CONFIG.TOP_HIDDEN_COUNT, results.length);
			if (newRevealed.size === topCount) {
				allRevealed = true;
			} else {
				allRevealed = false;
			}
		}
	}

	function revealAll() {
		const newRevealed = new Set<number>();
		for (let i = 0; i < VOTING_CONFIG.TOP_HIDDEN_COUNT && i < results.length; i++) {
			newRevealed.add(i);
		}
		revealedRows = newRevealed;
		allRevealed = true;
	}

	function hideAll() {
		revealedRows = new Set();
		allRevealed = false;
	}

	function isHidden(index: number): boolean {
		return index < VOTING_CONFIG.TOP_HIDDEN_COUNT && !revealedRows.has(index);
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation
		supabase={data.supabase}
		currentPage="results"
		initialSession={data.session}
		initialProfile={data.profile}
	/>

	<main class="container-eurovision py-8">
		{#if loading && events.length === 0}
			<!-- Initial Loading -->
			<div class="card-eurovision p-8">
				<div class="skeleton h-6 w-48 mb-4"></div>
				<div class="skeleton h-12 w-full"></div>
			</div>
		{:else if events.length === 0}
			<!-- No Events -->
			<div class="card-eurovision p-8 text-center">
				<div class="text-6xl mb-4">📊</div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Available Yet</h2>
				<p class="text-gray-600">Results will appear here once a voting event has been closed.</p>
			</div>
		{:else}
			<!-- Only show event selection if there are multiple events -->
			{#if events.length > 1}
				<div class="mb-8">
					<label for="event-select" class="block text-sm font-semibold text-gray-700 mb-3">
						Select Event to View Results:
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

			<!-- Results Display -->
			{#if selectedEventId && results.length > 0}
				<div class="card-eurovision p-6 md:p-8 animate-slide-up">
					<!-- Event Header -->
					<div class="mb-6 pb-4 border-b-2 border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<h2 class="text-2xl font-bold text-gray-800 mb-1">
								{selectedEvent?.title || 'Results'}
							</h2>
							<p class="text-gray-600">
								{results.length} participants • Click rows to reveal top {VOTING_CONFIG.TOP_HIDDEN_COUNT}
							</p>
						</div>
						{#if !allRevealed}
							<button onclick={revealAll} class="btn-accent whitespace-nowrap">
								🎉 Reveal All
							</button>
						{:else}
							<button onclick={hideAll} class="btn-primary whitespace-nowrap">
								🔒 Hide Top {VOTING_CONFIG.TOP_HIDDEN_COUNT}
							</button>
						{/if}
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="mb-6 p-4 bg-danger-50 border-2 border-danger-200 text-danger-700 rounded-lg">
							{error}
						</div>
					{/if}

					<!-- Results Table -->
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b-2 border-gray-200">
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Position</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Points</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Country</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Artist</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Song</th>
								</tr>
							</thead>
							<tbody>
								{#each results as result, index}
									<tr
										class="border-b border-gray-100 hover:bg-primary-50 transition-colors"
										class:cursor-pointer={index < VOTING_CONFIG.TOP_HIDDEN_COUNT}
										class:opacity-50={isHidden(index)}
										onclick={() => toggleReveal(index)}
									>
										<!-- Position -->
										<td class="py-4 px-4">
											{#if isHidden(index)}
												<span class="text-2xl">❓</span>
											{:else if index === 0}
												<span class="text-3xl">🥇</span>
											{:else if index === 1}
												<span class="text-3xl">🥈</span>
											{:else if index === 2}
												<span class="text-3xl">🥉</span>
											{:else}
												<span class="text-lg font-semibold text-gray-700">#{index + 1}</span>
											{/if}
										</td>

										<!-- Points -->
										<td class="py-4 px-4">
											{#if isHidden(index)}
												<span class="text-xl font-bold text-gray-400">???</span>
											{:else}
												<span class="inline-block bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold py-1 px-4 rounded-lg">
													{result.points} pts
												</span>
											{/if}
										</td>

										<!-- Country -->
											<td class="py-4 px-4">
												{#if isHidden(index)}
													<span class="text-2xl">❓</span>
												{:else}
													<div class="flex items-center gap-2">
														{#if result.flagCode}
															<img
																src={`https://flagcdn.com/24x18/${result.flagCode}.png`}
																alt=""
																class="h-[18px] w-6 rounded-sm object-cover border border-gray-200"
																loading="lazy"
															/>
														{/if}
														<span class="font-semibold text-gray-800">{result.country}</span>
													</div>
												{/if}
											</td>

										<!-- Artist -->
										<td class="py-4 px-4 text-gray-700">
											{#if isHidden(index)}
												<span class="text-gray-400">Hidden</span>
											{:else}
												{result.artist}
											{/if}
										</td>

										<!-- Song -->
										<td class="py-4 px-4 text-gray-600 italic">
											{#if isHidden(index)}
												<span class="text-gray-400">Click to reveal</span>
											{:else}
												"{result.song}"
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{:else if selectedEventId && loading}
				<!-- Loading Results -->
				<div class="card-eurovision p-8">
					<div class="space-y-4">
						<div class="skeleton h-6 w-48"></div>
						<div class="skeleton h-64 w-full"></div>
					</div>
				</div>
			{:else if selectedEventId && results.length === 0}
				<!-- No Results -->
				<div class="card-eurovision p-8 text-center">
					<div class="text-6xl mb-4">🗳️</div>
					<h2 class="text-2xl font-bold text-gray-800 mb-2">No Votes Yet</h2>
					<p class="text-gray-600">Nobody has voted for this event yet.</p>
				</div>
			{/if}
		{/if}
	</main>
</div>
