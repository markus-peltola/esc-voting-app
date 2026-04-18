/**
 * Auth Store - Svelte 5 Runes
 *
 * Provides reactive authentication state throughout the app
 */

import type { User, Session } from '@supabase/supabase-js';

type Profile = NonNullable<App.PageData['profile']>;

class AuthStore {
	user = $state<User | null>(null);
	session = $state<Session | null>(null);
	profile = $state<Profile | null>(null);
	isLoading = $state(false);

	get isAuthenticated(): boolean {
		return !!this.session && !!this.user;
	}

	get isAdmin(): boolean {
		return this.profile?.is_admin ?? false;
	}

	get username(): string | null {
		return this.profile?.username ?? null;
	}

	setAuth(session: Session | null, profile: Profile | null) {
		this.session = session;
		this.user = session?.user ?? null;
		this.profile = profile;
	}

	setLoading(loading: boolean) {
		this.isLoading = loading;
	}

	clear() {
		this.user = null;
		this.session = null;
		this.profile = null;
	}
}

export const authStore = new AuthStore();
