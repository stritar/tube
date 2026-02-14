import Phaser from 'phaser';
import { MainScene } from './main-scene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
};

export function bootGame(getState: () => import('../sim/state.js').SimState, dispatch: (action: () => void) => void): Phaser.Game {
  (window as unknown as { __getSimState: () => import('../sim/state.js').SimState }).__getSimState = getState;
  (window as unknown as { __dispatch: (action: () => void) => void }).__dispatch = dispatch;
  return new Phaser.Game(config);
}
