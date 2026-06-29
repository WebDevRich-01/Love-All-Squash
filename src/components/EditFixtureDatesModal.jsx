import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

function toDateInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDisplay(isoString) {
  if (!isoString) return 'No date set';
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

const isEditable = (m) => m.status !== 'completed' && m.status !== 'walkover';

const sortByDate = (fixtures) =>
  [...fixtures].sort((a, b) => {
    if (!a.scheduled_at && !b.scheduled_at) return 0;
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return new Date(a.scheduled_at) - new Date(b.scheduled_at);
  });

export default function EditFixtureDatesModal({ tournamentId, matches, participants, groups, onClose, onSaved }) {
  const participantMap = useMemo(() => {
    const map = {};
    participants.forEach((p) => { map[p._id?.toString()] = p; });
    return map;
  }, [participants]);

  const sections = useMemo(() => {
    if (groups.length > 0) {
      const byGroup = groups.reduce((acc, g) => {
        acc[g._id] = { group: g, fixtures: [] };
        return acc;
      }, {});
      matches.forEach((m) => {
        if (m.group_id && byGroup[m.group_id]) byGroup[m.group_id].fixtures.push(m);
      });
      return Object.values(byGroup)
        .sort((a, b) => a.group.name.localeCompare(b.group.name))
        .filter((s) => s.fixtures.length > 0)
        .map((s) => ({ ...s, fixtures: sortByDate(s.fixtures) }));
    }
    return [{ group: null, fixtures: sortByDate(matches) }];
  }, [matches, groups]);

  const [drafts, setDrafts] = useState(() => {
    const init = {};
    matches.forEach((m) => { init[m._id] = toDateInput(m.scheduled_at); });
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const getName = (match, side) => {
    const pid = match[`participant_${side}`]?.participant_id?.toString();
    return (pid && participantMap[pid]?.name)
      || match[`participant_${side}`]?.name
      || '?';
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const changed = matches.filter(
        (m) => isEditable(m) && drafts[m._id] !== toDateInput(m.scheduled_at)
      );
      await Promise.all(
        changed.map((m) =>
          api.updateFixtureSchedule(
            tournamentId,
            m._id,
            drafts[m._id] ? new Date(drafts[m._id]).toISOString() : null
          )
        )
      );
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save dates');
      setSaving(false);
    }
  };

  const hasChanges = matches
    .filter(isEditable)
    .some((m) => drafts[m._id] !== toDateInput(m.scheduled_at));

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50'>
      <div className='bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl lg:max-w-4xl flex flex-col max-h-[90vh]'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-4 border-b shrink-0'>
          <div>
            <h2 className='text-lg font-bold text-gray-900'>Edit fixture dates</h2>
            <p className='text-xs text-gray-500 mt-0.5'>Changes only affect scheduling — no results are affected</p>
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4'>×</button>
        </div>

        {/* Fixture list — sections side by side on desktop */}
        <div className='flex-1 overflow-y-auto px-5 py-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {sections.map(({ group, fixtures }) => (
              <div key={group?._id ?? 'all'}>
                {group && (
                  <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'>
                    {group.name}
                  </h3>
                )}
                <div className='space-y-2'>
                  {fixtures.map((m) => {
                    const editable = isEditable(m);
                    return (
                      <div
                        key={m._id}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 ${editable ? 'bg-gray-50' : 'bg-white border border-gray-100 opacity-60'}`}
                      >
                        <div className='flex-1 min-w-0'>
                          <span className='text-sm font-medium text-gray-800 truncate block'>
                            {getName(m, 'a')}
                            <span className='text-gray-400 font-normal mx-1.5'>vs</span>
                            {getName(m, 'b')}
                          </span>
                          {!editable && (
                            <span className='text-xs text-green-700 font-medium'>Completed</span>
                          )}
                        </div>
                        {editable ? (
                          <input
                            type='date'
                            value={drafts[m._id]}
                            onChange={(e) => setDrafts((d) => ({ ...d, [m._id]: e.target.value }))}
                            className='text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white shrink-0'
                          />
                        ) : (
                          <span className='text-sm text-gray-400 shrink-0 tabular-nums'>
                            {formatDisplay(m.scheduled_at)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className='px-5 py-4 border-t space-y-3 shrink-0'>
          {error && <p className='text-sm text-red-600 text-center'>{error}</p>}
          <div className='flex gap-3'>
            <button
              onClick={onClose}
              className='flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className='flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

EditFixtureDatesModal.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  matches: PropTypes.array.isRequired,
  participants: PropTypes.array.isRequired,
  groups: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};
