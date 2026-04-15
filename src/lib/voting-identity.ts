import { browser } from '$app/environment';

const GUEST_TOKEN_KEY = 'esc_guest_vote_token';
const GUEST_NAME_KEY = 'esc_guest_vote_name';

type MinimalSupabase = {
	from: (table: string) => any;
	rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export type VotingIdentity = {
	id: string;
	displayName: string;
	isGuest: boolean;
};

export function getGuestToken(): string | null {
	if (!browser) return null;
	return localStorage.getItem(GUEST_TOKEN_KEY);
}

export function getStoredGuestName(): string {
	if (!browser) return '';
	return localStorage.getItem(GUEST_NAME_KEY) || '';
}

export function storeGuestName(name: string) {
	if (!browser) return;
	localStorage.setItem(GUEST_NAME_KEY, name);
}

export function ensureGuestToken(): string {
	if (!browser) {
		throw new Error('Guest voting is only available in the browser');
	}

	let token = localStorage.getItem(GUEST_TOKEN_KEY);
	if (!token) {
		token = crypto.randomUUID();
		localStorage.setItem(GUEST_TOKEN_KEY, token);
	}

	return token;
}

export async function getOrCreateAuthVotingIdentity(
	supabase: MinimalSupabase,
	profileId: string,
	displayName: string
): Promise<VotingIdentity> {
	const voters = supabase.from('voters');
	const { data: existingVoter, error: selectError } = await voters
		.select('id, display_name, is_guest')
		.eq('profile_id', profileId)
		.maybeSingle();

	if (selectError) throw selectError;

	if (existingVoter) {
		if (existingVoter.display_name !== displayName) {
			const { error: updateError } = await voters
				.update({ display_name: displayName })
				.eq('id', existingVoter.id);

			if (updateError) throw updateError;
		}

		return {
			id: existingVoter.id,
			displayName,
			isGuest: false
		};
	}

	const { data: createdVoter, error: insertError } = await voters
		.insert({
			profile_id: profileId,
			display_name: displayName,
			is_guest: false
		})
		.select('id, display_name, is_guest')
		.single();

	if (insertError) throw insertError;

	return {
		id: createdVoter.id,
		displayName: createdVoter.display_name,
		isGuest: false
	};
}

export async function resolveGuestVotingIdentity(
	supabase: MinimalSupabase
): Promise<VotingIdentity | null> {
	const guestToken = getGuestToken();
	if (!guestToken) return null;

	const { data: guestVoter, error } = await supabase.rpc('get_guest_voter', {
		p_guest_token: guestToken
	});

	if (error) throw error;
	if (!guestVoter || guestVoter.length === 0) return null;

	const voter = guestVoter[0];

	storeGuestName(voter.display_name);

	return {
		id: voter.id,
		displayName: voter.display_name,
		isGuest: true
	};
}

export async function getOrCreateGuestVotingIdentity(
	supabase: MinimalSupabase,
	displayName: string
): Promise<VotingIdentity> {
	const trimmedName = displayName.trim();
	if (!trimmedName) {
		throw new Error('Please enter a voting nickname');
	}

	const guestToken = ensureGuestToken();
	const { data: guestVoter, error } = await supabase.rpc('get_or_create_guest_voter', {
		p_guest_token: guestToken,
		p_display_name: trimmedName
	});

	if (error) throw error;
	if (!guestVoter || guestVoter.length === 0) {
		throw new Error('Failed to create guest voting profile');
	}

	const voter = guestVoter[0];

	storeGuestName(voter.display_name);

	return {
		id: voter.id,
		displayName: voter.display_name,
		isGuest: true
	};
}
