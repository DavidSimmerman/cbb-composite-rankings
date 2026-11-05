-- Composite offense and defense as KenPom-style efficiency per 70 possessions (lib/shared.ts toPer70): each
-- averaged z-score is put back on KenPom's scale for that day (its average and spread across all teams),
-- then scaled from 100 possessions to 70. Offense is points scored; defense is points allowed, so a better
-- defense has a lower number. The overall rating is shown 0-100 and worked out when read
-- (lib/rankings/rating-scale.ts). The z-scores and ranks are unchanged; ML and March analysis use them.

ALTER TABLE composite_rankings
	ADD COLUMN IF NOT EXISTS per70_offensive_rating numeric,
	ADD COLUMN IF NOT EXISTS per70_defensive_rating numeric;

WITH kp AS (
	SELECT date,
		avg(offensive_rating) AS o_mean, stddev_pop(offensive_rating) AS o_sd,
		avg(defensive_rating) AS d_mean, stddev_pop(defensive_rating) AS d_sd
	FROM kenpom_rankings
	GROUP BY date
),
-- Each composite date uses KenPom's numbers from that day, or the latest day before it
scale AS (
	SELECT d.date, s.o_mean, s.o_sd, s.d_mean, s.d_sd
	FROM (SELECT DISTINCT date FROM composite_rankings) d
	CROSS JOIN LATERAL (SELECT * FROM kp WHERE kp.date <= d.date ORDER BY kp.date DESC LIMIT 1) s
)
UPDATE composite_rankings c SET
	per70_offensive_rating = round((s.o_mean + c.avg_offensive_zscore * s.o_sd) * 0.7, 2),
	per70_defensive_rating = round((s.d_mean - c.avg_defensive_zscore * s.d_sd) * 0.7, 2)
FROM scale s
WHERE s.date = c.date;
