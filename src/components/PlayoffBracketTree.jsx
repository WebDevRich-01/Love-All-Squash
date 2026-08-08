import PropTypes from 'prop-types';

// Status visual language matches MonradTournamentView's MatchTile for consistency
// across bracket-style tournament views.
const STATUS_STYLES = {
  pending: { border: 'border-gray-300', bg: 'bg-gray-50', chip: 'bg-gray-100 text-gray-600', text: 'Pending' },
  ready: { border: 'border-green-500', bg: 'bg-green-50', chip: 'bg-green-100 text-green-800', text: 'Ready' },
  live: { border: 'border-yellow-500', bg: 'bg-yellow-50', chip: 'bg-yellow-100 text-yellow-800', text: 'In Progress' },
  completed: { border: 'border-blue-500', bg: 'bg-blue-50', chip: 'bg-blue-100 text-blue-800', text: 'Complete' },
  walkover: { border: 'border-blue-500', bg: 'bg-blue-50', chip: 'bg-blue-100 text-blue-800', text: 'Walkover' },
};

const formatFixtureDate = (isoString) =>
  new Date(isoString).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

// Which terminal matches decide which final placements.
const TERMINALS = [
  { matchNumber: 'PINT-F', winnerPosition: 1, loserPosition: 2 },
  { matchNumber: 'PINT-3V4', winnerPosition: 3, loserPosition: 4 },
  { matchNumber: 'HP-F', winnerPosition: 5, loserPosition: 6 },
  { matchNumber: 'HP-7V8', winnerPosition: 7, loserPosition: 8 },
];

