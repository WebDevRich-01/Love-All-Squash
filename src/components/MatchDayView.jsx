import PropTypes from 'prop-types';

const STRING_COUNT = 5;

function getStringResult(fixture, stringNumber) {
  const source = fixture.status === 'completed'
    ? fixture.result?.string_results
    : fixture.draft_string_results;
  return source?.find((s) => s.string_number === stringNumber) ?? null;
}

function getPlayerName(fixture, side, stringNumber) {
  const lineup = side === 'a' ? (fixture.team_a_lineup || []) : (fixture.team_b_lineup || []);
  return lineup.find((l) => l.string_number === stringNumber)?.player_name || '';
}

function MatchRow({ abbr, playerA, playerB, result }) {
  const done = !!result;
  const aWon = done && result.team_a_games > result.team_b_games;
  const bWon = done && result.team_b_games > result.team_a_games;
  return (
    <div className='flex items-center px-5 gap-3 flex-1 min-h-0'>
      <span className='text-sm font-bold text-gray-300 w-7 shrink-0'>{abbr}</span>
      <span className={`flex-1 text-lg font-semibold truncate ${
        aWon ? 'text-gray-900' : done ? 'text-gray-400' : 'text-gray-700'
      }`}>
        {playerA || <span className='text-gray-300 font-normal italic text-base'>TBD</span>}
      </span>
      <span className={`text-xl font-bold tabular-nums shrink-0 w-14 text-center ${
        done ? 'text-gray-900' : 'text-gray-200'
      }`}>
        {done ? `${result.team_a_games}–${result.team_b_games}` : 'vs'}
      </span>
      <span className={`flex-1 text-lg font-semibold truncate text-right ${
        bWon ? 'text-gray-900' : done ? 'text-gray-400' : 'text-gray-700'
      }`}>
        {playerB || <span className='text-gray-300 font-normal italic text-base'>TBD</span>}
      </span>
    </div>
  );
}

MatchRow.propTypes = {
  abbr: PropTypes.string.isRequired,
  playerA: PropTypes.string,
  playerB: PropTypes.string,
  result: PropTypes.object,
};

function FixturePanel({ fixture }) {
  const completedStrings = fixture.status === 'completed'
    ? (fixture.result?.string_results || [])
    : (fixture.draft_string_results || []);

  const rbResult = fixture.racketball_result?.team_a_games != null ? fixture.racketball_result : null;
  const bgResult = fixture.beginner_result?.team_a_games != null ? fixture.beginner_result : null;

  // Running game tally — mirrors the tournament scoring formula
  let aGames = 0, bGames = 0;
  completedStrings.forEach((s) => {
    aGames += s.team_a_games || 0;
    bGames += s.team_b_games || 0;
  });
  if (rbResult) { aGames += rbResult.team_a_games || 0; bGames += rbResult.team_b_games || 0; }
  if (bgResult) { aGames += bgResult.team_a_games || 0; bGames += bgResult.team_b_games || 0; }

  const hasRB = !!(fixture.team_a_racketball_player && fixture.team_b_racketball_player);
  const hasBG = !!(fixture.team_a_beginner_player && fixture.team_b_beginner_player);

  const teamA = fixture.participant_a?.name || '—';
  const teamB = fixture.participant_b?.name || '—';

  const strings = Array.from({ length: STRING_COUNT }, (_, i) => {
    const sn = i + 1;
    const result = getStringResult(fixture, sn);
    return {
      sn,
      result,
      playerA: result?.team_a_player || getPlayerName(fixture, 'a', sn),
      playerB: result?.team_b_player || getPlayerName(fixture, 'b', sn),
    };
  });

  return (
    <div className='flex-1 flex flex-col bg-white rounded-2xl shadow-md overflow-hidden min-w-0'>
      {/* Team header */}
      <div className='bg-blue-700 text-white px-5 py-4 shrink-0'>
        <div className='flex items-center gap-3'>
          <span className='flex-1 text-xl font-bold truncate leading-tight'>{teamA}</span>
          <span className='text-4xl font-black tabular-nums shrink-0 leading-none'>
            {aGames}–{bGames}
          </span>
          <span className='flex-1 text-xl font-bold truncate text-right leading-tight'>{teamB}</span>
        </div>
      </div>

      {/* Match rows — flex-1 distributes height evenly */}
      <div className='flex-1 flex flex-col divide-y divide-gray-100 min-h-0'>
        {strings.map(({ sn, result, playerA, playerB }) => (
          <MatchRow key={sn} abbr={`S${sn}`} playerA={playerA} playerB={playerB} result={result} />
        ))}
        {hasRB && (
          <MatchRow
            abbr='RB'
            playerA={fixture.team_a_racketball_player}
            playerB={fixture.team_b_racketball_player}
            result={rbResult}
          />
        )}
        {hasBG && (
          <MatchRow
            abbr='BG'
            playerA={fixture.team_a_beginner_player}
            playerB={fixture.team_b_beginner_player}
            result={bgResult}
          />
        )}
      </div>
    </div>
  );
}

FixturePanel.propTypes = {
  fixture: PropTypes.object.isRequired,
};

export default function MatchDayView({ matches }) {
  const todayStr = new Date().toDateString();

  const todayFixtures = matches.filter((m) => {
    if (!m.scheduled_at) return false;
    return new Date(m.scheduled_at).toDateString() === todayStr;
  });

  return (
    <div className='h-full flex flex-col bg-gray-100 p-4 gap-4 overflow-hidden'>
      {todayFixtures.length === 0 ? (
        <div className='flex-1 flex items-center justify-center'>
          <p className='text-gray-400 text-2xl font-medium'>No fixtures scheduled for today</p>
        </div>
      ) : (
        <div className='flex-1 flex flex-col lg:flex-row gap-4 min-h-0'>
          {todayFixtures.slice(0, 2).map((fixture) => (
            <FixturePanel key={fixture._id} fixture={fixture} />
          ))}
        </div>
      )}
    </div>
  );
}

MatchDayView.propTypes = {
  matches: PropTypes.array.isRequired,
};
