# CBB Composite Rankings

## Git
- When creating git commits, always use: `--author="David Simmerman <davidsimmermancs@gmail.com>"`

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Database**: PostgreSQL (DATABASE_URL in .env, host 192.168.1.56:3120)
- **Scraping**: Playwright for BartTorvik/EvanMiya/NET, node-cron for scheduling
- **ML**: Python XGBoost models served via FastAPI (port 8100)
- **Deployment**: Docker Compose on Coolify with external `coolify` network

## Project Structure
```
app/
  page.tsx                    # Rankings table (home page)
  [teamKey]/                  # Team profile pages
    page.tsx                  # Server component, fetches profile data
    components/
      TeamProfileBanner.tsx   # Team header with logo, record, colors
      TeamCharts.tsx          # Rating trend line charts (Recharts)
      TeamStats.tsx           # Full stats table
      TeamSchedule.tsx        # Schedule with game results
      TeamHistory.tsx         # Season history bar charts (dynamic import, client-only)
      MarchProfile.tsx        # March tournament analysis (hidden if avg_seed is null, dynamic import)
      BottomSection.tsx       # Stacks TeamHistory + MarchProfile vertically
  games/
    page.tsx                  # Scoreboard
    [gameId]/
      page.tsx                # Game detail page
      components/
        MatchupComparison.tsx # Side-by-side team comparison
        GamePrediction.tsx    # ML prediction display
        SimilarGames.tsx      # Similar historical games (dynamic import, client-only)
  bracket/
    layout.tsx                # Server layout, fetches BracketPageData
    page.tsx                  # Bracket prediction tool (server component)
    context/
      BracketContext.tsx      # Bracket state, localStorage persistence, prediction caching, auto-fill handlers
    components/
      BracketClient.tsx       # Main bracket UI, toolbar, auto-fill orchestration
      BracketLayoutClient.tsx # Client wrapper, dynamically imports BracketProvider (no SSR)
      BracketPageClient.tsx   # Client wrapper for bracket page
      BracketView.tsx         # Desktop bracket tree visualization
      RoundView.tsx           # Mobile round-by-round view
      MatchupCard.tsx         # Individual game card with teams, seeds, scores
      WarningBadge.tsx        # Yellow/red warning indicators for unlikely picks
      EvaluationPanel.tsx     # Bracket realism score display with findings
    [gameId]/
      page.tsx                # Game preview page (matchup banner, predictions, stats)
      components/
        BracketGamePrediction.tsx   # ML prediction wrapper for bracket games
        BracketTeamComparison.tsx   # Side-by-side ratings comparison
        BracketSimilarOpponents.tsx # Similar opponent history
        SeedMatchupStats.tsx        # Historical seed vs seed win rates
        BracketImpact.tsx           # Seed pick tracking, next opponent, path to title
  context/
    RankingsContext.tsx        # Global rankings data
    TeamProfileContext.tsx     # Team profile data provider
    CookieContext.tsx          # Cookie-based persistent state (useCookie hook)
  march/
    page.tsx                  # March Madness analysis tool (server component)
    components/
      MarchPageClient.tsx     # Client wrapper, renders TournamentTeams
      TournamentTeams.tsx     # Team list + detail panel with March profile cards
      FactorExplorer.tsx      # Factor × Tier matrix visualization
    factors/
      page.tsx                # Dedicated style factors route (/march/factors)
  api/
    games/predict/route.ts    # Proxies to FastAPI ML server (general game predictions)
    games/similar/route.ts    # Similar opponent finder (returns categorized game lists)
    teams/ratings/route.ts    # Team ratings lookup across all sources
    bracket/predict/route.ts  # Proxies to FastAPI tournament-specific predictions
components/
  ui/                         # shadcn/ui components (Radix-based)
  Header.tsx                  # Global header with search
  games/
    SimilarOpponents.tsx      # Shared similar-opponent game cards (used by game detail + bracket preview)
  march/
    MarchCards.tsx             # Shared March profile cards (SeedLineCard, SimilarTeamsCard, StyleFactorsCard)
    MarchScoreBadge.tsx        # Score badge + getMarchScoreColor() color gradient
lib/
  rankings/
    profile.ts                # getTeamProfile(), getSeasonSnapshots(), getMarchPageData(), getBracketPageData()
  bracket/
    predictions.ts            # Auto-fill algorithm: initializeBracket(), autoFillBracket(), computeBlendedProbability()
    evaluation.ts             # Bracket realism scoring (0-100), style tiers, finding severity levels
    warnings.ts               # Warning system for unlikely bracket picks
  espn/
    espn-stats.ts             # EspnStats interface (250+ columns)
    espn-team-ids.ts          # ESPN ID to team_key mapping
scripts/
  scrape-tournament.ts        # Scrapes ESPN bracket + fetches games, saves to tournament_games + espn_games
  simulate-brackets.ts        # Bracket simulation: runs N auto-fills, compares to historical benchmarks
  simulate-historical.ts      # Multi-season validation: loads past tournament fields (2015-2024), runs sims per year
ml/
  training/train.py           # XGBoost game prediction model training
  training/train_tournament.py # Tournament-specific XGBoost model (21 features, 944 games 2010-2025)
  training/backtest.py        # Walk-forward CV
  training/feature_selection.py
  inference/server.py         # FastAPI with auto-training on startup, daily retrain at 5 AM
  inference/predict.py        # Game prediction + SHAP explanations
  inference/predict_tournament.py # Tournament-specific prediction endpoint
  models/                     # Saved .joblib model artifacts
```