const PlayoffBracketTree = ({ matches, onOpenFixture }) => {
  const byNumber = Object.fromEntries((matches || []).map((m) => [m.match_number, m]));

  const Side = ({ side, label, winnerName }) => {
    const isWinner = winnerName != null && label === winnerName;
    return (
      <div className='flex items-center justify-between gap-2'>
        <span className={`font-medium truncate ${side?.type !== 'participant' ? 'text-gray-400 italic' : 'text-gray-800'}`}>
          {label}
        </span>
        {isWinner && <span className='text-green-600 font-bold text-xs shrink-0'>W</span>}
      </div>
    );
  };

  const BracketMatch = ({ match, label, tbdA, tbdB }) => {
    if (!match) return null;
    const style = STATUS_STYLES[match.status] || STATUS_STYLES.pending;
    const a = match.participant_a;
    const b = match.participant_b;
    // Preview cards (draft-mode, synthesized client-side) have no _id and are never clickable.
    const clickable = a?.type === 'participant' && b?.type === 'participant' && !!match._id;
    const winnerName = match.result?.winner_name || null;

    const sideLabel = (side, tbd) => {
      if (side?.type !== 'participant') return tbd;
      const games = match.result ? (side === a ? match.result.team_a_games_total : match.result.team_b_games_total) : null;
      return games != null ? `${side.name} - ${games}` : side.name;
    };

    return (
      <button
        type='button'
        disabled={!clickable}
        onClick={() => clickable && onOpenFixture(match)}
        className={`w-full text-left border-2 rounded-lg p-3 transition-all ${style.border} ${style.bg} ${
          clickable ? 'hover:shadow-md cursor-pointer' : 'cursor-default opacity-90'
        }`}
      >
        <div className='flex items-center justify-between mb-2'>
          <span className='text-xs font-semibold text-gray-500'>{label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.chip}`}>{style.text}</span>
        </div>
        <div className='space-y-1 text-sm'>
          <Side side={a} label={sideLabel(a, tbdA)} winnerName={winnerName} />
          <div className='text-center text-gray-300 text-xs'>vs</div>
          <Side side={b} label={sideLabel(b, tbdB)} winnerName={winnerName} />
        </div>
        {match.scheduled_at && (
          <p className='text-xs text-gray-400 mt-2'>{formatFixtureDate(match.scheduled_at)}</p>
        )}
      </button>
    );
  };

  const BracketSection = ({ title, children }) => (
    <div className='space-y-2'>
      <h4 className='text-sm font-semibold text-gray-500'>{title}</h4>
      <div className='space-y-3'>{children}</div>
    </div>
  );

  const ResultColumn = () => {
    const placementFor = (position) => {
      const terminal = TERMINALS.find((t) => t.winnerPosition === position || t.loserPosition === position);
      const match = byNumber[terminal.matchNumber];
      if (!match || !(match.status === 'completed' || match.status === 'walkover') || !match.result) return 'tbc';
      return terminal.winnerPosition === position ? match.result.winner_name : match.result.loser_name;
    };

    return (
      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        <div className='divide-y divide-gray-100'>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((position) => (
            <div key={position} className='flex items-center gap-3 px-4 py-2.5'>
              <span className='text-sm font-bold text-gray-400 w-6 shrink-0'>{position}</span>
              <span className={`text-sm truncate ${placementFor(position) === 'tbc' ? 'text-gray-300 italic' : 'font-medium text-gray-800'}`}>
                {placementFor(position)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const pintFinal = (
    <BracketMatch match={byNumber['PINT-F']} label='Final' tbdA='TBD — winner of Semi-Final A' tbdB='TBD — winner of Semi-Final B' />
  );
  const pint34 = (
    <BracketMatch match={byNumber['PINT-3V4']} label='3rd/4th Play-off' tbdA='TBD — loser of Semi-Final A' tbdB='TBD — loser of Semi-Final B' />
  );
  const hpFinal = (
    <BracketMatch match={byNumber['HP-F']} label='Final' tbdA='TBD — winner of Semi-Final A' tbdB='TBD — winner of Semi-Final B' />
  );
  const hp78 = (
    <BracketMatch match={byNumber['HP-7V8']} label='7th/8th Play-off' tbdA='TBD — loser of Semi-Final A' tbdB='TBD — loser of Semi-Final B' />
  );

  return (
    <>
      {/* Mobile: each column reads top-to-bottom as its own block — alignment between
          columns doesn't matter once they're stacked, so no grid needed here. */}
      <div className='lg:hidden space-y-6'>
        <div className='space-y-6'>
          <h3 className='text-lg font-bold text-gray-900'>Semi Finals</h3>
          <BracketSection title='Pint'>
            <BracketMatch match={byNumber['PINT-SF-A']} label='Semi-Final A' tbdA='TBD' tbdB='TBD' />
            <BracketMatch match={byNumber['PINT-SF-B']} label='Semi-Final B' tbdA='TBD' tbdB='TBD' />
          </BracketSection>
          <BracketSection title='Half Pint'>
            <BracketMatch match={byNumber['HP-SF-A']} label='Semi-Final A' tbdA='TBD' tbdB='TBD' />
            <BracketMatch match={byNumber['HP-SF-B']} label='Semi-Final B' tbdA='TBD' tbdB='TBD' />
          </BracketSection>
        </div>
        <div className='space-y-6'>
          <h3 className='text-lg font-bold text-gray-900'>Finals</h3>
          <BracketSection title='Pint'>{pintFinal}{pint34}</BracketSection>
          <BracketSection title='Half Pint'>{hpFinal}{hp78}</BracketSection>
        </div>
        <div className='space-y-6'>
          <h3 className='text-lg font-bold text-gray-900'>Result</h3>
          <ResultColumn />
        </div>
      </div>

      {/* Desktop: Semi Finals and Finals are two columns of ONE grid, so each row (Pint
          heading, SF-A/Final, SF-B/3rd-4th, Half Pint heading, ...) is sized by its
          tallest cell — keeping the two columns' cards aligned even when one side has
          extra content (e.g. a scheduled date) the other doesn't yet. */}
      <div className='hidden lg:grid lg:grid-cols-[1fr_1fr_0.7fr] gap-x-6 gap-y-4 items-start'>
        <h3 className='text-lg font-bold text-gray-900'>Semi Finals</h3>
        <h3 className='text-lg font-bold text-gray-900'>Finals</h3>
        <h3 className='text-lg font-bold text-gray-900'>Result</h3>

        <h4 className='text-sm font-semibold text-gray-500'>Pint</h4>
        <h4 className='text-sm font-semibold text-gray-500'>Pint</h4>
        <div className='col-start-3 row-start-2 row-span-6'>
          <ResultColumn />
        </div>

        <BracketMatch match={byNumber['PINT-SF-A']} label='Semi-Final A' tbdA='TBD' tbdB='TBD' />
        {pintFinal}

        <BracketMatch match={byNumber['PINT-SF-B']} label='Semi-Final B' tbdA='TBD' tbdB='TBD' />
        {pint34}

        <h4 className='text-sm font-semibold text-gray-500 mt-2'>Half Pint</h4>
        <h4 className='text-sm font-semibold text-gray-500 mt-2'>Half Pint</h4>

        <BracketMatch match={byNumber['HP-SF-A']} label='Semi-Final A' tbdA='TBD' tbdB='TBD' />
        {hpFinal}

        <BracketMatch match={byNumber['HP-SF-B']} label='Semi-Final B' tbdA='TBD' tbdB='TBD' />
        {hp78}
      </div>
    </>
  );
};

PlayoffBracketTree.propTypes = {
  matches: PropTypes.array.isRequired,
  onOpenFixture: PropTypes.func.isRequired,
};

export default PlayoffBracketTree;
