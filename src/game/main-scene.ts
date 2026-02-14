import Phaser from 'phaser';
import type { SimState, Station } from '../sim/state.js';
import { createInitialState, placeStation, addPlannedLine, tick, CONSTRUCTION_TICKS } from '../sim/index.js';

const GRID_W = 20;
const GRID_H = 15;
const CELL = 40;
const STATION_R = 12;
const TRAIN_R = 6;
const COLOR_CONSTRUCTED = 0x4ecdc4;
const COLOR_PLANNED = 0x6c757d; // neutral grey

type BuildMode = 'station' | 'line' | 'play';

interface GridPoint {
  x: number;
  y: number;
}

export class MainScene extends Phaser.Scene {
  private state: SimState = createInitialState();
  private buildMode: BuildMode = 'station';
  /** Current path while dragging (line mode); committed to state on pointer up */
  private dragPath: GridPoint[] = [];
  private isDragging = false;
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
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
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
    this.dragPath = [];
    this.isDragging = false;
    const labels: Record<BuildMode, string> = {
      station: 'Place station',
      line: 'Draw line (drag route)',
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

  /** Draw a path with a "built" portion (0..1) in teal, the rest in grey — for construction animation. */
  private drawPlannedLineWithBuildProgress(
    g: Phaser.GameObjects.Graphics,
    path: GridPoint[],
    constructionRemainingTicks: number
  ) {
    if (path.length < 2) return;
    // Interpolate progress between sim ticks so the line grows smoothly each frame
    const effectiveRemaining =
      this.buildMode === 'play'
        ? constructionRemainingTicks - this.tickTimer / this.tickIntervalMs
        : constructionRemainingTicks;
    const progress = Math.max(0, Math.min(1, 1 - effectiveRemaining / CONSTRUCTION_TICKS));

    const pixels: { x: number; y: number }[] = path.map((p) => this.gridToPixel(p.x, p.y));
    const segmentLengths: number[] = [];
    let totalLength = 0;
    for (let i = 0; i < pixels.length - 1; i++) {
      const len = Phaser.Math.Distance.Between(pixels[i].x, pixels[i].y, pixels[i + 1].x, pixels[i + 1].y);
      segmentLengths.push(len);
      totalLength += len;
    }
    if (totalLength <= 0) return;
    const builtLength = progress * totalLength;

    let acc = 0;
    for (let i = 0; i < segmentLengths.length; i++) {
      const segLen = segmentLengths[i];
      const a = pixels[i];
      const b = pixels[i + 1];
      if (acc + segLen <= builtLength) {
        g.lineStyle(4, COLOR_CONSTRUCTED);
        g.lineBetween(a.x, a.y, b.x, b.y);
        acc += segLen;
      } else if (acc < builtLength) {
        const t = (builtLength - acc) / segLen;
        const midX = a.x + (b.x - a.x) * t;
        const midY = a.y + (b.y - a.y) * t;
        g.lineStyle(4, COLOR_CONSTRUCTED);
        g.lineBetween(a.x, a.y, midX, midY);
        g.lineStyle(4, COLOR_PLANNED);
        g.lineBetween(midX, midY, b.x, b.y);
        acc = builtLength;
      } else {
        g.lineStyle(4, COLOR_PLANNED);
        g.lineBetween(a.x, a.y, b.x, b.y);
        acc += segLen;
      }
    }
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
      const { gx, gy } = this.pixelToGrid(world.x, world.y);
      this.dragPath = [{ x: gx, y: gy }];
      this.isDragging = true;
      this.draw();
    }
  }

  private onPointerMove(ptr: Phaser.Input.Pointer) {
    if (this.buildMode !== 'line' || !this.isDragging || this.dragPath.length === 0) return;
    const world = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    const { gx, gy } = this.pixelToGrid(world.x, world.y);
    const last = this.dragPath[this.dragPath.length - 1];
    if (last.x !== gx || last.y !== gy) {
      this.dragPath = [...this.dragPath, { x: gx, y: gy }];
      this.draw();
    }
  }

  private onPointerUp() {
    if (this.buildMode !== 'line' || !this.isDragging) return;
    this.isDragging = false;
    if (this.dragPath.length >= 2) {
      this.state = addPlannedLine(this.state, this.dragPath);
    }
    this.dragPath = [];
    this.draw();
  }

  private draw() {
    const g = this.graphics;
    g.clear();

    // Grid
    g.lineStyle(1, 0x2a2a4a);
    for (let x = 0; x <= GRID_W; x++) g.lineBetween(x * CELL, 0, x * CELL, GRID_H * CELL);
    for (let y = 0; y <= GRID_H; y++) g.lineBetween(0, y * CELL, GRID_W * CELL, y * CELL);

    // Planned lines (under construction) — teal grows from A to B over 10s, rest stays grey
    for (const planned of this.state.plannedLines) {
      this.drawPlannedLineWithBuildProgress(g, planned.path, planned.constructionRemainingTicks);
    }

    // Drag preview (current route being drawn)
    if (this.dragPath.length >= 2) {
      g.lineStyle(4, COLOR_PLANNED);
      for (let i = 0; i < this.dragPath.length - 1; i++) {
        const a = this.gridToPixel(this.dragPath[i].x, this.dragPath[i].y);
        const b = this.gridToPixel(this.dragPath[i + 1].x, this.dragPath[i + 1].y);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }

    // Constructed lines — teal (segment endpoints are nodes)
    for (const line of this.state.lines) {
      g.lineStyle(4, COLOR_CONSTRUCTED);
      for (const segId of line.segmentIds) {
        const seg = this.state.segments.get(segId);
        if (!seg) continue;
        const fromNode = this.state.nodes.find((n) => n.id === seg.fromNodeId);
        const toNode = this.state.nodes.find((n) => n.id === seg.toNodeId);
        if (!fromNode || !toNode) continue;
        const a = this.gridToPixel(fromNode.x, fromNode.y);
        const b = this.gridToPixel(toNode.x, toNode.y);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }

    // Stations
    for (const s of this.state.stations) {
      const pos = this.gridToPixel(s.x, s.y);
      g.fillStyle(COLOR_CONSTRUCTED, 1);
      g.fillCircle(pos.x, pos.y, STATION_R);
      g.lineStyle(2, 0x2a2a4a);
      g.strokeCircle(pos.x, pos.y, STATION_R);
    }

    // Trains
    for (const t of this.state.trains) {
      const line = this.state.lines.find((l) => l.id === t.lineId);
      if (!line || line.segmentIds.length === 0) continue;
      const segId = line.segmentIds[t.segmentIndex];
      const seg = this.state.segments.get(segId);
      if (!seg) continue;
      const fromNode = this.state.nodes.find((n) => n.id === seg.fromNodeId);
      const toNode = this.state.nodes.find((n) => n.id === seg.toNodeId);
      if (!fromNode || !toNode) continue;
      const a = this.gridToPixel(fromNode.x, fromNode.y);
      const b = this.gridToPixel(toNode.x, toNode.y);
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
