-- ESC Voting & Fantasy League - Refactored Database Schema
-- This migration creates the new, cleaned-up database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Replaces public_users, now integrates with Supabase Auth
-- ============================================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for username lookups
CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================================================
-- EVENTS TABLE
-- Unified for both voting and fantasy events
-- ============================================================================
CREATE TYPE event_type AS ENUM ('voting', 'fantasy');
CREATE TYPE event_status AS ENUM ('upcoming', 'active', 'closed');

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  type event_type NOT NULL,
  status event_status DEFAULT 'upcoming' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for active events queries
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(type);

-- ============================================================================
-- PARTICIPANTS TABLE
-- Eurovision songs/entries
-- ============================================================================
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country TEXT NOT NULL,
  artist TEXT NOT NULL,
  song TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for country lookups
CREATE INDEX idx_participants_country ON participants(country);

-- ============================================================================
-- EVENT_PARTICIPANTS TABLE
-- Links events to participants (unified for both voting and fantasy)
-- ============================================================================
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  running_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, participant_id)
);

-- Indexes for lookups
CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_participant ON event_participants(participant_id);

-- ============================================================================
-- VOTES TABLE
-- User votes for events
-- ============================================================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points >= 1 AND points <= 12),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_votes_user_event ON votes(user_id, event_id);
CREATE INDEX idx_votes_event_participant ON votes(event_id, participant_id);

-- ============================================================================
-- FANTASY_DRAFTS TABLE
-- Manages fantasy league draft state (replaces fantasy_events)
-- ============================================================================
CREATE TYPE draft_status AS ENUM ('pending', 'open', 'closed');

CREATE TABLE fantasy_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  turn_order UUID[] NOT NULL DEFAULT '{}',
  current_turn_index INTEGER DEFAULT 0 NOT NULL,
  current_round INTEGER DEFAULT 1 NOT NULL,
  is_forward BOOLEAN DEFAULT TRUE NOT NULL,
  status draft_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for event lookups
CREATE INDEX idx_fantasy_drafts_event ON fantasy_drafts(event_id);
CREATE INDEX idx_fantasy_drafts_status ON fantasy_drafts(status);

-- ============================================================================
-- FANTASY_PREDICTIONS TABLE
-- User picks in fantasy draft
-- ============================================================================
CREATE TABLE fantasy_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  predicted_position INTEGER NOT NULL CHECK (predicted_position >= 1 AND predicted_position <= 26),
  pick_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, event_id, participant_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_fantasy_predictions_user_event ON fantasy_predictions(user_id, event_id);
CREATE INDEX idx_fantasy_predictions_event_participant ON fantasy_predictions(event_id, participant_id);

-- ============================================================================
-- FANTASY_RESULTS TABLE
-- Final results for fantasy scoring
-- ============================================================================
CREATE TABLE fantasy_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  final_position INTEGER NOT NULL CHECK (final_position >= 0 AND final_position <= 26),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, participant_id)
);

-- Indexes for lookups
CREATE INDEX idx_fantasy_results_event ON fantasy_results(event_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_results ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Events: Everyone can read, only admins can modify
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Participants: Everyone can read, only admins can modify
CREATE POLICY "Participants are viewable by everyone"
  ON participants FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify participants"
  ON participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Event Participants: Everyone can read, only admins can modify
CREATE POLICY "Event participants are viewable by everyone"
  ON event_participants FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify event participants"
  ON event_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Votes: Users can read all votes, but only manage their own
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own votes"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- Fantasy Drafts: Everyone can read, only admins can modify
CREATE POLICY "Fantasy drafts are viewable by everyone"
  ON fantasy_drafts FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify fantasy drafts"
  ON fantasy_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Fantasy Predictions: Users can read all predictions, but only manage their own
CREATE POLICY "Fantasy predictions are viewable by everyone"
  ON fantasy_predictions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own predictions"
  ON fantasy_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
  ON fantasy_predictions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions"
  ON fantasy_predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Fantasy Results: Everyone can read, only admins can modify
CREATE POLICY "Fantasy results are viewable by everyone"
  ON fantasy_results FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify fantasy results"
  ON fantasy_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fantasy_drafts_updated_at
  BEFORE UPDATE ON fantasy_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signups (creates profile automatically)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE events IS 'Eurovision events (both voting and fantasy)';
COMMENT ON TABLE participants IS 'Eurovision songs/entries';
COMMENT ON TABLE event_participants IS 'Links participants to events with running order';
COMMENT ON TABLE votes IS 'User votes with points (12, 10, 8, ...)';
COMMENT ON TABLE fantasy_drafts IS 'Fantasy league draft state management';
COMMENT ON TABLE fantasy_predictions IS 'User predictions in fantasy league';
COMMENT ON TABLE fantasy_results IS 'Final results for fantasy scoring';

COMMENT ON COLUMN fantasy_results.final_position IS '0 = DNQ (Did Not Qualify), 1-26 = final position';
COMMENT ON COLUMN fantasy_predictions.predicted_position IS 'User predicted position (1-26)';
COMMENT ON COLUMN votes.points IS 'Points awarded (12, 10, 8, 7, 6, 5, 4, 3, 2, 1)';
