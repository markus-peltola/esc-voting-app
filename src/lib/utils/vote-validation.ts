/**
 * Vote Validation Utilities
 *
 * This file contains the PRESERVED voting validation logic from the original app.
 * These validation rules must be maintained exactly as they were.
 *
 * Original source: src/routes/vote/+page.svelte (lines 83-97)
 */

import { VOTING_CONFIG } from '$lib/config/voting';

export type ValidationResult = {
	isValid: boolean;
	error?: string;
};

export type VoteData = {
	participantId: string;
	participantName?: string;
};

/**
 * PRESERVED VALIDATION LOGIC
 *
 * Validates that all required votes are filled
 *
 * Original implementation (line 83-86):
 * ```typescript
 * if (votes.some((vote) => !vote)) {
 *   alert('You must vote for 10 songs.');
 *   return;
 * }
 * ```
 *
 * @param votes - Array of participant IDs
 * @returns Validation result with error message if invalid
 */
export function validateAllVotesFilled(votes: string[]): ValidationResult {
	// Check that all vote slots are filled
	if (votes.some((vote) => !vote)) {
		return {
			isValid: false,
			error: 'You must vote for 10 songs.'
		};
	}

	return { isValid: true };
}

/**
 * PRESERVED VALIDATION LOGIC
 *
 * Validates that no song receives points twice
 *
 * Original implementation (lines 88-97):
 * ```typescript
 * const selectedSongs = votes.map((participantId) => {
 *   const participant = participants.find((p) => p.id === participantId);
 *   return participant?.name
 * });
 * const uniqueSongs = new Set(selectedSongs);
 * if (uniqueSongs.size !== selectedSongs.length) {
 *   alert('You cannot give points to the same song more than once.');
 *   return;
 * }
 * ```
 *
 * @param votes - Array of participant IDs
 * @returns Validation result with error message if invalid
 */
export function validateNoDuplicates(votes: string[]): ValidationResult {
	// Create a Set to check for duplicates
	const uniqueSongs = new Set(votes.filter(v => v)); // Filter out empty votes

	// If set size is smaller than array length, there are duplicates
	if (uniqueSongs.size !== votes.filter(v => v).length) {
		return {
			isValid: false,
			error: 'You cannot give points to the same song more than once.'
		};
	}

	return { isValid: true };
}

/**
 * PRESERVED VALIDATION LOGIC
 *
 * Complete validation combining all rules
 *
 * @param votes - Array of participant IDs
 * @returns Validation result with error message if invalid
 */
export function validateVotes(votes: string[]): ValidationResult {
	// Check that the correct number of votes are provided
	if (votes.length !== VOTING_CONFIG.REQUIRED_VOTE_COUNT) {
		return {
			isValid: false,
			error: `You must vote for exactly ${VOTING_CONFIG.REQUIRED_VOTE_COUNT} songs.`
		};
	}

	// Check that all votes are filled
	const allFilledResult = validateAllVotesFilled(votes);
	if (!allFilledResult.isValid) {
		return allFilledResult;
	}

	// Check for duplicates
	const noDuplicatesResult = validateNoDuplicates(votes);
	if (!noDuplicatesResult.isValid) {
		return noDuplicatesResult;
	}

	return { isValid: true };
}

/**
 * Filter available participant options for a specific vote position
 * This ensures users can't select the same participant multiple times
 *
 * @param allParticipants - All available participants
 * @param currentVotes - Currently selected votes
 * @param currentIndex - Index of the vote being edited
 * @returns Filtered list of participants that can be selected
 */
export function getAvailableParticipants<T extends { id: string }>(
	allParticipants: T[],
	currentVotes: string[],
	currentIndex: number
): T[] {
	return allParticipants.filter((participant) => {
		// Include if not already selected, or if it's selected at the current index
		return !currentVotes.includes(participant.id) || currentVotes[currentIndex] === participant.id;
	});
}

/**
 * Check if the vote form is complete and valid
 *
 * @param votes - Array of participant IDs
 * @returns true if all votes are filled (derived state helper)
 */
export function isFormValid(votes: string[]): boolean {
	return votes.every((v) => v !== '');
}
