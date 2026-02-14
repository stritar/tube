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
} from './state.js';
export type { SimState, Station, Line, LineSegment, Train, Passenger } from './state.js';
export { tick } from './tick.js';
export { placeStation, addSegment, appendSegmentToLine } from './actions.js';
