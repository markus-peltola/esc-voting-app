<script lang="ts">
	import { goto } from "$app/navigation";
	import type { Tables } from "$lib/database.types";
	import { getFantasyResults, type FantasyResults, type CurrentPicks } from "$lib/fantasy";
	import { supabase } from "$lib/supabase";
	import { onMount } from "svelte";

  let currentPredictions = $state<Record<string, CurrentPicks>>({});
  let activeFantasyEvent = $state<Tables<'fantasy_events'> | null>(null);
  let usersWithPredictions = $state<{ id: string, name: string }[]>([]);
  let fantasyResults = $state<FantasyResults>({});
  const totalPointMap = $state<Map<string, number>>(new Map());

  onMount(async () => {
		// Load active fantasy event
		const { data: event } = await supabase
			.from('fantasy_events')
			.select('*')
			.eq('active', true)
			.limit(1)
			.single();

		if (!event) return;

    activeFantasyEvent = event;

    // Load the predictions
    const { data: predictions } = await supabase
			.from('fantasy_predictions')
			.select('event_id, user_id, position, participant:participant_id(id, country, artist, song)')
			.eq('event_id', activeFantasyEvent.id)
		
		if (!predictions) return;

		const userIds = new Set(predictions.map(p => p.user_id));

		const { data: public_users } = await supabase
		.from('public_users')
		.select('*')
		.in('id', activeFantasyEvent.turn_order);

		const getNameWithId = (id: string) => public_users?.find((user) => user.id === id)?.username;

		for (const userId of Array.from(userIds)) {
			const currentUserPredictions = predictions.filter((p) => p.user_id === userId)
			currentPredictions[userId] = currentUserPredictions;
			usersWithPredictions.push({
				id: userId,
				name: getNameWithId(userId) || ''
			});
		}

    fantasyResults = await getFantasyResults(activeFantasyEvent.id, currentPredictions);
    // Loop through the fantasy results and calculate the total points for each user
    for (const userId of Object.keys(fantasyResults)) {
      const totalPoints = Object.values(fantasyResults[userId]).reduce((acc, cur) => acc + cur.totalPoints, 0);
      totalPointMap.set(userId, totalPoints);
    }
    // Sort the usersWithPredictions array by total points
    usersWithPredictions.sort((a, b) => {
      const aPoints = totalPointMap.get(a.id) || 0;
      const bPoints = totalPointMap.get(b.id) || 0;
      return bPoints - aPoints; // Sort in descending order
    });
  });
</script>

<main class="container">
	<h1>Fantasy League</h1>
  <button class="btn btn-primary back-btn" onclick={() => goto('/user')}>Back</button>
  {#if !activeFantasyEvent}
		<p>There are currently no open fantasy leagues.</p>
	{:else}

    {#if Object.keys(currentPredictions).length}
      <h3>Results</h3>
      {#each usersWithPredictions as user}
        <h4>{user.name}</h4>
        <div class="table-responsive-sm">
          <table class="table table-sm table-bordered">
            <thead class="table-light">
              <tr>
                <th scope="col">Country</th>
                <th scope="col">Predicted pos</th>
                <th scope="col">Final pos</th>
                <th scope="col">Final pts</th>
                <th scope="col">Total pts</th>
              </tr>
            </thead>
            <tbody>
              {#each currentPredictions[user.id] as prediction}
                <tr>
                  <td>{prediction.participant.country}</td>
                  <td>{prediction.position}</td>
                  {#if fantasyResults[prediction.user_id]?.[prediction.participant.id]}
                    <td>{fantasyResults[prediction.user_id][prediction.participant.id].finalPosition}</td>
                    <td>{fantasyResults[prediction.user_id][prediction.participant.id].finalPoints}</td>
                    <td>{fantasyResults[prediction.user_id][prediction.participant.id].totalPoints}</td>
                  {:else}
                    <td>TBD</td>
                    <td>TBD</td>
                    <td>TBD</td>
                  {/if}
                </tr>
              {/each}
            </tbody>
            <tfoot class="table-light fw-bold">
              <tr>
                <td>Total</td>
                <td></td>
                <td></td>
                <td></td>
                {#if fantasyResults[user.id]}
                  <td>{totalPointMap.get(user.id) || 0}</td>
                {:else}
                  <td>0</td>
                {/if}
              </tr>
            </tfoot>
          </table>
        </div>
      {/each}
    {/if}
  {/if}
</main>