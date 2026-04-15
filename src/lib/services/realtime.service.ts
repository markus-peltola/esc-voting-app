/**
 * Realtime Service - Supabase Realtime Subscriptions
 *
 * Provides real-time updates for fantasy drafts and voting
 */

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface DraftSubscriptionCallbacks {
	onPredictionInsert?: (payload: any) => void;
	onDraftUpdate?: (payload: any) => void;
}

/**
 * Subscribe to real-time updates for a fantasy draft
 * Returns cleanup function to unsubscribe
 */
export function subscribeToDraft(
	supabase: SupabaseClient,
	eventId: string,
	callbacks: DraftSubscriptionCallbacks
): () => void {
	const channels: RealtimeChannel[] = [];

	// Subscribe to new predictions (picks)
	if (callbacks.onPredictionInsert) {
		const predictionChannel = supabase
			.channel(`predictions:${eventId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'fantasy_predictions',
					filter: `event_id=eq.${eventId}`
				},
				callbacks.onPredictionInsert
			)
			.subscribe();

		channels.push(predictionChannel);
	}

	// Subscribe to draft state updates (turn changes)
	if (callbacks.onDraftUpdate) {
		const draftChannel = supabase
			.channel(`draft:${eventId}`)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'fantasy_drafts',
					filter: `event_id=eq.${eventId}`
				},
				callbacks.onDraftUpdate
			)
			.subscribe();

		channels.push(draftChannel);
	}

	// Return cleanup function
	return () => {
		channels.forEach(channel => {
			supabase.removeChannel(channel);
		});
	};
}

/**
 * Subscribe to real-time vote updates
 */
export function subscribeToVotes(
	supabase: SupabaseClient,
	eventId: string,
	onVoteChange: (payload: any) => void
): () => void {
	const channel = supabase
		.channel(`votes:${eventId}`)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'votes',
				filter: `event_id=eq.${eventId}`
			},
			onVoteChange
		)
		.subscribe();

	return () => {
		supabase.removeChannel(channel);
	};
}
