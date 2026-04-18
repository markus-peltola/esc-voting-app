<script lang="ts">
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	// User stats
	let stats = $state({
		totalVotes: 0,
		eventsVoted: 0,
		fantasyLeagues: 0,
		bestFantasyPosition: null as number | null
	});

	// Password change
	let newPassword = $state('');
	let confirmPassword = $state('');

	// Username change
	let newUsername = $state('');
	let editingUsername = $state(false);

	$effect(() => {
		loadStats();
	});

	async function loadStats() {
		if (!data.session?.user) return;

		try {
			// Count total votes
			const { count: voteCount } = await data.supabase
				.from('votes')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', data.session.user.id);

			// Count events voted in
			const { data: eventsData } = await data.supabase
				.from('votes')
				.select('event_id')
				.eq('user_id', data.session.user.id);

			const uniqueEvents = new Set(eventsData?.map(v => v.event_id) || []);

			// Count fantasy leagues joined
			const { data: fantasyData } = await data.supabase
				.from('fantasy_predictions')
				.select('event_id')
				.eq('user_id', data.session.user.id);

			const uniqueFantasyEvents = new Set(fantasyData?.map(p => p.event_id) || []);

			// Get best fantasy position (would need to calculate from fantasy_results)
			// For now, we'll skip this complex calculation

			stats = {
				totalVotes: voteCount || 0,
				eventsVoted: uniqueEvents.size,
				fantasyLeagues: uniqueFantasyEvents.size,
				bestFantasyPosition: null
			};
		} catch (err) {
			console.error('Error loading stats:', err);
		}
	}

	async function changePassword() {
		error = '';
		success = '';

		if (!newPassword || !confirmPassword) {
			error = 'Please fill in all fields';
			return;
		}

		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (newPassword.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		loading = true;

		try {
			const { error: updateError } = await data.supabase.auth.updateUser({
				password: newPassword
			});

			if (updateError) throw updateError;

			success = '✅ Password updated successfully!';
			newPassword = '';
			confirmPassword = '';
		} catch (err: any) {
			error = err.message || 'Failed to update password';
		} finally {
			loading = false;
		}
	}

	async function changeUsername() {
		error = '';
		success = '';
		const trimmedUsername = newUsername.trim();

		if (!trimmedUsername) {
			error = 'Please enter a username';
			return;
		}

		if (trimmedUsername.length < 3) {
			error = 'Username must be at least 3 characters';
			return;
		}

		loading = true;

		try {
			// Check if username is taken
			const { data: existingUser } = await data.supabase
				.from('profiles')
				.select('id')
				.eq('username', trimmedUsername)
				.maybeSingle();

			if (existingUser && existingUser.id !== data.session?.user.id) {
				throw new Error('Username already taken');
			}

			// Update username and sync the local auth store from the returned row.
			const { data: updatedProfile, error: updateError } = await data.supabase
				.from('profiles')
				.update({ username: trimmedUsername })
				.eq('id', data.session!.user.id)
				.select('*')
				.single();

			if (updateError) throw updateError;

			success = '✅ Username updated successfully!';
			authStore.setAuth(authStore.session, updatedProfile);
			editingUsername = false;
			newUsername = '';
		} catch (err: any) {
			error = err.message || 'Failed to update username';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation
		supabase={data.supabase}
		currentPage="profile"
		initialSession={data.session}
		initialProfile={data.profile}
	/>

	<main class="container-eurovision py-8">
		<div class="max-w-4xl mx-auto space-y-6">
			<!-- Page Header -->
			<div class="mb-8">
				<h2 class="text-3xl font-bold text-gray-800 mb-2">My Profile</h2>
				<p class="text-gray-600">Manage your account and view your statistics</p>
			</div>

			<!-- Messages -->
			{#if error}
				<div class="p-4 bg-danger-50 border-2 border-danger-200 text-danger-700 rounded-lg animate-slide-up">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="p-4 bg-success-500 text-white rounded-lg animate-slide-up font-semibold">
					{success}
				</div>
			{/if}

			<!-- Account Info -->
			<div class="card-eurovision p-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Account Information</h3>
				<div class="space-y-4">
					<div class="flex items-center justify-between py-3 border-b border-gray-200">
						<div>
							<p class="text-sm text-gray-600">Username</p>
							{#if editingUsername}
								<input
									type="text"
									bind:value={newUsername}
									placeholder={authStore.username || ''}
									disabled={loading}
									class="mt-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
								/>
							{:else}
								<p class="font-semibold text-gray-800">{authStore.username}</p>
							{/if}
						</div>
						<div class="flex gap-2">
							{#if editingUsername}
								<button
									onclick={changeUsername}
									disabled={loading}
									class="text-sm text-success-600 hover:text-success-700 font-semibold disabled:opacity-50"
								>
									Save
								</button>
								<button
									onclick={() => { editingUsername = false; newUsername = ''; }}
									disabled={loading}
									class="text-sm text-gray-600 hover:text-gray-700 font-semibold disabled:opacity-50"
								>
									Cancel
								</button>
							{:else}
								<button
									onclick={() => { editingUsername = true; newUsername = authStore.username || ''; }}
									class="text-sm text-primary-600 hover:text-primary-700 font-semibold"
								>
									Edit
								</button>
							{/if}
						</div>
					</div>

					<div class="py-3 border-b border-gray-200">
						<p class="text-sm text-gray-600">Email</p>
						<p class="font-semibold text-gray-800">{data.session?.user.email}</p>
					</div>

					{#if authStore.isAdmin}
						<div class="py-3">
							<p class="text-sm text-gray-600">Role</p>
							<span class="inline-block px-3 py-1 bg-danger-100 text-danger-700 rounded-lg text-sm font-semibold mt-1">
								⚙️ Administrator
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Statistics -->
			<div class="card-eurovision p-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Your Statistics</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
						<div class="text-4xl font-bold text-primary-600 mb-2">{stats.totalVotes}</div>
						<p class="text-sm text-gray-700 font-semibold">Total Votes Cast</p>
					</div>

					<div class="text-center p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-lg">
						<div class="text-4xl font-bold text-accent-600 mb-2">{stats.eventsVoted}</div>
						<p class="text-sm text-gray-700 font-semibold">Events Participated</p>
					</div>

					<div class="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
						<div class="text-4xl font-bold text-purple-600 mb-2">{stats.fantasyLeagues}</div>
						<p class="text-sm text-gray-700 font-semibold">Fantasy Leagues</p>
					</div>
				</div>
			</div>

			<!-- Change Password -->
			<div class="card-eurovision p-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Change Password</h3>
				<form onsubmit={(e) => { e.preventDefault(); changePassword(); }} class="space-y-4">
					<div>
						<label for="new-password" class="block text-sm font-semibold text-gray-700 mb-2">
							New Password
						</label>
						<input
							id="new-password"
							type="password"
							bind:value={newPassword}
							required
							disabled={loading}
							minlength="6"
							class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
							placeholder="Enter new password"
						/>
					</div>

					<div>
						<label for="confirm-password" class="block text-sm font-semibold text-gray-700 mb-2">
							Confirm Password
						</label>
						<input
							id="confirm-password"
							type="password"
							bind:value={confirmPassword}
							required
							disabled={loading}
							minlength="6"
							class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
							placeholder="Confirm new password"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Updating...' : '🔒 Update Password'}
					</button>
				</form>
			</div>

			<!-- Account Actions -->
			<div class="card-eurovision p-6">
				<h3 class="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
				<div class="flex flex-wrap gap-3">
					<button
						onclick={() => goto('/my-votes')}
						class="btn-primary"
					>
						📊 View My Votes
					</button>
					<button
						onclick={() => goto('/vote')}
						class="btn-accent"
					>
						🎵 Cast New Votes
					</button>
					<button
						onclick={() => goto('/fantasy/draft')}
						class="btn-primary"
					>
						🎲 Join Fantasy Draft
					</button>
				</div>
			</div>
		</div>
	</main>
</div>
