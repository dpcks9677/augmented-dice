CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  nickname TEXT NOT NULL DEFAULT 'Player',
  avatar_url TEXT,
  normal_rating INTEGER NOT NULL DEFAULT 500,
  normal_games INTEGER NOT NULL DEFAULT 0,
  augmented_rating INTEGER NOT NULL DEFAULT 500,
  augmented_games INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('normal', 'augmented')),
  player_a_uid TEXT NOT NULL,
  player_b_uid TEXT NOT NULL,
  outcome TEXT NOT NULL,
  settled_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS matches_player_a_idx ON matches(player_a_uid);
CREATE INDEX IF NOT EXISTS matches_player_b_idx ON matches(player_b_uid);
