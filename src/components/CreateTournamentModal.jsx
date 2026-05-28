import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable participant item component
const SortableParticipantItem = ({
  participant,
  index,
  onRemove,
  isMonrad,
  isHandicap,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.id || `participant-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      {isMonrad && (
        <div
          {...attributes}
          {...listeners}
          className='cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 8h16M4 16h16'
            />
          </svg>
        </div>
      )}
      <div className='flex items-center space-x-2 min-w-0 flex-1'>
        {!isHandicap && (
          <span className='text-sm font-medium text-gray-600 flex-shrink-0'>
            #{index + 1}
          </span>
        )}
        <span className='font-medium truncate'>{participant.name}</span>
      </div>
      <button
        type='button'
        onClick={() => onRemove(index)}
        className='text-red-500 hover:text-red-700 transition-colors flex-shrink-0'
      >
        <svg
          className='w-5 h-5'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
          />
        </svg>
      </button>
    </div>
  );
};

const emptyDivision = (name) => ({ name, teams: [] });
const emptyTeam = (name = '') => ({
  id: `team-${Date.now()}-${Math.random()}`,
  name,
  color: 'border-blue-500',
  roster: [
    { string_number: 1, player_name: '' },
    { string_number: 2, player_name: '' },
    { string_number: 3, player_name: '' },
    { string_number: 4, player_name: '' },
    { string_number: 5, player_name: '' },
  ],
});

const SUMMER_2026_PRESET = {
  name: 'Summer League 2026',
  format: 'team_round_robin',
  divisions: [
    {
      name: 'Division A',
      teams: [
        { name: 'Blue Fuse', roster: [
          { string_number: 1, player_name: 'Andy Ewings', is_captain: true },
          { string_number: 2, player_name: 'Jon Cordier' },
          { string_number: 3, player_name: 'James Gough' },
          { string_number: 4, player_name: 'Carolyn Chennels' },
          { string_number: 5, player_name: 'Nic Ross' },
        ]},
        { name: 'Watson Financial', roster: [
          { string_number: 1, player_name: 'Henry Duncanson', is_captain: true },
          { string_number: 2, player_name: 'Adam Conisbee' },
          { string_number: 3, player_name: 'Mark Ricketts' },
          { string_number: 4, player_name: 'Ian Ashworth' },
          { string_number: 5, player_name: 'Chris Stoaling' },
        ]},
        { name: 'Philip Clifford Design', roster: [
          { string_number: 1, player_name: 'Mark Radley' },
          { string_number: 2, player_name: 'Chris Osborne', is_captain: true },
          { string_number: 3, player_name: 'George Samios' },
          { string_number: 4, player_name: 'Julian Kashdan-Brown' },
          { string_number: 5, player_name: 'Thomas Osborne' },
        ]},
        { name: 'C.S. Simmons Engineering', roster: [
          { string_number: 1, player_name: 'Andy Killey' },
          { string_number: 2, player_name: 'Dave Major', is_captain: true },
          { string_number: 3, player_name: 'Mark Simmons' },
          { string_number: 4, player_name: 'Mark Hoskin' },
          { string_number: 5, player_name: 'Karl Sax' },
        ]},
      ],
    },
    {
      name: 'Division B',
      teams: [
        { name: 'PWM Training', roster: [
          { string_number: 1, player_name: 'Alisdair Wriglesworth' },
          { string_number: 2, player_name: 'Kevin Mountford' },
          { string_number: 3, player_name: 'Laurie Willis', is_captain: true },
          { string_number: 4, player_name: 'Mike Morris' },
          { string_number: 5, player_name: 'Gwill Lloyd' },
        ]},
        { name: 'Lovell Carpentry', roster: [
          { string_number: 1, player_name: 'Yuji Westmacott' },
          { string_number: 2, player_name: 'Richard Dixon', is_captain: true },
          { string_number: 3, player_name: 'Murray Kenneth' },
          { string_number: 4, player_name: 'Andy Rogers' },
          { string_number: 5, player_name: 'Guy Senior' },
        ]},
        { name: 'Brown Hen', roster: [
          { string_number: 1, player_name: 'Jono Sumner' },
          { string_number: 2, player_name: 'Brenda Pegrum' },
          { string_number: 3, player_name: 'Julian Ragless', is_captain: true },
          { string_number: 4, player_name: 'Jools Browning' },
          { string_number: 5, player_name: 'Sam Browning' },
        ]},
        { name: 'My Village Architect', roster: [
          { string_number: 1, player_name: 'Tim Jones' },
          { string_number: 2, player_name: 'Natalie Anwyll', is_captain: true },
          { string_number: 3, player_name: 'Jason Collins' },
          { string_number: 4, player_name: 'Ryan Burnham' },
          { string_number: 5, player_name: 'Hakan Aysan' },
        ]},
      ],
    },
  ],
  // fixture_dates keys are computed from team pair order within each division
  // Div A: [Blue Fuse, Watson Financial, Philip Clifford Design, CS Simmons]
  // D1F1=BF/WF, D1F2=BF/PCD, D1F3=BF/CSS, D1F4=WF/PCD, D1F5=WF/CSS, D1F6=PCD/CSS
  // Div B: [PWM, Lovell, Brown Hen, My Village]
  // D2F1=PWM/LC, D2F2=PWM/BH, D2F3=PWM/MVA, D2F4=LC/BH, D2F5=LC/MVA, D2F6=BH/MVA
  fixture_dates: {
    D1F1: '2026-07-15', D1F2: '2026-06-24', D1F3: '2026-07-08',
    D1F4: '2026-07-01', D1F5: '2026-06-17', D1F6: '2026-07-22',
    D2F1: '2026-07-15', D2F2: '2026-06-17', D2F3: '2026-07-01',
    D2F4: '2026-07-08', D2F5: '2026-06-24', D2F6: '2026-07-22',
  },
  pool_players: [
    { name: 'Oscar Lambert',    seed: 1 },
    { name: 'Oliver Tuncliffe', seed: 2 },
    { name: 'Jon Foulds',       seed: 2 },
    { name: 'Ben Warren',       seed: 2 },
    { name: 'Jeremy Goulding',  seed: 2 },
    { name: 'Rupert Larkin',    seed: 3 },
    { name: 'Julian Moore',     seed: 3 },
    { name: 'Matt Burn',        seed: 3 },
    { name: 'Angus Anderson',   seed: 3 },
    { name: 'Tom Wadsworth',    seed: 5 },
    { name: 'Wendy Harrison',   seed: 5 },
    { name: 'Eddie Spruit',     seed: 5 },
    { name: 'Martin Watson',    seed: 5 },
    { name: 'Rich Morris',      seed: 5 },
    { name: 'Andrew McGregor',  seed: 5 },
    { name: 'Adam Blezard',     seed: 5 },
    { name: 'Chris Lambert',    seed: 5 },
  ],
  racketball_players: [
    'Phil Cooney', 'Brendan Pergrum', 'Henry Duncanson', 'Jeremy Goulding',
    'Rupert Larkin', 'Jon Cordier', 'Mark Simmons', 'Mike Morris',
    'Tom Smith', 'James Scully',
  ],
  beginner_players: ['Claire Ackerman', 'Suzie Lawler', 'Jack Osborne'],
};

const fillSummer2026 = () => ({
  name: SUMMER_2026_PRESET.name,
  format: 'team_round_robin',
  divisions: SUMMER_2026_PRESET.divisions.map((div) => ({
    name: div.name,
    teams: div.teams.map((t) => ({
      id: `team-${Date.now()}-${Math.random()}`,
      name: t.name,
      color: 'border-blue-500',
      roster: t.roster,
    })),
  })),
  fixture_dates: SUMMER_2026_PRESET.fixture_dates,
  pool_players: SUMMER_2026_PRESET.pool_players.map((p, i) => ({ id: `pool-s26-${i}`, ...p })),
  racketball_players: SUMMER_2026_PRESET.racketball_players.map((name, i) => ({ id: `rb-s26-${i}`, name })),
  beginner_players: SUMMER_2026_PRESET.beginner_players.map((name, i) => ({ id: `bg-s26-${i}`, name })),
});

const TEST_DIVISIONS = [
  {
    name: 'Division A',
    teams: [
      { name: 'Brown Hen',          players: ['Alice Smith', 'Ben Clarke', 'Chris Day', 'Dan Evans', 'Ed Fox'] },
      { name: 'Kings Arms',         players: ['Fiona Gray', 'George Hall', 'Harry Ince', 'Ian Jones', 'Jack King'] },
      { name: 'Paget Arms',         players: ['Karen Lee', 'Liam Moon', 'Mike Nash', 'Nick Owen', 'Oliver Park'] },
      { name: 'Plume of Feathers',  players: ['Paul Quinn', 'Rachel Ross', 'Sam Stone', 'Tom Upton', 'Uma Vance'] },
      { name: 'Curry House',        players: ['Vera Ward', 'Will Xiao', 'Xena Young', 'Yusuf Zane', 'Zoe Adams'] },
    ],
  },
  {
    name: 'Division B',
    teams: [
      { name: 'White Hart',   players: ['Amy Baker', 'Brian Cole', 'Carol Dunn', 'David Edge', 'Emma Ford'] },
      { name: 'Red Lion',     players: ['Frank Grant', 'Grace Hill', 'Henry Irwin', 'Iris James', 'Jake Kent'] },
      { name: 'Crown Inn',    players: ['Laura Long', 'Mark Munn', 'Nina Norris', 'Oscar Pine', 'Peter Quinn'] },
      { name: 'Railway Tavern', players: ['Quinn Reed', 'Rosa Shaw', 'Steve Todd', 'Tracy Underwood', 'Uma Vale'] },
      { name: 'Bear Inn',     players: ['Victor Webb', 'Wendy Xin', 'Xavier York', 'Yasmin Zulu', 'Zack Allen'] },
    ],
  },
];

const makeTestDivisions = () =>
  TEST_DIVISIONS.map((div) => ({
    name: div.name,
    teams: div.teams.map((t) => ({
      id: `team-${Date.now()}-${Math.random()}`,
      name: t.name,
      color: 'border-blue-500',
      roster: t.players.map((player_name, i) => ({ string_number: i + 1, player_name })),
    })),
  }));

const CreateTournamentModal = ({ onClose, onSubmit, onUpdate, tournament, participants: initialParticipants }) => {
  const editMode = !!tournament;

  const [formData, setFormData] = useState(() => {
    if (editMode) {
      // Reconstruct divisions for team_round_robin from saved participants
      let divisions = [emptyDivision('Division A'), emptyDivision('Division B')];
      if (tournament.format === 'team_round_robin' && initialParticipants?.length > 0) {
        const divCount = tournament.config?.divisions?.count || 2;
        const byDiv = {};
        initialParticipants.forEach((p) => {
          if (p.is_pool || p.player_type) return;
          const idx = p.division_index ?? 0;
          if (!byDiv[idx]) byDiv[idx] = [];
          byDiv[idx].push(p);
        });
        divisions = Array.from({ length: divCount }, (_, i) => ({
          name: `Division ${String.fromCharCode(65 + i)}`,
          teams: (byDiv[i] || [])
            .sort((a, b) => (a.seed || 999) - (b.seed || 999))
            .map((p) => ({
              id: `team-${p._id}-${i}`,
              name: p.name,
              color: p.color || 'border-blue-500',
              roster: p.roster?.length > 0
                ? p.roster
                : [1, 2, 3, 4, 5].map((n) => ({ string_number: n, player_name: '' })),
            })),
        }));
      }

      return {
        name: tournament.name || '',
        format: tournament.format || 'single_elimination',
        venue: tournament.venue || '',
        description: tournament.description || '',
        start_date: tournament.start_date ? tournament.start_date.split('T')[0] : '',
        participants: (initialParticipants || [])
          .sort((a, b) => (a.seed || 999) - (b.seed || 999))
          .map((p, i) => ({ id: `participant-${i}`, name: p.name, seed: p.seed || i + 1, club: p.club || '', color: p.color || 'border-blue-500' })),
        matchSettings: {
          points_to_win: tournament.config?.match?.points_to_win || 15,
          best_of: tournament.config?.match?.best_of || 5,
          clear_points: tournament.config?.match?.clear_points || 2,
          is_handicap: tournament.config?.match?.is_handicap || false,
        },
        divisions,
        fixture_dates: tournament.config?.fixture_dates || {},
        pool_players: (initialParticipants || [])
          .filter((p) => p.is_pool)
          .map((p) => ({ id: `pool-${p._id}`, name: p.name, seed: p.seed })),
        racketball_players: (initialParticipants || [])
          .filter((p) => p.player_type === 'racketball')
          .map((p) => ({ id: `rb-${p._id}`, name: p.name })),
        beginner_players: (initialParticipants || [])
          .filter((p) => p.player_type === 'beginner')
          .map((p) => ({ id: `bg-${p._id}`, name: p.name })),
      };
    }
    return {
      name: '',
      format: 'single_elimination',
      venue: '',
      description: '',
      start_date: '',
      passphrase: '',
      participants: [],
      matchSettings: {
        points_to_win: 11,
        best_of: 5,
        clear_points: 2,
        is_handicap: false,
      },
      // Team round robin specific
      divisions: [emptyDivision('Division A'), emptyDivision('Division B')],
      fixture_dates: {},
      pool_players: [],
      racketball_players: [],
      beginner_players: [],
    };
  });

  const [availableFormats, setAvailableFormats] = useState([]);
  const [participantInput, setParticipantInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teamRrTab, setTeamRrTab] = useState('div-0');
  const [poolInput, setPoolInput] = useState({ name: '', seed: null });
  const [extraPlayerInput, setExtraPlayerInput] = useState({ racketball: '', beginner: '' });

  // Drag and drop sensors
  // PointerSensor needs a distance constraint so a small tap doesn't cancel the drag.
  // TouchSensor with a delay handles Android where pointer events are unreliable.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadFormats();
  }, []);

  const loadFormats = async () => {
    try {
      const formats = await api.getTournamentFormats();
      setAvailableFormats(formats);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading formats:', err);
      setError('Failed to load tournament formats');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addParticipant = () => {
    const name = participantInput.trim();
    if (!name) return;

    // Check for duplicates
    if (
      formData.participants.some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert('Participant already added');
      return;
    }

    const newParticipant = {
      id: `participant-${Date.now()}-${Math.random()}`, // Unique ID for drag-and-drop
      name,
      seed: formData.participants.length + 1,
      club: '',
      color: getRandomColor(),
    };

    setFormData((prev) => ({
      ...prev,
      participants: [...prev.participants, newParticipant],
    }));
    setParticipantInput('');
  };

  const removeParticipant = (index) => {
    setFormData((prev) => {
      const newParticipants = prev.participants.filter((_, i) => i !== index);
      // Update seeds to maintain order (for non-Monrad tournaments)
      if (prev.format !== 'monrad') {
        newParticipants.forEach((p, i) => {
          p.seed = i + 1;
        });
      }
      return {
        ...prev,
        participants: newParticipants,
      };
    });
  };


  const randomiseParticipants = () => {
    setFormData((prev) => {
      const shuffled = [...prev.participants].sort(() => Math.random() - 0.5);
      shuffled.forEach((p, i) => { p.seed = i + 1; });
      return { ...prev, participants: shuffled };
    });
  };

  const alphabetiseParticipants = () => {
    setFormData((prev) => {
      const sorted = [...prev.participants].sort((a, b) => a.name.localeCompare(b.name));
      sorted.forEach((p, i) => { p.seed = i + 1; });
      return { ...prev, participants: sorted };
    });
  };

  const addPoolPlayer = () => {
    if (!poolInput.name.trim() || !poolInput.seed) return;
    setFormData((prev) => ({
      ...prev,
      pool_players: [
        ...prev.pool_players,
        { id: `pool-${Date.now()}-${Math.random()}`, name: poolInput.name.trim(), seed: poolInput.seed },
      ],
    }));
    setPoolInput({ name: '', seed: null });
  };

  const removePoolPlayer = (id) => {
    setFormData((prev) => ({ ...prev, pool_players: prev.pool_players.filter((p) => p.id !== id) }));
  };

  const addExtraPlayer = (type) => {
    const name = extraPlayerInput[type].trim();
    if (!name) return;
    setFormData((prev) => ({
      ...prev,
      [`${type}_players`]: [
        ...(prev[`${type}_players`] || []),
        { id: `${type}-${Date.now()}-${Math.random()}`, name },
      ],
    }));
    setExtraPlayerInput((p) => ({ ...p, [type]: '' }));
  };

  const removeExtraPlayer = (type, id) => {
    setFormData((prev) => ({
      ...prev,
      [`${type}_players`]: prev[`${type}_players`].filter((p) => p.id !== id),
    }));
  };

  // Handle drag end for Monrad tournaments
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFormData((prev) => {
        const oldIndex = prev.participants.findIndex((p) => p.id === active.id);
        const newIndex = prev.participants.findIndex((p) => p.id === over.id);

        const newParticipants = arrayMove(
          prev.participants,
          oldIndex,
          newIndex
        );

        // Update seeds based on new order for Monrad
        if (prev.format === 'monrad') {
          newParticipants.forEach((p, i) => {
            p.seed = i + 1;
          });
        }

        return {
          ...prev,
          participants: newParticipants,
        };
      });
    }
  };

  const getRandomColor = () => {
    const colors = [
      'border-red-500',
      'border-blue-500',
      'border-green-500',
      'border-yellow-500',
      'border-purple-500',
      'border-pink-500',
      'border-indigo-500',
      'border-orange-500',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Tournament name is required');
      return;
    }

    const isTeamRR = formData.format === 'team_round_robin';

    if (isTeamRR) {
      const allTeams = formData.divisions.flatMap((d) => d.teams);
      if (allTeams.length < 2) {
        setError('Add at least 2 teams across all divisions');
        return;
      }
      const emptyDiv = formData.divisions.find((d) => d.teams.length === 0);
      if (emptyDiv) {
        setError(`${emptyDiv.name} has no teams — add at least one team or remove the division`);
        return;
      }
    } else if (formData.participants.length < 2) {
      setError('At least 2 participants are required');
      return;
    }

    try {
      setLoading(true);

      let participants, config;

      if (isTeamRR) {
        // Flatten divisions into a single participant list with seeds
        let seed = 1;
        participants = [
          ...formData.divisions.flatMap((div, divIdx) =>
            div.teams.map((team) => ({
              name: team.name,
              seed: seed++,
              color: team.color || 'border-blue-500',
              roster: team.roster.filter((r) => r.player_name.trim()),
              division_index: divIdx,
            }))
          ),
          ...formData.pool_players.map((p) => ({
            name: p.name,
            seed: p.seed,
            is_pool: true,
          })),
          ...(formData.racketball_players || []).map((p) => ({
            name: p.name,
            player_type: 'racketball',
          })),
          ...(formData.beginner_players || []).map((p) => ({
            name: p.name,
            player_type: 'beginner',
          })),
        ];
        config = {
          match: {
            best_of: formData.matchSettings.best_of,
            points_to_win: formData.matchSettings.points_to_win,
            clear_points: formData.matchSettings.clear_points,
          },
          divisions: { count: formData.divisions.length },
          ...(Object.keys(formData.fixture_dates).length > 0 && { fixture_dates: formData.fixture_dates }),
        };
      } else {
        participants = formData.participants.map(({ id, ...p }) => p);
        config = getDefaultConfig(formData.format);
      }

      const base = {
        name: formData.name.trim(),
        format: formData.format,
        ...(formData.venue.trim() && { venue: formData.venue.trim() }),
        ...(formData.description.trim() && { description: formData.description.trim() }),
        ...(formData.start_date && { start_date: formData.start_date }),
        config,
        participants,
      };

      if (editMode) {
        await onUpdate(base);
      } else {
        await onSubmit({ ...base, passphrase: formData.passphrase });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConfig = (format) => {
    const baseConfig = {
      match: {
        best_of: formData.matchSettings.best_of,
        points_to_win: formData.matchSettings.points_to_win,
        clear_points: formData.matchSettings.clear_points,
        is_handicap: formData.matchSettings.is_handicap,
      },
      courts: 1,
      min_rest_minutes: 20,
      allow_walkovers: true,
      tiebreakers: [
        'wins',
        'h2h',
        'game_diff',
        'point_diff',
        'fewest_walkovers',
        'random',
      ],
    };

    switch (format) {
      case 'round_robin':
        return {
          ...baseConfig,
          groups: {
            target_size: Math.min(formData.participants.length, 6),
            advance_per_group: 2,
            avoid_same_club: false,
          },
        };
      case 'pools_knockout':
        return {
          ...baseConfig,
          groups: {
            target_size: 4,
            advance_per_group: 2,
            avoid_same_club: false,
          },
          knockout: {
            consolation: false,
            draw_size: null,
          },
        };
      case 'single_elimination':
        return {
          ...baseConfig,
          knockout: {
            consolation: false,
            draw_size: null,
          },
        };
      default:
        return baseConfig;
    }
  };

  // ── Reusable field blocks (used in both layouts) ──────────────────────────

  const matchSettingsBlock = (
    <div className='space-y-3'>
      <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>Match Settings</p>
      <div>
        <label className='block text-xs font-medium text-gray-600 mb-1'>Points to Win</label>
        <select
          value={formData.matchSettings.points_to_win}
          onChange={(e) => setFormData((prev) => ({ ...prev, matchSettings: { ...prev.matchSettings, points_to_win: Number(e.target.value) } }))}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        >
          <option value={11}>11 Points</option>
          <option value={15}>15 Points</option>
        </select>
      </div>
      <div>
        <label className='block text-xs font-medium text-gray-600 mb-1'>Match Format</label>
        <select
          value={formData.matchSettings.best_of}
          onChange={(e) => setFormData((prev) => ({ ...prev, matchSettings: { ...prev.matchSettings, best_of: Number(e.target.value) } }))}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        >
          <option value={1}>Single Game</option>
          <option value={3}>Best of 3</option>
          <option value={5}>Best of 5</option>
        </select>
      </div>
      <div className='flex gap-2'>
        {[
          { label: '2 Clear', checked: formData.matchSettings.clear_points === 2, onChange: (v) => setFormData((prev) => ({ ...prev, matchSettings: { ...prev.matchSettings, clear_points: v ? 2 : 1 } })) },
          { label: 'Handicap', checked: formData.matchSettings.is_handicap, onChange: (v) => setFormData((prev) => { const updated = { ...prev, matchSettings: { ...prev.matchSettings, is_handicap: v } }; if (v && prev.participants.length > 0) { const shuffled = [...prev.participants].sort(() => Math.random() - 0.5); shuffled.forEach((p, i) => { p.seed = i + 1; }); updated.participants = shuffled; } return updated; }) },
        ].map(({ label, checked, onChange }) => (
          <label key={label} className='flex items-center gap-2 flex-1 p-2 bg-white rounded border border-gray-200 cursor-pointer hover:bg-gray-50 text-sm'>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
              {checked && <svg className='w-2.5 h-2.5 text-white' fill='currentColor' viewBox='0 0 20 20'><path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' /></svg>}
            </div>
            <span className='font-medium text-gray-700'>{label}</span>
            <input type='checkbox' checked={checked} onChange={(e) => onChange(e.target.checked)} className='sr-only' />
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className='fixed inset-0 bg-gray-100 z-50 flex flex-col'>
      <form onSubmit={handleSubmit} className='flex flex-col h-full min-h-0'>

        {/* ── Top bar ── */}
        <div className='bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 gap-3'>
          <div className='flex items-center gap-2 min-w-0'>
            <button type='button' onClick={onClose} className='p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
            <h1 className='text-base lg:text-xl font-bold text-gray-900 truncate'>
              {editMode ? 'Edit Tournament' : 'Create Tournament'}
            </h1>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <button type='button' onClick={onClose} className='hidden sm:block px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'>
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading || (formData.format !== 'team_round_robin' && formData.participants.length < 2)}
              className='px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap'
            >
              {loading
                ? (editMode ? 'Saving…' : 'Creating…')
                : (editMode
                  ? <><span className='sm:hidden'>Save</span><span className='hidden sm:inline'>Save Changes</span></>
                  : <><span className='sm:hidden'>Create</span><span className='hidden sm:inline'>Create Tournament</span></>
                )
              }
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className='bg-red-50 border-b border-red-200 text-red-700 px-6 py-3 text-sm shrink-0'>
            {error}
          </div>
        )}

        {/* ── Body: sidebar + main ── */}
        <div className='flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden'>

          {/* Left sidebar — settings */}
          <div className='lg:w-80 bg-white border-r lg:overflow-y-auto shrink-0 p-6 space-y-5'>

            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Tournament Name *</label>
              <input
                type='text'
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Enter tournament name'
                required
              />
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Format *</label>
              <select
                value={formData.format}
                onChange={(e) => handleInputChange('format', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                {availableFormats.map((fmt) => (
                  <option key={fmt.id} value={fmt.id}>{fmt.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Venue</label>
              <input
                type='text'
                value={formData.venue}
                onChange={(e) => handleInputChange('venue', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Optional'
              />
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Start Date</label>
              <input
                type='date'
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={2}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Optional'
              />
            </div>

            {!editMode && (
              <div>
                <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'>Passphrase *</label>
                <div className='relative'>
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={formData.passphrase || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, passphrase: e.target.value }))}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Set a passphrase'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassphrase((s) => !s)}
                    className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'
                    tabIndex={-1}
                  >
                    {showPassphrase
                      ? <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' /></svg>
                      : <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' /><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' /></svg>
                    }
                  </button>
                </div>
                <p className='text-xs text-gray-400 mt-1'>Needed to edit or start the tournament.</p>
              </div>
            )}

            {matchSettingsBlock}

          </div>

          {/* Right panel — participants / divisions */}
          <div className='flex-1 lg:overflow-y-auto p-6'>

            {/* ── Team Round Robin: tabbed divisions + pool ── */}
            {formData.format === 'team_round_robin' && (
              <div className='space-y-4'>

                {/* Tab bar */}
                <div className='flex items-center gap-2 flex-wrap'>
                  {formData.divisions.map((div, i) => (
                    <button
                      key={i}
                      type='button'
                      onClick={() => setTeamRrTab(`div-${i}`)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        teamRrTab === `div-${i}`
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {div.name}
                    </button>
                  ))}
                  <button
                    type='button'
                    onClick={() => setTeamRrTab('pool')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      teamRrTab === 'pool'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    Pool {formData.pool_players.length > 0 && `(${formData.pool_players.length})`}
                  </button>
                  <div className='ml-auto flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setFormData((prev) => ({ ...prev, ...fillSummer2026() }))}
                      className='text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-medium'
                    >
                      Fill Summer 2026
                    </button>
                    {import.meta.env.DEV && (
                      <button
                        type='button'
                        onClick={() => setFormData((prev) => ({ ...prev, name: prev.name || 'Summer Showdown 2025', passphrase: prev.passphrase || 'test', divisions: makeTestDivisions() }))}
                        className='text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 px-2 py-1 rounded font-medium'
                      >
                        Fill test data
                      </button>
                    )}
                    {teamRrTab !== 'pool' && (
                      <button
                        type='button'
                        onClick={() => {
                          const newIdx = formData.divisions.length;
                          setFormData((prev) => ({ ...prev, divisions: [...prev.divisions, emptyDivision(`Division ${String.fromCharCode(65 + prev.divisions.length)}`)] }));
                          setTeamRrTab(`div-${newIdx}`);
                        }}
                        className='text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap'
                      >
                        + Add Division
                      </button>
                    )}
                  </div>
                </div>

                {/* Division tab content */}
                {formData.divisions.map((div, divIdx) => teamRrTab === `div-${divIdx}` && (
                  <div key={divIdx} className='bg-white rounded-xl border border-gray-200 flex flex-col'>
                    {/* Division header */}
                    <div className='flex items-center gap-2 px-4 py-3 border-b bg-gray-50 rounded-t-xl'>
                      <input
                        type='text'
                        value={div.name}
                        onChange={(e) => setFormData((prev) => { const divisions = [...prev.divisions]; divisions[divIdx] = { ...divisions[divIdx], name: e.target.value }; return { ...prev, divisions }; })}
                        className='flex-1 font-bold text-gray-800 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none'
                      />
                      {formData.divisions.length > 1 && (
                        <button
                          type='button'
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, divisions: prev.divisions.filter((_, i) => i !== divIdx) }));
                            setTeamRrTab('div-0');
                          }}
                          className='text-xs text-red-400 hover:text-red-600'
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Team cards */}
                    <div className='p-3 space-y-2 flex-1'>
                      {div.teams.map((team, teamIdx) => (
                        <div key={team.id} className='bg-gray-50 rounded-lg p-3 space-y-2'>
                          <div className='flex items-center gap-2'>
                            <input
                              type='text'
                              value={team.name}
                              onChange={(e) => setFormData((prev) => { const divisions = [...prev.divisions]; const teams = [...divisions[divIdx].teams]; teams[teamIdx] = { ...teams[teamIdx], name: e.target.value }; divisions[divIdx] = { ...divisions[divIdx], teams }; return { ...prev, divisions }; })}
                              placeholder='Team name'
                              className='flex-1 font-medium border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
                            />
                            <button
                              type='button'
                              onClick={() => setFormData((prev) => { const divisions = [...prev.divisions]; divisions[divIdx] = { ...divisions[divIdx], teams: divisions[divIdx].teams.filter((_, i) => i !== teamIdx) }; return { ...prev, divisions }; })}
                              className='text-gray-300 hover:text-red-500 text-xl leading-none transition-colors'
                            >
                              ×
                            </button>
                          </div>
                          <div className='grid grid-cols-5 gap-1.5'>
                            {team.roster.map((row, strIdx) => (
                              <div key={strIdx} className='flex flex-col gap-0.5'>
                                <span className='text-xs text-gray-400 text-center'>S{row.string_number}</span>
                                <input
                                  type='text'
                                  value={row.player_name}
                                  onChange={(e) => setFormData((prev) => { const divisions = [...prev.divisions]; const teams = [...divisions[divIdx].teams]; const roster = [...teams[teamIdx].roster]; roster[strIdx] = { ...roster[strIdx], player_name: e.target.value }; teams[teamIdx] = { ...teams[teamIdx], roster }; divisions[divIdx] = { ...divisions[divIdx], teams }; return { ...prev, divisions }; })}
                                  placeholder='Name'
                                  className='w-full text-xs border border-gray-200 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 text-center'
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button
                        type='button'
                        onClick={() => setFormData((prev) => { const divisions = [...prev.divisions]; divisions[divIdx] = { ...divisions[divIdx], teams: [...divisions[divIdx].teams, emptyTeam()] }; return { ...prev, divisions }; })}
                        className='w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors'
                      >
                        + Add Team
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pool tab content */}
                {teamRrTab === 'pool' && (
                  <div className='space-y-4'>
                    {/* Add player form */}
                    <div className='bg-white rounded-xl border border-gray-200 p-4 space-y-3'>
                      <h3 className='text-sm font-semibold text-gray-700'>Add pool player</h3>
                      <input
                        type='text'
                        value={poolInput.name}
                        onChange={(e) => setPoolInput((p) => ({ ...p, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPoolPlayer(); } }}
                        placeholder='Player name'
                        className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                      <div>
                        <label className='block text-xs text-gray-500 mb-1.5'>String</label>
                        <div className='flex gap-2'>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type='button'
                              onClick={() => setPoolInput((p) => ({ ...p, seed: s }))}
                              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                poolInput.seed === s
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type='button'
                        onClick={addPoolPlayer}
                        disabled={!poolInput.name.trim() || !poolInput.seed}
                        className='w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                      >
                        Add Player
                      </button>
                    </div>

                    {/* Players grouped by string */}
                    {formData.pool_players.length === 0 && (
                      <p className='text-sm text-gray-400 text-center py-4'>No pool players added yet</p>
                    )}
                    {[
                      { label: '1', seeds: [1] },
                      { label: '2', seeds: [2] },
                      { label: '3', seeds: [3] },
                      { label: '4/5', seeds: [4, 5] },
                    ].map((group) => {
                      const players = formData.pool_players.filter((p) => group.seeds.includes(p.seed));
                      if (players.length === 0) return null;
                      return (
                        <div key={group.label} className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                          <div className='px-4 py-2.5 bg-gray-50 border-b'>
                            <h3 className='text-sm font-semibold text-gray-700'>String {group.label}</h3>
                          </div>
                          <div className='divide-y divide-gray-100'>
                            {players.map((p) => (
                              <div key={p.id} className='flex items-center justify-between px-4 py-2.5'>
                                <span className='text-sm text-gray-800'>{p.name}</span>
                                <button
                                  type='button'
                                  onClick={() => removePoolPlayer(p.id)}
                                  className='text-gray-300 hover:text-red-500 text-xl leading-none transition-colors'
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Racketball and Beginner sections */}
                    {[
                      { type: 'racketball', label: 'Racketball' },
                      { type: 'beginner',   label: 'Beginners'  },
                    ].map(({ type, label }) => {
                      const players = formData[`${type}_players`] || [];
                      return (
                        <div key={type} className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                          <div className='px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between'>
                            <h3 className='text-sm font-semibold text-gray-700'>{label}</h3>
                            <span className='text-xs text-gray-400'>{players.length} players</span>
                          </div>
                          <div className='divide-y divide-gray-100'>
                            {players.map((p) => (
                              <div key={p.id} className='flex items-center justify-between px-4 py-2.5'>
                                <span className='text-sm text-gray-800'>{p.name}</span>
                                <button
                                  type='button'
                                  onClick={() => removeExtraPlayer(type, p.id)}
                                  className='text-gray-300 hover:text-red-500 text-xl leading-none transition-colors'
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <div className='flex gap-2 px-3 py-2'>
                              <input
                                type='text'
                                value={extraPlayerInput[type]}
                                onChange={(e) => setExtraPlayerInput((p) => ({ ...p, [type]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtraPlayer(type); } }}
                                placeholder={`Add ${label.toLowerCase()} player`}
                                className='flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400'
                              />
                              <button
                                type='button'
                                onClick={() => addExtraPlayer(type)}
                                disabled={!extraPlayerInput[type].trim()}
                                className='text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fixture Schedule (division tabs only) */}
                {teamRrTab !== 'pool' && (() => {
                  const slots = formData.divisions.flatMap((div, divIdx) => {
                    const teams = div.teams || [];
                    const result = [];
                    let n = 1;
                    for (let i = 0; i < teams.length; i++) {
                      for (let j = i + 1; j < teams.length; j++) {
                        result.push({ matchNumber: `D${divIdx + 1}F${n}`, divisionName: div.name, teamA: teams[i].name || `Team ${i + 1}`, teamB: teams[j].name || `Team ${j + 1}` });
                        n++;
                      }
                    }
                    return result;
                  });
                  if (slots.length === 0) return null;
                  return (
                    <div className='border-t pt-4'>
                      <h2 className='text-sm font-semibold text-gray-700 mb-3'>Fixture Schedule <span className='font-normal text-gray-400'>(optional)</span></h2>
                      <div className='space-y-2'>
                        {slots.map((slot) => (
                          <div key={slot.matchNumber} className='flex items-center gap-3 py-1.5'>
                            <div className='flex-1 min-w-0'>
                              <span className='text-xs text-gray-400 mr-2'>{slot.divisionName}</span>
                              <span className='text-sm text-gray-700'>{slot.teamA} <span className='text-gray-400'>vs</span> {slot.teamB}</span>
                            </div>
                            <input
                              type='date'
                              value={formData.fixture_dates[slot.matchNumber] || ''}
                              onChange={(e) => setFormData((prev) => ({ ...prev, fixture_dates: { ...prev.fixture_dates, [slot.matchNumber]: e.target.value } }))}
                              className='text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 shrink-0'
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* ── Individual formats: participants ── */}
            {formData.format !== 'team_round_robin' && (
              <div className='max-w-xl'>
                <h2 className='text-sm font-semibold text-gray-700 mb-3'>Participants <span className='font-normal text-gray-400'>(minimum 2)</span></h2>

                <div className='flex gap-2 mb-4'>
                  <input
                    type='text'
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                    className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Enter participant name and press Enter'
                  />
                  <button type='button' onClick={addParticipant} className='bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700'>
                    Add
                  </button>
                </div>

                {formData.matchSettings.is_handicap && formData.participants.length > 0 && (
                  <div className='flex gap-2 mb-3'>
                    <button type='button' onClick={randomiseParticipants} className='flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50'>Randomise</button>
                    <button type='button' onClick={alphabetiseParticipants} className='flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50'>Alphabetise</button>
                  </div>
                )}

                {formData.format === 'monrad' && !formData.matchSettings.is_handicap && formData.participants.length > 0 && (
                  <div className='mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800'>
                    <strong>Monrad Seeding:</strong> Drag players to reorder seeds. Top = Seed #1 (strongest).
                  </div>
                )}

                <div className='space-y-2'>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={formData.participants.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                      {formData.participants.map((participant, index) => (
                        <SortableParticipantItem
                          key={participant.id}
                          participant={participant}
                          index={index}
                          onRemove={removeParticipant}
                          isMonrad={formData.format === 'monrad'}
                          isHandicap={formData.matchSettings.is_handicap}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>

                {formData.participants.length === 0 && (
                  <div className='text-center py-8 text-gray-400 text-sm'>No participants added yet</div>
                )}
              </div>
            )}

          </div>{/* end right panel */}
        </div>{/* end body */}
      </form>
    </div>
  );
};

export default CreateTournamentModal;
