<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	type Profile = NonNullable<App.PageData['profile']>;

	async function loadProfile(userId: string) {
		const profileClient = data.supabase as typeof data.supabase & {
			from(relation: 'profiles'): {
				select(columns: '*'): {
					eq(column: 'id', value: string): {
						maybeSingle(): Promise<{ data: Profile | null }>;
					};
				};
			};
		};

		const { data: profile } = await profileClient
			.from('profiles')
			.select('*')
			.eq('id', userId)
			.maybeSingle();

		return profile;
	}

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const { data: authData, error: authError } = await data.supabase.auth.signInWithPassword({
				email,
				password
			});

			if (authError) {
				error = authError.message;
				return;
			}

			if (authData.session) {
				const profile = await loadProfile(authData.session.user.id);
				authStore.setAuth(authData.session, profile);
				window.location.assign('/vote');
				return;
			}
		} catch (err) {
			error = 'An unexpected error occurred';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center px-4 gradient-eurovision">
	<div class="w-full max-w-md">
		<!-- Card -->
		<div class="card-eurovision p-8 animate-slide-up">
			<!-- Logo/Header -->
			<div class="text-center mb-8">
				<h1 class="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">
					ESC Voting
				</h1>
				<p class="text-gray-600">Welcome back! Sign in to your account</p>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="mb-4 p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg animate-slide-up">
					{error}
				</div>
			{/if}

			<!-- Login Form -->
			<form onsubmit={handleLogin} class="space-y-6">
				<div>
					<label for="email" class="block text-sm font-semibold text-gray-700 mb-2">
						Email
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						disabled={loading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						placeholder="your@email.com"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-semibold text-gray-700 mb-2">
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						disabled={loading}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Signing in...' : 'Sign In'}
				</button>
			</form>

			<!-- Divider -->
			<div class="relative my-6">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-gray-300"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-2 bg-white text-gray-500">Don't have an account?</span>
				</div>
			</div>

			<!-- Register Link -->
			<a
				href="/register"
				class="block text-center text-primary-600 hover:text-primary-700 font-semibold transition-colors"
			>
				Create a new account
			</a>

			<div class="mt-4 text-center">
				<a
					href="/vote?guest=1"
					class="text-gray-600 hover:text-gray-900 font-medium transition-colors"
				>
					Let me just vote without creating an account
				</a>
			</div>
		</div>

		<!-- Footer Note -->
		<p class="text-center mt-6 text-white text-sm drop-shadow-md">
			🎵 Eurovision Voting & Fantasy League 2026
		</p>
	</div>
</div>
