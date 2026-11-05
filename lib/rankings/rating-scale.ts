import { PostgresService } from '../database';
import { RatingScale } from '../shared';
import { getLatestSeason } from './snapshot';

const db = PostgresService.getInstance();

// The ends of the 0-100 composite rating: the lowest and highest final composite z-score of any team
// in a completed season. A final rating is the team's last row of the season (after the tournament),
// from the widest set of models that day. The season in progress never moves the ends, so a team can
// pass 100 this year and becomes the new 100 once next season starts.
let cache: { season: number; at: number; scale: Promise<RatingScale | null> } | null = null;
const REFRESH_MS = 12 * 60 * 60 * 1000;

export async function getRatingScale(): Promise<RatingScale | null> {
	const season = await getLatestSeason();
	if (cache && cache.season === season && Date.now() - cache.at < REFRESH_MS) return cache.scale;

	const scale = db
		.query<{ min: number | null; max: number | null }>(
			`WITH finals AS (
				SELECT season::int AS season, MAX(date) AS date FROM composite_rankings
				WHERE season::int < $1
				GROUP BY season::int
			),
			rows AS (
				SELECT c.avg_zscore,
					RANK() OVER (PARTITION BY c.season ORDER BY array_length(string_to_array(c.sources, ','), 1) DESC) AS widest
				FROM composite_rankings c
				JOIN finals f ON c.season::int = f.season AND c.date = f.date
			)
			SELECT MIN(avg_zscore) AS min, MAX(avg_zscore) AS max FROM rows WHERE widest = 1`,
			[season]
		)
		.then(([row]) => (row?.min != null && row.max != null && row.max > row.min ? { min: row.min, max: row.max } : null))
		.catch(e => {
			cache = null;
			console.error('Composite rating scale failed:', e);
			return null;
		});

	cache = { season, at: Date.now(), scale };
	return scale;
}
