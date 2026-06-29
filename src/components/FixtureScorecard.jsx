import PropTypes from 'prop-types';

const COLS = 'grid-cols-[4.5rem_1fr_3rem_1fr_3rem]';

function computeBreakdown(strings, extraResults, result) {
  const rbResult = extraResults.racketball;
  const bgResult = extraResults.beginner;

  let stringA = 0, stringB = 0;
  strings.filter((s) => s.persisted).forEach((s) => {
    stringA += s.team_a_games || 0;
    stringB += s.team_b_games || 0;
  });

  const rbA = rbResult ? (rbResult.team_a_games || 0) : 0;
  const rbB = rbResult ? (rbResult.team_b_games || 0) : 0;
  const bgA = bgResult ? (bgResult.team_a_games || 0) : 0;
  const bgB = bgResult ? (bgResult.team_b_games || 0) : 0;

  const baseA = stringA + rbA + (rbResult ? 1 : 0) + bgA + (bgResult ? 1 : 0);
  const baseB = stringB + rbB + (rbResult ? 1 : 0) + bgB + (bgResult ? 1 : 0);

  const storedA = result?.team_a_league_points;
  const storedB = result?.team_b_league_points;

  let winBonusA, winBonusB;

  if (storedA != null && storedB != null) {
    // Back-calculate win bonus from stored totals — more reliable than ID comparison
    winBonusA = Math.max(0, storedA - baseA);
    winBonusB = Math.max(0, storedB - baseB);
  } else {
    // Fallback: derive from winner_id
    const teamAId = result?.winner_id?.toString ? result.winner_id.toString() : null;
    winBonusA = teamAId ? 2 : 0;
    winBonusB = teamAId ? 0 : 0;
  }

  const teamAWon = winBonusA > winBonusB;

  return { teamAWon, winBonusA, winBonusB, rbResult, bgResult };
}

