/**
 * Public sim API: state, tick, actions.
 */

export {
  createInitialState,
  nextStationId,
  nextSegmentId,
  nextLineId,
  nextTrainId,
  nextPassengerId,
  CONSTRUCTION_TICKS,
} from './state.js';
export type { SimState, Node, Station, Line, LineSegment, Train, Passenger, PlannedLine, GridPoint } from './state.js';
export { tick } from './tick.js';
export { placeStation, addSegment, appendSegmentToLine, addPlannedLine } from './actions.js';
