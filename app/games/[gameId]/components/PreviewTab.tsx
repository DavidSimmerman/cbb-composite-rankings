'use client';

import PredBar from '@/components/PredBar';
import type { GamePageData, ModelCell, ModelKey, PastGame, Side } from '@/lib/games/game-page';
import { formatLine } from '@/lib/games/line-utils';
import type { KeyToGame } from '@/lib/games/store';
import { useState } from 'react';
import { AtsValue, Card, Dot, fmtShortDate, LOSS, LogoBox, RankChip, SideSeg, SidesHeader, WIN } from './ui';

const MODEL_META: Record<ModelKey, { name: string; short: string; color: string }> = {
	comp: { name: 'Composite', short: 'CMP', color: '#a78bfa' },
	kp: { name: 'KenPom', short: 'KP', color: '#60a5fa' },
	em: { name: 'EvanMiya', short: 'EM', color: '#34d399' },
	bt: { name: 'BartTorvik', short: 'BT', color: '#fb923c' },
	net: { name: 'NET', short: 'NET', color: '#f87171' }
};
const ADV_COLOR = { team: '#4ade80', opponent: '#f87171', neutral: '#facc15' };

const pct = (p: number) => Math.round(p * 100);

// ── Model prediction ──

function PredSide({ data, side }: { data: GamePageData; side: Side }) {
	const p = data.prediction!;
	const prob = side === 'home' ? p.homeWinProb : 1 - p.homeWinProb;
	const t = data[side];
	const score = side === 'home' ? p.homeScore : p.awayScore;
	const fav = prob >= 0.5;
	return (
		<div className={`min-w-0 ${side === 'home' ? 'text-right' : ''}`}>
			<div className={`flex items-center gap-2 ${side === 'home' ? 'flex-row-reverse' : ''}`}>
				<LogoBox teamKey={t.teamKey} size={20} />
				<span className={`text-[12.5px] truncate ${fav ? 'text-slate-200' : 'text-slate-400'}`}>
					<span className="md:hidden">{t.abbr}</span>
					<span className="hidden md:inline">{t.name}</span>
				</span>
			</div>
			<div className={`text-[30px] md:text-[44px] font-semibold tabular-nums leading-none mt-1.5 ${fav ? 'text-white' : 'text-slate-500'}`}>
				{pct(prob)}
				<span className="text-[16px] md:text-[22px] text-slate-500">%</span>
			</div>
			{score != null && (
				<div className="text-[11.5px] text-slate-500 mt-1 tabular-nums">
					Predicted <span className="text-slate-300">{score}</span>
				</div>
			)}
		</div>
	);
}

function PredictionHero({ data }: { data: GamePageData }) {
	const p = data.prediction;
	const pre = data.phase === 'pre';
	if (!p) {
		return (
			<Card title={pre ? 'Model prediction' : 'Pregame prediction'}>
				<p className="text-[13px] text-slate-400">
					{pre ? 'The prediction model is unavailable right now. Try again in a few minutes.' : 'No pregame prediction saved for this game.'}
				</p>
			</Card>
		);
	}
	const pick: Side = p.homeWinProb >= 0.5 ? 'home' : 'away';
	const winner: Side | null =
		data.phase === 'final' && data.away.score != null && data.home.score != null ? (data.away.score > data.home.score ? 'away' : 'home') : null;
	const spread = formatLine(p.spread, data.home.abbr, data.away.abbr);
	return (
		<div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
			<div className="flex items-center justify-between gap-2 mb-3">
				<h3 className="text-[15px] font-semibold text-white">{pre ? 'Model prediction' : 'Pregame prediction'}</h3>
				<span className="text-[10.5px] text-slate-500 text-right">
					{p.modelVersion ? `Model v${p.modelVersion}` : 'Model'}
					{p.frozen ? ' · set before tip-off' : ''}
				</span>
			</div>
			<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
				<PredSide data={data} side="away" />
				<div className="flex flex-col md:flex-row gap-1.5 md:gap-2 pb-1">
					{spread && (
						<div className="rounded-lg bg-white/[0.04] px-2.5 py-1 md:px-4 md:py-2 text-center">
							<div className="text-[9.5px] uppercase tracking-wider text-slate-500">Spread</div>
							<div className="text-[13px] md:text-[16px] font-semibold text-white tabular-nums whitespace-nowrap">{spread}</div>
						</div>
					)}
					{p.total != null && (
						<div className="rounded-lg bg-white/[0.04] px-2.5 py-1 md:px-4 md:py-2 text-center">
							<div className="text-[9.5px] uppercase tracking-wider text-slate-500">Total</div>
							<div className="text-[13px] md:text-[16px] font-semibold text-white tabular-nums">{p.total}</div>
						</div>
					)}
				</div>
				<PredSide data={data} side="home" />
			</div>
			<div className="mt-4">
				<PredBar pAway={1 - p.homeWinProb} colors={[data.away.color, data.home.color]} height={7} />
			</div>
			{winner && (
				<div className="mt-3 text-[12px] text-slate-400 flex items-center gap-1.5">
					<Dot color={winner === pick ? WIN : LOSS} />
					<span>
						Model picked {data[pick].name}; {data[winner].name} won {Math.max(data.away.score!, data.home.score!)}-
						{Math.min(data.away.score!, data.home.score!)}.{winner === pick ? ' The pick was right.' : ' The pick was wrong.'}
					</span>
				</div>
			)}
		</div>
	);
}

