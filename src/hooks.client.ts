import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { type HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = async ({ error, event }) => {
	console.error('Client error:', error);

	return {
		message: 'An unexpected error occurred'
	};
};
