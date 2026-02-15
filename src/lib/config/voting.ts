/**
 * Voting System Configuration
 *
 * These constants define the core rules for the Eurovision voting system.
 * Previously stored in database, now in code for better maintainability.
 */

export const VOTING_CONFIG = {
	/** Point values assigned to votes in order (1st place gets 12, 2nd gets 10, etc.) */
	POINTS: [12, 10, 8, 7, 6, 5, 4, 3, 2, 1] as const,

	/** Number of songs each user must vote for */
	REQUIRED_VOTE_COUNT: 10,

	/** Number of top results to hide by default on results page */
	TOP_HIDDEN_COUNT: 10,

	/** Minimum votes required (same as REQUIRED_VOTE_COUNT for validation) */
	MIN_VOTES: 10,

	/** Maximum votes allowed (same as REQUIRED_VOTE_COUNT for validation) */
	MAX_VOTES: 10,
} as const;

/**
 * Get the point value for a given position (0-indexed)
 * @param position - The position (0 = 1st place, 1 = 2nd place, etc.)
 * @returns The point value for that position, or 0 if position is out of range
 */
export function getPointsForPosition(position: number): number {
	if (position < 0 || position >= VOTING_CONFIG.POINTS.length) {
		return 0;
	}
	return VOTING_CONFIG.POINTS[position];
}

/**
 * Validate that the vote count meets requirements
 * @param voteCount - Number of votes submitted
 * @returns true if valid, false otherwise
 */
export function isValidVoteCount(voteCount: number): boolean {
	return voteCount === VOTING_CONFIG.REQUIRED_VOTE_COUNT;
}

/**
 * Get all point values as an array
 * @returns Array of point values
 */
export function getAllPoints(): readonly number[] {
	return VOTING_CONFIG.POINTS;
}
