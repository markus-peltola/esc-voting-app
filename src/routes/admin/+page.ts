import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase, session } = await parent();

	if (!session) {
		throw redirect(303, '/login');
	}

	// Check if user is admin
	const { data: profile, error } = await supabase
		.from('profiles')
		.select('is_admin')
		.eq('id', session.user.id)
		.single();

	if (error || !profile?.is_admin) {
		throw redirect(303, '/vote');
	}

	return {
		supabase,
		session
	};
};
