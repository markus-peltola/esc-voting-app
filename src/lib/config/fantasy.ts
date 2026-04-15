/**
 * Fantasy League Configuration
 *
 * These constants define the core rules for the fantasy league draft and scoring system.
 * Previously stored in the fantasy_rules database table, now in code for better maintainability.
 */

export const FANTASY_CONFIG = {
	/** Maximum number of picks one drafter can have (hard cap) */
	MAX_PICKS_PER_DRAFTER: 5,

	/** Base bonus points awarded for accurate position predictions */
	BASE_BONUS_POINTS: 50,

	/** Points deducted per position offset from prediction */
	POSITION_BONUS_REDUCTION: 10,

	/** Position value representing "Did Not Qualify" */
	DNQ_POSITION: 0,

	/** Minimum position value (1 = first place) */
	MIN_POSITION: 1,

	/** Maximum position value (typically 26 for Eurovision final) */
	MAX_POSITION: 25,

	/** Point multiplier for final contest points (currently not used, but kept for future) */
	POINT_MULTIPLIER: 1
} as const;

/**
 * Calculate fantasy points based on prediction accuracy
 *
 * Formula: finalPoints + Math.max(BASE_BONUS - (predictionOffset * REDUCTION), 0)
 *
 * @param finalPosition - The actual final position (0 = DNQ)
 * @param predictedPosition - The user's predicted position
 * @param finalPoints - The actual contest points earned
 * @returns Total fantasy points earned
 *
 * @example
 * // Perfect prediction
 * calculateFantasyPoints(1, 1, 300) // Returns 350 (300 + 50 bonus)
 *
 * @example
 * // Off by 1 position
 * calculateFantasyPoints(4, 5, 150) // Returns 190 (150 + 40 bonus)
 *
 * @example
 * // DNQ (Did Not Qualify)
 * calculateFantasyPoints(0, 5, 0) // Returns 0
 */
export function calculateFantasyPoints(
	finalPosition: number,
	predictedPosition: number,
	finalPoints: number
): number {
	// If the participant did not qualify, all points are 0
	if (finalPosition === FANTASY_CONFIG.DNQ_POSITION) {
		return 0;
	}

	// Calculate the prediction offset
	const predictionOffset = Math.abs(finalPosition - predictedPosition);

	// Calculate bonus points based on prediction accuracy
	const bonusPoints = Math.max(
		FANTASY_CONFIG.BASE_BONUS_POINTS - predictionOffset * FANTASY_CONFIG.POSITION_BONUS_REDUCTION,
		0
	);

	// Total points = contest points + prediction accuracy bonus
	return finalPoints + bonusPoints;
}

/**
 * Validate that a predicted position is within valid range
 * @param position - The position to validate
 * @returns true if valid, false otherwise
 */
export function isValidPosition(position: number): boolean {
	return position >= FANTASY_CONFIG.MIN_POSITION && position <= FANTASY_CONFIG.MAX_POSITION;
}

/**
 * Check if a position represents DNQ (Did Not Qualify)
 * @param position - The position to check
 * @returns true if DNQ, false otherwise
 */
export function isDNQ(position: number): boolean {
	return position === FANTASY_CONFIG.DNQ_POSITION;
}

/**
 * Format position for display (converts 0 to "DNQ")
 * @param position - The position value
 * @returns Formatted string representation
 */
export function formatPosition(position: number): string {
	return isDNQ(position) ? 'DNQ' : position.toString();
}

/**
 * Calculate maximum possible bonus points (perfect prediction)
 * @returns Maximum bonus points
 */
export function getMaxBonusPoints(): number {
	return FANTASY_CONFIG.BASE_BONUS_POINTS;
}

/**
 * Calculate minimum position offset for no bonus points
 * @returns Number of positions off where bonus becomes 0
 */
export function getZeroBonusThreshold(): number {
	return Math.ceil(FANTASY_CONFIG.BASE_BONUS_POINTS / FANTASY_CONFIG.POSITION_BONUS_REDUCTION);
}
