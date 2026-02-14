/**
 * Advance simulation by one tick. Pure function: state in, state out.
 */

import type { SimState, Train, Passenger, PlannedLine, Station, Node } from './state.js';
import {
  nextPassengerId,
  nextNodeId,
  nextStationId,
  nextSegmentId,
  nextLineId,
  nextTrainId,
} from './state.js';

const TRAIN_SPEED = 0.15; // progress per tick along segment (faster)
const DWELL_TICKS = 50; // 10 seconds at 200ms per tick — stop at each station
const SPAWN_CHANCE = 0.15; // chance to spawn a passenger per tick per station
const MAX_PASSENGERS_PER_TRAIN = 50;

function isStationAtNode(state: SimState, nodeId: string): boolean {
  return state.stations.some((s) => s.nodeId === nodeId);
}

export function tick(state: SimState): SimState {
  let next = { ...state, tick: state.tick + 1 };

  // Advance planned lines (construction countdown); convert to real when done
  next = processPlannedLines(next);

  // Move trains
  next = moveTrains(next);

  // Board/alight passengers
  next = updatePassengers(next);

  // Spawn new passengers (simple: random origin/dest among stations)
  next = spawnPassengers(next);

  return next;
}

function processPlannedLines(state: SimState): SimState {
  const stillPlanning: PlannedLine[] = [];
  let next = state;

  for (const planned of state.plannedLines) {
    const remaining = planned.constructionRemainingTicks - 1;
    if (remaining > 0) {
      stillPlanning.push({ ...planned, constructionRemainingTicks: remaining });
    } else {
      next = convertPlannedLineToReal(next, planned);
    }
  }

  return { ...next, plannedLines: stillPlanning };
}

/** Convert a planned line (path) into stations, segments, one line, and one train. */
function convertPlannedLineToReal(state: SimState, planned: PlannedLine): SimState {
  const path = planned.path;
  if (path.length < 2) return state;

  const newNodes: Node[] = [];
  const nodeIdsByKey = new Map<string, string>();

  for (const p of path) {
    const key = `${p.x},${p.y}`;
    const existingNode = state.nodes.find((n) => n.x === p.x && n.y === p.y);
    if (existingNode) {
      nodeIdsByKey.set(key, existingNode.id);
    } else {
      const nodeId = nextNodeId();
      nodeIdsByKey.set(key, nodeId);
      newNodes.push({ id: nodeId, x: p.x, y: p.y });
    }
  }

  const segmentIds: string[] = [];
  const segments = new Map(state.segments);
  for (let i = 0; i < path.length - 1; i++) {
    const fromKey = `${path[i].x},${path[i].y}`;
    const toKey = `${path[i + 1].x},${path[i + 1].y}`;
    const fromNodeId = nodeIdsByKey.get(fromKey)!;
    const toNodeId = nodeIdsByKey.get(toKey)!;
    if (fromNodeId === toNodeId) continue;
    const segId = nextSegmentId();
    segments.set(segId, { fromNodeId, toNodeId });
    segmentIds.push(segId);
  }

  if (segmentIds.length === 0) return state;

  const firstNodeId = nodeIdsByKey.get(`${path[0].x},${path[0].y}`)!;
  const lastNodeId = nodeIdsByKey.get(`${path[path.length - 1].x},${path[path.length - 1].y}`)!;

  const newStations: Station[] = [];
  const hasStationAtFirst = state.stations.some((s) => s.nodeId === firstNodeId);
  const hasStationAtLast = state.stations.some((s) => s.nodeId === lastNodeId);
  if (!hasStationAtFirst) {
    const stationId = nextStationId();
    newStations.push({
      id: stationId,
      nodeId: firstNodeId,
      x: path[0].x,
      y: path[0].y,
    });
  }
  if (!hasStationAtLast && lastNodeId !== firstNodeId) {
    const stationId = nextStationId();
    newStations.push({
      id: stationId,
      nodeId: lastNodeId,
      x: path[path.length - 1].x,
      y: path[path.length - 1].y,
    });
  }

  const lineId = nextLineId();
  const trainId = nextTrainId();
  const line = { id: lineId, segmentIds };
  const train: Train = {
    id: trainId,
    lineId,
    segmentIndex: 0,
    progress: 0,
    direction: 1,
    dwellTicksRemaining: 0,
    dwellAtNodeId: null,
  };

  return {
    ...state,
    nodes: [...state.nodes, ...newNodes],
    stations: [...state.stations, ...newStations],
    segments,
    lines: [...state.lines, line],
    trains: [...state.trains, train],
  };
}

