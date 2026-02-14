/**
 * Simulation state — pure data. No Phaser, no DOM.
 * This is the single source of truth for the game.
 */

export interface Station {
  id: string;
  nodeId: string; // which node this stop is at
  x: number;
  y: number;
}

/** A point on the network (segment endpoints). Only some nodes are stations (stops). */
export interface Node {
  id: string;
  x: number;
  y: number;
}

export interface LineSegment {
  fromNodeId: string;
  toNodeId: string;
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
  direction: 1 | -1; // 1 = toward higher segment index, -1 = toward lower
  dwellTicksRemaining: number; // 0 = moving; >0 = stopped at station/terminal
  dwellAtNodeId: string | null; // when dwelling, which node we're stopped at (for boarding/alighting)
}

export interface Passenger {
  id: string;
  originStationId: string;
  destinationStationId: string;
  state: 'waiting' | 'on_train' | 'arrived';
  trainId?: string;
}

/** Grid point (x, y) in sim coordinates */
export interface GridPoint {
  x: number;
  y: number;
}

/** Line being constructed: drawn route that becomes a real line after construction time */
export interface PlannedLine {
  id: string;
  path: GridPoint[]; // ordered cells the route passes through
  constructionRemainingTicks: number;
}

export interface SimState {
  tick: number;
  nodes: Node[];
  stations: Station[];
  segments: Map<string, LineSegment>;
  lines: Line[];
  trains: Train[];
  passengers: Passenger[];
  servedCount: number;
  plannedLines: PlannedLine[];
}

let segmentIdCounter = 0;
export function nextSegmentId(): string {
  return `seg_${++segmentIdCounter}`;
}

let nodeIdCounter = 0;
export function nextNodeId(): string {
  return `node_${++nodeIdCounter}`;
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

let plannedLineIdCounter = 0;
export function nextPlannedLineId(): string {
  return `planned_${++plannedLineIdCounter}`;
}

export const CONSTRUCTION_TICKS = 50; // 10s at 200ms per tick

export function createInitialState(): SimState {
  return {
    tick: 0,
    nodes: [],
    stations: [],
    segments: new Map(),
    lines: [],
    trains: [],
    passengers: [],
    servedCount: 0,
    plannedLines: [],
  };
}
