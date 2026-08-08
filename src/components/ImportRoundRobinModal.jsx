import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';
import { buildPlayoffDivisionsFromRoundRobin } from '../utils/importRoundRobinDivisions';

const ImportRoundRobinModal = ({ onClose, onImport }) => {
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // { divisions, poolPlayers, racketballPlayers, beginnerPlayers, warnings, sourceName }
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await api.getTournaments();
        setTournaments(
          all.filter((t) => t.format === 'team_round_robin' && t.status === 'completed')
        );
      } catch (err) {
        setError(err.message || 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectTournament = async (tournament) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const detail = await api.getTournament(tournament._id);
      const { divisions, poolPlayers, racketballPlayers, beginnerPlayers, warnings } = buildPlayoffDivisionsFromRoundRobin(detail);
      if (!divisions) {
        setError(warnings.join('; ') || 'Could not read divisions from this tournament');
        return;
      }
      setSelected({ divisions, poolPlayers, racketballPlayers, beginnerPlayers, warnings, sourceName: tournament.name });
    } catch (err) {
      setError(err.message || 'Failed to load tournament detail');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto'>
        <h2 className='text-xl font-bold text-gray-900 mb-1'>Import from Round Robin</h2>
        <p className='text-sm text-gray-500 mb-5'>
          Pull teams, rosters, and final standings from a completed Team Round Robin tournament.
        </p>

        {error && (
          <div className='bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4'>
            {error}
          </div>
        )}

        {!selected ? (
          <div className='space-y-3'>
            {loading && <p className='text-sm text-gray-400 text-center py-4'>Loading tournaments…</p>}

            {!loading && tournaments.length === 0 && !error && (
              <p className='text-sm text-gray-400 text-center py-4'>
                No completed Team Round Robin tournaments found.
              </p>
            )}

            {!loading &&
              tournaments.map((t) => (
                <button
                  key={t._id}
                  onClick={() => selectTournament(t)}
                  disabled={loadingDetail}
                  className='w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
                >
                  <div className='font-medium text-gray-900'>{t.name}</div>
                  {t.venue && <div className='text-xs text-gray-400'>{t.venue}</div>}
                </button>
              ))}

            <button
              onClick={onClose}
              className='w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm'
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className='space-y-4'>
            <p className='text-sm text-gray-700'>
              Importing from <span className='font-semibold'>{selected.sourceName}</span>:
            </p>

            {selected.warnings.length > 0 && (
              <div className='bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1'>
                {selected.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            <div className='space-y-3'>
              {selected.divisions.map((div) => (
                <div key={div.name} className='border border-gray-200 rounded-lg p-3'>
                  <p className='text-sm font-semibold text-gray-800 mb-1'>{div.name}</p>
                  <ul className='text-sm text-gray-600 space-y-0.5'>
                    {div.teams.map((team) => (
                      <li key={team.id}>
                        {team.position ? `${team.position}. ` : ''}
                        {team.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {(selected.poolPlayers.length > 0 || selected.racketballPlayers.length > 0 || selected.beginnerPlayers.length > 0) && (
              <p className='text-xs text-gray-500'>
                Also importing {selected.poolPlayers.length} pool player{selected.poolPlayers.length === 1 ? '' : 's'},{' '}
                {selected.racketballPlayers.length} racketball, {selected.beginnerPlayers.length} beginner
              </p>
            )}

            <div className='flex gap-3'>
              <button
                onClick={() => setSelected(null)}
                className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Back
              </button>
              <button
                onClick={() => onImport(selected)}
                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                Use this data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

ImportRoundRobinModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
};

export default ImportRoundRobinModal;
