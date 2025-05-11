import type { QueryData } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { flags } from '$lib/flags';

const eventsQuery = supabase.from('events').select('*');

export type Events = QueryData<typeof eventsQuery>;
export type ResultTableData = {
	flag: string;
	country: string;
	artist: string;
	song: string;
	points: number;
}[];

export async function getEvents(): Promise<Events> {
	const response = await eventsQuery;
	if (response.data) {
		return response.data;
	} else {
		return [];
	}
}

export async function loadTableData(eventId: string): Promise<ResultTableData> {
	const tableData: ResultTableData = [];

	// Get all the participants that are in the requested event
	const { data: eventParticipants } = await supabase
		.from('event_participants')
		.select('*')
		.eq('event_id', eventId);
	if (!eventParticipants) return tableData;

	// Get the details of every participant
	const { data: participants } = await supabase
		.from('participants')
		.select('*')
		.in(
			'id',
			eventParticipants.map((ep) => ep.participant_id)
		);
	if (!participants) return tableData;

	// Get the votes of the events
	const { data: eventVotes } = await supabase.from('votes').select('*').eq('event_id', eventId);
	if (!eventVotes) return tableData;

	// Calculate the points for each participant
	for (const participant of participants) {
		tableData.push({
			flag: Object.values(flags).find((cc) => cc.name === participant.country)?.emoji || '',
			country: participant.country!,
			artist: participant.artist!,
			song: participant.song!,
			points: eventVotes
				.filter((ev) => ev.participant_id === participant.id)
				.reduce((acc, obj) => {
					return acc + obj.points;
				}, 0)
		});
	}

	return tableData.sort((a, b) => b.points - a.points);
}
