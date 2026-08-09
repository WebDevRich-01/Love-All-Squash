import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';
import FixtureScorecard from './FixtureScorecard';

const STRING_COUNT = 5;

function buildInitialStrings(fixture, teamA, teamB) {
  const source =
    fixture.status === 'completed'
      ? fixture.result?.string_results
      : fixture.draft_string_results;
  const lineupA = fixture.team_a_lineup || [];
  const lineupB = fixture.team_b_lineup || [];

  return Array.from({ length: STRING_COUNT }, (_, i) => {
    const sn = i + 1;
    const rosterAPlayer = teamA?.roster?.find((r) => r.string_number === sn)?.player_name || '';
    const rosterBPlayer = teamB?.roster?.find((r) => r.string_number === sn)?.player_name || '';
    const aPlayer = lineupA.find((l) => l.string_number === sn)?.player_name || rosterAPlayer;
    const bPlayer = lineupB.find((l) => l.string_number === sn)?.player_name || rosterBPlayer;
    const saved = source?.find((s) => s.string_number === sn);

    if (saved) {
      const games = saved.game_scores?.length
        ? saved.game_scores.map((g) => ({ a: String(g.team_a ?? ''), b: String(g.team_b ?? '') }))
        : null; // null = legacy record with counts but no per-game breakdown

      return {
        string_number: sn,
        team_a_player: saved.team_a_player || aPlayer,
        team_b_player: saved.team_b_player || bPlayer,
        games,
        team_a_games: saved.team_a_games ?? 0,
        team_b_games: saved.team_b_games ?? 0,
        persisted: true,
      };
    }

    return {
      string_number: sn,
      team_a_player: aPlayer,
      team_b_player: bPlayer,
      games: [],
      team_a_games: 0,
      team_b_games: 0,
      persisted: false,
    };
  });
}

function computeFromGames(games) {
  let a = 0, b = 0;
  (games || []).forEach(({ a: av, b: bv }) => {
    const ai = parseInt(av, 10);
    const bi = parseInt(bv, 10);
    if (!isNaN(ai) && !isNaN(bi)) {
      if (ai > bi) a++;
      else if (bi > ai) b++;
    }
  });
  return { a, b };
}

