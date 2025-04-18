<script lang="ts">
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabase";
	import type { VoteRecord } from "../../types";

	let groupedVotes = $state<Record<string, VoteRecord[]>>({});

	$effect(() => {
		(async () => {
			const userId = localStorage.getItem('user_id');
			if (!userId) goto('/');

			const { data, error } = await supabase
				.from('votes')
				.select('points, participant:participant_id(country, artist, song), event:event_id(title, year)')
				.eq('user_id', userId);


			if (!data || error) {
				console.error('Failed to load votes', error);
				return;
			}

			// Group by event title
			const groups: Record<string, VoteRecord[]> = {};
			for (const vote of data as unknown as VoteRecord[]) {
				const eventTitle = `${vote.event.year} - ${vote.event.title}`;
				if (!groups[eventTitle]) groups[eventTitle] = [];
				groups[eventTitle].push(vote);
			}

			// Sort votes in each event by points (descending)
			for (const title in groups) {
				groups[title].sort((a, b) => b.points - a.points);
			}

			groupedVotes = groups;
		})();
	})
</script>

<h2>Your Votes</h2>

{#if Object.keys(groupedVotes).length === 0}
	<p>You haven't voted yet.</p>
{:else}
	{#each Object.entries(groupedVotes) as [eventTitle, votes]}
		<h3>{eventTitle}</h3>
		<ul>
			{#each votes as vote}
				<li>
					<strong>{vote.points} pts</strong> → {vote.participant.country} – {vote.participant.artist} – {vote.participant.song}
				</li>
			{/each}
		</ul>
	{/each}
{/if}