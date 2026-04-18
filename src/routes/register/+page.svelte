<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state('');
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

	async function handleRegister(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		success = '';
		loading = true;

		// Validation
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			loading = false;
			return;
		}

		if (username.length < 3) {
			error = 'Username must be at least 3 characters';
			loading = false;
			return;
		}

		try {
			// Check if username is already taken
			const { data: existingProfile } = await data.supabase
				.from('profiles')
				.select('username')
				.eq('username', username)
				.single();

			if (existingProfile) {
				error = 'Username is already taken';
				loading = false;
				return;
			}

			// Sign up with Supabase Auth
			const { data: authData, error: authError } = await data.supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						username: username
					}
				}
			});

			if (authError) {
				error = authError.message;
				return;
			}

			if (authData.user) {
				// Check if email confirmation is required
				if (authData.session) {
					const profile = await loadProfile(authData.session.user.id);
					authStore.setAuth(authData.session, profile);
					window.location.assign('/vote');
					return;
				} else {
					// Email confirmation required
					success = 'Account created! Please check your email to verify your account.';
					setTimeout(() => goto('/login'), 3000);
				}
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
				<p class="text-gray-600">Create your account to start voting!</p>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="mb-4 p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-lg animate-slide-up">
					{error}
				</div>
			{/if}

			<!-- Success Message -->
			{#if success}
				<div class="mb-4 p-4 bg-success-50 border border-success-200 text-success-700 rounded-lg animate-slide-up">
					{success}
				</div>
			{/if}

			<!-- Register Form -->
			<form onsubmit={handleRegister} class="space-y-5">
				<div>
					<label for="username" class="block text-sm font-semibold text-gray-700 mb-2">
						Username
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						disabled={loading}
						minlength="3"
						maxlength="30"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						placeholder="Your display name"
					/>
					<p class="mt-1 text-xs text-gray-500">This will be visible to other users</p>
				</div>

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
						minlength="6"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						placeholder="••••••••"
					/>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-semibold text-gray-700 mb-2">
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						type="password"
						bind:value={confirmPassword}
						required
						disabled={loading}
						minlength="6"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						placeholder="••••••••"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Creating account...' : 'Create Account'}
				</button>
			</form>

			<!-- Divider -->
			<div class="relative my-6">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-gray-300"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-2 bg-white text-gray-500">Already have an account?</span>
				</div>
			</div>

			<!-- Login Link -->
			<a
				href="/login"
				class="block text-center text-primary-600 hover:text-primary-700 font-semibold transition-colors"
			>
				Sign in instead
			</a>
		</div>

		<!-- Footer Note -->
		<p class="text-center mt-6 text-white text-sm drop-shadow-md">
			🎵 Eurovision Voting & Fantasy League 2026
		</p>
	</div>
</div>
