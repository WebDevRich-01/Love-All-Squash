/**
 * Reshapes a completed Team Round Robin tournament's detail response
 * (`{ participants, groups }` from api.getTournament(id)) into the
 * `formData` shape CreateTournamentModal uses for the Team Round Robin
 * Playoff setup screen — each division's final standings position becomes
 * the team's playoff seed, and pool/racketball/beginner players carry over
 * unchanged so they're still available as lineup suggestions in the playoff.
 *
 * Returns { divisions, poolPlayers, racketballPlayers, beginnerPlayers, warnings } —
 * divisions may be shorter/incomplete if the source tournament isn't a clean
 * 2-division x 4-team shape; warnings describes what to double-check rather
 * than failing silently.
 */
export function buildPlayoffDivisionsFromRoundRobin({ participants, groups }) {
  const warnings = [];

  if (!groups || groups.length === 0) {
    return { divisions: null, poolPlayers: [], racketballPlayers: [], beginnerPlayers: [], warnings: ['Source tournament has no divisions to import'] };
  }

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const usedGroups = sortedGroups.slice(0, 2);
  if (sortedGroups.length > 2) {
    warnings.push(
      `Source tournament has ${sortedGroups.length} divisions — only the first 2 (${usedGroups
        .map((g) => g.name)
        .join(', ')}) were imported`
    );
  } else if (sortedGroups.length < 2) {
    warnings.push(`Source tournament only has ${sortedGroups.length} division — the playoff needs 2`);
  }

  const participantById = new Map((participants || []).map((p) => [String(p._id), p]));

  const divisions = usedGroups.map((group) => {
    const standings = [...(group.standings || [])].sort(
      (a, b) => (a.position || 999) - (b.position || 999)
    );
    if (standings.length !== 4) {
      warnings.push(`${group.name} has ${standings.length} team${standings.length === 1 ? '' : 's'} — expected 4`);
    }

    const teams = standings.slice(0, 4).map((s, i) => {
      const participant = participantById.get(String(s.participant_id));
      return {
        id: `team-import-${s.participant_id}-${Date.now()}-${i}`,
        name: participant?.name || s.name || `Team ${i + 1}`,
        color: participant?.color || 'border-blue-500',
        position: s.position || i + 1,
        roster:
          participant?.roster?.length > 0
            ? participant.roster
            : [1, 2, 3, 4, 5].map((n) => ({ string_number: n, player_name: '' })),
      };
    });

    return { name: group.name, teams };
  });

  const poolPlayers = (participants || [])
    .filter((p) => p.is_pool)
    .map((p) => ({ id: `pool-import-${p._id}`, name: p.name, seed: p.seed }));
  const racketballPlayers = (participants || [])
    .filter((p) => p.player_type === 'racketball')
    .map((p) => ({ id: `rb-import-${p._id}`, name: p.name }));
  const beginnerPlayers = (participants || [])
    .filter((p) => p.player_type === 'beginner')
    .map((p) => ({ id: `bg-import-${p._id}`, name: p.name }));

  return { divisions, poolPlayers, racketballPlayers, beginnerPlayers, warnings };
}
