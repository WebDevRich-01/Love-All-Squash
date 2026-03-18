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

const CreateTournamentModal = ({ onClose, onSubmit, onUpdate, tournament, participants: initialParticipants }) => {
  const editMode = !!tournament;

  const [formData, setFormData] = useState(() => {
    if (editMode) {
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
        points_to_win: 15,
        best_of: 5,
        clear_points: 2,
        is_handicap: false,
      },
    };
  });

  const [availableFormats, setAvailableFormats] = useState([]);
  const [participantInput, setParticipantInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

    if (formData.participants.length < 2) {
      setError('At least 2 participants are required');
      return;
    }

    try {
      setLoading(true);

      const participants = formData.participants.map(({ id, ...p }) => p);
      const config = getDefaultConfig(formData.format);
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

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b'>
            <h2 className='text-2xl font-bold text-gray-900'>
              {editMode ? 'Edit Tournament' : 'Create Tournament'}
            </h2>
            <button
              type='button'
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 transition-colors'
            >
              <svg
                className='w-6 h-6'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          <div className='p-6 space-y-6'>
            {/* Error message */}
            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg'>
                {error}
              </div>
            )}

            {/* Basic details */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Tournament Name *
                </label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='Enter tournament name'
                  required
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Format *
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => handleInputChange('format', e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {availableFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Venue
                </label>
                <input
                  type='text'
                  value={formData.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='Enter venue'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Start Date
                </label>
                <input
                  type='date'
                  value={formData.start_date}
                  onChange={(e) =>
                    handleInputChange('start_date', e.target.value)
                  }
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange('description', e.target.value)
                }
                rows={3}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Optional tournament description'
              />
            </div>

            {/* Passphrase (create mode only) */}
            {!editMode && (
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Passphrase *
                </label>
                <div className='relative'>
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={formData.passphrase || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, passphrase: e.target.value }))}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='Set a passphrase for editing this tournament'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassphrase((s) => !s)}
                    className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'
                    tabIndex={-1}
                    aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showPassphrase ? (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                      </svg>
                    ) : (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                    )}
                  </button>
                </div>
                <p className='text-xs text-gray-500 mt-1'>
                  Required to edit or start the tournament. Share with trusted organisers only.
                </p>
              </div>
            )}

            {/* Match Settings */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Match Settings
              </label>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg'>
                <div>
                  <label className='block text-xs font-medium text-gray-600 mb-1'>
                    Points to Win
                  </label>
                  <select
                    value={formData.matchSettings.points_to_win}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        matchSettings: { ...prev.matchSettings, points_to_win: Number(e.target.value) },
                      }))
                    }
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value={11}>11 Points</option>
                    <option value={15}>15 Points</option>
                  </select>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-600 mb-1'>
                    Match Format
                  </label>
                  <select
                    value={formData.matchSettings.best_of}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        matchSettings: { ...prev.matchSettings, best_of: Number(e.target.value) },
                      }))
                    }
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value={1}>Single Game</option>
                    <option value={3}>Best of 3</option>
                    <option value={5}>Best of 5</option>
                  </select>
                </div>

                <div className='flex items-end'>
                  <label className='flex items-center gap-3 p-2 bg-white rounded border border-gray-300 cursor-pointer hover:bg-gray-50 w-full'>
                    <div className='relative flex-shrink-0'>
                      <input
                        type='checkbox'
                        checked={formData.matchSettings.clear_points === 2}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            matchSettings: { ...prev.matchSettings, clear_points: e.target.checked ? 2 : 1 },
                          }))
                        }
                        className='sr-only'
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        formData.matchSettings.clear_points === 2
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}>
                        {formData.matchSettings.clear_points === 2 && (
                          <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className='text-sm font-medium text-gray-700'>2 Clear</span>
                  </label>
                </div>

                <div className='flex items-end'>
                  <label className='flex items-center gap-3 p-2 bg-white rounded border border-gray-300 cursor-pointer hover:bg-gray-50 w-full'>
                    <div className='relative flex-shrink-0'>
                      <input
                        type='checkbox'
                        checked={formData.matchSettings.is_handicap}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => {
                            const updated = {
                              ...prev,
                              matchSettings: { ...prev.matchSettings, is_handicap: checked },
                            };
                            if (checked && prev.participants.length > 0) {
                              const shuffled = [...prev.participants].sort(() => Math.random() - 0.5);
                              shuffled.forEach((p, i) => { p.seed = i + 1; });
                              updated.participants = shuffled;
                            }
                            return updated;
                          });
                        }}
                        className='sr-only'
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        formData.matchSettings.is_handicap
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}>
                        {formData.matchSettings.is_handicap && (
                          <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                            <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className='text-sm font-medium text-gray-700'>Handicap</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Participants * (minimum 2)
              </label>

              {/* Add participant input */}
              <div className='flex space-x-2 mb-4'>
                <input
                  type='text'
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addParticipant())
                  }
                  className='flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='Enter participant name'
                />
                <button
                  type='button'
                  onClick={addParticipant}
                  className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
                >
                  Add
                </button>
              </div>

              {/* Randomise / Alphabetise buttons (handicap only) */}
              {formData.matchSettings.is_handicap && formData.participants.length > 0 && (
                <div className='flex gap-2 mb-3'>
                  <button
                    type='button'
                    onClick={randomiseParticipants}
                    className='flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    Randomise
                  </button>
                  <button
                    type='button'
                    onClick={alphabetiseParticipants}
                    className='flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    Alphabetise
                  </button>
                </div>
              )}

              {/* Participants list */}
              {formData.format === 'monrad' &&
                !formData.matchSettings.is_handicap &&
                formData.participants.length > 0 && (
                  <div className='mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                    <p className='text-sm text-blue-800'>
                      <strong>Monrad Seeding:</strong> Drag players to reorder
                      their seeds. Top = Seed #1 (strongest), Bottom = highest
                      seed (weakest).
                    </p>
                  </div>
                )}

              <div className='space-y-2 max-h-48 overflow-y-auto'>
                {formData.format === 'monrad' ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={formData.participants.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.participants.map((participant, index) => (
                        <SortableParticipantItem
                          key={participant.id}
                          participant={participant}
                          index={index}
                          onRemove={removeParticipant}
                          isMonrad={true}
                          isHandicap={formData.matchSettings.is_handicap}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={formData.participants.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.participants.map((participant, index) => (
                        <SortableParticipantItem
                          key={participant.id}
                          participant={participant}
                          index={index}
                          onRemove={removeParticipant}
                          isMonrad={false}
                          isHandicap={formData.matchSettings.is_handicap}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {formData.participants.length === 0 && (
                <div className='text-center py-4 text-gray-500'>
                  No participants added yet
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-end space-x-3 p-6 border-t bg-gray-50'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading || formData.participants.length < 2}
              className='px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {loading ? (editMode ? 'Saving...' : 'Creating...') : (editMode ? 'Save Changes' : 'Create Tournament')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
