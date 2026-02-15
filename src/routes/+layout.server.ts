import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { session, profile }, cookies }) => {
	return {
		session,
		profile,
		cookies: cookies.getAll()
	};
};
