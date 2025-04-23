<script lang="ts">
	import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      goto('/user');
    }
  });

	let username = '';
	let password = '';
	let statusMessage = '';
	let existingUser = false;
	let userId: string | null = null;

	const NEW_USER_PASSWORD = import.meta.env.VITE_SHARED_PASSWORD;

	function handleEnter(node: HTMLFormElement) {
		async function onSubmit(e: SubmitEvent) {
			e.preventDefault();
			await login();
		}

		node.addEventListener('submit', onSubmit);

		return {
			destroy() {
				node.removeEventListener('submit', onSubmit);
			}
		}
	}

	async function login() {
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
			localStorage.setItem('user_id', userId);
			localStorage.setItem('username', username);
      goto('/user');
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

			localStorage.setItem('user_id', data.id);
			localStorage.setItem('username', username);
      goto('/user');
		}
	}
</script>

<main class="container">
	<h1>Eurovision Voting App</h1>

	<form use:handleEnter class="form">
		<label for="username">Enter your username:</label>
		<input
			id="username"
			class="form-control"
			type="text"
			bind:value={username}
			placeholder="Username"
			required
		/>
		<button type="submit" class="btn btn-primary">Enter</button>
	</form>

	{#if statusMessage}
		<p class="status-message">{statusMessage}</p>
		{#if !existingUser}
			<input
				type="password"
				class="form-control password"
				placeholder="Shared password"
				bind:value={password}
			/>
		{/if}
		<button class="btn btn-primary" onclick={confirmChoice}>Confirm</button>
	{/if}
</main>

