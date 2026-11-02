-- Betting lines and frozen pre-game predictions for the scoreboard and game pages.
-- Safe to run more than once. The app treats both tables as empty until this has been run.

-- One line per game. home_spread is the home team's spread: negative = home favored
-- (FLA -2.5 at home is -2.5). Upcoming games hold the current line, finished games the closing line.
CREATE TABLE IF NOT EXISTS game_lines (
	game_id text PRIMARY KEY,
	home_spread numeric,
	over_under numeric,
	source text,
	updated_at timestamptz DEFAULT now()
);

-- The model's prediction as it stood before tip-off. Written while the game has not started and
-- never touched after, so finished games show what the model said beforehand.
-- spread uses the same convention as game_lines.home_spread (negative = home favored);
-- keys holds the ML "keys to the game" as { "home": [...], "away": [...] }.
CREATE TABLE IF NOT EXISTS game_predictions (
	game_id text PRIMARY KEY,
	home_win_prob numeric,
	home_score numeric,
	away_score numeric,
	spread numeric,
	total numeric,
	model_version text,
	keys jsonb,
	created_at timestamptz DEFAULT now()
);
