import Phaser from 'phaser';
import type { SimState, Station } from '../sim/state.js';
import { createInitialState, placeStation, addSegment, tick } from '../sim/index.js';

const GRID_W = 20;
const GRID_H = 15;
const CELL = 40;
const STATION_R = 12;
const TRAIN_R = 6;

type BuildMode = 'station' | 'line' | 'play';

export class MainScene extends Phaser.Scene {
  private state: SimState = createInitialState();
  private buildMode: BuildMode = 'station';
  private lineFirstId: string | null = null;
  private tickTimer = 0;
  private tickIntervalMs = 200;
  private graphics!: Phaser.GameObjects.Graphics;
  private servedText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Main' });
  }

  create() {
    this.graphics = this.add.graphics();
    this.servedText = this.add.text(10, 10, 'Served: 0', { font: '18px monospace', color: '#eee' }).setScrollFactor(0);
    this.modeText = this.add.text(10, 34, 'Mode: Place station', { font: '14px monospace', color: '#aaa' }).setScrollFactor(0);

    // Simple mode buttons (placeholder — can replace with React later)
    const y = 58;
    this.makeButton(10, y, 'Station', () => this.setMode('station'));
    this.makeButton(90, y, 'Line', () => this.setMode('line'));
    this.makeButton(160, y, 'Play', () => this.setMode('play'));

    this.input.on('pointerdown', this.onPointerDown, this);
    this.cameras.main.setBounds(0, 0, GRID_W * CELL, GRID_H * CELL);
  }

  private makeButton(x: number, y: number, label: string, cb: () => void) {
    const bg = this.add.rectangle(x + 40, y + 12, 70, 24, 0x333366).setScrollFactor(0).setInteractive();
    const text = this.add.text(x + 10, y + 4, label, { font: '14px monospace', color: '#fff' }).setScrollFactor(0);
    bg.on('pointerdown', cb);
    bg.on('pointerover', () => bg.setFillStyle(0x444477));
    bg.on('pointerout', () => bg.setFillStyle(0x333366));
  }

  private setMode(mode: BuildMode) {
    this.buildMode = mode;
    this.lineFirstId = null;
    const labels: Record<BuildMode, string> = {
      station: 'Place station',
      line: 'Draw line (click 2 stations)',
      play: 'Play',
    };
    this.modeText.setText('Mode: ' + labels[mode]);
  }

  private gridToPixel(gx: number, gy: number): { x: number; y: number } {
    return { x: gx * CELL + CELL / 2, y: gy * CELL + CELL / 2 };
  }

  private pixelToGrid(px: number, py: number): { gx: number; gy: number } {
    const gx = Math.floor(px / CELL);
    const gy = Math.floor(py / CELL);
    return { gx: Phaser.Math.Clamp(gx, 0, GRID_W - 1), gy: Phaser.Math.Clamp(gy, 0, GRID_H - 1) };
  }

  private stationAtPixel(px: number, py: number): Station | undefined {
    for (const s of this.state.stations) {
      const pos = this.gridToPixel(s.x, s.y);
      if (Phaser.Math.Distance.Between(px, py, pos.x, pos.y) <= STATION_R + 4) return s;
    }
    return undefined;
  }

  private onPointerDown(ptr: Phaser.Input.Pointer) {
    const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    if (this.buildMode === 'play') return;

    if (this.buildMode === 'station') {
      const { gx, gy } = this.pixelToGrid(world.x, world.y);
      this.state = placeStation(this.state, gx, gy);
      this.draw();
      return;
    }

    if (this.buildMode === 'line') {
      const st = this.stationAtPixel(world.x, world.y);
      if (!st) return;
      if (this.lineFirstId === null) {
        this.lineFirstId = st.id;
        return;
      }
      if (this.lineFirstId === st.id) return;
      const { state } = addSegment(this.state, this.lineFirstId, st.id);
      this.state = state;
      this.lineFirstId = null;
      this.draw();
    }
  }

  private draw() {
    const g = this.graphics;
    g.clear();

    // Grid
    g.lineStyle(1, 0x2a2a4a);
    for (let x = 0; x <= GRID_W; x++) g.lineBetween(x * CELL, 0, x * CELL, GRID_H * CELL);
    for (let y = 0; y <= GRID_H; y++) g.lineBetween(0, y * CELL, GRID_W * CELL, y * CELL);

    // Segments / lines
    for (const line of this.state.lines) {
      const color = 0x4ecdc4;
      g.lineStyle(4, color);
      for (const segId of line.segmentIds) {
        const seg = this.state.segments.get(segId);
        if (!seg) continue;
        const from = this.state.stations.find((s) => s.id === seg.fromStationId);
        const to = this.state.stations.find((s) => s.id === seg.toStationId);
        if (!from || !to) continue;
        const a = this.gridToPixel(from.x, from.y);
        const b = this.gridToPixel(to.x, to.y);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }

    // Stations
    for (const s of this.state.stations) {
      const pos = this.gridToPixel(s.x, s.y);
      g.fillStyle(0x4ecdc4, 1);
      g.fillCircle(pos.x, pos.y, STATION_R);
      g.lineStyle(2, 0x2a2a4a);
      g.strokeCircle(pos.x, pos.y, STATION_R);
    }

    // Line first selection
    if (this.buildMode === 'line' && this.lineFirstId) {
      const first = this.state.stations.find((s) => s.id === this.lineFirstId);
      if (first) {
        const pos = this.gridToPixel(first.x, first.y);
        g.lineStyle(2, 0xffe66d);
        g.strokeCircle(pos.x, pos.y, STATION_R + 4);
      }
    }

    // Trains
    for (const t of this.state.trains) {
      const line = this.state.lines.find((l) => l.id === t.lineId);
      if (!line || line.segmentIds.length === 0) continue;
      const segId = line.segmentIds[t.segmentIndex];
      const seg = this.state.segments.get(segId);
      if (!seg) continue;
      const from = this.state.stations.find((s) => s.id === seg.fromStationId)!;
      const to = this.state.stations.find((s) => s.id === seg.toStationId)!;
      const a = this.gridToPixel(from.x, from.y);
      const b = this.gridToPixel(to.x, to.y);
      const x = a.x + (b.x - a.x) * t.progress;
      const y = a.y + (b.y - a.y) * t.progress;
      g.fillStyle(0xffe66d, 1);
      g.fillCircle(x, y, TRAIN_R);
    }

    this.servedText.setText('Served: ' + this.state.servedCount);
  }

  update(_time: number, delta: number) {
    if (this.buildMode !== 'play') {
      this.draw();
      return;
    }
    this.tickTimer += delta;
    while (this.tickTimer >= this.tickIntervalMs) {
      this.tickTimer -= this.tickIntervalMs;
      this.state = tick(this.state);
    }
    this.draw();
  }
}
