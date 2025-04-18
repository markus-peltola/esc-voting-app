export interface Event {
	id: string;
	title: string;
	year: number;
	active: boolean;
	created_at: string;
}

export interface User {
	id: string;
	username: string;
	created_at: string;
}

export interface Participant {
	id: string;
	country: string;
	artist: string;
	song: string;
	created_at: string;
}

export interface EventParticipant {
	id: string;
	event_id: string;
	participant_id: string;
	running_oderd: number;
	created_at: string;
}

export interface Vote {
	id: string;
	user_id: string;
	event_id: string;
	participant_id: string;
	points: number;
	created_at: string;
}

export interface ParticipantListItem {
	participant_id: string;
	running_order: number;
	participants: {
		song: string;
		artist: string;
		country: string;
	};
}

export interface VoteRecord {
	points: number;
	event: { title: string; year: number };
	participant: { country: string; artist: string; song: string };
}
