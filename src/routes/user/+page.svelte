<script lang="ts">
	import { goto } from "$app/navigation";
	import { checkAuth } from "$lib/auth";
	import { onMount } from "svelte";

  let username: string | null = null;

  onMount(() => {
    const userDetails = checkAuth();
    username = userDetails?.username || 'friend';
  });

  function logout() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    goto('/');
  }
</script>

<main class="container">
	<h1>Welcome, {username}!</h1>

	<div class="menu">
		<button class="btn btn-primary" onclick={() => goto('/vote')}>Vote</button>
		<button class="btn btn-primary"  onclick={() => goto('/your-votes')}>Your Votes</button>
		<button class="btn btn-primary"  onclick={() => goto('/fantasy-league')}>Fantasy League</button>
		<button class="btn btn-danger"  onclick={logout}>Logout</button>
	</div>
</main>