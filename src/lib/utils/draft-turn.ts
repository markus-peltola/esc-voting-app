/**
 * Fantasy Draft Turn Management Utilities
 *
 * This file contains the PRESERVED snake draft turn logic from the original app.
 * The serpentine draft algorithm must be maintained exactly as it was.
 *
 * Original source: src/lib/fantasy.ts (lines 96-145 in nextTurn function)
 */

import { FANTASY_CONFIG } from '$lib/config/fantasy';

export type DraftState = {
	currentTurnIndex: number;
	round: number;
	isForward: boolean;
	turnOrder: string[];
	teamSize: number;
};

export type TurnUpdate = {
	currentTurnIndex: number;
	round: number;
	isForward: boolean;
	draftClosed?: boolean;
};

/**
 * PRESERVED SNAKE DRAFT LOGIC
 *
 * Calculate the next turn in a serpentine/snake draft
 *
 * Original implementation (lines 96-145):
 * ```typescript
 * let round = event.round;
 * const currentDirection = event.forward_direction;
 * let nextTurnIndex: number;
 *
 * // Calculate the new index for the next turn
 * if (currentDirection) {
 *   nextTurnIndex = event.current_turn + 1;
 * } else {
 *   nextTurnIndex = event.current_turn - 1;
 * }
 *
 * // If round has reached end
 * if (nextTurnIndex >= event.turn_order.length || nextTurnIndex < 0) {
 *   // If round ends, it is always the same user's turn to start the next round
 *   nextTurnIndex = event.current_turn;
 *   // Increment round
 *   round++;
 *
 *   // If that was the last round
 *   if (round > draftRules?.team_size) {
 *     // End the draft
 *     await supabase.from('fantasy_events').update({ draft_open: false }).eq('id', eventId);
 *     return;
 *   }
 *
 *   // Change the direction
 *   const newDirection = currentDirection ? false : true;
 *
 *   // Update the turn information
 *   await supabase
 *     .from('fantasy_events')
 *     .update({ current_turn: nextTurnIndex, forward_direction: newDirection, round: round })
 *     .eq('id', eventId);
 * } else {
 *   // Update the turn information
 *   await supabase.from('fantasy_events').update({ current_turn: nextTurnIndex }).eq('id', eventId);
 * }
 * ```
 *
 * Snake draft explanation:
 * - Round 1: User A → User B → User C (forward)
 * - Round 2: User C → User B → User A (backward)
 * - Round 3: User A → User B → User C (forward)
 * - And so on...
 *
 * @param currentState - Current draft state
 * @returns Turn update with new indices and round info
 *
 * @example
 * // Forward direction, mid-round
 * calculateNextTurn({
 *   currentTurnIndex: 0,
 *   round: 1,
 *   isForward: true,
 *   turnOrder: ['A', 'B', 'C'],
 *   teamSize: 3
 * })
 * // Returns: { currentTurnIndex: 1, round: 1, isForward: true }
 *
 * @example
 * // End of forward round - reverses direction
 * calculateNextTurn({
 *   currentTurnIndex: 2,
 *   round: 1,
 *   isForward: true,
 *   turnOrder: ['A', 'B', 'C'],
 *   teamSize: 3
 * })
 * // Returns: { currentTurnIndex: 2, round: 2, isForward: false }
 *
 * @example
 * // Final round complete - closes draft
 * calculateNextTurn({
 *   currentTurnIndex: 0,
 *   round: 3,
 *   isForward: false,
 *   turnOrder: ['A', 'B', 'C'],
 *   teamSize: 3
 * })
 * // Returns: { currentTurnIndex: 0, round: 4, isForward: true, draftClosed: true }
 */
