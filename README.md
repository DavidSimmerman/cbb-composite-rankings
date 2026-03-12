# CBB Composite Rankings

![CBB Composite Rankings](public/open-graph-image.png)

**Live at [cbbcomposite.com](https://cbbcomposite.com)**

Composite college basketball rankings combining data from KenPom, EvanMiya, BartTorvik, and NET. Rankings are normalized via z-scores and combined into a single composite ranking across all available sources.

## Features

- **Composite Rankings** - Z-score normalized rankings from 4 major rating sources
- **Team Profiles** - Detailed team pages with rating trends, stats, schedule, and season history
- **Scoreboard & Game Details** - Daily scores with side-by-side matchup comparisons
- **ML Predictions** - XGBoost win probability and score margin predictions with SHAP explanations
- **March Madness Analysis** - Style factor analysis, historical comps, seed-line ratings, and combined March Score for tournament teams
- **Bracket Prediction Tool** - Interactive bracket builder with intelligent auto-fill calibrated against 23 years of tournament data
- **Historical Data** - Rankings and stats going back to the 2002-03 season

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Database**: PostgreSQL
- **Scraping**: Playwright (BartTorvik, EvanMiya, NET), KenPom API
- **ML**: Python XGBoost models served via FastAPI
- **Deployment**: Docker Compose on Coolify

## Data Sources

| Source | Data | Available From |
|--------|------|----------------|
| KenPom | Efficiency ratings, tempo, luck, SOS | ~2002 |
| BartTorvik | Efficiency, shooting, experience metrics | ~2008 |
| EvanMiya | BPR, offensive/defensive ratings | ~2010 |
| NET | NCAA evaluation tool rankings | ~2019 |
| ESPN | 250+ team stats, game results, box scores | Varies |
| Bracket Matrix | Consensus projected tournament seedings | Current season |
| Tournament Games | NCAA bracket results (seeds, rounds, scores) | 2002-2025 |
