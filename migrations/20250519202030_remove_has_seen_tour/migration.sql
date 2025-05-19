-- Drop the has_seen_tour column from user_preferences table
ALTER TABLE user_preferences DROP COLUMN IF EXISTS has_seen_tour;