## Database

### Tables
- `kenpom_rankings` - KenPom data (date DATE, season INT, has data back to ~2002)
- `barttorvik_rankings` - BartTorvik data (date DATE, season INT, starts ~season 8)
- `evanmiya_rankings` - EvanMiya data (date DATE, season INT, starts ~season 10)
- `net_rankings` - NET rankings (no season column)
- `composite_rankings` - Z-score composites across sources
  - `sources` column: comma-separated like 'kp,em,bt,net' (varies by season/availability)
  - Older seasons have fewer sources (no NET, no BT before season 8, no EM before season 10)
  - Use `ORDER BY array_length(string_to_array(sources, ','), 1) DESC` to get best composite
- `espn_stats` - ESPN team stats (250+ columns, joins on `season` not `date`)
  - Opponent stats (opp_off_*) only available from ~2014-15 season onward
- `espn_games` - Game data (date is TEXT type, not DATE - need ::date cast in joins)
- `tournament_games` - NCAA tournament bracket data (game_id PK → espn_games, season, region, round, team_a_key/team_b_key, team_a_seed/team_b_seed)
  - Data from 2002-2025 (no 2020), 63 games/season pre-2011, 67 after (First Four)
  - Regions: SOUTH, EAST, WEST, MIDWEST, Final Four, First Four
  - Rounds: First Four, Round of 64, Round of 32, Sweet 16, Elite 8, Final Four, Championship
- `ap_rankings` - AP poll rankings
- `team_data` - Team metadata (colors, logos, conference)

### Column Quirks
- BartTorvik columns starting with numbers need quoting: `b."3p_pct"`, `b."2p_pct"`
- `espn_games.date` is TEXT, rating tables use DATE - need explicit `::date` cast in joins
- `espn_games` columns: game_id, season, date, status, home_team_key, away_team_key, home_score, away_score, home_won, away_won, home_stats, away_stats
- `espn_stats` has no date column - one row per team per season
- `team_data` columns: team_key, name (not team_name), abbreviation, color, secondary_color, espn_id, school, mascot, nickname, short_name

