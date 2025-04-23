<script lang="ts">
	import { goto } from "$app/navigation";
	import { checkAuth } from "$lib/auth";
	import { supabase } from "$lib/supabase";
	import type { QueryData } from "@supabase/supabase-js";

	let userId: string;
	const votesWithParticipantsQuery = supabase
		.from('votes')
		.select('points, participant:participant_id(country, artist, song), event:event_id(title, year)')
	type VotesWithParticipant = QueryData<typeof votesWithParticipantsQuery>;

	let groupedVotes = $state<Record<string, VotesWithParticipant>>({});

	$effect(() => {
		(async () => {
			const userDetails = checkAuth();
			if (userDetails) userId = userDetails.userId;

			const { data, error } = await supabase
		.from('votes')
		.select('points, participant:participant_id(country, artist, song), event:event_id(title, year)')
		.eq('user_id', userId);;

			if (!data || error) {
				console.error('Failed to load votes', error);
				return;
			}

			// Group by event title
			const groups: Record<string, VotesWithParticipant> = {};
			for (const vote of data) {
				const eventTitle = `${vote.event?.year} - ${vote.event?.title}`;
				if (!groups[eventTitle]) groups[eventTitle] = [];
				groups[eventTitle].push(vote);
			}

			// Sort votes in each event by points (descending)
			for (const title in groups) {
				groups[title].sort((a: any, b: any) => b.points - a.points);
			}

			groupedVotes = groups;
		})();
	})
</script>

<main class="container">
	<h1>Your Votes</h1>

	<button class="btn btn-primary back-btn" onclick={() => goto('/user')}>Back</button>

	{#if Object.keys(groupedVotes).length === 0}
		<p>You haven't voted yet.</p>
	{:else}
		{#each Object.entries(groupedVotes) as [eventTitle, votes]}
			<h2>{eventTitle}</h2>
			<div class="votes-table table-responsive">
				<table class="table table-striped table-bordered">
					<thead>
						<tr>
							<th scope="col">Points</th>
							<th scope="col">Country</th>
							<th scope="col">Artist</th>
							<th scope="col">Song</th>
						</tr>
					</thead>
					<tbody>
						{#each votes as vote}
							<tr>
								<th scope="row">{vote.points}</th>
								<td>{vote.participant?.country}</td>
								<td>{vote.participant?.artist}</td>
								<td>{vote.participant?.song}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	{/if}
</main>