function DataRow({ label, playerA, playerB, ptsA, ptsB, topBorder }) {
  const aWins = ptsA > ptsB;
  const bWins = ptsB > ptsA;
  return (
    <div className={`grid ${COLS} border-b border-gray-100 ${topBorder ? 'border-t-2 border-t-gray-200' : ''}`}>
      <div className='py-3 px-2 bg-gray-50 text-xs font-bold text-gray-500 text-center flex items-center justify-center border-r border-gray-100'>
        {label}
      </div>
      <div className={`py-3 px-3 text-sm truncate ${aWins ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
        {playerA || <span className='text-gray-300 italic'>—</span>}
      </div>
      <div className={`py-3 text-center text-sm font-bold tabular-nums ${aWins ? 'text-green-600' : 'text-gray-700'}`}>
        {ptsA}
      </div>
      <div className={`py-3 px-3 text-sm truncate text-right ${bWins ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
        {playerB || <span className='text-gray-300 italic'>—</span>}
      </div>
      <div className={`py-3 text-center text-sm font-bold tabular-nums ${bWins ? 'text-green-600' : 'text-gray-700'}`}>
        {ptsB}
      </div>
    </div>
  );
}

function BonusRow({ label, ptsA, ptsB, topBorder }) {
  return (
    <div className={`grid ${COLS} border-b border-gray-100 bg-blue-50 ${topBorder ? 'border-t-2 border-t-gray-200' : ''}`}>
      <div className='py-2.5 px-2 bg-blue-100 text-xs font-bold text-blue-500 text-center flex items-center justify-center border-r border-blue-100 leading-tight'>
        {label}
      </div>
      <div className='py-2.5 px-3' />
      <div className='py-2.5 text-center text-sm font-bold tabular-nums text-blue-700'>{ptsA}</div>
      <div className='py-2.5 px-3' />
      <div className='py-2.5 text-center text-sm font-bold tabular-nums text-blue-700'>{ptsB}</div>
    </div>
  );
}

export default function FixtureScorecard({ fixture, teamA, teamB, strings, extraPlayers, extraResults }) {
  const result = fixture.result || {};
  const { teamAWon, winBonusA, winBonusB, rbResult, bgResult } = computeBreakdown(
    strings, extraResults, result
  );

  const displayTotalA = result.team_a_league_points;
  const displayTotalB = result.team_b_league_points;

  const filledStrings = strings.filter((s) => s.persisted);

  return (
    <div className='bg-white rounded-xl shadow-sm overflow-hidden'>
      {/* Team name header */}
      <div className={`grid ${COLS}`}>
        <div className='bg-gray-100 border-b border-r border-gray-200 p-3' />
        <div className='col-span-2 bg-blue-600 text-white py-3 px-3 font-bold text-sm text-center border-b'>
          {teamA?.name}
        </div>
        <div className='col-span-2 bg-slate-600 text-white py-3 px-3 font-bold text-sm text-center border-b'>
          {teamB?.name}
        </div>
      </div>

      {/* Column sub-headers */}
      <div className={`grid ${COLS} bg-gray-50 border-b border-gray-200`}>
        <div className='py-1.5 px-2 text-xs font-medium text-gray-400 text-center border-r border-gray-100'>
          Match
        </div>
        <div className='py-1.5 px-3 text-xs font-medium text-gray-400'>Player</div>
        <div className='py-1.5 text-xs font-medium text-gray-400 text-center'>Pts</div>
        <div className='py-1.5 px-3 text-xs font-medium text-gray-400 text-right'>Player</div>
        <div className='py-1.5 text-xs font-medium text-gray-400 text-center'>Pts</div>
      </div>

      {/* All match rows: strings, then RB, then BG */}
      {filledStrings.map((s) => (
        <DataRow
          key={s.string_number}
          label={`S${s.string_number}`}
          playerA={s.team_a_player}
          playerB={s.team_b_player}
          ptsA={s.team_a_games}
          ptsB={s.team_b_games}
        />
      ))}

      {rbResult && (
        <DataRow
          label='RB'
          playerA={extraPlayers.racketball.a !== 'TBC' ? extraPlayers.racketball.a : null}
          playerB={extraPlayers.racketball.b !== 'TBC' ? extraPlayers.racketball.b : null}
          ptsA={rbResult.team_a_games}
          ptsB={rbResult.team_b_games}
          topBorder
        />
      )}

      {bgResult && (
        <DataRow
          label='BG'
          playerA={extraPlayers.beginner.a !== 'TBC' ? extraPlayers.beginner.a : null}
          playerB={extraPlayers.beginner.b !== 'TBC' ? extraPlayers.beginner.b : null}
          ptsA={bgResult.team_a_games}
          ptsB={bgResult.team_b_games}
          topBorder={!rbResult}
        />
      )}

      {/* Bonus rows — separated from match rows by a top border on the first one */}
      {rbResult && <BonusRow label='RB+' ptsA={1} ptsB={1} topBorder />}
      {bgResult && <BonusRow label='BG+' ptsA={1} ptsB={1} topBorder={!rbResult} />}
      <BonusRow label='Win+' ptsA={winBonusA} ptsB={winBonusB} topBorder={!(rbResult || bgResult)} />

      {/* Total */}
      <div className={`grid ${COLS} border-t-2 border-gray-300`}>
        <div className='py-4 px-2 bg-gray-100 text-xs font-bold text-gray-600 text-center flex items-center justify-center border-r border-gray-200'>
          Total
        </div>
        <div className='py-4 col-span-1 bg-gray-50' />
        <div
          className={`py-4 text-center text-xl font-bold tabular-nums bg-gray-50 ${
            teamAWon ? 'text-green-600' : 'text-gray-700'
          }`}
        >
          {displayTotalA ?? '—'}
        </div>
        <div className='py-4 col-span-1 bg-gray-50' />
        <div
          className={`py-4 text-center text-xl font-bold tabular-nums bg-gray-50 ${
            !teamAWon ? 'text-green-600' : 'text-gray-700'
          }`}
        >
          {displayTotalB ?? '—'}
        </div>
      </div>
    </div>
  );
}

FixtureScorecard.propTypes = {
  fixture: PropTypes.object.isRequired,
  teamA: PropTypes.object.isRequired,
  teamB: PropTypes.object.isRequired,
  strings: PropTypes.array.isRequired,
  extraPlayers: PropTypes.object.isRequired,
  extraResults: PropTypes.object.isRequired,
};

DataRow.propTypes = {
  label: PropTypes.string.isRequired,
  playerA: PropTypes.string,
  playerB: PropTypes.string,
  ptsA: PropTypes.number.isRequired,
  ptsB: PropTypes.number.isRequired,
  topBorder: PropTypes.bool,
};

BonusRow.propTypes = {
  label: PropTypes.string.isRequired,
  ptsA: PropTypes.number.isRequired,
  ptsB: PropTypes.number.isRequired,
  topBorder: PropTypes.bool,
};