## UI Patterns
- Card style: `border border-neutral-800 rounded-lg p-3 md:p-4`
- Team colors: `#${metadata.color}`, `#${metadata.secondary_color}`
- Rank color tiers: Top 10 (dark green #16a34a), 11-25 (light green #86efac), 26-100 (yellow #fbbf24), 101-200 (orange #f97316), 200+ (red #ef4444)
- Mobile away/home toggle pattern used in MatchupComparison, GamePrediction
- `useCookie` hook for persistent UI state (view modes, selected stats)
- Page layout: `h-dvh flex flex-col` with `flex-1 min-h-0 overflow-auto` content area

## Recharts / Hydration
- Recharts generates auto-incrementing clipPath IDs that differ between SSR and client
- **Always use `dynamic(() => import(...), { ssr: false })` for Recharts components**
- TeamHistory and SimilarGames both use this pattern
- Radix UI (shadcn) also has ID mismatches - `suppressHydrationWarning` on DropdownMenuTrigger
- For date-dependent renders, use `suppressHydrationWarning` on the element

## Season History (TeamHistory.tsx)
- Bar chart showing stats across past seasons with horizontal scroll
- Stat groups: Rankings (composite), Efficiency (KenPom + ESPN), Shooting (ESPN + BartTorvik), Other (KenPom tempo + ESPN)
- Rank mode: 50/50 blend of absolute (vs 363 teams) and relative (vs own seasons)
- Stat mode: relative positioning with 40% floor, `lowerBetter` flag flips direction
- Filters out seasons with null data for the selected stat
- Scrolls to rightmost (most recent) on mount via callback ref
- Data from `getSeasonSnapshots()` in `lib/rankings/profile.ts` using LEFT JOIN LATERAL for composites

## March Tournament Analysis System
- **Style Factors**: 18 factors (3pt rate, FT rate, turnover rate, defense, tempo, rebound rate, 3pt defense, TO margin, EFG% — each high/low)
- Tier-based system: top-N / bottom-N in country (tiers: 5, 10, 15, 25, 35, 50, 75, 100)
- `computeWinsAboveSeed()` measures actual tournament wins minus seed baseline
- Percentile scoring (0-100) using global min/max across all factor cells
- **March Score**: `styleScore * 0.4 + compsScore * 0.3 + ratingScore * 0.3`
- **SeasonRankMaps**: Computed per-season rankings for stats without DB rank columns (defense, tempo, 3pt defense, TO margin, EFG%)
- **Historical Comps**: Similar teams by rating/style matched to tournament outcomes
- Color gradient: oklch-based, 0-30 red → 45-55 grey → 70+ green (getMarchScoreColor)
- Data flows: `getMarchPageData()` → `MarchPageData` → `MarchPageClient` → `TournamentTeams` / `FactorExplorer`
- Factor explorer at `/march/factors` (dedicated route), linked from both `/march` and team profile pages

## ML Prediction System
- Two XGBoost models: win probability (classifier) + score margin (regressor)
- 25 matchup-differential features from all rating sources
- SHAP-based "keys to the game" explanations
- Auto-trains on startup if no models found, daily retrain at 5 AM via APScheduler
- FastAPI on port 8100, proxied through Next.js API route at `/api/games/predict`
- Venv at `ml/venv/`, models saved to `ml/models/`
- Tournament-specific model: 21 features, trained on 944 tournament games (2010-2025), endpoint at `/predict/tournament`

## Bracket Prediction System
- Route: `/bracket` with desktop bracket tree (`BracketView`) + mobile round-by-round (`RoundView`)
- Uses Bracket Matrix projected seedings, randomly assigns to 4 regions
- State managed in `BracketContext` with localStorage persistence (region assignments + picks)
- Initialization + pick restoration in `useState` lazy initializer (avoids useEffect race conditions)
- ML predictions fetched and cached per-matchup, merged into state for auto-fill
- Game preview at `/bracket/[gameId]` with matchup banner, predictions, seed stats, similar opponents, bracket impact
- UI uses shadcn `DropdownMenu` for all auto-fill menus (toolbar, per-round)

### Auto-Fill UI
- **Toolbar dropdown**: "Auto-fill" button with two options — Simulate and Perfect My Bracket
- **Round-level auto-fill**: Desktop shows "Auto-fill" buttons above each round column (SOUTH/WEST regions only); mobile shows "Auto-fill round" bar between round tabs and games. Both use shadcn DropdownMenu with same Simulate/Perfect options scoped to that round
- **Simulate** (`autoFillBracket`): Randomized bracket using ML predictions, team ratings, and historical seed patterns. Supports `options?: { round?: number }` for round-scoping
- **Perfect My Bracket** (`perfectBracket`): Generates 20 auto-fill candidates, picks highest realism score, then hill-climbs by flipping non-manual games. Supports `options?: { round?: number }`. Evaluator passed as callback to avoid circular dependency with `evaluation.ts`
- No per-game or per-region auto-fill buttons — only whole-bracket and per-round

### Auto-Fill Algorithm (`lib/bracket/predictions.ts`)
- **6-phase round-by-round process**: Phase 1 (target upsets per seed group), Phase 2 (assign upsets by scoring), Phase 3 (double-digit seed cap), Phase 3.5 (minimum upset floor), Phase 4 (warning avoidance), Apply
- **Blended probability**: ML 40% + seed history 30% + march diff 20% + viability 10% (fallback without ML: seed 45% + march 40% + viability 15%), then 25% regression toward 0.5
- **Single-game path** (S16+): Uses unconditional rate ratios with gap-scaled round calibration and deep-run penalty
- **Multi-game path** (R64/R32): Uses `crossSeedPatterns` distributions (per-seed wins-per-year stats) sampled via Gaussian
- **Tournament viability**: Sigmoid on weighted comps (45%) + style (30%) + rating (25%) scores
- **Conditional win rates**: `P(win round R | reached R)` with sample-size shrinkage toward 0.45 prior (weight = sampleAtStage / (sampleAtStage + 20))
- **Deep-run penalty**: Seeds 7-9 get 0.70x per round above avg depth; seeds 10+ get 0.60x with hard caps from `SEED_MAX_DEPTH_EVER`
- **Hard caps**: 16-over-1 upset rate forced to 0%; 15-over-2 capped at 2.5%
- **Phase 4 warning thresholds**: R64/R32 use unconditional rate < 5% (red); S16+ use conditional rate < 10% (to avoid blocking plausible deep-run upsets)
- **Chaos tracking**: Cumulative score from seed-diff >= 5 upsets; bias only at extreme levels (>7: -0.02, >10: -0.05)
- **Minimum upset floors**: R64 >= 5, R32 >= 3, S16 >= 1

### Evaluation System (`lib/bracket/evaluation.ts`)
- **Realism score**: 100 minus accumulated penalties for unlikely picks
- **Bracket style tiers**: 97+ "This Is the One", 90+ "Almost Perfect", 75+ "Mostly Realistic", 55+ "Bold Picks", 30+ "Chaos Bracket", <30 "March Madness Fantasy"
- Penalties for: deep runs by low seeds, double-digit seed advances, upset group frequency, chalk bracket (no upsets)

### Warning System (`lib/bracket/warnings.ts`)
- Per-game warnings: yellow (< 20% historical) and red (< 5% historical) based on seed win rates
- Cross-bracket pattern warnings for unprecedented seed-round combinations

### Simulation Scripts
- `scripts/simulate-brackets.ts`: Runs N sims with current year's team pool, outputs per-bracket details and aggregate stats vs historical benchmarks
- `scripts/simulate-historical.ts`: Loads actual tournament fields from 2015-2024, approximates march scores from DB data, runs 50 sims per season for cross-year validation
- Run with: `DATABASE_URL="..." npx tsx scripts/simulate-brackets.ts`

## Docker / Deployment
- `docker-compose.yml` with `web` (Next.js) and `ml` (FastAPI) services
- External `coolify` network for database connectivity on Coolify
- `ML_API_URL=http://ml:8100` env var connects web to ML service
