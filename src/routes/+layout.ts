import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { LayoutLoad } from './$types';
import type { Database } from '$lib/database.types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	/**
	 * Declare a dependency so the layout can be invalidated, for example, on
	 * session refresh.
	 */
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient<Database>(
				import.meta.env.PUBLIC_SUPABASE_URL,
				import.meta.env.PUBLIC_SUPABASE_ANON_KEY
		  )
		: createServerClient<Database>(
				import.meta.env.PUBLIC_SUPABASE_URL,
				import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
				{
					cookies: {
						getAll() {
							return data.cookies;
						},
						setAll() {
							// Not needed on client
						}
					},
					fetch
				}
		  );

	/**
	 * SECURITY: Always call getUser() first to verify the session with the server
	 * Then getSession() can be used to get the session details
	 */
	const {
		data: { user }
	} = await supabase.auth.getUser();

	const {
		data: { session }
	} = await supabase.auth.getSession();

	return { session, supabase, user, profile: data.profile };
};
