/**
 * Fantasy League Scoring Utilities
 *
 * This file contains the PRESERVED fantasy scoring logic from the original app.
 * The scoring formula must be maintained exactly as it was.
 *
 * Original source: src/lib/fantasy.ts (lines 184-188 in getFantasyResults function)
 */

import { FANTASY_CONFIG, isDNQ, formatPosition } from '$lib/config/fantasy';

export type FantasyPoints = {
	finalPosition: number | string;
	finalPoints: number;
	totalPoints: number;
	predictionOffset?: number;
	bonusPoints?: number;
};

export type ScoringInput = {
	finalPosition: number;
	predictedPosition: number;
	finalPoints: number;
};

/**
 * PRESERVED SCORING FORMULA
 *
 * Calculate fantasy points based on prediction accuracy and contest results
 *
 * Original implementation (lines 184-188):
 * ```typescript
 * if (typeof finalPosition === 'number') {
 *   finalPoints = currentResult.points || 0;
 *   const predictionOffset = Math.abs(finalPosition - userPrediction.position);
 *   totalPoints = finalPoints + Math.max(50 - predictionOffset * 10, 0);
 * }
 * ```
 *
 * Formula breakdown:
 * - Base points = actual contest points earned
 * - Bonus points = 50 - (prediction offset × 10)
 * - Bonus points cannot go below 0
 * - Perfect prediction earns +50 bonus points
 * - Each position off reduces bonus by 10 points
 * - 5+ positions off earns 0 bonus points
 *
 * @param finalPosition - The actual final position (0 = DNQ)
 * @param predictedPosition - The user's predicted position
 * @param finalPoints - The actual contest points earned
 * @returns Complete fantasy points breakdown
 *
 * @example
 * // Perfect prediction
 * calculateFantasyPoints(1, 1, 300)
 * // Returns: { finalPosition: 1, finalPoints: 300, totalPoints: 350, predictionOffset: 0, bonusPoints: 50 }
 *
 * @example
 * // Off by 1 position
 * calculateFantasyPoints(4, 5, 150)
 * // Returns: { finalPosition: 4, finalPoints: 150, totalPoints: 190, predictionOffset: 1, bonusPoints: 40 }
 *
 * @example
 * // Off by 6 positions (no bonus)
 * calculateFantasyPoints(10, 4, 100)
 * // Returns: { finalPosition: 10, finalPoints: 100, totalPoints: 100, predictionOffset: 6, bonusPoints: 0 }
 *
 * @example
 * // DNQ (Did Not Qualify)
 * calculateFantasyPoints(0, 5, 0)
 * // Returns: { finalPosition: 'DNQ', finalPoints: 0, totalPoints: 0 }
 */
export function calculateFantasyPoints(
	finalPosition: number,
	predictedPosition: number,
	finalPoints: number
): FantasyPoints {
	// PRESERVED LOGIC: Position 0 means the participant did not qualify to the final
	// Original: if (currentResult.position === 0)
	if (finalPosition === FANTASY_CONFIG.DNQ_POSITION) {
		return {
			finalPosition: 'DNQ',
			finalPoints: 0,
			totalPoints: 0
		};
	}

	// PRESERVED LOGIC: Calculate prediction offset
	// Original: const predictionOffset = Math.abs(finalPosition - userPrediction.position);
	const predictionOffset = Math.abs(finalPosition - predictedPosition);

	// PRESERVED LOGIC: Calculate bonus points with floor of 0
	// Original: totalPoints = finalPoints + Math.max(50 - predictionOffset * 10, 0);
	const bonusPoints = Math.max(
		FANTASY_CONFIG.BASE_BONUS_POINTS - (predictionOffset * FANTASY_CONFIG.POSITION_BONUS_REDUCTION),
		0
	);

	const totalPoints = finalPoints + bonusPoints;

	return {
		finalPosition,
		finalPoints,
		totalPoints,
		predictionOffset,
		bonusPoints
	};
}

/**
 * Calculate fantasy results for multiple predictions
 *
 * @param predictions - Array of user predictions with participant info
 * @param finalResults - Map of participant ID to final result
 * @returns Map of participant ID to fantasy points
 */
export function calculateUserResults(
	predictions: Array<{
		participant_id: string;
		predicted_position: number;
	}>,
	finalResults: Map<string, { position: number; points: number }>
): Record<string, FantasyPoints> {
	const results: Record<string, FantasyPoints> = {};

	for (const prediction of predictions) {
		const finalResult = finalResults.get(prediction.participant_id);

		// If no result found for this participant, skip
		if (!finalResult) {
			continue;
		}

		// Calculate points using the preserved formula
		const points = calculateFantasyPoints(
			finalResult.position,
			prediction.predicted_position,
			finalResult.points
		);

		results[prediction.participant_id] = points;
	}

	return results;
}

/**
 * Calculate total points across all predictions
 *
 * @param fantasyPoints - Map of participant ID to fantasy points
 * @returns Sum of all total points
 */
export function calculateTotalScore(fantasyPoints: Record<string, FantasyPoints>): number {
	return Object.values(fantasyPoints).reduce((sum, points) => sum + points.totalPoints, 0);
}

/**
 * Get the maximum possible bonus points for a perfect prediction
 */
export function getMaxBonusPoints(): number {
	return FANTASY_CONFIG.BASE_BONUS_POINTS;
}

/**
 * Get the position offset threshold where bonus reaches 0
 */
export function getZeroBonusThreshold(): number {
	return Math.ceil(FANTASY_CONFIG.BASE_BONUS_POINTS / FANTASY_CONFIG.POSITION_BONUS_REDUCTION);
}

/**
 * Format fantasy points for display
 *
 * @param points - Fantasy points object
 * @returns Formatted string
 */
export function formatFantasyPoints(points: FantasyPoints): string {
	if (isDNQ(points.finalPosition as number)) {
		return 'DNQ - 0 pts';
	}

	return `Position ${points.finalPosition}: ${points.finalPoints} pts + ${points.bonusPoints} bonus = ${points.totalPoints} pts`;
}
