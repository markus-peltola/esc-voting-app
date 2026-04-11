<script lang="ts">
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import { calculateFantasyPoints } from '$lib/utils/fantasy-scoring';
	import { flags } from '$lib/flags';
	import type { PageData } from './$types';

	// Helper to get flag by country name
	function getFlagByCountryName(countryName: string): string {
		const entry = Object.values(flags).find(f => f.name === countryName);
		return entry?.emoji || '🏳️';
	}

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state('');
	let events = $state<any[]>([]);
	let selectedEventId = $state<string | null>(null);
	let selectedEvent = $state<any | null>(null);
	let leaderboard = $state<any[]>([]);
	let userTeams = $state<Map<string, any[]>>(new Map());
	let hasResults = $state(false); // Whether admin has entered any real results

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
		loading = true;

		try {
			// Load all predictions with participant and user info
			const { data: predictionsData, error: predictionsError } = await data.supabase
				.from('fantasy_predictions')
				.select(`
					id,
					user_id,
					predicted_position,
					pick_order,
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

			// Load fantasy results (final positions)
			const { data: resultsData, error: resultsError } = await data.supabase
				.from('fantasy_results')
				.select('*')
				.eq('event_id', eventId);

			if (resultsError) throw resultsError;

			// Create a map of participant_id to final result
			const resultsMap = new Map<string, any>();
			for (const result of resultsData || []) {
				resultsMap.set(result.participant_id, result);
			}

			// Track whether any real results have been entered
			hasResults = (resultsData || []).length > 0;

			// Group predictions by user and calculate points
			const userScores = new Map<string, any>();
			const userTeamsMap = new Map<string, any[]>();

			for (const prediction of predictionsData || []) {
				const userId = prediction.user_id;
				const username = prediction.profile.username;
				const participantId = prediction.participant.id;
				const predictedPosition = prediction.predicted_position;

				// Get final result for this participant
				const finalResult = resultsMap.get(participantId);
				const hasResult = !!finalResult;
				// Keep null as null (TBA) — only 0 means explicit DNQ
				const finalPosition = hasResult ? (finalResult.final_position ?? null) : null;
				const finalPoints = hasResult ? (finalResult.points ?? 0) : 0;

				// Calculate fantasy points only if a real position has been entered
				let fantasyPointsTotal = 0;
				if (hasResult && finalPosition !== null) {
					const result = calculateFantasyPoints(finalPosition, predictedPosition, finalPoints);
					fantasyPointsTotal = result.totalPoints;
				}

				// Add to user's team
				if (!userTeamsMap.has(userId)) {
					userTeamsMap.set(userId, []);
				}
				userTeamsMap.get(userId)!.push({
					participant: prediction.participant,
					predicted_position: predictedPosition,
					final_position: finalPosition,
					final_points: finalPoints,
					fantasy_points: fantasyPointsTotal,
					has_result: hasResult,
					pick_order: prediction.pick_order,
					flag: getFlagByCountryName(prediction.participant.country)
				});

				// Add to user's total score
				if (!userScores.has(userId)) {
					userScores.set(userId, {
						user_id: userId,
						username: username,
						total_points: 0,
						team_size: 0
					});
				}
				const userScore = userScores.get(userId)!;
				userScore.total_points += fantasyPointsTotal;
				userScore.team_size += 1;
			}

			// Convert to sorted leaderboard array
			leaderboard = Array.from(userScores.values()).sort(
				(a, b) => b.total_points - a.total_points
			);

			// Sort each user's team by predicted position, then alphabetically
			for (const [userId, team] of userTeamsMap.entries()) {
				team.sort((a, b) => {
					if (a.predicted_position !== b.predicted_position) {
						return a.predicted_position - b.predicted_position;
					}
					return a.participant.country.localeCompare(b.participant.country);
				});
			}
			userTeams = userTeamsMap;

		} catch (err: any) {
			console.error('Error loading fantasy results:', err);
			error = err.message || 'Failed to load fantasy results';
			leaderboard = [];
			userTeams = new Map();
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation supabase={data.supabase} currentPage="fantasy-results" />

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
				<div class="text-6xl mb-4">🎲</div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2">No Fantasy Events Yet</h2>
				<p class="text-gray-600">No fantasy leagues have been created yet.</p>
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

			<!-- Results Display -->
			{#if selectedEventId && leaderboard.length > 0}
				<div class="space-y-8">
					<!-- Results pending notice -->
					{#if !hasResults}
						<div class="card-eurovision p-6 bg-amber-50 border-2 border-amber-200">
							<div class="flex items-center gap-3">
								<span class="text-3xl">⏳</span>
								<div>
									<h3 class="font-bold text-amber-800">Awaiting Real Results</h3>
									<p class="text-sm text-amber-700">The admin hasn't entered the actual competition results yet. Rankings and points will appear once results are in.</p>
								</div>
							</div>
						</div>
					{/if}

					<!-- Leaderboard (only show when real results exist) -->
					{#if hasResults}
						<div class="card-eurovision p-6 md:p-8 animate-slide-up">
							<div class="mb-6 pb-4 border-b-2 border-gray-200">
								<h2 class="text-2xl font-bold text-gray-800 mb-1">
									{selectedEvent?.title || 'Leaderboard'}
								</h2>
								<p class="text-gray-600">
									{leaderboard.length} players
								</p>
							</div>

							<!-- Error Message -->
							{#if error}
								<div class="mb-6 p-4 bg-danger-50 border-2 border-danger-200 text-danger-700 rounded-lg">
									{error}
								</div>
							{/if}

							<!-- Leaderboard Table -->
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead>
										<tr class="border-b-2 border-gray-200">
											<th class="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
											<th class="text-left py-3 px-4 font-semibold text-gray-700">User</th>
											<th class="text-left py-3 px-4 font-semibold text-gray-700">Team Size</th>
											<th class="text-left py-3 px-4 font-semibold text-gray-700">Total Points</th>
										</tr>
									</thead>
									<tbody>
										{#each leaderboard as user, index}
											<tr class="border-b border-gray-100 hover:bg-primary-50 transition-colors">
												<td class="py-4 px-4">
													{#if index === 0}
														<span class="text-3xl">🥇</span>
													{:else if index === 1}
														<span class="text-3xl">🥈</span>
													{:else if index === 2}
														<span class="text-3xl">🥉</span>
													{:else}
														<span class="text-lg font-semibold text-gray-700">#{index + 1}</span>
													{/if}
												</td>
												<td class="py-4 px-4 font-semibold text-gray-800">
													{user.username}
												</td>
												<td class="py-4 px-4 text-gray-700">
													{user.team_size} picks
												</td>
												<td class="py-4 px-4">
													<span class="inline-block bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold py-1 px-4 rounded-lg">
														{user.total_points} pts
													</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}

					<!-- User Teams Breakdown -->
					<div class="space-y-6">
						<h2 class="text-2xl font-bold text-gray-800">Team Breakdowns</h2>
						{#each leaderboard as user, userIndex}
							{@const team = userTeams.get(user.user_id) || []}
							<div class="card-eurovision p-6 animate-slide-up">
								<div class="mb-4 pb-3 border-b border-gray-200 flex justify-between items-center">
									<div>
										<h3 class="text-xl font-bold text-gray-800">{user.username}'s Team</h3>
										<p class="text-sm text-gray-600">
											{team.length} picks
											{#if hasResults}
												• {user.total_points} total points
											{/if}
										</p>
									</div>
									{#if hasResults && userIndex < 3}
										<span class="text-4xl">
											{#if userIndex === 0}
												🥇
											{:else if userIndex === 1}
												🥈
											{:else}
												🥉
											{/if}
										</span>
									{/if}
								</div>

								<div class="overflow-x-auto">
									<table class="w-full">
										<thead>
											<tr class="border-b border-gray-200 text-sm">
												<th class="text-left py-2 px-3 font-semibold text-gray-700">Predicted</th>
												<th class="text-left py-2 px-3 font-semibold text-gray-700">Country</th>
												<th class="text-left py-2 px-3 font-semibold text-gray-700">Artist</th>
												<th class="text-left py-2 px-3 font-semibold text-gray-700">Actual</th>
												<th class="text-left py-2 px-3 font-semibold text-gray-700">Points</th>
											</tr>
										</thead>
										<tbody>
											{#each team as pick}
												<tr class="border-b border-gray-100 text-sm">
													<td class="py-3 px-3 font-semibold text-primary-600">
														#{pick.predicted_position}
													</td>
													<td class="py-3 px-3">
														<div class="flex items-center gap-2">
															<span class="text-xl">{pick.flag}</span>
															<span class="font-medium text-gray-800">{pick.participant.country}</span>
														</div>
													</td>
													<td class="py-3 px-3 text-gray-700">{pick.participant.artist}</td>
													<td class="py-3 px-3 font-semibold">
														{#if pick.final_position === null}
															<span class="text-amber-600">TBA</span>
														{:else if pick.final_position === 0}
															<span class="text-danger-600">DNQ</span>
														{:else if pick.final_position === pick.predicted_position}
															<span class="text-success-600">#{pick.final_position} ✓</span>
														{:else}
															<span class="text-gray-700">#{pick.final_position}</span>
														{/if}
													</td>
													<td class="py-3 px-3">
														{#if pick.final_position === null}
															<span class="text-amber-600 text-xs font-semibold">TBA</span>
														{:else}
															<span class="inline-block bg-gray-100 text-gray-800 font-bold py-1 px-2 rounded text-xs">
																{pick.fantasy_points} pts
															</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/each}
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
			{:else if selectedEventId && leaderboard.length === 0}
				<!-- No Results -->
				<div class="card-eurovision p-8 text-center">
					<div class="text-6xl mb-4">📊</div>
					<h2 class="text-2xl font-bold text-gray-800 mb-2">No Results Yet</h2>
					<p class="text-gray-600">Results will appear once the event is complete and scoring is calculated.</p>
				</div>
			{/if}
		{/if}
	</main>
</div>
