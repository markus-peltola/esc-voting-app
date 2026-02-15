<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function handleLogout() {
		await data.supabase.auth.signOut();
		goto('/login');
	}
</script>

<div class="min-h-screen gradient-eurovision flex items-center justify-center px-4">
	<div class="w-full max-w-2xl">
		<!-- Success Card -->
		<div class="card-eurovision p-8 text-center animate-slide-up">
			<!-- Success Icon -->
			<div class="mb-6">
				<div class="w-20 h-20 bg-success-500 rounded-full flex items-center justify-center mx-auto">
					<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
					</svg>
				</div>
			</div>

			<!-- Welcome Message -->
			<h1 class="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-4">
				🎉 Authentication Works!
			</h1>

			<div class="mb-8">
				<p class="text-xl text-gray-700 mb-2">
					Welcome, <span class="font-bold text-primary-600">{authStore.username || 'User'}</span>!
				</p>
				<p class="text-gray-600">
					You're successfully logged in with Supabase Auth 🚀
				</p>
			</div>

			<!-- Status Info -->
			<div class="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mb-8">
				<h2 class="text-lg font-semibold text-primary-800 mb-3">
					🏗️ Rebuild in Progress
				</h2>
				<div class="text-left text-sm text-primary-700 space-y-2">
					<div class="flex items-start">
						<span class="text-success-600 mr-2">✅</span>
						<span>Tailwind CSS v4 with Eurovision theme</span>
					</div>
					<div class="flex items-start">
						<span class="text-success-600 mr-2">✅</span>
						<span>New database schema (8 refactored tables)</span>
					</div>
					<div class="flex items-start">
						<span class="text-success-600 mr-2">✅</span>
						<span>Supabase Auth with email/password</span>
					</div>
					<div class="flex items-start">
						<span class="text-success-600 mr-2">✅</span>
						<span>Core logic preserved (voting, fantasy, results)</span>
					</div>
					<div class="flex items-start">
						<span class="text-accent-500 mr-2">🔨</span>
						<span class="font-semibold">Next: Rebuild voting & fantasy pages</span>
					</div>
				</div>
			</div>

			<!-- Your Info -->
			<div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
				<h3 class="font-semibold text-gray-700 mb-2">Your Account:</h3>
				<div class="text-sm text-gray-600 space-y-1">
					<p><strong>Email:</strong> {data.session?.user.email}</p>
					<p><strong>Username:</strong> {authStore.username}</p>
					<p><strong>User ID:</strong> <code class="text-xs bg-gray-200 px-1 py-0.5 rounded">{data.session?.user.id}</code></p>
					{#if authStore.isAdmin}
						<p class="text-accent-600 font-semibold">👑 Admin</p>
					{/if}
				</div>
			</div>

			<!-- Logout Button -->
			<button
				onclick={handleLogout}
				class="btn-primary"
			>
				Sign Out
			</button>
		</div>

		<!-- Footer Note -->
		<p class="text-center mt-6 text-white text-sm drop-shadow-md">
			🎵 Ready to rebuild the voting and fantasy pages!
		</p>
	</div>
</div>
