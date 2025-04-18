<script lang="ts">
	import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      goto('/vote');
    }
  });

	let username = '';
	let password = '';
	let statusMessage = '';
	let confirmed = false;
	let existingUser = false;
	let userId: string | null = null;

	const NEW_USER_PASSWORD = 'letmevote'; // you can replace this with an env variable in backend

	async function handleEnter() {
		if (!username.trim()) return;

		const { data, error } = await supabase
			.from('public_users')
			.select('*')
			.eq('username', username)
			.single();

		if (data) {
			statusMessage = `User "${username}" exists. Do you want to continue as this user?`;
			existingUser = true;
			userId = data.id;
		} else if (error && error.code === 'PGRST116') {
			// No rows found = user does not exist
			statusMessage = `No user "${username}" found. Do you want to create a new user? Enter the shared password below.`;
			existingUser = false;
			userId = null;
		} else {
			statusMessage = 'Something went wrong.';
			console.error(error);
		}
	}

	async function confirmChoice() {
		if (existingUser && userId) {
			console.log('Logging in as existing user', userId);
			localStorage.setItem('user_id', userId);
      goto('/vote');
		} else {
			if (password !== NEW_USER_PASSWORD) {
				statusMessage = 'Incorrect password for creating a new user.';
				return;
			}

			const { data, error } = await supabase
				.from('public_users')
				.insert({ username })
				.select()
				.single();

			if (error) {
				statusMessage = 'Error creating user.';
				console.error(error);
				return;
			}

			console.log('Created new user:', data.id);
			localStorage.setItem('user_id', data.id);
      goto('/vote');
		}
	}
</script>

<main class="container">
	<h1>Eurovision Voting App</h1>

	<form on:submit|preventDefault={handleEnter} class="form">
		<label for="username">Enter your username:</label>
		<input
			id="username"
			type="text"
			bind:value={username}
			placeholder="Username"
			required
		/>
		<button type="submit">Enter</button>
	</form>

	{#if statusMessage}
		<p>{statusMessage}</p>
		{#if !existingUser}
			<input
				type="password"
				placeholder="Shared password"
				bind:value={password}
			/>
		{/if}
		<button on:click={confirmChoice}>Confirm</button>
	{/if}
</main>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4rem;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 320px;
		width: 100%;
	}
	input,
	button {
		font-size: 1rem;
		padding: 0.75rem;
		border: 1px solid #ccc;
		border-radius: 6px;
	}
	button {
		background-color: #2c73d2;
		color: white;
		border: none;
		cursor: pointer;
	}
	button:hover {
		background-color: #1b4f9c;
	}
</style>