// ── Tale of the tape ──

function TapeCard({ data }: { data: GamePageData }) {
	const colors = { away: data.away.color, home: data.home.color };
	return (
		<Card title="Tale of the tape" sub={data.tapeNote}>
			<SidesHeader away={data.away.name} home={data.home.name} colors={colors} />
			{data.tape.map(r => (
				<div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 h-[33px] border-t border-white/[0.05] text-[13px] tabular-nums">
					<span className={`flex items-center gap-1.5 min-w-0 ${r.better === 'away' ? 'text-white font-semibold' : 'text-slate-400'}`}>
						{r.better === 'away' && <Dot color={colors.away} />}
						<span className="truncate">{r.away}</span>
					</span>
					<span className="text-center text-[11px] text-slate-500 whitespace-nowrap w-24 md:w-36">
						<span className="md:hidden">{r.short ?? r.label}</span>
						<span className="hidden md:inline">{r.label}</span>
					</span>
					<span className={`flex items-center gap-1.5 justify-end min-w-0 ${r.better === 'home' ? 'text-white font-semibold' : 'text-slate-400'}`}>
						<span className="truncate">{r.home}</span>
						{r.better === 'home' && <Dot color={colors.home} />}
					</span>
				</div>
			))}
		</Card>
	);
}

// ── Ratings by model ──

function fmtModel(k: ModelKey, v: number | null) {
	if (v == null) return '';
	if (k === 'bt') return v.toFixed(3).replace(/^0/, '');
	if (k === 'comp') return v.toFixed(2);
	return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}

function ModelSide({ k, cell, other, side }: { k: ModelKey; cell: ModelCell | null; other: ModelCell | null; side: Side }) {
	if (!cell) return <span className={`text-slate-600 text-[12px] ${side === 'home' ? 'text-right' : ''}`}>—</span>;
	const ahead = other?.rank == null || (cell.rank != null && cell.rank <= other.rank);
	return (
		<div className={`flex items-center gap-2 min-w-0 ${side === 'home' ? 'flex-row-reverse' : ''}`}>
			<RankChip rank={cell.rank} />
			{cell.value != null && (
				<span className={`text-[13.5px] tabular-nums ${ahead ? 'text-white font-semibold' : 'text-slate-400'}`}>{fmtModel(k, cell.value)}</span>
			)}
			{cell.ork != null && cell.drk != null && (
				<span className={`text-[10.5px] text-slate-500 tabular-nums whitespace-nowrap ${side === 'home' ? 'mr-auto' : 'ml-auto'}`}>
					O <span className="text-slate-300">#{cell.ork}</span>
					<span className="hidden md:inline"> · </span>
					<br className="md:hidden" />D <span className="text-slate-300">#{cell.drk}</span>
				</span>
			)}
		</div>
	);
}

