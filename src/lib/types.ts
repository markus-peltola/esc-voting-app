export type CurrentRoundDetails = {
	round: number;
	users: {
		id: string;
		username: string;
	}[];
	currentTurn: {
		id: string;
		name: string;
	};
};

export interface FantasyEvent {
	id: string;
	title: string;
	active: boolean;
	draft_open: boolean;
	created_at: string;
}

export interface FantasyPrediction {
	id: string;
	event_id: string;
	user_id: string;
	participant_id: string;
	position: number;
	created_at: string;
}

export type FantasyParticipantListItem = Omit<ParticipantListItem, 'running_order'>;

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
