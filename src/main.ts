/**
 * Entry point: boot Phaser and run the game.
 * Sim state lives inside MainScene for the minimal slice.
 * Later: lift state to a store here and pass getState/dispatch so React can read/write.
 */

import { bootGame } from './game/boot.js';

const game = bootGame(
  () => ({} as import('./sim/state.js').SimState),
  () => {}
);

(window as unknown as { __game: Phaser.Game }).__game = game;