export function calculateNextTurn(currentState: DraftState): TurnUpdate {
	let round = currentState.round;
	const currentDirection = currentState.isForward;
	let nextTurnIndex: number;

	// PRESERVED LOGIC: Calculate the new index for the next turn
	if (currentDirection) {
		// Moving forward through the turn order
		nextTurnIndex = currentState.currentTurnIndex + 1;
	} else {
		// Moving backward through the turn order
		nextTurnIndex = currentState.currentTurnIndex - 1;
	}

	// PRESERVED LOGIC: Check if round has reached end
	if (nextTurnIndex >= currentState.turnOrder.length || nextTurnIndex < 0) {
		// If round ends, it is always the same user's turn to start the next round
		nextTurnIndex = currentState.currentTurnIndex;

		// Increment round
		round++;

		// Keep the final visible draft state on the last completed round.
		if (round > currentState.teamSize) {
			return {
				currentTurnIndex: nextTurnIndex,
				round: currentState.teamSize,
				isForward: currentDirection,
				draftClosed: true
			};
		}

		// PRESERVED LOGIC: Change the direction (snake draft)
		const newDirection = !currentDirection;

		return {
			currentTurnIndex: nextTurnIndex,
			round: round,
			isForward: newDirection
		};
	}

	// Normal turn progression within the round
	return {
		currentTurnIndex: nextTurnIndex,
		round: round,
		isForward: currentDirection
	};
}

/**
 * Check if it's a specific user's turn
 *
 * @param userId - User ID to check
 * @param currentTurnIndex - Current turn index
 * @param turnOrder - Array of user IDs in turn order
 * @returns true if it's the user's turn
 */
export function isUserTurn(userId: string, currentTurnIndex: number, turnOrder: string[]): boolean {
	return turnOrder[currentTurnIndex] === userId;
}

/**
 * Get the user ID whose turn it currently is
 *
 * @param currentTurnIndex - Current turn index
 * @param turnOrder - Array of user IDs in turn order
 * @returns User ID or null if invalid index
 */
export function getCurrentTurnUserId(currentTurnIndex: number, turnOrder: string[]): string | null {
	if (currentTurnIndex < 0 || currentTurnIndex >= turnOrder.length) {
		return null;
	}
	return turnOrder[currentTurnIndex];
}

/**
 * Calculate how many picks a user has made
 *
 * @param userId - User ID to check
 * @param round - Current round number
 * @param currentTurnIndex - Current turn index
 * @param turnOrder - Array of user IDs in turn order
 * @param isForward - Current direction
 * @returns Number of picks made
 */
export function getUserPickCount(
	userId: string,
	round: number,
	currentTurnIndex: number,
	turnOrder: string[],
	isForward: boolean
): number {
	const userIndex = turnOrder.indexOf(userId);
	if (userIndex === -1) return 0;

	// Each completed round = 1 pick
	let picks = round - 1;

	// Check if user has picked in current round
	const currentTurnUserId = getCurrentTurnUserId(currentTurnIndex, turnOrder);

	// In forward direction, users before current index have picked
	// In backward direction, users after current index have picked
	if (isForward) {
		if (userIndex < currentTurnIndex || userId === currentTurnUserId) {
			picks++;
		}
	} else {
		if (userIndex > currentTurnIndex || userId === currentTurnUserId) {
			picks++;
		}
	}

	return picks;
}

/**
 * Check if the draft should be closed
 *
 * @param round - Current round number
 * @param teamSize - Maximum team size
 * @returns true if draft is complete
 */
export function shouldCloseDraft(round: number, teamSize: number): boolean {
	return round > teamSize;
}

/**
 * Get the next user who will pick (preview)
 *
 * @param currentState - Current draft state
 * @returns User ID of next picker, or null if draft would close
 */
export function getNextPickerUserId(currentState: DraftState): string | null {
	const nextTurn = calculateNextTurn(currentState);

	if (nextTurn.draftClosed) {
		return null;
	}

	return getCurrentTurnUserId(nextTurn.currentTurnIndex, currentState.turnOrder);
}

/**
 * Validate that a pick can be made
 *
 * @param userId - User attempting to pick
 * @param currentState - Current draft state
 * @returns Validation result with error message if invalid
 */
export function validatePick(
	userId: string,
	currentState: DraftState
): { valid: boolean; error?: string } {
	// Check if it's the user's turn
	if (!isUserTurn(userId, currentState.currentTurnIndex, currentState.turnOrder)) {
		return {
			valid: false,
			error: "It's not your turn to pick."
		};
	}

	// Check if draft is still open
	if (shouldCloseDraft(currentState.round, currentState.teamSize)) {
		return {
			valid: false,
			error: 'The draft has already closed.'
		};
	}

	return { valid: true };
}