function moveTrains(state: SimState): SimState {
  const trains = state.trains.map((t) => {
    const line = state.lines.find((l) => l.id === t.lineId);
    if (!line || line.segmentIds.length === 0) return t;
    const segCount = line.segmentIds.length;
    let { progress, segmentIndex, direction, dwellTicksRemaining, dwellAtNodeId } = t;

    if (dwellTicksRemaining > 0) {
      return { ...t, dwellTicksRemaining: dwellTicksRemaining - 1 };
    }
    dwellAtNodeId = null;

    if (direction === 1) {
      progress += TRAIN_SPEED;
      while (progress >= 1 && segmentIndex < segCount - 1) {
        progress -= 1;
        segmentIndex += 1;
        const seg = state.segments.get(line.segmentIds[segmentIndex]);
        const nodeId = seg?.fromNodeId; // node we just arrived at
        if (nodeId && isStationAtNode(state, nodeId)) {
          return { ...t, progress, segmentIndex, dwellTicksRemaining: DWELL_TICKS, dwellAtNodeId: nodeId };
        }
      }
      if (progress >= 1 && segmentIndex === segCount - 1) {
        const seg = state.segments.get(line.segmentIds[segmentIndex]);
        const endNodeId = seg?.toNodeId ?? null;
        return {
          ...t,
          progress: 1,
          segmentIndex,
          direction: -1 as const,
          dwellTicksRemaining: DWELL_TICKS,
          dwellAtNodeId: endNodeId,
        };
      }
      if (progress >= 1) progress = 1;
    } else {
      progress -= TRAIN_SPEED;
      while (progress < 0 && segmentIndex > 0) {
        segmentIndex -= 1;
        progress += 1;
        const seg = state.segments.get(line.segmentIds[segmentIndex]);
        const nodeId = seg?.toNodeId; // node we just arrived at (segment start in reverse)
        if (nodeId && isStationAtNode(state, nodeId)) {
          return { ...t, progress, segmentIndex, dwellTicksRemaining: DWELL_TICKS, dwellAtNodeId: nodeId };
        }
      }
      if (progress < 0 && segmentIndex === 0) {
        const seg = state.segments.get(line.segmentIds[0]);
        const startNodeId = seg?.fromNodeId ?? null;
        return {
          ...t,
          progress: 0,
          segmentIndex: 0,
          direction: 1 as const,
          dwellTicksRemaining: DWELL_TICKS,
          dwellAtNodeId: startNodeId,
        };
      }
      if (progress < 0) progress = 0;
    }

    return { ...t, progress, segmentIndex, direction, dwellAtNodeId };
  });
  return { ...state, trains };
}

function trainAtNode(train: Train, nodeId: string, state: SimState): boolean {
  if (train.dwellTicksRemaining > 0 && train.dwellAtNodeId === nodeId) return true;
  const line = state.lines.find((l) => l.id === train.lineId);
  if (!line) return false;
  const seg = state.segments.get(line.segmentIds[train.segmentIndex]);
  if (!seg) return false;
  if (train.direction === 1) {
    return (train.progress < 0.1 && seg.fromNodeId === nodeId) || (train.progress >= 0.9 && seg.toNodeId === nodeId);
  }
  return (train.progress >= 0.9 && seg.fromNodeId === nodeId) || (train.progress < 0.1 && seg.toNodeId === nodeId);
}

function updatePassengers(state: SimState): SimState {
  let servedCount = state.servedCount;
  const destStation = (id: string) => state.stations.find((s) => s.id === id);
  const passengers = state.passengers
    .map((p): Passenger | null => {
      if (p.state === 'arrived') return null;
      if (p.state === 'on_train' && p.trainId) {
        const train = state.trains.find((t) => t.id === p.trainId);
        if (!train) return p;
        const dest = destStation(p.destinationStationId);
        if (!dest) return p;
        if (trainAtNode(train, dest.nodeId, state)) {
          servedCount += 1;
          return { ...p, state: 'arrived' as const };
        }
        return p;
      }
      const atStation = state.stations.find((s) => s.id === p.originStationId);
      if (!atStation) return p;
      for (const train of state.trains) {
        if (!trainAtNode(train, atStation.nodeId, state)) continue;
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
