-- Allow users who are participants in a draft to update the draft turn state
-- Previously only admins could modify fantasy_drafts, which prevented
-- non-admin users from advancing the turn after making a pick.

-- Drop the overly restrictive admin-only policy for updates
DROP POLICY IF EXISTS "Only admins can modify fantasy drafts" ON fantasy_drafts;

-- Admins can do everything (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage fantasy drafts"
  ON fantasy_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Draft participants can update the turn state
CREATE POLICY "Draft participants can update turn state"
  ON fantasy_drafts FOR UPDATE
  USING (
    auth.uid() = ANY(turn_order)
  );
