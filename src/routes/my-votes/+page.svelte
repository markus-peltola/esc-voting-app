<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import {
		getOrCreateAuthVotingIdentity,
		resolveGuestVotingIdentity,
		type VotingIdentity
	} from '$lib/voting-identity';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(true);
	let error = $state('');
	let votesByEvent = $state<Map<string, any[]>>(new Map());
	let events = $state<Map<string, any>>(new Map());
	let currentVoter = $state<VotingIdentity | null>(null);

	onMount(async () => {
		await loadVotes();
	});

	async function loadVotes() {
		try {
			loading = true;
			error = '';

			if (data.session?.user) {
				currentVoter = await getOrCreateAuthVotingIdentity(
					data.supabase as any,
					data.session.user.id,
					authStore.username || data.profile?.username || 'Account voter'
				);
			} else {
				currentVoter = await resolveGuestVotingIdentity(data.supabase as any);
			}

			if (!currentVoter) {
				votesByEvent = new Map();
				events = new Map();
				loading = false;
				return;
			}

			// Load all votes for current user with participant and event details
			const { data: votesData, error: votesError } = await data.supabase
				.from('votes')
				.select(`
					id,
					points,
					created_at,
					event:events (
						id,
						title,
						year
					),
					participant:participants (
						id,
						country,
						artist,
						song
					)
				`)
				.eq('voter_id', currentVoter.id)
				.order('created_at', { ascending: false });

			if (votesError) throw votesError;

			// Group votes by event
			const grouped = new Map<string, any[]>();
			const eventMap = new Map<string, any>();

			for (const vote of votesData || []) {
				const eventId = vote.event.id;

				if (!grouped.has(eventId)) {
					grouped.set(eventId, []);
					eventMap.set(eventId, vote.event);
				}

				grouped.get(eventId)!.push({
					id: vote.id,
					points: vote.points,
					country: vote.participant.country,
					artist: vote.participant.artist,
					song: vote.participant.song,
					created_at: vote.created_at
				});
			}

			// Sort votes within each event by points (descending)
			for (const [eventId, votes] of grouped.entries()) {
				votes.sort((a, b) => b.points - a.points);
			}

			votesByEvent = grouped;
			events = eventMap;
		} catch (err: any) {
			console.error('Error loading votes:', err);
			error = err.message || 'Failed to load votes';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation
		supabase={data.supabase}
		currentPage="my-votes"
		initialSession={data.session}
		initialProfile={data.profile}
	/>

	<main class="container-eurovision py-8">
		{#if loading}
			<!-- Loading State -->
			<div class="card-eurovision p-8">
				<div class="space-y-4">
					<div class="skeleton h-6 w-48"></div>
					<div class="skeleton h-64 w-full"></div>
				</div>
			</div>
		{:else if error}
			<!-- Error State -->
			<div class="card-eurovision p-8 text-center">
				<div class="text-danger-500 text-5xl mb-4">⚠️</div>
				<h2 class="text-xl font-bold text-gray-800 mb-2">Error Loading Votes</h2>
				<p class="text-gray-600">{error}</p>
			</div>
		{:else if votesByEvent.size === 0}
			<!-- No Votes State -->
			<div class="card-eurovision p-8 text-center">
				<div class="text-6xl mb-4">🎤</div>
				<h2 class="text-2xl font-bold text-gray-800 mb-2">No Votes Yet</h2>
				<p class="text-gray-600 mb-6">
					{#if currentVoter}
						{currentVoter.displayName} hasn't cast any votes yet. Head to the voting page to participate!
					{:else}
						No voting profile was found on this device. Head to the voting page to start a ballot.
					{/if}
				</p>
				<button onclick={() => goto('/vote')} class="btn-accent">
					🎵 Start Voting
				</button>
			</div>
		{:else}
			<!-- Votes Display -->
			<div class="space-y-8">
				{#each [...votesByEvent.entries()] as [eventId, votes]}
					{@const event = events.get(eventId)}
					<div class="card-eurovision p-6 md:p-8 animate-slide-up">
						<!-- Event Header -->
						<div class="mb-6 pb-4 border-b-2 border-gray-200">
							<h2 class="text-2xl font-bold text-gray-800 mb-1">
								{event?.title || 'Unknown Event'}
							</h2>
							<p class="text-gray-600">
								Year: {event?.year || 'Unknown'} • {votes.length} votes
							</p>
						</div>

						<!-- Votes Table -->
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b-2 border-gray-200">
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Points</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Country</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Artist</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Song</th>
									</tr>
								</thead>
								<tbody>
									{#each votes as vote, index}
										<tr class="border-b border-gray-100 hover:bg-primary-50 transition-colors">
											<!-- Rank -->
											<td class="py-4 px-4">
												<div class="flex items-center gap-2">
													{#if index === 0}
														<span class="text-2xl">🥇</span>
													{:else if index === 1}
														<span class="text-2xl">🥈</span>
													{:else if index === 2}
														<span class="text-2xl">🥉</span>
													{:else}
														<span class="text-lg font-semibold text-gray-500">#{index + 1}</span>
													{/if}
												</div>
											</td>

											<!-- Points -->
											<td class="py-4 px-4">
												<span class="inline-block bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold py-1 px-3 rounded-lg text-sm">
													{vote.points} pts
												</span>
											</td>

											<!-- Country -->
											<td class="py-4 px-4 font-semibold text-gray-800">
												{vote.country}
											</td>

											<!-- Artist -->
											<td class="py-4 px-4 text-gray-700">
												{vote.artist}
											</td>

											<!-- Song -->
											<td class="py-4 px-4 text-gray-600 italic">
												"{vote.song}"
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						<!-- Vote Again Button -->
						<div class="mt-6 pt-4 border-t border-gray-200">
							<button
								onclick={() => goto('/vote')}
								class="btn-primary"
							>
								✏️ Update Your Votes
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>
