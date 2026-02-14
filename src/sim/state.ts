/**
 * Simulation state — pure data. No Phaser, no DOM.
 * This is the single source of truth for the game.
 */

export interface Station {
  id: string;
  x: number;
  y: number;
}

export interface LineSegment {
  fromStationId: string;
  toStationId: string;
}

export interface Line {
  id: string;
  segmentIds: string[]; // ordered: segment 0, 1, 2...
}

export interface Train {
  id: string;
  lineId: string;
  segmentIndex: number;
  progress: number; // 0..1 along current segment
}

export interface Passenger {
  id: string;
  originStationId: string;
  destinationStationId: string;
  state: 'waiting' | 'on_train' | 'arrived';
  trainId?: string;
}

export interface SimState {
  tick: number;
  stations: Station[];
  segments: Map<string, LineSegment>; // segmentId -> segment
  lines: Line[];
  trains: Train[];
  passengers: Passenger[];
  servedCount: number;
}

let segmentIdCounter = 0;
export function nextSegmentId(): string {
  return `seg_${++segmentIdCounter}`;
}

let stationIdCounter = 0;
export function nextStationId(): string {
  return `st_${++stationIdCounter}`;
}

let lineIdCounter = 0;
export function nextLineId(): string {
  return `line_${++lineIdCounter}`;
}

let trainIdCounter = 0;
export function nextTrainId(): string {
  return `train_${++trainIdCounter}`;
}

let passengerIdCounter = 0;
export function nextPassengerId(): string {
  return `pax_${++passengerIdCounter}`;
}

export function createInitialState(): SimState {
  return {
    tick: 0,
    stations: [],
    segments: new Map(),
    lines: [],
    trains: [],
    passengers: [],
    servedCount: 0,
  };
}
