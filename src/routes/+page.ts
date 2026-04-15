import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { session } = await parent();

	// If logged in, redirect to vote page
	if (session) {
		throw redirect(303, '/vote');
	}

	// If not logged in, redirect to login page
	throw redirect(303, '/login');
};
