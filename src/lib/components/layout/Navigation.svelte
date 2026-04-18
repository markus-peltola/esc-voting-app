<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	let {
		supabase,
		currentPage = 'vote'
	}: {
		supabase: SupabaseClient;
		currentPage?: string;
	} = $props();

	async function handleLogout() {
		await supabase.auth.signOut();
		authStore.clear();
		window.location.assign('/login');
	}
</script>

<header class="bg-white border-b border-gray-200 sticky top-0 z-10">
	<div class="container-eurovision py-4">
		<div class="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
			<div>
				<h1 class="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
					🎵 ESC Voting App
				</h1>
				<p class="text-sm text-gray-600">
					{#if authStore.username}
						Hello, {authStore.username}!
					{:else}
						Party voting and fantasy league
					{/if}
				</p>
			</div>
			<nav class="flex flex-wrap gap-3 items-center text-sm">
				<button
					onclick={() => window.location.assign('/vote')}
					class="font-semibold transition-colors"
					class:text-primary-700={currentPage === 'vote'}
					class:text-primary-600={currentPage !== 'vote'}
					class:hover:text-primary-700={currentPage !== 'vote'}
				>
					🏠 Home
				</button>
				<button
					onclick={() => window.location.assign('/my-votes')}
					class="font-semibold transition-colors"
					class:text-primary-700={currentPage === 'my-votes'}
					class:text-primary-600={currentPage !== 'my-votes'}
					class:hover:text-primary-700={currentPage !== 'my-votes'}
				>
					Your Votes
				</button>
				<button
					onclick={() => window.location.assign('/results')}
					class="font-semibold transition-colors"
					class:text-primary-700={currentPage === 'results'}
					class:text-primary-600={currentPage !== 'results'}
					class:hover:text-primary-700={currentPage !== 'results'}
				>
					Results
				</button>
				{#if authStore.isAuthenticated}
					<span class="text-gray-300 hidden md:inline">|</span>
					<button
						onclick={() => window.location.assign('/fantasy/draft')}
						class="font-semibold transition-colors"
						class:text-purple-700={currentPage === 'fantasy-draft'}
						class:text-purple-600={currentPage !== 'fantasy-draft'}
						class:hover:text-purple-700={currentPage !== 'fantasy-draft'}
					>
						Fantasy Draft
					</button>
					<button
						onclick={() => window.location.assign('/fantasy/results')}
						class="font-semibold transition-colors"
						class:text-purple-700={currentPage === 'fantasy-results'}
						class:text-purple-600={currentPage !== 'fantasy-results'}
						class:hover:text-purple-700={currentPage !== 'fantasy-results'}
					>
						Fantasy Results
					</button>
					{#if authStore.isAdmin}
						<span class="text-gray-300 hidden md:inline">|</span>
						<button
							onclick={() => window.location.assign('/admin')}
							class="font-semibold transition-colors"
							class:text-danger-700={currentPage === 'admin'}
							class:text-danger-600={currentPage !== 'admin'}
							class:hover:text-danger-700={currentPage !== 'admin'}
						>
							⚙️ Admin
						</button>
					{/if}
					<span class="text-gray-300 hidden md:inline">|</span>
					<button
						onclick={() => window.location.assign('/profile')}
						class="font-semibold transition-colors"
						class:text-gray-700={currentPage === 'profile'}
						class:text-gray-600={currentPage !== 'profile'}
						class:hover:text-gray-900={currentPage !== 'profile'}
					>
						👤 Profile
					</button>
					<button
						type="button"
						onclick={handleLogout}
						class="text-gray-600 hover:text-gray-900 transition-colors"
					>
						Sign Out
					</button>
				{:else}
					<span class="text-gray-300 hidden md:inline">|</span>
					<button
						onclick={() => window.location.assign('/login')}
						class="text-gray-600 hover:text-gray-900 transition-colors"
					>
						Log In
					</button>
				{/if}
			</nav>
		</div>
	</div>
</header>
