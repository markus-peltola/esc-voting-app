// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			session: Session | null;
			profile: Database['public']['Tables']['profiles']['Row'] | null;
		}
		interface PageData {
			session: Session | null;
			profile: Database['public']['Tables']['profiles']['Row'] | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