export default function TeamFixtureScreen({
  fixture,
  teamA,
  teamB,
  tournamentId,
  onBack,
  onResultSaved,
  onScoreMatch,
  matchConfig,
  poolPlayers,
  racketballPlayers,
  beginnerPlayers,
  contextLabel,
}) {
  const isEdit = fixture.status === 'completed' || fixture.status === 'walkover';
  const [scorecardMode, setScorecardMode] = useState(fixture.status === 'completed');

  const [strings, setStrings] = useState(() => buildInitialStrings(fixture, teamA, teamB));
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [draft, setDraft] = useState(null); // { team_a_player, team_b_player, games: [{a,b}] }
  const [savingString, setSavingString] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Team lineup confirmation
  const [teamAConfirmed, setTeamAConfirmed] = useState(fixture.team_a_confirmed || false);
  const [teamBConfirmed, setTeamBConfirmed] = useState(fixture.team_b_confirmed || false);
  const [confirmingTeam, setConfirmingTeam] = useState(null); // null | 'a' | 'b'
  const [lineupDraft, setLineupDraft] = useState([]); // 5 player name strings
  const [extraDraft, setExtraDraft] = useState({ racketball: null, beginner: null }); // null=not added
  const [savingLineup, setSavingLineup] = useState(false);

  // Manual tie-break: when total games are level after all strings are in, a human
  // picks who advances rather than the fixture being stuck with no way to complete.
  const [manualWinnerOverride, setManualWinnerOverride] = useState(null);

  // Tracked locally so fixture view updates without a refetch
  const [extraPlayers, setExtraPlayers] = useState({
    racketball: { a: fixture.team_a_racketball_player || null, b: fixture.team_b_racketball_player || null },
    beginner:   { a: fixture.team_a_beginner_player   || null, b: fixture.team_b_beginner_player   || null },
  });
  const [extraResults, setExtraResults] = useState({
    racketball: fixture.racketball_result?.team_a_games != null ? fixture.racketball_result : null,
    beginner:   fixture.beginner_result?.team_a_games   != null ? fixture.beginner_result   : null,
  });
  const [extraResultEditing, setExtraResultEditing] = useState(null); // null | 'racketball' | 'beginner'
  const [extraResultDraft, setExtraResultDraft] = useState([]);
  const [savingExtraResult, setSavingExtraResult] = useState(false);

  const totals = useMemo(() => {
    let a = 0, b = 0;
    strings.forEach((s) => {
      if (!s.persisted) return;
      if (s.games?.length) {
        const { a: ga, b: gb } = computeFromGames(s.games);
        a += ga;
        b += gb;
      } else {
        a += s.team_a_games || 0;
        b += s.team_b_games || 0;
      }
    });
    for (const r of Object.values(extraResults)) {
      if (r) { a += r.team_a_games || 0; b += r.team_b_games || 0; }
    }
    return { a, b };
  }, [strings, extraResults]);

  // Countback used only when total games are level: first by strings/extras won
  // outright (each string or extra is one decisive unit), then by total points
  // scored across every game played. Mirrors squash countback conventions.
  const tieBreak = useMemo(() => {
    let unitsA = 0, unitsB = 0, pointsA = 0, pointsB = 0;

    const tallyUnit = (gamesWonA, gamesWonB, gameList) => {
      if (gamesWonA > gamesWonB) unitsA++;
      else if (gamesWonB > gamesWonA) unitsB++;
      (gameList || []).forEach(({ a: pa, b: pb }) => {
        pointsA += Number(pa) || 0;
        pointsB += Number(pb) || 0;
      });
    };

    strings.forEach((s) => {
      if (!s.persisted) return;
      if (s.games?.length) {
        const { a: ga, b: gb } = computeFromGames(s.games);
        tallyUnit(ga, gb, s.games);
      } else {
        // Legacy record: only the games-won count survived, no per-game points to add.
        tallyUnit(s.team_a_games || 0, s.team_b_games || 0, []);
      }
    });

    for (const r of Object.values(extraResults)) {
      if (!r) continue;
      const gameList = (r.game_scores || []).map((g) => ({ a: g.team_a, b: g.team_b }));
      tallyUnit(r.team_a_games || 0, r.team_b_games || 0, gameList);
    }

    return { unitsA, unitsB, pointsA, pointsB };
  }, [strings, extraResults]);

  const persistedStrings = strings.filter((s) => s.persisted);
  const allPersisted = persistedStrings.length === STRING_COUNT;

  // Genuinely unresolvable only once games, strings/extras won, AND total points all tie —
  // mathematically possible but vanishingly rare (needs an even number of decisive units).
  const isTie = allPersisted
    && totals.a === totals.b
    && tieBreak.unitsA === tieBreak.unitsB
    && tieBreak.pointsA === tieBreak.pointsB;

  const winReason = !allPersisted || totals.a !== totals.b
    ? null
    : tieBreak.unitsA !== tieBreak.unitsB
    ? 'strings'
    : tieBreak.pointsA !== tieBreak.pointsB
    ? 'points'
    : manualWinnerOverride
    ? 'manual'
    : null;

  const winner = totals.a !== totals.b
    ? (totals.a > totals.b ? 'a' : 'b')
    : !allPersisted
    ? null
    : tieBreak.unitsA !== tieBreak.unitsB
    ? (tieBreak.unitsA > tieBreak.unitsB ? 'a' : 'b')
    : tieBreak.pointsA !== tieBreak.pointsB
    ? (tieBreak.pointsA > tieBreak.pointsB ? 'a' : 'b')
    : manualWinnerOverride;

  const bothConfirmed = teamAConfirmed && teamBConfirmed;
  const canComplete = allPersisted && winner !== null && bothConfirmed;

  const openRow = (idx) => {
    const s = strings[idx];
    const games = s.games?.length ? [...s.games] : [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }];
    setExpandedIdx(idx);
    setDraft({ team_a_player: s.team_a_player, team_b_player: s.team_b_player, games });
    setError(null);
  };

  const openTeamEditor = (side) => {
    const names = strings.map((s) =>
      side === 'a' ? (s.team_a_player || '') : (s.team_b_player || '')
    );
    const rb = side === 'a' ? extraPlayers.racketball.a : extraPlayers.racketball.b;
    const beg = side === 'a' ? extraPlayers.beginner.a : extraPlayers.beginner.b;
    setLineupDraft(names);
    setExtraDraft({ racketball: rb ?? null, beginner: beg ?? null });
    setConfirmingTeam(side);
    setExpandedIdx(null);
    setDraft(null);
    setError(null);
  };

  const handleConfirmLineup = async () => {
    setSavingLineup(true);
    setError(null);
    const lineup = lineupDraft.map((name, i) => ({ string_number: i + 1, player_name: name }));
    const extraPayload = {};
    if (extraDraft.racketball !== undefined) extraPayload.racketball_player = extraDraft.racketball || null;
    if (extraDraft.beginner !== undefined) extraPayload.beginner_player = extraDraft.beginner || null;
    // Always send both so backend can apply auto-TBC / clear-TBC logic
    extraPayload.racketball_player = extraDraft.racketball || null;
    extraPayload.beginner_player = extraDraft.beginner || null;
    try {
      await api.saveTeamLineup(tournamentId, fixture._id, confirmingTeam, lineup, extraPayload);
      const playerKey = confirmingTeam === 'a' ? 'team_a_player' : 'team_b_player';
      setStrings((prev) => prev.map((s, i) => ({ ...s, [playerKey]: lineupDraft[i] })));
      if (confirmingTeam === 'a') setTeamAConfirmed(true);
      else setTeamBConfirmed(true);
      // Apply auto-TBC logic locally to keep fixture view in sync
      const side = confirmingTeam;
      const other = side === 'a' ? 'b' : 'a';
      setExtraPlayers((prev) => {
        const next = {
          racketball: { ...prev.racketball },
          beginner:   { ...prev.beginner },
        };
        for (const type of ['racketball', 'beginner']) {
          const val = extraDraft[type] || null;
          next[type][side] = val;
          if (val && !prev[type][other]) next[type][other] = 'TBC';
          if (!val && prev[type][other] === 'TBC') next[type][other] = null;
        }
        return next;
      });
      setConfirmingTeam(null);
      setLineupDraft([]);
      setExtraDraft({ racketball: null, beginner: null });
    } catch (err) {
      setError(err.message || 'Failed to save lineup');
    } finally {
      setSavingLineup(false);
    }
  };

  const openExtraEditor = (type) => {
    const existing = extraResults[type];
    const games = existing?.game_scores?.length
      ? existing.game_scores.map((g) => ({ a: String(g.team_a), b: String(g.team_b) }))
      : [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }];
    setExtraResultDraft(games);
    setExtraResultEditing(type);
    setError(null);
  };

  const saveExtraResult = async (type) => {
    const filledGames = extraResultDraft.filter(({ a, b }) => a !== '' && b !== '');
    if (filledGames.length === 0) return;
    setSavingExtraResult(true);
    setError(null);
    const { a: teamAGames, b: teamBGames } = computeFromGames(filledGames);
    try {
      await api.saveExtraMatchResult(tournamentId, fixture._id, type, {
        team_a_games: teamAGames,
        team_b_games: teamBGames,
        game_scores: filledGames.map((g) => ({ team_a: parseInt(g.a, 10), team_b: parseInt(g.b, 10) })),
      });
      setExtraResults((prev) => ({
        ...prev,
        [type]: {
          team_a_games: teamAGames,
          team_b_games: teamBGames,
          game_scores: filledGames.map((g) => ({ team_a: parseInt(g.a, 10), team_b: parseInt(g.b, 10) })),
        },
      }));
      setExtraResultEditing(null);
      setExtraResultDraft([]);
    } catch (err) {
      setError(err.message || 'Failed to save result');
    } finally {
      setSavingExtraResult(false);
    }
  };

  const removeExtraMatch = async (type) => {
    setError(null);
    try {
      await api.removeExtraPlayer(tournamentId, fixture._id, type);
      setExtraPlayers((prev) => ({
        ...prev,
        [type]: { a: null, b: null },
      }));
    } catch (err) {
      setError(err.message || 'Failed to remove match');
    }
  };

  const addGame = () => setDraft((d) => ({ ...d, games: [...d.games, { a: '', b: '' }] }));

  const removeGame = (gIdx) =>
    setDraft((d) => ({ ...d, games: d.games.filter((_, i) => i !== gIdx) }));

  const updateGame = (gIdx, field, value) =>
    setDraft((d) => ({
      ...d,
      games: d.games.map((g, i) => (i === gIdx ? { ...g, [field]: value } : g)),
    }));

  const saveRow = async (idx) => {
    const filledGames = draft.games.filter(({ a, b }) => a !== '' && b !== '');
    if (filledGames.length === 0) return;

    setSavingString(true);
    setError(null);

    const { a: ta, b: tb } = computeFromGames(filledGames);
    const newString = {
      ...strings[idx],
      ...draft,
      games: filledGames,
      team_a_games: ta,
      team_b_games: tb,
      persisted: true,
    };
    const newStrings = strings.map((s, i) => (i === idx ? newString : s));
    setStrings(newStrings);
    setExpandedIdx(null);
    setDraft(null);

    const toSave = newStrings
      .filter((s) => s.persisted)
      .map((s) => ({
        string_number: s.string_number,
        team_a_games: s.team_a_games,
        team_b_games: s.team_b_games,
        team_a_player: s.team_a_player || undefined,
        team_b_player: s.team_b_player || undefined,
        game_scores: (s.games || []).map((g) => ({
          team_a: parseInt(g.a, 10),
          team_b: parseInt(g.b, 10),
        })),
      }));

    try {
      await api.saveDraftFixtureStrings(tournamentId, fixture._id, toSave);
    } catch (err) {
      setStrings((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, persisted: false } : s))
      );
      setError(`Failed to save string ${idx + 1}: ${err.message}`);
    } finally {
      setSavingString(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete) return;
    setSubmitting(true);
    setError(null);

    const stringResults = strings.map((s) => ({
      string_number: s.string_number,
      team_a_games: s.team_a_games,
      team_b_games: s.team_b_games,
      team_a_player: s.team_a_player || undefined,
      team_b_player: s.team_b_player || undefined,
      game_scores: (s.games || []).map((g) => ({
        team_a: parseInt(g.a, 10),
        team_b: parseInt(g.b, 10),
      })),
    }));

    const winnerTeam = winner === 'a' ? teamA : teamB;
    const loserTeam = winner === 'a' ? teamB : teamA;

    const result = {
      winner_id: winnerTeam._id,
      loser_id: loserTeam._id,
      winner_name: winnerTeam.name,
      loser_name: loserTeam.name,
      team_a_games_total: totals.a,
      team_b_games_total: totals.b,
      string_results: stringResults,
    };

    try {
      if (isEdit) {
        await api.editTeamFixtureResult(tournamentId, fixture._id, result);
      } else {
        await api.submitTeamFixtureResult(tournamentId, fixture._id, result);
      }
      onResultSaved();
    } catch (err) {
      setError(err.message || 'Failed to complete fixture');
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      {/* Header */}
      <div className='bg-white shadow-sm shrink-0'>
        <div className='max-w-2xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-3'>
          <button onClick={onBack} className='p-1.5 text-gray-500 hover:text-gray-700 shrink-0'>
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </button>
          <div className='flex-1 min-w-0'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>
              {scorecardMode ? 'Completed Fixture' : isEdit ? 'Edit Fixture' : 'Fixture'}
            </p>
            <div className='flex items-center gap-2 mb-2'>
              <span className='font-bold text-base text-gray-900 truncate flex-1'>{teamA?.name}</span>
              <span className='text-gray-400 font-normal shrink-0 text-sm'>vs</span>
              <span className='font-bold text-base text-gray-900 truncate flex-1 text-right'>
                {teamB?.name}
              </span>
            </div>
            {contextLabel && (
              <p className='text-xs text-gray-400 mb-2 truncate'>{contextLabel}</p>
            )}
            {/* Team confirmation buttons — hidden in scorecard mode */}
            {!scorecardMode && (
              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-1.5 flex-1'>
                  {teamAConfirmed && (
                    <svg className='w-4 h-4 text-green-500 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                    </svg>
                  )}
                  <button
                    onClick={() => openTeamEditor('a')}
                    className='text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 px-2.5 py-1 rounded-lg transition-colors'
                  >
                    {teamAConfirmed ? 'Edit' : 'Select team'}
                  </button>
                </div>
                <div className='flex items-center gap-1.5 flex-1 justify-end'>
                  <button
                    onClick={() => openTeamEditor('b')}
                    className='text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 px-2.5 py-1 rounded-lg transition-colors'
                  >
                    {teamBConfirmed ? 'Edit' : 'Select team'}
                  </button>
                  {teamBConfirmed && (
                    <svg className='w-4 h-4 text-green-500 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>
          {!scorecardMode && (
            <div className='shrink-0 text-sm font-medium text-gray-500'>
              {persistedStrings.length}/{STRING_COUNT}
            </div>
          )}
        </div>
      </div>

      {/* Scorecard view for completed fixtures */}
      {scorecardMode && (
        <div className='flex-1 overflow-y-auto px-4 lg:px-8 py-6 max-w-2xl mx-auto w-full space-y-4'>
          <FixtureScorecard
            fixture={fixture}
            teamA={teamA}
            teamB={teamB}
            strings={strings}
            extraPlayers={extraPlayers}
            extraResults={extraResults}
          />
          <button
            onClick={() => setScorecardMode(false)}
            className='w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 font-medium text-sm hover:bg-gray-50 transition-colors'
          >
            Edit fixture
          </button>
        </div>
      )}

      {/* Team lineup editor */}
      {!scorecardMode && confirmingTeam && (
        <div className='flex-1 px-4 lg:px-8 py-6 max-w-2xl mx-auto w-full space-y-4'>
          <h3 className='font-semibold text-gray-800 text-sm'>
            {confirmingTeam === 'a' ? teamA?.name : teamB?.name} — Confirm Lineup
          </h3>
          {Array.from({ length: STRING_COUNT }, (_, i) => {
            const sn = i + 1;
            const seedsForString = sn <= 3 ? [sn] : [4, 5];
            const relevantPool = (poolPlayers || []).filter((p) =>
              seedsForString.includes(p.seed)
            );
            return (
              <div key={sn} className='bg-white rounded-xl shadow-sm px-4 py-3 space-y-2'>
                <div className='flex items-center gap-3'>
                  <span className='text-xs font-bold text-gray-400 shrink-0 w-6'>S{sn}</span>
                  <input
                    type='text'
                    value={lineupDraft[i] || ''}
                    onChange={(e) => {
                      const next = [...lineupDraft];
                      next[i] = e.target.value;
                      setLineupDraft(next);
                    }}
                    placeholder={`String ${sn} player`}
                    className='flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                  />
                </div>
                {relevantPool.length > 0 && (
                  <div className='flex flex-wrap gap-2 pl-9'>
                    <span className='text-xs text-gray-400 self-center'>Pool:</span>
                    {relevantPool.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => {
                          const next = [...lineupDraft];
                          next[i] = p.name;
                          setLineupDraft(next);
                        }}
                        className='text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 transition-colors'
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* Extra player rows: racketball and beginner */}
          {[
            { type: 'racketball', label: 'Racketball', suggestions: racketballPlayers || [] },
            { type: 'beginner',   label: 'Beginner',   suggestions: beginnerPlayers   || [] },
          ].map(({ type, label, suggestions }) => {
            const val = extraDraft[type];
            if (val === null) return null;
            return (
              <div key={type} className='bg-white rounded-xl shadow-sm px-4 py-3 space-y-2'>
                <div className='flex items-center gap-3'>
                  <span className='text-xs font-bold text-gray-400 shrink-0 w-16'>{label}</span>
                  <input
                    type='text'
                    value={val}
                    onChange={(e) => setExtraDraft((d) => ({ ...d, [type]: e.target.value }))}
                    placeholder='Player name'
                    className='flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                  />
                  <button
                    onClick={() => setExtraDraft((d) => ({ ...d, [type]: null }))}
                    className='text-gray-300 hover:text-red-400 transition-colors shrink-0'
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                    </svg>
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className='flex flex-wrap gap-2 pl-16'>
                    {suggestions.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => setExtraDraft((d) => ({ ...d, [type]: p.name }))}
                        className='text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 transition-colors'
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add extra player buttons */}
          <div className='flex gap-2'>
            {extraDraft.racketball === null && (
              <button
                onClick={() => setExtraDraft((d) => ({ ...d, racketball: '' }))}
                className='flex-1 py-2 text-xs font-medium border border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-purple-400 hover:text-purple-600 transition-colors'
              >
                + Add racketball
              </button>
            )}
            {extraDraft.beginner === null && (
              <button
                onClick={() => setExtraDraft((d) => ({ ...d, beginner: '' }))}
                className='flex-1 py-2 text-xs font-medium border border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-orange-400 hover:text-orange-600 transition-colors'
              >
                + Add beginner
              </button>
            )}
          </div>

          {error && <p className='text-sm text-red-600 text-center'>{error}</p>}
          <div className='flex gap-3 pt-1'>
            <button
              onClick={() => { setConfirmingTeam(null); setLineupDraft([]); setExtraDraft({ racketball: null, beginner: null }); setError(null); }}
              className='flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm'
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLineup}
              disabled={savingLineup}
              className='flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            >
              {savingLineup ? 'Saving…' : 'Confirm Team'}
            </button>
          </div>
        </div>
      )}

      {/* String list */}
      {!scorecardMode && !confirmingTeam && (
      <div className='flex-1 px-4 lg:px-8 py-6 space-y-3 max-w-2xl mx-auto w-full'>
        {strings.map((row, idx) => {
          const isOpen = expandedIdx === idx;

          // Compute games won from stored data
          const { a: ga, b: gb } =
            row.games?.length
              ? computeFromGames(row.games)
              : { a: row.team_a_games || 0, b: row.team_b_games || 0 };

          // Format individual game scores for display e.g. "15–10, 11–15"
          const gameScoreStr = row.games?.length
            ? row.games.map((g) => `${g.a}–${g.b}`).join(', ')
            : null;

          // Live totals while editor is open
          const draftTotals =
            isOpen && draft
              ? computeFromGames(draft.games.filter((g) => g.a !== '' && g.b !== ''))
              : null;

          return (
            <div
              key={row.string_number}
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${isOpen ? 'ring-2 ring-blue-300' : ''}`}
            >
              {/* Collapsed view */}
              {!isOpen && (
                <div className='px-4 py-4'>
                  {/* String number + player names row */}
                  <div className='flex items-center gap-3 mb-3'>
                    <span className='text-xs font-bold text-gray-400 shrink-0 w-6'>
                      S{row.string_number}
                    </span>
                    <div className='flex-1 flex items-center gap-2 min-w-0'>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1'>
                        {row.team_a_player || (
                          <span className='text-gray-300 font-normal italic'>Player</span>
                        )}
                      </span>
                      {row.persisted ? (
                        <span className='text-sm font-bold text-gray-700 shrink-0 tabular-nums'>
                          {ga}–{gb}
                        </span>
                      ) : (
                        <span className='text-xs text-gray-300 shrink-0'>vs</span>
                      )}
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1 text-right'>
                        {row.team_b_player || (
                          <span className='text-gray-300 font-normal italic'>Player</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Result summary or action buttons */}
                  {row.persisted ? (
                    <div className='flex items-center justify-between gap-3 pl-9'>
                      <div className='flex-1 min-w-0'>
                        {gameScoreStr ? (
                          <p className='text-xs text-gray-400 leading-relaxed'>{gameScoreStr}</p>
                        ) : (
                          <p className='text-xs text-gray-400'>{ga} games to {gb}</p>
                        )}
                      </div>
                      <button
                        onClick={() => openRow(idx)}
                        className='text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 px-3 py-1.5 rounded-lg shrink-0 transition-colors'
                      >
                        Edit
                      </button>
                    </div>
                  ) : (bothConfirmed || isEdit) ? (
                    <div className='flex gap-2 pl-9'>
                      <button
                        onClick={() =>
                          onScoreMatch({
                            isTeamRRString: true,
                            tournamentId,
                            fixtureId: fixture._id,
                            stringNumber: row.string_number,
                            player1Name: row.team_a_player || teamA?.name,
                            player2Name: row.team_b_player || teamB?.name,
                            currentStrings: strings,
                            matchConfig: matchConfig || {},
                          })
                        }
                        className='flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                      >
                        Score match
                      </button>
                      <button
                        onClick={() => openRow(idx)}
                        className='flex-1 py-2.5 text-sm font-semibold border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors'
                      >
                        Enter result
                      </button>
                    </div>
                  ) : (
                    <p className='pl-9 text-xs text-gray-400 italic'>Waiting for both teams to confirm</p>
                  )}
                </div>
              )}

              {/* Expanded editor */}
              {isOpen && draft && (
                <div className='px-4 py-4 space-y-5'>
                  {/* String label + player names (collapsed summary while editing) */}
                  <div className='flex items-center gap-3'>
                    <span className='text-xs font-bold text-gray-400 shrink-0 w-6'>
                      S{row.string_number}
                    </span>
                    <div className='flex-1 flex items-center gap-2 min-w-0'>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1'>
                        {draft.team_a_player || teamA?.name}
                      </span>
                      <span className='text-gray-300 text-xs shrink-0'>vs</span>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1 text-right'>
                        {draft.team_b_player || teamB?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => { setExpandedIdx(null); setDraft(null); }}
                      className='text-gray-300 hover:text-gray-500 shrink-0'
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                      </svg>
                    </button>
                  </div>

                  {/* Player name inputs */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1'>{teamA?.name} player</label>
                      <input
                        type='text'
                        value={draft.team_a_player}
                        onChange={(e) => setDraft((d) => ({ ...d, team_a_player: e.target.value }))}
                        placeholder='Player name'
                        className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                      />
                    </div>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1 text-right'>
                        {teamB?.name} player
                      </label>
                      <input
                        type='text'
                        value={draft.team_b_player}
                        onChange={(e) => setDraft((d) => ({ ...d, team_b_player: e.target.value }))}
                        placeholder='Player name'
                        className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 text-right'
                      />
                    </div>
                  </div>

                  {/* Per-game score inputs */}
                  <div>
                    <div className='flex items-baseline justify-between mb-2'>
                      <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                        Game scores
                      </span>
                      <span className='text-xs text-gray-400'>highest score wins</span>
                    </div>
                    <div className='space-y-2'>
                      {draft.games.map((g, gIdx) => {
                        const ai = parseInt(g.a, 10);
                        const bi = parseInt(g.b, 10);
                        const gameWinner =
                          g.a !== '' && g.b !== '' && !isNaN(ai) && !isNaN(bi)
                            ? ai > bi
                              ? teamA?.name
                              : bi > ai
                              ? teamB?.name
                              : null
                            : null;

                        return (
                          <div key={gIdx} className='flex items-center gap-3'>
                            <span className='text-xs text-gray-400 w-14 shrink-0'>
                              Game {gIdx + 1}
                            </span>
                            <div className='flex items-center gap-2 flex-1'>
                              <input
                                type='number'
                                min='0'
                                value={g.a}
                                onChange={(e) => updateGame(gIdx, 'a', e.target.value)}
                                className='w-16 text-center text-lg font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                              />
                              <span className='text-gray-300'>–</span>
                              <input
                                type='number'
                                min='0'
                                value={g.b}
                                onChange={(e) => updateGame(gIdx, 'b', e.target.value)}
                                className='w-16 text-center text-lg font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                              />
                              {gameWinner && (
                                <span className='text-xs text-gray-500 truncate'>
                                  {gameWinner} wins
                                </span>
                              )}
                            </div>
                            {draft.games.length > 1 && (
                              <button
                                onClick={() => removeGame(gIdx)}
                                className='text-gray-300 hover:text-red-400 transition-colors shrink-0'
                              >
                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={addGame}
                      className='mt-2 text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1'
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                      </svg>
                      Add game
                    </button>
                  </div>

                  {/* Live running total */}
                  {draftTotals && (draftTotals.a > 0 || draftTotals.b > 0) && (
                    <div className='flex items-center justify-center gap-3 py-1 bg-gray-50 rounded-lg'>
                      <span className='text-sm text-gray-500 truncate'>{teamA?.name}</span>
                      <span className='text-xl font-bold tabular-nums text-gray-800'>
                        {draftTotals.a}–{draftTotals.b}
                      </span>
                      <span className='text-sm text-gray-500 truncate'>{teamB?.name}</span>
                    </div>
                  )}

                  <button
                    onClick={() => saveRow(idx)}
                    disabled={
                      draft.games.filter((g) => g.a !== '' && g.b !== '').length === 0 ||
                      savingString
                    }
                    className='w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    {savingString ? 'Saving…' : `Save String ${row.string_number}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Racketball and beginner match rows */}
        {[
          { type: 'racketball', label: 'Racketball', abbr: 'RB', canScore: true },
          { type: 'beginner',   label: 'Beginner',   abbr: 'BG', canScore: true  },
        ].map(({ type, label, abbr, canScore }) => {
          const playerA = extraPlayers[type].a;
          const playerB = extraPlayers[type].b;
          if (!playerA && !playerB) return null;
          const bothSet = !!(playerA && playerB); // both slots filled (TBC counts)
          const bothReady = bothSet && playerA !== 'TBC' && playerB !== 'TBC';
          const result = extraResults[type];
          const isEditing = extraResultEditing === type;
          const gameScoreStr = result?.game_scores?.length
            ? result.game_scores.map((g) => `${g.team_a}–${g.team_b}`).join(', ')
            : null;

          return (
            <div
              key={type}
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${isEditing ? 'ring-2 ring-blue-300' : ''}`}
            >
              {!isEditing && (
                <div className='px-4 py-4'>
                  {/* Player names row */}
                  <div className='flex items-center gap-3 mb-3'>
                    <span className='text-xs font-bold text-gray-400 shrink-0 w-6'>{abbr}</span>
                    <div className='flex-1 flex items-center gap-2 min-w-0'>
                      <span className={`text-sm font-semibold truncate flex-1 ${playerA === 'TBC' ? 'text-gray-300 italic font-normal' : 'text-gray-800'}`}>
                        {playerA}
                      </span>
                      {result ? (
                        <span className='text-sm font-bold text-gray-700 shrink-0 tabular-nums'>
                          {result.team_a_games}–{result.team_b_games}
                        </span>
                      ) : (
                        <span className='text-xs text-gray-300 shrink-0'>vs</span>
                      )}
                      <span className={`text-sm font-semibold truncate flex-1 text-right ${playerB === 'TBC' ? 'text-gray-300 italic font-normal' : 'text-gray-800'}`}>
                        {playerB}
                      </span>
                    </div>
                    {!result && (
                      <button
                        onClick={() => removeExtraMatch(type)}
                        className='text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0'
                        title={`Remove ${label} match`}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Result summary or action buttons */}
                  {result ? (
                    <div className='flex items-center justify-between gap-3 pl-9'>
                      <div className='flex-1 min-w-0'>
                        {gameScoreStr
                          ? <p className='text-xs text-gray-400 leading-relaxed'>{gameScoreStr}</p>
                          : <p className='text-xs text-gray-400'>{result.team_a_games} games to {result.team_b_games}</p>
                        }
                      </div>
                      <button
                        onClick={() => openExtraEditor(type)}
                        className='text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 px-3 py-1.5 rounded-lg shrink-0 transition-colors'
                      >
                        Edit
                      </button>
                    </div>
                  ) : bothSet && (bothConfirmed || isEdit) ? (
                    <div className='flex gap-2 pl-9'>
                      {canScore && bothReady && (
                        <button
                          onClick={() => onScoreMatch({
                            isTeamRRExtra: true,
                            extraMatchType: type,
                            tournamentId,
                            fixtureId: fixture._id,
                            player1Name: playerA,
                            player2Name: playerB,
                            matchConfig: matchConfig || {},
                          })}
                          className='flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                        >
                          Score match
                        </button>
                      )}
                      <button
                        onClick={() => openExtraEditor(type)}
                        className={`flex-1 py-2.5 text-sm font-semibold border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors`}
                      >
                        Enter result
                      </button>
                    </div>
                  ) : bothSet ? (
                    <p className='pl-9 text-xs text-gray-400 italic'>Waiting for both teams to confirm</p>
                  ) : null}
                </div>
              )}

              {/* Inline result editor */}
              {isEditing && (
                <div className='px-4 py-4 space-y-5'>
                  <div className='flex items-center gap-3'>
                    <span className='text-xs font-bold text-gray-400 shrink-0 w-6'>{abbr}</span>
                    <div className='flex-1 flex items-center gap-2 min-w-0'>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1'>{playerA}</span>
                      <span className='text-gray-300 text-xs shrink-0'>vs</span>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1 text-right'>{playerB}</span>
                    </div>
                    <button
                      onClick={() => { setExtraResultEditing(null); setExtraResultDraft([]); }}
                      className='text-gray-300 hover:text-gray-500 shrink-0'
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                      </svg>
                    </button>
                  </div>

                  <div>
                    <div className='flex items-baseline justify-between mb-2'>
                      <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Game scores</span>
                      <span className='text-xs text-gray-400'>highest score wins</span>
                    </div>
                    <div className='space-y-2'>
                      {extraResultDraft.map((g, gIdx) => (
                        <div key={gIdx} className='flex items-center gap-3'>
                          <span className='text-xs text-gray-400 w-14 shrink-0'>Game {gIdx + 1}</span>
                          <div className='flex items-center gap-2 flex-1'>
                            <input
                              type='number' min='0' value={g.a}
                              onChange={(e) => {
                                const next = [...extraResultDraft];
                                next[gIdx] = { ...next[gIdx], a: e.target.value };
                                setExtraResultDraft(next);
                              }}
                              className='w-16 text-center text-lg font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                            />
                            <span className='text-gray-300'>–</span>
                            <input
                              type='number' min='0' value={g.b}
                              onChange={(e) => {
                                const next = [...extraResultDraft];
                                next[gIdx] = { ...next[gIdx], b: e.target.value };
                                setExtraResultDraft(next);
                              }}
                              className='w-16 text-center text-lg font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                            />
                          </div>
                          {extraResultDraft.length > 1 && (
                            <button
                              onClick={() => setExtraResultDraft((d) => d.filter((_, i) => i !== gIdx))}
                              className='text-gray-300 hover:text-red-400 transition-colors shrink-0'
                            >
                              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setExtraResultDraft((d) => [...d, { a: '', b: '' }])}
                      className='mt-2 text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1'
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                      </svg>
                      Add game
                    </button>
                  </div>

                  <button
                    onClick={() => saveExtraResult(type)}
                    disabled={extraResultDraft.filter((g) => g.a !== '' && g.b !== '').length === 0 || savingExtraResult}
                    className='w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    {savingExtraResult ? 'Saving…' : `Save ${label} Result`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Incomplete matches summary */}
        {(() => {
          const incompleteStrings = STRING_COUNT - persistedStrings.length;
          const incompleteExtras = ['racketball', 'beginner'].filter((type) => {
            const { a, b } = extraPlayers[type];
            return !!(a && b) && !extraResults[type];
          }).length;
          const total = incompleteStrings + incompleteExtras;
          if (total === 0) return null;
          return (
            <p className='text-center text-xs text-gray-400 pt-1'>
              {total} match{total !== 1 ? 'es' : ''} still to enter
            </p>
          );
        })()}
      </div>
      )}

      {/* Footer — hidden in scorecard mode */}
      {!scorecardMode && <div className='bg-white border-t px-4 lg:px-8 py-4 shrink-0'>
        <div className='max-w-2xl mx-auto space-y-3'>
          <div className='flex items-center justify-between'>
            <span
              className={`font-bold text-lg truncate flex-1 ${
                winner === 'a' ? 'text-green-600' : 'text-gray-700'
              }`}
            >
              {teamA?.name}
            </span>
            <span className='text-2xl font-bold tabular-nums tracking-tight mx-4 shrink-0'>
              <span className={winner === 'a' ? 'text-green-600' : ''}>{totals.a}</span>
              <span className='text-gray-300 mx-2'>–</span>
              <span className={winner === 'b' ? 'text-green-600' : ''}>{totals.b}</span>
            </span>
            <span
              className={`font-bold text-lg truncate flex-1 text-right ${
                winner === 'b' ? 'text-green-600' : 'text-gray-700'
              }`}
            >
              {teamB?.name}
            </span>
          </div>

          {winner && allPersisted && (
            <p className='text-center text-sm text-green-700 font-medium'>
              {winner === 'a' ? teamA?.name : teamB?.name} win
              {winReason === 'strings' && ' (countback: strings won)'}
              {winReason === 'points' && ' (countback: points won)'}
              {winReason === 'manual' && ' (tie-break)'}
            </p>
          )}

          {isTie && bothConfirmed && (
            <div className='space-y-2'>
              <p className='text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3'>
                Games, strings, and points are all level — pick the team that advances
              </p>
              <div className='flex gap-3'>
                <button
                  onClick={() => setManualWinnerOverride('a')}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    manualWinnerOverride === 'a'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Advance {teamA?.name}
                </button>
                <button
                  onClick={() => setManualWinnerOverride('b')}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    manualWinnerOverride === 'b'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Advance {teamB?.name}
                </button>
              </div>
            </div>
          )}

          {error && <p className='text-center text-sm text-red-600'>{error}</p>}

          <button
            onClick={handleComplete}
            disabled={!canComplete || submitting}
            className='w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          >
            {submitting ? 'Saving…' : isEdit ? 'Update Fixture' : 'Complete Fixture'}
          </button>

        </div>
      </div>}
    </div>
  );
}

TeamFixtureScreen.propTypes = {
  fixture: PropTypes.object.isRequired,
  teamA: PropTypes.object.isRequired,
  teamB: PropTypes.object.isRequired,
  tournamentId: PropTypes.string.isRequired,
  passphrase: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  onResultSaved: PropTypes.func.isRequired,
  onScoreMatch: PropTypes.func.isRequired,
  matchConfig: PropTypes.object,
  poolPlayers: PropTypes.array,
  racketballPlayers: PropTypes.array,
  beginnerPlayers: PropTypes.array,
  contextLabel: PropTypes.string,
};
