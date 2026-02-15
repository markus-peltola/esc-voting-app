import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabase: Handle = async ({ event, resolve }) => {
	/**
	 * Creates a Supabase client specific to this server request.
	 * The client handles auth sessions and cookies automatically.
	 */
	event.locals.supabase = createServerClient(
		import.meta.env.PUBLIC_SUPABASE_URL,
		import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	/**
	 * Get the session from Supabase and make it available throughout the app
	 */
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	event.locals.session = session;

	/**
	 * Get the user profile if logged in
	 */
	if (session) {
		const { data: profile } = await event.locals.supabase
			.from('profiles')
			.select('*')
			.eq('id', session.user.id)
			.single();

		event.locals.profile = profile;
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			/**
			 * Supabase needs the content-range and x-supabase-api-version headers
			 */
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const session = event.locals.session;
	const pathname = event.url.pathname;

	/**
	 * Define protected routes that require authentication
	 */
	const protectedRoutes = ['/vote', '/my-votes', '/fantasy', '/profile'];
	const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

	/**
	 * Define auth routes that should redirect to /vote if already logged in
	 */
	const authRoutes = ['/login', '/register'];
	const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

	/**
	 * Redirect to login if trying to access protected route without session
	 */
	if (isProtectedRoute && !session) {
		throw redirect(303, '/login');
	}

	/**
	 * Redirect to vote page if trying to access auth routes while logged in
	 */
	if (isAuthRoute && session) {
		throw redirect(303, '/vote');
	}

	return resolve(event);
};

export const handle = sequence(supabase, authGuard);
