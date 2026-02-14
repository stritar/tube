/**
 * Advance simulation by one tick. Pure function: state in, state out.
 */

import type { SimState, Train, Passenger, LineSegment } from './state.js';
import { nextPassengerId } from './state.js';

const TRAIN_SPEED = 0.05; // progress per tick along segment
const SPAWN_CHANCE = 0.15; // chance to spawn a passenger per tick per station
const MAX_PASSENGERS_PER_TRAIN = 50;

export function tick(state: SimState): SimState {
  let next = { ...state, tick: state.tick + 1 };

  // Move trains
  next = moveTrains(next);

  // Board/alight passengers
  next = updatePassengers(next);

  // Spawn new passengers (simple: random origin/dest among stations)
  next = spawnPassengers(next);

  return next;
}

function moveTrains(state: SimState): SimState {
  const trains = state.trains.map((t) => {
    let progress = t.progress + TRAIN_SPEED;
    let segmentIndex = t.segmentIndex;
    const line = state.lines.find((l) => l.id === t.lineId);
    if (!line || line.segmentIds.length === 0) return t;
    const segCount = line.segmentIds.length;
    while (progress >= 1 && segmentIndex < segCount - 1) {
      progress -= 1;
      segmentIndex += 1;
    }
    if (progress >= 1) progress = progress % 1;
    return { ...t, progress, segmentIndex };
  });
  return { ...state, trains };
}

function updatePassengers(state: SimState): SimState {
  let servedCount = state.servedCount;
  const passengers = state.passengers
    .map((p): Passenger | null => {
      if (p.state === 'arrived') return null;
      if (p.state === 'on_train' && p.trainId) {
        const train = state.trains.find((t) => t.id === p.trainId);
        if (!train) return p;
        const line = state.lines.find((l) => l.id === train.lineId);
        if (!line) return p;
        const segId = line.segmentIds[train.segmentIndex];
        const seg = state.segments.get(segId);
        if (!seg) return p;
        // Arriving at toStation when progress >= 1 (we check at end of segment)
        if (train.progress >= 0.99 && seg.toStationId === p.destinationStationId) {
          servedCount += 1;
          return { ...p, state: 'arrived' as const };
        }
        return p;
      }
      // waiting: try to board a train at same station
      const atStation = state.stations.find((s) => s.id === p.originStationId);
      if (!atStation) return p;
      for (const train of state.trains) {
        const line = state.lines.find((l) => l.id === train.lineId);
        if (!line) continue;
        const segId = line.segmentIds[train.segmentIndex];
        const seg = state.segments.get(segId);
        if (!seg) continue;
        const atThisStation =
          (train.segmentIndex === 0 && train.progress < 0.1 && seg.fromStationId === p.originStationId) ||
          (train.progress >= 0.9 && seg.toStationId === p.originStationId);
        if (!atThisStation) continue;
        const onTrain = state.passengers.filter(
          (x) => x.state === 'on_train' && x.trainId === train.id
        );
        if (onTrain.length >= MAX_PASSENGERS_PER_TRAIN) continue;
        return {
          ...p,
          state: 'on_train' as const,
          trainId: train.id,
        };
      }
      return p;
    })
    .filter((p): p is Passenger => p !== null);
  return { ...state, passengers, servedCount };
}

function spawnPassengers(state: SimState): SimState {
  if (state.stations.length < 2) return state;
  const newPassengers: Passenger[] = [];
  for (const origin of state.stations) {
    if (Math.random() > SPAWN_CHANCE) continue;
    const others = state.stations.filter((s) => s.id !== origin.id);
    const dest = others[Math.floor(Math.random() * others.length)];
    newPassengers.push({
      id: nextPassengerId(),
      originStationId: origin.id,
      destinationStationId: dest.id,
      state: 'waiting',
    });
  }
  return {
    ...state,
    passengers: [...state.passengers, ...newPassengers],
  };
}
