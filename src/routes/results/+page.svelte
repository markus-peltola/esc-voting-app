<script lang="ts">
	import { onMount } from "svelte";
  import { getEvents, loadTableData, type Events, type ResultTableData } from "$lib/results"
	import { goto } from "$app/navigation";

  let events = $state<Events>([]);
  let selectedEvent = $state<Events[number]>();
  let tableData = $state<ResultTableData>([]);
  let hiddenTableData = $state<ResultTableData>([]);

  onMount(async () => {
    events = await getEvents();
  });

  async function loadEvent(eventId: string) {
    selectedEvent = events.find((e) => e.id === eventId)!;
    tableData = await loadTableData(eventId);
    hiddenTableData = tableData.map((data, i) => {
      if (i < 10) {
        return { flag: '', country: '???', artist: '???', song: '???', points: NaN }
      } else {
        return data;
      }
    });
  }

  function revealRow(index: number) {
    hiddenTableData[index] = tableData[index];
  }

  function revealAll() {
    hiddenTableData = tableData;
  }

  function resetTable() {
    hiddenTableData = tableData.map((data, i) => {
      if (i < 10) {
        return { flag: '', country: '???', artist: '???', song: '???', points: NaN }
      } else {
        return data;
      }
    });
  }
</script>

<main class=container>
  <h1>Results</h1>
  {#if !selectedEvent}
    <button class='btn btn-primary' onclick={() => goto('/')}>Back</button>
    <h2>Select Event</h2>
    {#each events as event}
      <button class="btn btn-primary" onclick={() => loadEvent(event.id)}>{event.year} - {event.title}</button>
    {/each}
  {:else}
    <button class='btn btn-primary' onclick={() => { selectedEvent = undefined; resetTable() }}>Back</button>
    <button class='btn btn-primary' onclick={() => revealAll()}>Reveal all</button>
    <h2>{selectedEvent.year} - {selectedEvent.title}</h2>
    <div class="votes-table table-responsive">
      <table class="table table-striped table-bordered">
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Points</th>
            <th scope="col">Country</th>
            <th scope="col">Artist</th>
            <th scope="col">Song</th>
          </tr>
        </thead>
        <tbody>
          {#each hiddenTableData as row, i}
            <tr onclick={() => revealRow(i)}>
              <th scope="row">{i+1}</th>
              <td>{row.points}</td>
              <td>{row.flag} {row.country}</td>
              <td>{row.artist}</td>
              <td>{row.song}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>

<style>
	button {
		padding: 0.75rem 1.25rem;
    margin-top: 1em;
    margin-bottom: 0.75em;
		width: fit-content;
	}
</style>