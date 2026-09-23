import { useEffect, useMemo, useState } from 'react';
import { useFantasyApp } from '@/hooks/use-fantasy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock3, Medal, Trophy, Users } from 'lucide-react';

const SCORE_VALUES = [20, 16, 13, 10, 8, 6] as const;
function scoreForPlace(place: number) {
  if (place >= 1 && place <= SCORE_VALUES.length) return SCORE_VALUES[place - 1] ?? 0;
  return place >= 7 && place <= 15 ? 2 : 0;
}

function ordinal(place: number) {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  if (place % 10 === 1) return `${place}st`;
  if (place % 10 === 2) return `${place}nd`;
  if (place % 10 === 3) return `${place}rd`;
  return `${place}th`;
}

type Placement = { place: number; contestantIds: string[]; result?: string };

type TeamWithHistory = {
  id: string;
  name: string;
  rank: number;
  roster?: string[];
  lineupHistory?: Record<string, string[]>;
  scoreHistory?: Record<string, number>;
};

export default function LiveRound() {
  const { data, currentTeam, contestants, teams, roundState, isLoading } = useFantasyApp();
  const roundResults = data?.roundResults ?? {};
  const availableRounds = useMemo(
    () => Object.keys(roundResults).map(Number).filter(Number.isFinite).sort((a, b) => a - b),
    [roundResults],
  );
  const defaultRound = availableRounds.at(-1) ?? roundState?.number ?? 1;
  const [selectedRound, setSelectedRound] = useState(defaultRound);

  useEffect(() => {
    if (!roundResults[String(selectedRound)] && availableRounds.length) {
      setSelectedRound(availableRounds.at(-1) ?? selectedRound);
    }
  }, [availableRounds, roundResults, selectedRound]);

  const result = roundResults[String(selectedRound)];
  const isFinal = result?.status === 'final';
  const enhancedCurrentTeam = currentTeam as (TeamWithHistory | undefined);
  const lineup = enhancedCurrentTeam?.lineupHistory?.[String(selectedRound)] ?? enhancedCurrentTeam?.roster ?? [];
  const rosterIds = enhancedCurrentTeam?.roster ?? [];
  const displayIds = Array.from(new Set([...lineup.slice(0, 10), ...rosterIds.slice(0, 10)])).slice(0, 10);
  const starterIds = new Set(lineup.slice(0, 7));

  const placementById = useMemo(() => {
    const map = new Map<string, { event: string; placement: Placement }>();
    for (const [event, groups] of Object.entries(result?.events ?? {})) {
      for (const placement of groups as Placement[]) {
        for (const id of placement.contestantIds) map.set(id, { event, placement });
      }
    }
    return map;
  }, [result]);

  const roundPointsForTeam = (team: TeamWithHistory) => {
    const saved = team.scoreHistory?.[String(selectedRound)];
    if (saved !== undefined) return Number(saved || 0);
    const teamLineup = team.lineupHistory?.[String(selectedRound)] ?? team.roster ?? [];
    return teamLineup.slice(0, 7).reduce((sum, id) => {
      const found = placementById.get(id);
      return sum + (found ? scoreForPlace(found.placement.place) : 0);
    }, 0);
  };

  const roundPoints = enhancedCurrentTeam ? roundPointsForTeam(enhancedCurrentTeam) : 0;

  const roundStandings = useMemo(() => {
    return (teams as TeamWithHistory[])
      .map((team) => ({ id: team.id, points: roundPointsForTeam(team) }))
      .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  }, [teams, selectedRound, placementById]);

  const roundFinish = enhancedCurrentTeam
    ? roundStandings.findIndex((team) => team.id === enhancedCurrentTeam.id) + 1
    : 0;
  const overallPosition = enhancedCurrentTeam?.rank ?? 0;
  const updatedLabel = result?.updatedAt
    ? new Date(result.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  if (isLoading) return <div className="py-16 text-center text-muted-foreground">Loading round recap…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">My Team</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Round {selectedRound} Recap</h1>
          <p className="text-muted-foreground mt-1">See exactly what each roster spot earned after the round is finalized.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((round) => (
            <Button key={round} size="sm" variant={selectedRound === round ? 'default' : 'outline'} onClick={() => setSelectedRound(round)}>
              R{round}
            </Button>
          ))}
        </div>
      </div>

      {!isFinal ? (
        <Card className="border-dashed">
          <CardContent className="p-6 flex items-start gap-3">
            <Clock3 className="w-5 h-5 mt-0.5 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-white">Round recap not posted yet</div>
              <div className="text-sm text-muted-foreground mt-1">
                Once Round {selectedRound} is finalized, this page will show every roster result, fantasy points earned, your round finish, and your overall league position.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Round {selectedRound} total</div>
                <div className="mt-1 text-4xl font-display font-black text-primary">{roundPoints}</div>
                <div className="text-sm text-muted-foreground">fantasy points</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Round finish</div>
                <div className="mt-1 text-4xl font-display font-black text-white">{roundFinish ? ordinal(roundFinish) : '—'}</div>
                <div className="text-sm text-muted-foreground">of {teams.length} teams</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall standing</div>
                <div className="mt-1 text-4xl font-display font-black text-white">{overallPosition ? ordinal(overallPosition) : '—'}</div>
                <div className="text-sm text-muted-foreground">after Round {selectedRound}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Roster Results
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Starters count toward your round total. Bench results are shown for reference and do not count.
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {displayIds.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No roster was saved for this round.</div>
              ) : (
                <div className="divide-y divide-border">
                  {displayIds.map((id) => {
                    const contestant = contestants.find((item) => item.id === id);
                    if (!contestant) return null;
                    const found = placementById.get(id);
                    const isStarter = starterIds.has(id);
                    const earnedPoints = found ? scoreForPlace(found.placement.place) : 0;
                    return (
                      <div key={id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white truncate">{contestant.name}</span>
                            <Badge variant={isStarter ? 'default' : 'secondary'}>{isStarter ? 'Starter' : 'Bench'}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {contestant.event}{contestant.role ? ` · ${contestant.role}` : ''}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 sm:min-w-[340px]">
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Place</div>
                            <div className="font-display font-bold text-white">{found ? ordinal(found.placement.place) : 'No place'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Score / time</div>
                            <div className="font-medium text-white">{found?.placement.result || '—'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Earned</div>
                            {isStarter ? (
                              <div className={`font-display font-black ${earnedPoints ? 'text-primary' : 'text-white'}`}>+{earnedPoints}</div>
                            ) : (
                              <div className="font-display font-bold text-muted-foreground">Bench</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-primary shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-white">Round {selectedRound} finalized</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {updatedLabel ? `Results finalized at ${updatedLabel}. ` : ''}Your round total and league standings have been updated.
                </div>
              </div>
              <Medal className="w-5 h-5 text-primary shrink-0" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
