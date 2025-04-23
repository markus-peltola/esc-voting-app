export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					operationName?: string;
					query?: string;
					variables?: Json;
					extensions?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			event_participants: {
				Row: {
					created_at: string;
					event_id: string;
					id: string;
					participant_id: string;
					running_order: number | null;
				};
				Insert: {
					created_at?: string;
					event_id: string;
					id?: string;
					participant_id: string;
					running_order?: number | null;
				};
				Update: {
					created_at?: string;
					event_id?: string;
					id?: string;
					participant_id?: string;
					running_order?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'event_participants_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'event_participants_participant_id_fkey';
						columns: ['participant_id'];
						isOneToOne: false;
						referencedRelation: 'participants';
						referencedColumns: ['id'];
					}
				];
			};
			events: {
				Row: {
					active: boolean;
					created_at: string;
					id: string;
					title: string;
					year: number;
				};
				Insert: {
					active?: boolean;
					created_at?: string;
					id?: string;
					title: string;
					year: number;
				};
				Update: {
					active?: boolean;
					created_at?: string;
					id?: string;
					title?: string;
					year?: number;
				};
				Relationships: [];
			};
			fantasy_event_participants: {
				Row: {
					created_at: string;
					event_id: string;
					id: string;
					participant_id: string;
				};
				Insert: {
					created_at?: string;
					event_id: string;
					id?: string;
					participant_id: string;
				};
				Update: {
					created_at?: string;
					event_id?: string;
					id?: string;
					participant_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fantasy_event_participants_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'fantasy_events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fantasy_event_participants_participant_id_fkey';
						columns: ['participant_id'];
						isOneToOne: false;
						referencedRelation: 'participants';
						referencedColumns: ['id'];
					}
				];
			};
			fantasy_events: {
				Row: {
					active: boolean;
					created_at: string;
					current_turn: number;
					draft_open: boolean;
					forward_direction: boolean;
					id: string;
					round: number;
					title: string;
					turn_order: string[];
				};
				Insert: {
					active?: boolean;
					created_at?: string;
					current_turn?: number;
					draft_open?: boolean;
					forward_direction?: boolean;
					id?: string;
					round?: number;
					title: string;
					turn_order?: string[];
				};
				Update: {
					active?: boolean;
					created_at?: string;
					current_turn?: number;
					draft_open?: boolean;
					forward_direction?: boolean;
					id?: string;
					round?: number;
					title?: string;
					turn_order?: string[];
				};
				Relationships: [];
			};
			fantasy_predictions: {
				Row: {
					created_at: string;
					event_id: string;
					id: string;
					participant_id: string;
					position: number;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					event_id: string;
					id?: string;
					participant_id: string;
					position: number;
					user_id: string;
				};
				Update: {
					created_at?: string;
					event_id?: string;
					id?: string;
					participant_id?: string;
					position?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fantasy_predictions_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'fantasy_events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fantasy_predictions_participant_id_fkey';
						columns: ['participant_id'];
						isOneToOne: false;
						referencedRelation: 'participants';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fantasy_predictions_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'public_users';
						referencedColumns: ['id'];
					}
				];
			};
			fantasy_results: {
				Row: {
					created_at: string;
					event_id: string;
					id: string;
					participant_id: string;
					position: number;
				};
				Insert: {
					created_at?: string;
					event_id: string;
					id?: string;
					participant_id: string;
					position: number;
				};
				Update: {
					created_at?: string;
					event_id?: string;
					id?: string;
					participant_id?: string;
					position?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'fantasy_results_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'fantasy_events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fantasy_results_participant_id_fkey';
						columns: ['participant_id'];
						isOneToOne: false;
						referencedRelation: 'participants';
						referencedColumns: ['id'];
					}
				];
			};
			fantasy_rules: {
				Row: {
					id: string;
					point_multiplier: number;
					position_points: number;
					position_reduction: number;
					team_size: number;
				};
				Insert: {
					id?: string;
					point_multiplier: number;
					position_points: number;
					position_reduction: number;
					team_size: number;
				};
				Update: {
					id?: string;
					point_multiplier?: number;
					position_points?: number;
					position_reduction?: number;
					team_size?: number;
				};
				Relationships: [];
			};
			fantasy_users: {
				Row: {
					created_at: string;
					event_id: string;
					id: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					event_id: string;
					id?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					event_id?: string;
					id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'fantasy_users_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'fantasy_events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'fantasy_users_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'public_users';
						referencedColumns: ['id'];
					}
				];
			};
			participants: {
				Row: {
					artist: string | null;
					country: string | null;
					created_at: string;
					id: string;
					song: string | null;
				};
				Insert: {
					artist?: string | null;
					country?: string | null;
					created_at?: string;
					id?: string;
					song?: string | null;
				};
				Update: {
					artist?: string | null;
					country?: string | null;
					created_at?: string;
					id?: string;
					song?: string | null;
				};
				Relationships: [];
			};
			public_users: {
				Row: {
					created_at: string;
					id: string;
					username: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					username: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					username?: string;
				};
				Relationships: [];
			};
			votes: {
				Row: {
					created_at: string;
					event_id: string | null;
					id: string;
					participant_id: string | null;
					points: number;
					user_id: string | null;
				};
				Insert: {
					created_at?: string;
					event_id?: string | null;
					id?: string;
					participant_id?: string | null;
					points: number;
					user_id?: string | null;
				};
				Update: {
					created_at?: string;
					event_id?: string | null;
					id?: string;
					participant_id?: string | null;
					points?: number;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'votes_event_id_fkey';
						columns: ['event_id'];
						isOneToOne: false;
						referencedRelation: 'events';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'votes_participant_id_fkey';
						columns: ['participant_id'];
						isOneToOne: false;
						referencedRelation: 'participants';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'votes_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'public_users';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
	? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {}
	},
	public: {
		Enums: {}
	}
} as const;
