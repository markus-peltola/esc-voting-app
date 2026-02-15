/**
 * Results Aggregation Utilities
 *
 * This file contains the PRESERVED results aggregation logic from the original app.
 * The vote summing and sorting algorithm must be maintained exactly as it was.
 *
 * Original source: src/lib/results.ts (lines 25-65 in loadTableData function)
 */

export type ParticipantResult = {
	participantId: string;
	country: string;
	artist: string;
	song: string;
	points: number;
	flag?: string;
};

export type Vote = {
	participant_id: string;
	points: number;
	user_id?: string;
	event_id?: string;
};

/**
 * PRESERVED AGGREGATION LOGIC
 *
 * Calculate total points for a participant by summing all votes
 *
 * Original implementation (lines 56-60):
 * ```typescript
 * points: eventVotes
 *   .filter((ev) => ev.participant_id === participant.id)
 *   .reduce((acc, obj) => {
 *     return acc + obj.points;
 *   }, 0)
 * ```
 *
 * @param participantId - ID of the participant
 * @param votes - All votes for the event
 * @returns Total points
 */
export function calculateParticipantPoints(participantId: string, votes: Vote[]): number {
	return votes
		.filter((vote) => vote.participant_id === participantId)
		.reduce((acc, vote) => acc + vote.points, 0);
}

/**
 * PRESERVED SORTING LOGIC
 *
 * Sort results by points in descending order (highest points first)
 *
 * Original implementation (line 64):
 * ```typescript
 * return tableData.sort((a, b) => b.points - a.points);
 * ```
 *
 * @param results - Array of participant results
 * @returns Sorted array (descending by points)
 */
export function sortByPointsDescending(results: ParticipantResult[]): ParticipantResult[] {
	return [...results].sort((a, b) => b.points - a.points);
}

/**
 * Aggregate all votes for participants and calculate their total points
 *
 * @param participants - Array of participants with their info
 * @param votes - All votes for the event
 * @returns Array of results sorted by points (descending)
 */
export function aggregateResults(
	participants: Array<{
		id: string;
		country: string;
		artist: string;
		song: string;
		flag?: string;
	}>,
	votes: Vote[]
): ParticipantResult[] {
	const results: ParticipantResult[] = [];

	// PRESERVED LOGIC: Calculate points for each participant
	for (const participant of participants) {
		results.push({
			participantId: participant.id,
			country: participant.country,
			artist: participant.artist,
			song: participant.song,
			flag: participant.flag,
			points: calculateParticipantPoints(participant.id, votes)
		});
	}

	// PRESERVED LOGIC: Sort by points descending
	return sortByPointsDescending(results);
}

/**
 * Get the top N results
 *
 * @param results - Sorted results array
 * @param count - Number of top results to return
 * @returns Top N results
 */
export function getTopResults(results: ParticipantResult[], count: number): ParticipantResult[] {
	return results.slice(0, count);
}

/**
 * Get results ranking for a specific participant
 *
 * @param participantId - ID of the participant
 * @param results - Sorted results array (must be sorted by points descending)
 * @returns 1-based ranking (1 = first place)
 */
export function getParticipantRanking(
	participantId: string,
	results: ParticipantResult[]
): number | null {
	const index = results.findIndex((r) => r.participantId === participantId);
	return index === -1 ? null : index + 1; // 1-based ranking
}

/**
 * Calculate statistics for the results
 *
 * @param results - Array of participant results
 * @returns Statistics object
 */
export function calculateResultStatistics(results: ParticipantResult[]): {
	totalVotes: number;
	highestPoints: number;
	lowestPoints: number;
	averagePoints: number;
	totalParticipants: number;
} {
	if (results.length === 0) {
		return {
			totalVotes: 0,
			highestPoints: 0,
			lowestPoints: 0,
			averagePoints: 0,
			totalParticipants: 0
		};
	}

	const points = results.map((r) => r.points);
	const totalPoints = points.reduce((sum, p) => sum + p, 0);

	return {
		totalVotes: results.filter((r) => r.points > 0).length,
		highestPoints: Math.max(...points),
		lowestPoints: Math.min(...points),
		averagePoints: totalPoints / results.length,
		totalParticipants: results.length
	};
}

/**
 * Group results by point range for visualization
 *
 * @param results - Array of participant results
 * @param bucketSize - Size of each point range bucket
 * @returns Map of range string to count
 */
export function groupResultsByPointRange(
	results: ParticipantResult[],
	bucketSize: number = 50
): Map<string, number> {
	const buckets = new Map<string, number>();

	for (const result of results) {
		const bucketMin = Math.floor(result.points / bucketSize) * bucketSize;
		const bucketMax = bucketMin + bucketSize - 1;
		const bucketKey = `${bucketMin}-${bucketMax}`;

		buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
	}

	return buckets;
}

/**
 * Find participants with tied scores
 *
 * @param results - Sorted results array
 * @returns Array of arrays, each containing tied participants
 */
export function findTiedResults(results: ParticipantResult[]): ParticipantResult[][] {
	const ties: ParticipantResult[][] = [];
	const pointGroups = new Map<number, ParticipantResult[]>();

	// Group by points
	for (const result of results) {
		if (!pointGroups.has(result.points)) {
			pointGroups.set(result.points, []);
		}
		pointGroups.get(result.points)!.push(result);
	}

	// Find groups with more than one participant (ties)
	for (const group of pointGroups.values()) {
		if (group.length > 1) {
			ties.push(group);
		}
	}

	return ties;
}
