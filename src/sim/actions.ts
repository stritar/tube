/**
 * Actions that mutate sim state. Return new state (immutable style).
 */

import type { SimState, Station, Line, LineSegment, Train, PlannedLine, GridPoint, Node } from './state.js';
import {
  nextNodeId,
  nextStationId,
  nextSegmentId,
  nextLineId,
  nextTrainId,
  nextPlannedLineId,
  CONSTRUCTION_TICKS,
} from './state.js';

export function placeStation(state: SimState, x: number, y: number): SimState {
  const nodeId = nextNodeId();
  const node: Node = { id: nodeId, x, y };
  const stationId = nextStationId();
  const station: Station = { id: stationId, nodeId, x, y };
  return {
    ...state,
    nodes: [...state.nodes, node],
    stations: [...state.stations, station],
  };
}

export function addSegment(
  state: SimState,
  fromStationId: string,
  toStationId: string
): { state: SimState; segmentId: string } {
  const fromStation = state.stations.find((s) => s.id === fromStationId);
  const toStation = state.stations.find((s) => s.id === toStationId);
  if (!fromStation || !toStation) return { state, segmentId: '' };
  const segmentId = nextSegmentId();
  const segments = new Map(state.segments);
  segments.set(segmentId, { fromNodeId: fromStation.nodeId, toNodeId: toStation.nodeId });

  const lineId = nextLineId();
  const line: Line = { id: lineId, segmentIds: [segmentId] };
  const trainId = nextTrainId();
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
    state: {
      ...state,
      segments,
      lines: [...state.lines, line],
      trains: [...state.trains, train],
    },
    segmentId,
  };
}

export function appendSegmentToLine(
  state: SimState,
  lineId: string,
  fromStationId: string,
  toStationId: string
): SimState {
  const fromStation = state.stations.find((s) => s.id === fromStationId);
  const toStation = state.stations.find((s) => s.id === toStationId);
  if (!fromStation || !toStation) return state;
  const segmentId = nextSegmentId();
  const segments = new Map(state.segments);
  segments.set(segmentId, { fromNodeId: fromStation.nodeId, toNodeId: toStation.nodeId });

  const lines = state.lines.map((l) =>
    l.id === lineId ? { ...l, segmentIds: [...l.segmentIds, segmentId] } : l
  );

  return { ...state, segments, lines };
}

/** Add a planned line (drawn route). Becomes a real line after CONSTRUCTION_TICKS. */
export function addPlannedLine(state: SimState, path: GridPoint[]): SimState {
  if (path.length < 2) return state;
  const id = nextPlannedLineId();
  const planned: PlannedLine = {
    id,
    path: [...path],
    constructionRemainingTicks: CONSTRUCTION_TICKS,
  };
  return {
    ...state,
    plannedLines: [...state.plannedLines, planned],
  };
}
