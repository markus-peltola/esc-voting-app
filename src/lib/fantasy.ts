import type { QueryData } from '@supabase/supabase-js';
import { supabase } from './supabase';

const availableParticipantsQuery = supabase
	.from('fantasy_event_participants')
	.select('event_id, participant:participant_id(id, country, artist, song)');

export type AvailableParticipants = QueryData<typeof availableParticipantsQuery>;

export async function getAvailableDraftParticipants(eventId: string) {
	// 1. Get all selected participant_ids for this event
	const { data: selected, error: selectedError } = await supabase
		.from('fantasy_predictions')
		.select('participant_id')
		.eq('event_id', eventId);

	if (selectedError) throw selectedError;

	const selectedIds = selected.map((p) => p.participant_id);

	// 2. Query all fantasy_event_participants *excluding* those already selected
	const { data: available, error } = await supabase
		.from('fantasy_event_participants')
		.select('event_id, participant:participant_id(id, country, artist, song)')
		.eq('event_id', eventId)
		.not('participant_id', 'in', `(${selectedIds.join(',')})`);

	if (error) throw error;

	return available;
}

export async function getCurrentRoundDetails(eventId: string) {
	const { data: eventDetails } = await supabase
		.from('fantasy_events')
		.select('*')
		.eq('id', eventId)
		.single();
	if (!eventDetails) throw new Error('No event draft details found with given event id.');

	const { data: users } = await supabase
		.from('public_users')
		.select('*')
		.in('id', eventDetails.turn_order);

	const currentTurnIndex = eventDetails.current_turn;
	const nextTurnIndex =
		currentTurnIndex + 1 >= eventDetails.turn_order.length ? 0 : currentTurnIndex + 1;

	const currentTurnId = eventDetails.turn_order[currentTurnIndex];
	const nextTurnId = eventDetails.turn_order[nextTurnIndex];
	const getNameWithId = (id: string) => users?.find((user) => user.id === id)?.username;

	const fantasyUsers: { id: string; username: string }[] = [];
	for (const userId of eventDetails.turn_order) {
		fantasyUsers.push({
			id: userId,
			username: getNameWithId(userId) || ''
		});
	}

	return {
		round: eventDetails.round,
		users: fantasyUsers,
		currentTurn: {
			id: currentTurnId,
			name: getNameWithId(currentTurnId) || ''
		}
	};
}

export async function nextTurn(eventId: string) {
	const { data: event } = await supabase
		.from('fantasy_events')
		.select('*')
		.eq('id', eventId)
		.single();
	const { data: draftRules } = await supabase.from('fantasy_rules').select('*').single();
	if (!event) throw new Error('No draft details found with given event id.');
	if (!draftRules) throw new Error('No draft rules found with given event id.');

	let round = event.round;
	/** true = forwards, false = backwards */
	const currentDirection = event.forward_direction;

	let nextTurnIndex: number;

	// Calculate the new index for the next turn
	if (currentDirection) {
		nextTurnIndex = event.current_turn + 1;
	} else {
		nextTurnIndex = event.current_turn - 1;
	}

	// If round has reached end
	if (nextTurnIndex >= event.turn_order.length || nextTurnIndex < 0) {
		// If round ends, it is always the same user's turn to start the next round
		nextTurnIndex = event.current_turn;
		// Increment round
		round++;

		// If that was the last round
		if (round > draftRules?.team_size) {
			// End the draft
			await supabase.from('fantasy_events').update({ draft_open: false }).eq('id', eventId);
			return;
		}

		// Change the direction
		const newDirection = currentDirection ? false : true;

		// Update the turn information
		await supabase
			.from('fantasy_events')
			.update({ current_turn: nextTurnIndex, forward_direction: newDirection, round: round })
			.eq('id', eventId);
	} else {
		// Update the turn information
		await supabase.from('fantasy_events').update({ current_turn: nextTurnIndex }).eq('id', eventId);
	}
}