function ModelsCard({ data }: { data: GamePageData }) {
	const colors = { away: data.away.color, home: data.home.color };
	const voters = data.models.filter(r => r.key !== 'comp' && r.away?.rank != null && r.home?.rank != null);
	const awayVotes = voters.filter(r => r.away!.rank! < r.home!.rank!).length;
	const homeVotes = voters.filter(r => r.home!.rank! < r.away!.rank!).length;
	const lead: Side | null = awayVotes > homeVotes ? 'away' : homeVotes > awayVotes ? 'home' : null;
	const names = voters.map(r => MODEL_META[r.key].name).join(', ');
	const asOf = data.modelsAsOf ? (data.phase === 'pre' ? `as of ${fmtShortDate(data.modelsAsOf)}` : `going into the game (${fmtShortDate(data.modelsAsOf)})`) : '';

	return (
		<Card title="Ratings by model" sub={`Rating and national rank in each model, with offense and defense ranks${asOf ? `, ${asOf}` : ''}`}>
			{data.models.length === 0 ? (
				<p className="text-[13px] text-slate-500">No model ratings for these teams yet.</p>
			) : (
				<>
					<SidesHeader away={data.away.name} home={data.home.name} colors={colors} />
					{data.models.map(r => {
						const m = MODEL_META[r.key];
						return (
							<div key={r.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 h-11 md:h-[54px] border-t border-white/[0.05]">
								<ModelSide k={r.key} cell={r.away} other={r.home} side="away" />
								<span className="text-center text-[12px] font-semibold w-9 md:w-[78px]" style={{ color: m.color }}>
									<span className="md:hidden">{m.short}</span>
									<span className="hidden md:inline">{m.name}</span>
								</span>
								<ModelSide k={r.key} cell={r.home} other={r.away} side="home" />
							</div>
						);
					})}
					{voters.length > 0 && (
						<div className="border-t border-white/[0.05] pt-2.5 flex items-center gap-2 text-[11.5px] text-slate-400">
							{lead && <Dot color={colors[lead]} />}
							<span>
								{lead
									? `${data[lead].name} is rated higher by ${Math.max(awayVotes, homeVotes)} of ${voters.length} model${voters.length === 1 ? '' : 's'} (${names})`
									: `The models split evenly between the two teams (${names})`}
							</span>
						</div>
					)}
				</>
			)}
		</Card>
	);
}

// ── Keys to the game ──

function KeysFor({ data, side, keys, right }: { data: GamePageData; side: Side; keys: KeyToGame[]; right?: React.ReactNode }) {
	const t = data[side];
	return (
		<div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 min-w-0 relative overflow-hidden">
			<div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${t.color}aa, transparent)` }} />
			<div className="flex items-center gap-2 mb-3 flex-wrap">
				<LogoBox teamKey={t.teamKey} size={20} />
				<h3 className="text-[15px] font-semibold text-white">Keys for {t.name}</h3>
				{right && <div className="ml-auto">{right}</div>}
			</div>
			{keys.length === 0 ? (
				<p className="text-[12px] text-slate-500">No keys from the model for this team.</p>
			) : (
				keys.map((k, i) => (
					<div key={i} className="py-2.5 border-t border-white/[0.05] first:border-0 first:pt-0">
						<div className="flex items-center gap-2">
							<Dot color={ADV_COLOR[k.advantage] ?? ADV_COLOR.neutral} size={8} />
							<span className="text-[13px] font-medium text-white">{k.label}</span>
						</div>
						<p className="text-[12px] text-slate-400 leading-relaxed mt-1 pl-4">{k.description}</p>
					</div>
				))
			)}
		</div>
	);
}

function Keys({ data }: { data: GamePageData }) {
	const [side, setSide] = useState<Side>('away');
	const keys = data.prediction?.keys;
	if (!keys || (!keys.away?.length && !keys.home?.length)) return null;
	const colors = { away: data.away.color, home: data.home.color };
	const seg = <SideSeg value={side} onChange={setSide} label={s => data[s].abbr} colors={colors} className="md:hidden" />;
	return (
		<div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{(['away', 'home'] as const).map(s => (
					<div key={s} className={side === s ? '' : 'hidden md:block'}>
						<KeysFor data={data} side={s} keys={keys[s] ?? []} right={seg} />
					</div>
				))}
			</div>
			<div className="flex items-center gap-3 text-[10.5px] text-slate-500 mt-2 px-1 md:px-0">
				{(
					[
						['team', 'Helps them'],
						['opponent', 'Hurts them'],
						['neutral', 'Toss-up']
					] as const
				).map(([k, l]) => (
					<span key={k} className="flex items-center gap-1">
						<Dot color={ADV_COLOR[k]} />
						{l}
					</span>
				))}
			</div>
		</div>
	);
}

// ── Recent form ──

export function OppCell({ g }: { g: PastGame }) {
	return (
		<div className="flex items-center gap-2 min-w-0">
			<span className="w-4 text-[10.5px] text-slate-500 shrink-0">{g.loc}</span>
			<LogoBox teamKey={g.oppKey} size={16} />
			<span className="text-slate-200 truncate">{g.opp}</span>
			{g.oppRank != null && <RankChip rank={g.oppRank} small />}
		</div>
	);
}

export function ResultCell({ g }: { g: PastGame }) {
	return (
		<span className="text-right tabular-nums whitespace-nowrap">
			<span className="font-semibold" style={{ color: g.won ? WIN : LOSS }}>
				{g.won ? 'W' : 'L'}
			</span>{' '}
			<span className="text-slate-300">{g.score}</span>
		</span>
	);
}

function FormList({ data, side, right }: { data: GamePageData; side: Side; right?: React.ReactNode }) {
	const games = data.form[side];
	const t = data[side];
	const w = games.filter(g => g.won).length;
	const withLine = games.filter(g => g.ats != null);
	const cov = withLine.filter(g => g.ats! > 0).length;
	return (
		<div className="min-w-0">
			<div className="flex items-center gap-2 mb-1 flex-wrap">
				<LogoBox teamKey={t.teamKey} size={18} />
				<span className="text-[13px] font-semibold text-white">{t.name}</span>
				<span className="text-[11.5px] text-slate-500 tabular-nums">
					{w}-{games.length - w}
					{withLine.length > 0 && ` · ${cov}-${withLine.length - cov} ATS`}
				</span>
				{right && <div className="ml-auto">{right}</div>}
			</div>
			{games.length === 0 ? (
				<p className="text-[12px] text-slate-500 py-3">No games played yet.</p>
			) : (
				<>
					<div className="grid grid-cols-[42px_1fr_68px_44px] gap-2 text-[10px] uppercase tracking-wider text-slate-600 h-6 items-center">
						<span>Date</span>
						<span>Opponent</span>
						<span className="text-right">Result</span>
						<span className="text-right">ATS</span>
					</div>
					{games.map(g => (
						<a
							key={g.gameId}
							href={`/games/${g.gameId}`}
							className="grid grid-cols-[42px_1fr_68px_44px] gap-2 items-center h-9 border-t border-white/[0.05] text-[12.5px] hover:bg-white/[0.02]"
						>
							<span className="text-[11px] text-slate-500 tabular-nums">{fmtShortDate(g.date)}</span>
							<OppCell g={g} />
							<ResultCell g={g} />
							<span className="text-right">
								<AtsValue v={g.ats} />
							</span>
						</a>
					))}
				</>
			)}
		</div>
	);
}

function FormCard({ data }: { data: GamePageData }) {
	const [side, setSide] = useState<Side>('away');
	const colors = { away: data.away.color, home: data.home.color };
	const seg = <SideSeg value={side} onChange={setSide} label={s => data[s].abbr} colors={colors} className="md:hidden" />;
	return (
		<Card
			title="Recent form"
			sub="Last five games. ATS = result against the spread: how many points they beat (+) or missed (-) the line by"
		>
			<div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-6">
				<div className={side === 'away' ? '' : 'hidden md:block'}>
					<FormList data={data} side="away" right={seg} />
				</div>
				<div className="hidden md:block bg-white/[0.06]" />
				<div className={side === 'home' ? '' : 'hidden md:block'}>
					<FormList data={data} side="home" right={seg} />
				</div>
			</div>
		</Card>
	);
}

export default function PreviewTab({ data }: { data: GamePageData }) {
	return (
		<div className="space-y-3 md:space-y-4">
			<PredictionHero data={data} />
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
				<TapeCard data={data} />
				<ModelsCard data={data} />
			</div>
			<Keys data={data} />
			<FormCard data={data} />
		</div>
	);
}
