import { describe, it, expect } from 'vitest';
import { createInitialState, tick, placeStation, addSegment } from '../../src/sim/index.js';

describe('sim tick', () => {
  it('increments tick count', () => {
    let state = createInitialState();
    for (let i = 0; i < 10; i++) state = tick(state);
    expect(state.tick).toBe(10);
  });

  it('moves train along segment', () => {
    let state = createInitialState();
    state = placeStation(state, 0, 0);
    state = placeStation(state, 2, 0);
    const { state: stateWithLine } = addSegment(state, state.stations[0].id, state.stations[1].id);
    state = stateWithLine;
    expect(state.trains.length).toBe(1);
    const initialProgress = state.trains[0].progress;
    state = tick(state);
    expect(state.trains[0].progress).toBeGreaterThan(initialProgress);
  });
});
