/**
 * Actions that mutate sim state. Return new state (immutable style).
 */

import type { SimState, Station, Line, LineSegment, Train } from './state.js';
import { nextStationId, nextSegmentId, nextLineId, nextTrainId } from './state.js';

export function placeStation(state: SimState, x: number, y: number): SimState {
  const id = nextStationId();
  const station: Station = { id, x, y };
  return {
    ...state,
    stations: [...state.stations, station],
  };
}

export function addSegment(
  state: SimState,
  fromStationId: string,
  toStationId: string
): { state: SimState; segmentId: string } {
  const segmentId = nextSegmentId();
  const segments = new Map(state.segments);
  segments.set(segmentId, { fromStationId, toStationId });

  const lineId = nextLineId();
  const line: Line = { id: lineId, segmentIds: [segmentId] };
  const trainId = nextTrainId();
  const train: Train = {
    id: trainId,
    lineId,
    segmentIndex: 0,
    progress: 0,
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
  const segmentId = nextSegmentId();
  const segments = new Map(state.segments);
  segments.set(segmentId, { fromStationId, toStationId });

  const lines = state.lines.map((l) =>
    l.id === lineId ? { ...l, segmentIds: [...l.segmentIds, segmentId] } : l
  );

  return { ...state, segments, lines };
}
