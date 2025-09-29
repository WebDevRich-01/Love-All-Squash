import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
        <span className='text-sm font-medium text-gray-600 flex-shrink-0'>
          #{index + 1}
        </span>
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

const CreateTournamentModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    format: 'single_elimination',
    venue: '',
    description: '',
    start_date: '',
    participants: [],
  });

  const [availableFormats, setAvailableFormats] = useState([]);
  const [participantInput, setParticipantInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
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
      console.error('Error loading formats:', err);
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

  const updateParticipantSeed = (index, seed) => {
    const seedNum = parseInt(seed) || 0;
    setFormData((prev) => ({
      ...prev,
      participants: prev.participants.map((p, i) =>
        i === index ? { ...p, seed: seedNum } : p
      ),
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

    if (formData.participants.length < 2) {
      setError('At least 2 participants are required');
      return;
    }

    try {
      setLoading(true);

      const tournamentData = {
        name: formData.name.trim(),
        format: formData.format,
        venue: formData.venue.trim(),
        description: formData.description.trim(),
        start_date: formData.start_date || null,
        participants: formData.participants,
        config: getDefaultConfig(formData.format),
      };

      await onSubmit(tournamentData);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConfig = (format) => {
    const baseConfig = {
      match: {
        best_of: 5,
        points_to_win: 15,
        clear_points: 2,
        scoring: 'traditional',
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
              Create Tournament
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

              {/* Participants list */}
              {formData.format === 'monrad' &&
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
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  // Non-Monrad tournaments use the original interface
                  formData.participants.map((participant, index) => (
                    <div
                      key={participant.id || index}
                      className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'
                    >
                      <div className='flex-1'>
                        <span className='font-medium'>{participant.name}</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <label className='text-sm text-gray-600'>Seed:</label>
                        <input
                          type='number'
                          min='1'
                          value={participant.seed}
                          onChange={(e) =>
                            updateParticipantSeed(index, e.target.value)
                          }
                          className='w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
                        />
                      </div>
                      <button
                        type='button'
                        onClick={() => removeParticipant(index)}
                        className='text-red-500 hover:text-red-700 transition-colors'
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
                  ))
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
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
