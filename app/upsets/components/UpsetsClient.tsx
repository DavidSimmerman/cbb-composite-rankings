'use client';

import type { MarchPageData, BracketPageData, BracketTeamSummary } from '@/lib/rankings/profile';
import TeamLogo from '@/components/TeamLogo';
import { MarchScoreBadge } from '@/components/march/MarchScoreBadge';
import Link from 'next/link';
import { TrendingUp, Flame, Target } from 'lucide-react';

const R64_MATCHUP_ORDER: [number, number][] = [
	[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
];

const SEED_WIN_RATES: Record<number, number> = {
	10: 34.7, 11: 34.7, 12: 37.0, 13: 19.6, 14: 10.3, 15: 7.3, 16: 1.6,
};

interface UpsetAnalysis {
	upsetCase: string;
	cinderellaCase: string;
}

const UPSET_ANALYSES: Record<string, UpsetAnalysis> = {
	// 10 seeds
	vcu: {
		upsetCase: "This is the most lopsided \"upset\" in the bracket. North Carolina's March Score is a dismal 36 — tied with VCU and terrible for a 6-seed. The Rams are ranked #45 vs UNC at #34, a gap of just 11 spots. VCU's style profile emphasizes low turnovers and high 3-point shooting, both proven tournament traits. UNC's historical comps are littered with first-round exits, and the Tar Heels' defensive ranking (#37) doesn't inspire confidence against VCU's offense.",
		cinderellaCase: "VCU's comps are weak for a deep run — Oklahoma 2025 and Marquette 2019 both exited in the first round. None of the top-5 comps reached the Sweet 16. But the program made the Final Four as an 11-seed in 2011, so VCU knows what it takes. The style factors are all neutral rather than positive, which limits the ceiling. A Sweet 16 would require winning two games against likely 3- and 2-seeds — possible if UNC falls, but not a profile built for a run.",
	},
	santa_clara: {
		upsetCase: "Santa Clara is the most underseeded team in the tournament. At #33 overall with the #18 offense in the country, they're an implied 7-seed stuck playing as a 10. Their 85th-percentile rating for a 10-seed means they're significantly better than the typical double-digit seed. The Broncos shoot a lot of threes (a positive tournament factor) and play at a high tempo that can rattle opponents. Kentucky (#27) is only 6 ranking spots ahead — this is a virtual toss-up.",
		cinderellaCase: "Syracuse 2021 (70% match) reached the Sweet 16 as an 11-seed, and Alabama 2022 (72% match) was a 6-seed that made the Sweet 16 — both had Santa Clara's high-tempo, 3-point-heavy DNA. With the #18 offense in the country, the Broncos have genuine Sweet 16 firepower. If they beat Kentucky and draw a beatable 2-seed, this is one of the few double-digit seeds with the offensive ceiling to go on a legitimate run.",
	},
	texas_am: {
		upsetCase: "Texas A&M brings two of the most important tournament style factors: a high 3-point rate and low turnovers, both graded as positive. The Aggies are ranked #42 overall with balanced offense (#43) and defense (#42). At the 70th percentile for a 10-seed, they're clearly better than their seeding suggests. Saint Mary's (#24) has elite defense (#19) but a mediocre offense (#44) — A&M's 3-point volume can crack defensive teams that rely on limiting possessions.",
		cinderellaCase: "The comp that jumps off the page is Florida Atlantic 2023 (70% match) — a mid-major 9-seed that rode a balanced profile all the way to the Final Four. FAU had A&M's same DNA: efficient 3-point shooting paired with ball security. Creighton 2021 (70% match) reached the Sweet 16 as a 5-seed. Two positive style factors (high 3pt rate + low turnovers) is a rare combination among double-digit seeds and exactly what fuels deep March runs.",
	},
	missouri: {
		upsetCase: "Missouri's historical comps tell the story: Oregon State 2021 is an 88% match, and that Beavers team was a 12-seed that reached the Elite Eight. The Tigers' comps score is a perfect 100, the highest of any double-digit seed. Missouri (#50) faces Miami (#29), whose mediocre March Score of 50 suggests they're a classic underperforming favorite. The gap in overall ranking is just 21 spots, well within upset range for a 10-seed that wins 35% of these games historically.",
		cinderellaCase: "Oregon State 2021 made the Elite Eight as a 12-seed with an 88% comp match — the highest-similarity deep-run comp of any double-digit seed in the bracket. That Beavers team had Mizzou's same physical, rebounding-heavy identity and rode it through four games. Missouri's comps score of 100 means historically, teams with this profile don't just win one game — they keep winning. If the Tigers get past Miami, a Sweet 16 appearance is well within the range of outcomes.",
	},
	ucf: {
		upsetCase: "UCF's offensive ranking (#46) is strong for a 10-seed, and the Knights play a physical, up-tempo style with high rebounding. UCLA (#26) is clearly the better team on paper, but UCF's top comp USC 2017 (86% match) was an 11-seed that made the Sweet 16. The Knights' high tempo can force UCLA into an uncomfortable pace, and their physicality on the boards could create second-chance opportunities that neutralize the talent gap.",
		cinderellaCase: "USC 2017 (86% match) reached the Sweet 16 as an 11-seed — that's the ceiling comp. But UCF's 6th-percentile rating for a 10-seed is a red flag for a deep run. Most of the top comps (UAB 2022, NC State 2023, San Francisco 2022) were one-and-done. The Knights could pull the first-round upset, but the profile doesn't support a Sweet 16 run. They'd need their offense to dramatically overperform their season-long numbers.",
	},

	// 11 seeds
	south_florida: {
		upsetCase: "South Florida (#47) draws the short straw facing Louisville (#19), one of the strongest 6-seeds in the bracket with a March Score of 90. The talent gap is massive. However, USF's defensive ranking (#38) is elite for an 11-seed and could slow Louisville's attack. The Bulls play at a high tempo and get to the free-throw line — if they can force turnovers and survive in transition, 11-seeds win 35% of these games.",
		cinderellaCase: "Not happening. USF's comps score of just 6 is the worst of any 11-seed — every single top comp (Marquette 2022, College of Charleston 2023, Illinois 2023, San Francisco 2022) lost in the first round. Zero Sweet 16 comps in the profile. Even if USF somehow beats Louisville, there's no historical basis to expect them to win a second game. This is a first-round-or-bust team.",
	},
	nc_state: {
		upsetCase: "If NC State wins the First Four against Texas, they'll enter the Round of 64 as a battle-tested 11-seed. The Wolfpack are ranked #36 overall with the #23 offense in the country, making them arguably a top-40 team stuck in a play-in game. Their style profile includes low turnovers and high 3-point shooting — both tournament-friendly traits. Their top comp is Syracuse 2021 (75% match), an 11-seed that reached the Sweet 16.",
		cinderellaCase: "NC State reached the Final Four as an 11-seed in 2024 — one of the most improbable Cinderella runs in modern tournament history. Syracuse 2021 (75% match) reached the Sweet 16 as an 11-seed with a similar profile. The Wolfpack's #23 offense is elite enough to win multiple games, and the program's recent tournament DNA is real. If they survive the First Four and the first round, a Sweet 16 is genuinely plausible.",
	},
	texas: {
		upsetCase: "Texas is a first-round upset waiting to happen — if they survive the First Four. The Longhorns are ranked #40 overall with the #15 offense in the country, a top-tier unit for any seed line. Their comp profile is loaded: Saint Mary's 2010 (85% match, 10-seed, Sweet 16), Miami (Fla.) 2022 (78% match, 10-seed, Elite Eight). Texas's physical rebounding, free-throw shooting, and low turnovers make them a tough out in a single-elimination format.",
		cinderellaCase: "Miami (Fla.) 2022 reached the Elite Eight as a 10-seed with a 78% similarity match — that's a team that won three tournament games with Texas's exact profile. Saint Mary's 2010 (85% match) made the Sweet 16 as a 10-seed. Texas's #15 offense is the kind of elite unit that carries Cinderella runs. The comps score of 100 means this profile historically doesn't just squeak out one upset — it produces multi-game runs. Sweet 16 or deeper is on the table.",
	},
	smu: {
		upsetCase: "SMU (#43) has a strong comp profile featuring Xavier 2017 (82% match), an 11-seed that reached the Elite Eight, and Miami (Fla.) 2022 (84% match), a 10-seed that also made the Elite Eight. The Mustangs have the #27 offense and a physical rebounding style. If they get past Miami OH in the First Four, they'll be a dangerous out for any 6-seed.",
		cinderellaCase: "Xavier 2017 (82% match) reached the Elite Eight as an 11-seed, and Miami (Fla.) 2022 (84% match) made the Elite Eight as a 10-seed. Two of SMU's top-5 comps made it to at least the second weekend — that's a strong Cinderella signal. The #27 offense gives SMU enough firepower to win multiple games. A Sweet 16 run is realistic if they get past the First Four and first round.",
	},
	miami_oh: {
		upsetCase: "Miami OH is a massive longshot. Ranked #89 overall with the #146 defense, the RedHawks are the weakest 11-seed in the field by a significant margin. Their rating percentile of just 1% for an 11-seed means they're historically bad for this seed line. They'd need everything to break right — a hot shooting night, an opponent having their worst game, and a lot of luck.",
		cinderellaCase: "No Sweet 16 path exists here. Every top comp (College of Charleston 2024, Iona 2016, Akron 2025, San Francisco 2022) lost in the first round. The #89 overall ranking and 1st-percentile rating for an 11-seed make a multi-game run historically unprecedented. Furman 2023 (72% match) won one game as a 13-seed but went no further. Miami OH's ceiling is a single upset, and even that would be a major shock.",
	},

	// 12 seeds
	northern_iowa: {
		upsetCase: "Northern Iowa is the classic 12-seed upset archetype: elite defense (#25 in the country), slow pace, and disciplined play. The Panthers are the best defensive team of any double-digit seed in the bracket. Their style factors include elite defense, slow tempo, and low turnovers — a classic tournament recipe. However, St. John's (#13 overall, #10 defense) is a brutally tough draw. This could be one of the lowest-scoring games of the first round.",
		cinderellaCase: "Dayton 2015 (67% match) reached the Sweet 16 as a defensive-minded 11-seed — a strong Cinderella comp for UNI's style. Elite defense is the trait most associated with deep tournament runs by underdogs because it provides consistency game to game. If UNI beats St. John's, they'd face a 4- or 13-seed in the Round of 32, and their suffocating defense could grind that opponent down too. A Sweet 16 is legitimately possible if the Panthers can find enough offense.",
	},
	high_point: {
		upsetCase: "High Point is the weakest 12-seed in the field, ranked #90 overall with the #143 defense. Their rating percentile (12th) for a 12-seed means they're well below the historical average. Wisconsin (#21, #9 offense) is a terrible matchup. The Panthers' best hope is a high-tempo, free-throw-heavy game where they can stay close. 12-seeds win 37% of the time, but High Point is not a typical 12-seed.",
		cinderellaCase: "No Cinderella potential whatsoever. The comps are wall-to-wall first-round exits: Iona 2016, Sam Houston State 2010, College of Charleston 2024, Northern Kentucky 2019. Not a single top-5 comp reached the Sweet 16. At #90 overall and 12th-percentile for a 12-seed, High Point's ceiling is one upset win, and even that is a stretch against Wisconsin's elite offense.",
	},
	mcneese: {
		upsetCase: "McNeese's calling card is ball security — their low turnover rate scores as a positive tournament factor. The Cowboys also have a solid defense (#48) and play a physical, rebounding-heavy style. Vanderbilt (#12, #7 offense, March Score 89) is a very tough draw, but McNeese's deliberate style can shorten games and limit possessions. UC Irvine 2019 (77% match) won a game as a 13-seed with a similar defensive profile.",
		cinderellaCase: "The comps don't support a deep run — Akron 2013, Providence 2017, Temple 2016, and Nebraska 2014 all lost in the first round. UC Irvine 2019 (77% match) won one game as a 13-seed but went no further. McNeese's #48 defense is solid but not elite enough to carry a team to the Sweet 16 against the caliber of opponents they'd face in the second round. A single upset would be the realistic ceiling.",
	},
	akron: {
		upsetCase: "Akron's top comp is Oral Roberts 2023 (88% match), though that team lost in the first round. More encouragingly, Belmont 2019 (69% match) won a game as an 11-seed, and Pittsburgh 2023 (68% match) made the Sweet 16. The Zips play at a high tempo and shoot a lot of threes — a volatile combination that can produce upset magic. Texas Tech (#22, March Score 77) is a strong opponent, but the 5-12 matchup produces upsets 37% of the time.",
		cinderellaCase: "Pittsburgh 2023 (68% match) reached the Sweet 16 as an 11-seed — that's the Cinderella comp. Akron's high-tempo, 3-point-heavy style is the kind of volatile profile that produces occasional deep runs when the shots are falling. The #54 offense isn't elite, but 12-seeds that shoot a lot of threes can ride a hot weekend to the Sweet 16. The path would require beating Texas Tech and then likely a 4-seed, which is a tall order but not impossible for a team that can catch fire.",
	},

	// 13 seeds
	hofstra: {
		upsetCase: "Hofstra has the best March Score (62) of any 13-seed — and it's not close. The Pride play a disciplined, slow-tempo style with strong rebounding. Their comp profile is excellent: Princeton 2023 (70% match) made the Sweet 16 as a 15-seed, and Richmond 2022 (76% match) won a game as a 12-seed. Alabama (#17) has a vulnerable defense (#63) and a March Score of just 63, making them one of the more upset-prone 4-seeds.",
		cinderellaCase: "Princeton 2023 (70% match) reached the Sweet 16 as a 15-seed — the ultimate Cinderella story for a slow, disciplined mid-major. Hofstra plays the exact same style: control tempo, rebound, and turn every game into a low-possession grinder. If the Pride upset Alabama, they'd face a 5- or 12-seed in the Round of 32 — a very winnable game for a team that makes opponents play at their pace. This is the 13-seed most likely to reach the Sweet 16.",
	},
	cal_baptist: {
		upsetCase: "Cal Baptist's secret weapon is their elite defense (#47 in the country, the best of any 13-seed). They match up against Kansas (#20), a team with a mediocre offense (#53) and a March Score of just 65. The most intriguing comp: Saint Peter's 2022 (71% match), the 15-seed that shocked the world with an Elite Eight run. Cal Baptist plays a similar slow, physical, defensive style that can smother higher-seeded opponents. If CBU can turn this into a 55-50 rock fight, anything is possible.",
		cinderellaCase: "Saint Peter's 2022 went from 15-seed to the Elite Eight — the greatest Cinderella run by a low seed in recent memory — and Cal Baptist is a 71% comp match. The Lancers share Saint Peter's elite-defense, slow-pace identity that suffocated Kentucky and Purdue in 2022. Elite defense is the single best predictor of deep Cinderella runs because it works against any opponent regardless of talent gap. If CBU beats Kansas, a Sweet 16 is within the realm of possibility.",
	},
	troy: {
		upsetCase: "Troy faces what might be the weakest 4-seed in the tournament. Nebraska's March Score is a horrendous 38 — the kind of number you'd expect from a double-digit seed, not a 4-seed. Nebraska's defense (#7) is elite, but their offense (#55) is pedestrian. Troy's high 3-point rate and slow pace could create a game where one hot shooting stretch decides everything. Oakland 2024 (70% match) stunned a 3-seed in the same tournament.",
		cinderellaCase: "Oakland 2024 (70% match) beat Kentucky as a 14-seed — but even Oakland didn't make the Sweet 16. Troy's other comps (Morehead State 2024, Jacksonville State 2022, Lipscomb 2025) are all first-round exits. At #134 overall, Troy is the weakest 13-seed by far, and the style factors are all neutral. A first-round upset over a vulnerable Nebraska team is plausible, but there's no historical basis for a Sweet 16 run from a team this poorly rated.",
	},
	hawaii: {
		upsetCase: "Hawai'i faces Arkansas (#16, #5 offense), one of the most dynamic offensive teams in the bracket. The Rainbow Warriors' defense (#57) will be severely tested. The most interesting comp is Middle Tennessee 2016 (67% match), the 15-seed that beat 2-seed Michigan State. Hawai'i gets to the free-throw line and plays with pace — if they can avoid getting blown out early, the crowd energy of a Cinderella could carry them.",
		cinderellaCase: "No path to the Sweet 16. The comps are almost entirely first-round exits (UNC Greensboro 2021, Kennesaw State 2023, Yale 2022), and Hawai'i's #205 offense is among the worst in the tournament field. Middle Tennessee 2016 pulled a legendary 15-over-2 upset with a 67% match, but even that team didn't survive the next round. Hawai'i would need to play four levels above their season-long rating for multiple games — not a realistic scenario.",
	},

	// 14 seeds
	north_dakota_st: {
		upsetCase: "North Dakota State has the best March Score (49) of any 14-seed, and their comp profile includes Oakland 2024 (79% match) — a 14-seed that beat 3-seed Kentucky last year. NDSU's low free-throw rate scores as a neutral-to-positive factor, and their physical rebounding style can create havoc. Michigan State (#11) is a tough draw, but the Spartans have been upset by mid-majors before. A 14-seed wins about 10% of the time — and NDSU is a better-than-average 14.",
		cinderellaCase: "A 14-seed has reached the Sweet 16 only once in tournament history (Cleveland State in 1986). Oakland 2024 (79% match) is the aspirational comp — they beat Kentucky but fell in the next round. NDSU's other comps (Akron 2024, Morehead State 2024, Northern Colorado 2011) are all first-round exits. The data is clear: a first-round win is the realistic ceiling for any 14-seed, and NDSU is no exception despite being a strong one.",
	},
	wright_st: {
		upsetCase: "Wright State's most famous comp is themselves — Wright State 2022 (74% match) won a game as a 16-seed in the First Four before falling. More practically, the Raiders face Virginia (#14), a team with a March Score of just 47 and a program historically susceptible to upsets (UMBC 2018, Ohio 2021). Virginia's Pack Line defense slows games down, which actually plays into Wright State's physical, low-3-point-rate style.",
		cinderellaCase: "Only one 14-seed has ever reached the Sweet 16 (Cleveland State in 1986), and Wright State at #135 overall won't be the second. The comps (Montana State 2022, Kent State 2017, North Texas 2010, Oakland 2010) are all first-round exits. Wright State 2022 (74% match) won a First Four game as a 16-seed but lost immediately after. The realistic ceiling is one upset win against a Virginia team with a history of tournament collapses.",
	},
	kennesaw_st: {
		upsetCase: "Kennesaw State's rating percentile of 0 for a 14-seed tells the story — this is the weakest 14-seed in the field at #152 overall. Gonzaga (#10, March Score 67) is a terrible matchup. The Owls play with pace and get to the line, but their defense (#192) will struggle against Gonzaga's balanced attack. This is one of the least likely upsets in the first round.",
		cinderellaCase: "None. The comps are universally first-round exits: Bryant 2022, Northern Kentucky 2017, Winthrop 2017, Georgia State 2019. At #152 overall with a 0th-percentile rating for a 14-seed, Kennesaw State has no historical basis for even one win, let alone a Sweet 16 run.",
	},
	penn: {
		upsetCase: "Penn faces the most daunting matchup of any 14-seed: Illinois (#8 overall, #2 offense, March Score 91). The Quakers are ranked #148 with the #208 offense — a catastrophic mismatch. Penn's low turnovers and moderate pace won't be enough against Illinois's scoring avalanche. Their top comp Yale 2022 (88% match) lost in the first round as a 14-seed. This is a sub-5% upset probability.",
		cinderellaCase: "None. Penn's comps are 15- and 16-seeds that lost in the first round: Yale 2022, Iona 2021, Manhattan 2015, UNC Asheville 2023, Georgia State 2022. The #148 ranking and #208 offense make it impossible to envision winning even one game against Illinois, let alone stringing together multiple wins. This is the least likely Cinderella in the bracket.",
	},

	// 15 seeds
	idaho: {
		upsetCase: "Idaho is the strongest 15-seed in the field by rating percentile (39th), ranked #145 overall. The Vandals shoot a lot of threes and protect the ball — two positive tournament traits. But Houston (#5, #4 defense, March Score 90) is one of the toughest draws in the entire bracket. Houston's suffocating defense has been the gold standard in college basketball. A 15-seed wins about 7% of the time, and this is not one of the better opportunities.",
		cinderellaCase: "Only a handful of 15-seeds have ever reached the Sweet 16 — FGCU in 2013, Oral Roberts in 2021, and Saint Peter's made the Elite Eight in 2022. Idaho's comps are all 15-seeds that lost in the first round: Northern Kentucky 2017, Weber State 2016, Jacksonville State 2022. Against Houston's #4 defense, the Vandals would need a miracle just to win one game. A Sweet 16 run is essentially impossible — the historical base rate is near zero and the matchup makes it even worse.",
	},
	tennessee_st: {
		upsetCase: "Tennessee State's low 3-point rate scores at the 76th percentile — the highest positive factor of any 15-seed. The Tigers also play at a high tempo and rebound physically. Their most interesting comp is Texas A&M-Corpus Christi 2023 (72% match), a 16-seed that won in the First Four. Iowa State (#6, #5 defense) is a brutal draw, but the Cyclones' turnover-forcing defense could actually work in TSU's favor if the Tigers can handle the pressure.",
		cinderellaCase: "None. Only a handful of 15-seeds have ever reached the Sweet 16, and Tennessee State at #191 overall won't join them. The comps (Long Beach State 2024, North Dakota 2017, Prairie View 2019) are all first-round exits. Texas A&M-CC 2023 (72% match) won as a 16-seed in the First Four, but that's a play-in game, not a deep run. Against Iowa State's #5 defense, even a single win would be historically remarkable.",
	},
	furman: {
		upsetCase: "Furman is the weakest 15-seed by ranking (#179) and has only one applicable style factor (high 3-point rate, barely positive). UConn (#9, March Score 61) is a tough draw. The Paladins' comps are all first-round losses. The only path to an upset is a 3-point barrage — Furman shooting lights-out from beyond the arc while UConn has an off night. That's about a 5% scenario.",
		cinderellaCase: "None. Furman beat Virginia as a 13-seed in 2023, but that was a significantly better team and an easier opponent. This squad at #179 overall has no Sweet 16 comps — Milwaukee 2014, Appalachian State 2021, Jacksonville State 2022, and Northern Kentucky 2017 all lost in the first round. A single upset over UConn would be remarkable; anything beyond that is fantasy.",
	},
	queens: {
		upsetCase: "Queens is an interesting case — their weak defense is actually listed as a style factor, which is unusual. At #194 overall with the #322 defense, the Royals would be relying entirely on their offense (#77) to stay competitive. Purdue (#7, #1 offense) creates a potential shootout, but Queens can't match Purdue's firepower. The Royals do protect the ball well (low turnovers at 64th percentile), but the talent gap is too wide.",
		cinderellaCase: "None. Queens' comps are entirely 16-seeds that lost in the first round: South Dakota State 2017, Iona 2019, Mount St. Mary's 2014, Stetson 2024. The #322 defense makes it impossible to win multiple games against tournament-level opponents. Queens might keep it interesting offensively for a half, but there is zero Sweet 16 path for a team this defensively challenged.",
	},

	// 16 seeds
	siena: {
		upsetCase: "Siena is the most interesting 16-seed by March Score (61) and has the highest rating percentile (70th) among 16-seeds. The Saints play a slow, deliberate style with a low 3-point rate — both factors that historically outperform seed expectations. Their top comp Robert Morris 2015 (89% match) won a play-in game. But this is Duke — the #1 overall seed, #1 defense, March Score 93. A 16-seed has beaten a 1-seed exactly twice in tournament history.",
		cinderellaCase: "No 16-seed has ever reached the Sweet 16 — only two have even won a single game (UMBC 2018, Fairleigh Dickinson 2023). Siena's slow-grinding style is actually the best archetype for keeping games close against 1-seeds, but Duke's #1 defense and #1 overall ranking make even a first-round win a sub-1% proposition. A Sweet 16 run is not a real possibility for any 16-seed, period.",
	},
	liu: {
		upsetCase: "Long Island has the highest March Score (66) of any 16-seed in the field — an unusually high number driven by a low 3-point rate (positive factor at 78th percentile), physical rebounding, and a comp profile that includes UC Davis 2017, which won a First Four game. Arizona (#3, March Score 55) has a relatively mediocre March Score for a 1-seed, suggesting some style vulnerability. But the #3 overall rating and #3 defense make this a near-impossible task.",
		cinderellaCase: "No 16-seed has ever made the Sweet 16. Long Island's comps (Southern 2016, Longwood 2024, Coastal Carolina 2014, Texas A&M-CC 2022) are all first-round exits. UC Davis 2017 (68% match) won a First Four game but then lost to a 1-seed. The March Score of 66 is meaningless when the base rate for even winning one game as a 16-seed is 1.6%. A Cinderella run is a mathematical impossibility.",
	},
};

// First Four team analyses
const FIRST_FOUR_ANALYSES: Record<string, UpsetAnalysis> = {
	howard: {
		upsetCase: "Howard enters the First Four as a 16-seed with a March Score of 58 and the 58th-percentile rating for a 16-seed. The Bison get to the free-throw line and play physical defense (#109). Their top comp Texas Southern 2022 (77% match) won as a 16-seed in the First Four. If Howard advances, they'd face a 1-seed with virtually no chance of winning.",
		cinderellaCase: "None. Even if Howard wins the First Four, they'd face a 1-seed. No 16-seed has ever reached the Sweet 16. The comps (Texas Southern 2022, UC Davis 2017, Mount St. Mary's 2017) won play-in games but lost immediately after. The ceiling is one First Four win.",
	},
	umbc: {
		upsetCase: "The most famous 16-seed upset in history was UMBC over Virginia in 2018. This year's Retrievers (ranked #180) are a different team but carry that legacy. They protect the ball well (low turnovers at 69th percentile) and their top comp Milwaukee 2014 (87% match) was a 15-seed. The First Four game is winnable, but a 1-seed matchup after that is a wall.",
		cinderellaCase: "UMBC beat Virginia as a 16-seed in 2018, but even that historic team didn't win a second game. No 16-seed has ever reached the Sweet 16. The comps (Milwaukee 2014, Norfolk State 2022, Western Kentucky 2013) are all first-round exits. The ceiling is surviving the First Four — a 1-seed matchup after that is a wall.",
	},
	lehigh: {
		upsetCase: "Lehigh is the weakest team in the tournament at #281 overall. Their only applicable style factor is a low rebound rate (neutral). The comps include Alabama State 2025 and Mount St. Mary's 2025, which won First Four games. Lehigh could squeak through the play-in but has no chance against a 1-seed.",
		cinderellaCase: "Lehigh beat Duke as a 15-seed in 2012, but that was a fundamentally better team. At #281 overall, this squad is one of the weakest in the entire tournament. The comps (Alabama State 2025, Saint Francis 2025, Mount St. Mary's 2025) are all play-in level. No path to the Sweet 16 exists.",
	},
	prairie_view_am: {
		upsetCase: "Prairie View A&M plays at a blistering tempo and gets to the free-throw line — their high-tempo factor scores at the 65th percentile. The Panthers' low 3-point rate (78th percentile) is a positive factor. At #288 overall, they're one of the weakest teams in the bracket, but their style at least creates variance. A First Four win is possible; anything beyond that is not.",
		cinderellaCase: "None. At #288 overall, Prairie View is one of the weakest teams in the field. Hampton 2015 (64% match) won a play-in game but fell to a 1-seed immediately. The comps are all 16-seeds that lost in the first round. A First Four win is the absolute ceiling.",
	},
};

interface UpsetCandidate {
	team: BracketTeamSummary;
	opponent: BracketTeamSummary | null;
	upsetScore: number;
	analysis: UpsetAnalysis | null;
	isFirstFour?: boolean;
	firstFourOpponentKey?: string;
	firstFourOpponentName?: string;
	targetRegion?: string;
}

function computeUpsetScore(team: BracketTeamSummary, opponent: BracketTeamSummary | null): number {
	const seedRate = SEED_WIN_RATES[team.projected_seed] ?? 0;
	const ratingPctile = team.march_analysis?.seed_line?.rating_percentile ?? 0;
	const marchScore = team.march_score;
	const rankGap = opponent ? (opponent.comp_rank - team.comp_rank) : -100;
	const oppWeakness = opponent ? Math.max(0, 60 - opponent.march_score) : 0;

	// Weighted combination
	return (
		seedRate * 0.30 +
		ratingPctile * 0.20 +
		marchScore * 0.20 +
		Math.max(0, 50 + rankGap) * 0.15 +
		oppWeakness * 0.15
	);
}

function getRankColor(rank: number): string {
	if (!rank || isNaN(rank)) return 'oklch(0.4 0 0)';
	if (rank <= 36) return 'oklch(0.70 0.22 145)';
	if (rank <= 73) return 'oklch(0.65 0.19 135)';
	if (rank <= 109) return 'oklch(0.62 0.17 120)';
	if (rank <= 146) return 'oklch(0.60 0.16 100)';
	if (rank <= 182) return 'oklch(0.58 0.15 85)';
	return 'oklch(0.58 0.16 70)';
}


export default function UpsetsClient({
	marchData,
	bracketData,
}: {
	marchData: MarchPageData;
	bracketData: BracketPageData;
}) {
	const allTeams = new Map(marchData.bracket_teams.map(t => [t.team_key, t]));

	// Build First Four lookup: team_key -> { ff opponent key/name, target region, R64 opponent seed }
	const firstFourInfo = new Map<string, { ffOpponentKey: string; ffOpponentName: string; targetRegion: string }>();
	for (const ff of bracketData.first_four_games) {
		const teamA = allTeams.get(ff.team_a.team_key);
		const teamB = allTeams.get(ff.team_b.team_key);
		firstFourInfo.set(ff.team_a.team_key, {
			ffOpponentKey: ff.team_b.team_key,
			ffOpponentName: teamB?.team_name ?? ff.team_b.team_key,
			targetRegion: ff.target_region ?? '',
		});
		firstFourInfo.set(ff.team_b.team_key, {
			ffOpponentKey: ff.team_a.team_key,
			ffOpponentName: teamA?.team_name ?? ff.team_a.team_key,
			targetRegion: ff.target_region ?? '',
		});
	}

	// Build upset candidates — every double-digit seed gets its own entry
	const candidates: UpsetCandidate[] = [];

	for (const team of marchData.bracket_teams) {
		if (team.projected_seed < 10) continue;

		const isFirstFour = firstFourInfo.has(team.team_key);
		const ffInfo = firstFourInfo.get(team.team_key);

		// Find R64 opponent
		const matchup = R64_MATCHUP_ORDER.find(([, low]) => low === team.projected_seed);
		if (!matchup) continue;
		const [oppSeed] = matchup;

		// For First Four teams, look in target region; otherwise use team's own region
		const oppRegion = isFirstFour ? ffInfo!.targetRegion : team.region;
		const opponent = marchData.bracket_teams.find(
			t => t.projected_seed === oppSeed && t.region === oppRegion
		) ?? null;

		const analysis = isFirstFour
			? (FIRST_FOUR_ANALYSES[team.team_key] ?? UPSET_ANALYSES[team.team_key] ?? null)
			: (UPSET_ANALYSES[team.team_key] ?? null);

		candidates.push({
			team,
			opponent,
			upsetScore: computeUpsetScore(team, opponent),
			analysis,
			isFirstFour,
			firstFourOpponentKey: ffInfo?.ffOpponentKey,
			firstFourOpponentName: ffInfo?.ffOpponentName,
			targetRegion: ffInfo?.targetRegion,
		});
	}

	// Sort within each tier by upset score desc
	candidates.sort((a, b) => b.upsetScore - a.upsetScore);

	// Group into tiers by seed
	const tiers: { label: string; color: string; subtitle: string; seeds: number[]; candidates: UpsetCandidate[] }[] = [
		{ label: 'Legitimate Threats', color: 'oklch(0.70 0.22 145)', subtitle: '10 and 11 seeds win ~35% of first-round games', seeds: [10, 11], candidates: [] },
		{ label: 'Classic 5-12 Upsets', color: 'oklch(0.65 0.19 135)', subtitle: '12 seeds win 37% — the most common upset in the tournament', seeds: [12], candidates: [] },
		{ label: '13-Seed Specials', color: 'oklch(0.62 0.17 85)', subtitle: '13 seeds win ~20% of first-round games', seeds: [13], candidates: [] },
		{ label: 'Long Shots', color: 'oklch(0.60 0.16 50)', subtitle: '14 seeds win ~10% of first-round games', seeds: [14], candidates: [] },
		{ label: 'Near Impossible', color: 'oklch(0.58 0.15 30)', subtitle: '15 seeds win ~7% of first-round games', seeds: [15], candidates: [] },
		{ label: 'Miracles Only', color: 'oklch(0.58 0.20 30)', subtitle: '16 seeds have beaten a 1-seed only twice in history', seeds: [16], candidates: [] },
	];

	for (const c of candidates) {
		const tier = tiers.find(t => t.seeds.includes(c.team.projected_seed));
		if (tier) tier.candidates.push(c);
	}

	// Pre-compute global ranks
	const rankedCandidates: { candidate: UpsetCandidate; rank: number }[] = [];
	let rank = 0;
	for (const tier of tiers) {
		for (const c of tier.candidates) {
			rank++;
			rankedCandidates.push({ candidate: c, rank });
		}
	}

	// Index into rankedCandidates by tier
	const tierRanges = new Map<string, { candidate: UpsetCandidate; rank: number }[]>();
	for (const tier of tiers) {
		const seedSet = new Set(tier.seeds);
		tierRanges.set(tier.label, rankedCandidates.filter(r => seedSet.has(r.candidate.team.projected_seed)));
	}

	return (
		<div className="max-w-340 mx-auto px-2 md:px-4 py-4 md:py-6 pb-8">
			{/* Page Header */}
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-2">
					<Flame className="size-7 text-orange-500" />
					<h2 className="text-2xl md:text-3xl font-bold">Upset Watch</h2>
				</div>
				<p className="text-sm text-neutral-400 max-w-2xl">
					Every double-digit seed ranked by their likelihood of pulling a first-round upset.
					Based on composite ratings, tournament style factors, historical comps, and matchup dynamics.
				</p>
			</div>

			{/* Tiers */}
			<div className="space-y-8">
				{tiers.map(tier => {
					const items = tierRanges.get(tier.label);
					if (!items || items.length === 0) return null;
					return (
						<div key={tier.label}>
							{/* Tier Header */}
							<div className="mb-3 flex items-baseline gap-3">
								<h3
									className="text-lg font-bold"
									style={{ color: tier.color }}
								>
									{tier.label}
								</h3>
								<span className="text-xs text-neutral-500">{tier.subtitle}</span>
							</div>
							{/* Cards */}
							<div className="space-y-4">
								{items.map(({ candidate, rank: r }) => (
									<UpsetCard key={candidate.team.team_key} candidate={candidate} rank={r} />
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function UpsetCard({ candidate, rank }: { candidate: UpsetCandidate; rank: number }) {
	const { team, opponent, analysis, isFirstFour, firstFourOpponentKey, firstFourOpponentName, targetRegion } = candidate;
	const ma = team.march_analysis;
	const topComps = ma?.similar_teams?.slice(0, 3) ?? [];
	const topFactors = ma?.style_factors?.filter(f => f.applies) ?? [];

	return (
		<div className="border border-neutral-800 rounded-lg overflow-hidden">
			{/* Card Header */}
			<div
				className="p-3 md:p-4 relative"
				style={{
					background: opponent
						? `linear-gradient(135deg, #${team.color}20 0%, transparent 40%, transparent 60%, #${opponent.color}20 100%)`
						: `linear-gradient(135deg, #${team.color}20 0%, transparent 100%)`,
				}}
			>
				{/* Rank + badges */}
				<div className="flex items-center gap-2 mb-3">
					<span className="text-2xl font-bold tabular-nums text-neutral-500">#{rank}</span>
					{isFirstFour && (
						<span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
							Play-In
						</span>
					)}
					<span className="ml-auto text-xs text-neutral-500">
						{team.region && !isFirstFour ? team.region : targetRegion ? `→ ${targetRegion}` : ''}
					</span>
				</div>

				{/* Matchup */}
				<div className="flex items-center gap-3 md:gap-5">
					{/* Team */}
					<div className="flex items-center gap-2.5 flex-1 min-w-0">
						<Link href={`/${team.team_key}`} className="shrink-0 hover:opacity-80 transition-opacity">
							<TeamLogo teamKey={team.team_key} size={80} className="size-10 md:size-12" />
						</Link>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
									{team.projected_seed}
								</span>
								<Link href={`/${team.team_key}`} className="font-bold text-sm md:text-base truncate hover:underline">
									{team.team_name}
								</Link>
							</div>
							{isFirstFour && firstFourOpponentKey && (
								<div className="text-xs text-neutral-500 mt-0.5">
									First Four vs{' '}
									<Link href={`/${firstFourOpponentKey}`} className="hover:underline">
										{firstFourOpponentName}
									</Link>
								</div>
							)}
							<div className="flex items-center gap-2 mt-1">
								<MarchScoreBadge score={team.march_score} size="sm" />
								<span className="text-xs text-neutral-500">
									#{team.comp_rank} overall
								</span>
							</div>
						</div>
					</div>

					{/* VS */}
					<div className="text-neutral-600 font-bold text-sm shrink-0">VS</div>

					{/* Opponent */}
					{opponent && (
						<div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
							<div className="min-w-0 text-right">
								<div className="flex items-center gap-1.5 justify-end">
									<Link href={`/${opponent.team_key}`} className="font-bold text-sm md:text-base truncate hover:underline">
										{opponent.team_name}
									</Link>
									<span className="text-xs font-medium px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
										{opponent.projected_seed}
									</span>
								</div>
								<div className="flex items-center gap-2 mt-1 justify-end">
									<span className="text-xs text-neutral-500">
										#{opponent.comp_rank} overall
									</span>
									<MarchScoreBadge score={opponent.march_score} size="sm" />
								</div>
							</div>
							<Link href={`/${opponent.team_key}`} className="shrink-0 hover:opacity-80 transition-opacity">
								<TeamLogo teamKey={opponent.team_key} size={80} className="size-10 md:size-12" />
							</Link>
						</div>
					)}
				</div>

				{/* Rating Comparison */}
				{opponent && (
					<div className="mt-3 grid grid-cols-3 gap-2 text-xs">
						<ComparisonStat
							label="Offense"
							teamRank={team.comp_off_rank}
							oppRank={opponent.comp_off_rank}
						/>
						<ComparisonStat
							label="Defense"
							teamRank={team.comp_def_rank}
							oppRank={opponent.comp_def_rank}
						/>
						<ComparisonStat
							label="Overall"
							teamRank={team.comp_rank}
							oppRank={opponent.comp_rank}
						/>
					</div>
				)}
			</div>

			{/* Analysis Section */}
			{analysis && (
				<div className="border-t border-neutral-800 p-3 md:p-4 space-y-3">
					{/* Upset Case */}
					<div>
						<div className="flex items-center gap-1.5 mb-1">
							<Target className="size-3.5 text-orange-400" />
							<span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
								The Case for {team.short_name || team.team_name}
							</span>
						</div>
						<p className="text-sm text-neutral-300 leading-relaxed">
							{analysis.upsetCase}
						</p>
					</div>

					{/* Cinderella Case */}
					<div>
						<div className="flex items-center gap-1.5 mb-1">
							<TrendingUp className="size-3.5 text-blue-400" />
							<span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
								Cinderella Potential
							</span>
						</div>
						<p className="text-sm text-neutral-300 leading-relaxed">
							{analysis.cinderellaCase}
						</p>
					</div>

					{/* Style Factors + Comps Row */}
					<div className="flex flex-col md:flex-row gap-3">
						{/* Style Factors */}
						{topFactors.length > 0 && (
							<div className="flex-1">
								<div className="text-xs text-neutral-500 mb-1.5">Style Factors</div>
								<div className="flex flex-wrap gap-1.5">
									{topFactors.map(f => (
										<span
											key={f.key}
											className="text-xs px-2 py-1 rounded-md border"
											style={{
												borderColor: f.verdict === 'positive'
													? 'oklch(0.65 0.15 145)'
													: f.verdict === 'negative'
													? 'oklch(0.65 0.15 30)'
													: 'oklch(0.35 0 0)',
												color: f.verdict === 'positive'
													? 'oklch(0.75 0.18 145)'
													: f.verdict === 'negative'
													? 'oklch(0.75 0.18 30)'
													: 'oklch(0.55 0 0)',
											}}
										>
											{f.label}
											{f.verdict === 'positive' && ' +'}
											{f.verdict === 'negative' && ' −'}
										</span>
									))}
								</div>
							</div>
						)}

						{/* Top Comps */}
						{topComps.length > 0 && (
							<div className="flex-1">
								<div className="text-xs text-neutral-500 mb-1.5">Top Historical Comps</div>
								<div className="space-y-1">
									{topComps.map(comp => (
										<div key={`${comp.season}-${comp.team_key}`} className="text-xs text-neutral-400 flex items-center gap-1.5">
											<span className="text-neutral-300 font-medium">
												{comp.team_name} {comp.season}
											</span>
											<span className="text-neutral-600">·</span>
											<span>{comp.seed}-seed</span>
											<span className="text-neutral-600">·</span>
											<span className={comp.wins > 0 ? 'text-green-400' : 'text-neutral-500'}>
												{comp.wins > 0 ? comp.deepest_round : 'R64 exit'}
											</span>
											<span className="text-neutral-600">·</span>
											<span>{comp.similarity}%</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function ComparisonStat({ label, teamRank, oppRank }: { label: string; teamRank: number; oppRank: number }) {
	const teamBetter = teamRank < oppRank;
	return (
		<div className="text-center">
			<div className="text-neutral-500 mb-0.5">{label}</div>
			<div className="flex items-center justify-center gap-1.5">
				<span
					className={`tabular-nums font-medium ${teamBetter ? 'text-green-400' : ''}`}
					style={!teamBetter ? { color: getRankColor(teamRank) } : undefined}
				>
					#{teamRank}
				</span>
				<span className="text-neutral-700">vs</span>
				<span
					className={`tabular-nums font-medium ${!teamBetter ? 'text-green-400' : ''}`}
					style={teamBetter ? { color: getRankColor(oppRank) } : undefined}
				>
					#{oppRank}
				</span>
			</div>
		</div>
	);
}
