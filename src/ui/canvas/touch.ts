/**
 * Touch input for the design canvas.
 *
 * One finger behaves like the mouse (select, move, draw). Two fingers pan and
 * pinch-zoom. Because a second finger often lands a moment after the first, a
 * finger's "down" is held back until it moves, lifts or rests for HOLD_MS; a
 * second finger arriving in that window starts a pinch without the first finger
 * having selected or drawn anything. A still finger held for LONG_PRESS_MS
 * opens the context menu.
 */
import { useEditor } from '../../editor/store';
import type { CanvasInteraction } from './interaction';

const HOLD_MS = 150;
const LONG_PRESS_MS = 550;
const MOVE_SLOP_PX = 6;

interface Pt {
  x: number;
  y: number;
}

type Mode =
  | { type: 'idle' }
  /** First finger down, not yet forwarded to the interaction. */
  | { type: 'pending'; id: number; down: PointerEvent; timer: number }
  /** One finger driving the normal interaction. */
  | { type: 'single'; id: number; longPress: number | null; start: Pt }
  | { type: 'pinch'; ids: [number, number]; lastDist: number; lastMid: Pt }
  /** A pinch or long-press ended; ignore the fingers until all are lifted. */
  | { type: 'ignore' };

export class TouchController {
  private mode: Mode = { type: 'idle' };
  private points = new Map<number, Pt>();

  constructor(
    private interaction: CanvasInteraction,
    private getRect: () => DOMRect,
  ) {}

  down(e: PointerEvent): void {
    this.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const m = this.mode;
    if (m.type === 'idle') {
      const timer = window.setTimeout(() => this.forward(), HOLD_MS);
      this.mode = { type: 'pending', id: e.pointerId, down: e, timer };
      return;
    }
    if (m.type === 'pending' || m.type === 'single') {
      // Second finger: whatever the first one started becomes a pinch.
      const first = m.id;
      this.clearTimers();
      if (m.type === 'single') this.interaction.abortGesture();
      this.startPinch(first, e.pointerId);
      return;
    }
    // Third finger during a pinch, or fingers while ignoring: nothing to do.
  }

  move(e: PointerEvent): void {
    if (!this.points.has(e.pointerId)) return;
    const p = { x: e.clientX, y: e.clientY };
    this.points.set(e.pointerId, p);
    const m = this.mode;
    if (m.type === 'pending' && m.id === e.pointerId) {
      if (dist(p, { x: m.down.clientX, y: m.down.clientY }) > MOVE_SLOP_PX) {
        this.forward();
        this.interaction.pointerMove(e);
      }
    } else if (m.type === 'single' && m.id === e.pointerId) {
      if (m.longPress != null && dist(p, m.start) > MOVE_SLOP_PX) {
        window.clearTimeout(m.longPress);
        m.longPress = null;
      }
      this.interaction.pointerMove(e);
    } else if (m.type === 'pinch' && m.ids.includes(e.pointerId)) {
      const a = this.points.get(m.ids[0]);
      const b = this.points.get(m.ids[1]);
      if (!a || !b) return;
      const d = Math.max(1, dist(a, b));
      const mid = this.local(midpoint(a, b));
      const s = useEditor.getState();
      // Pan by the midpoint's movement, then zoom around the new midpoint.
      s.setView({ ...s.view, x: s.view.x + mid.x - m.lastMid.x, y: s.view.y + mid.y - m.lastMid.y });
      if (Math.abs(d / m.lastDist - 1) > 0.001) useEditor.getState().zoomAt(d / m.lastDist, mid);
      m.lastDist = d;
      m.lastMid = mid;
    }
  }

  up(e: PointerEvent): void {
    if (!this.points.has(e.pointerId)) return;
    this.points.delete(e.pointerId);
    const m = this.mode;
    if (m.type === 'pending' && m.id === e.pointerId) {
      // A tap: deliver down and up together.
      this.forward();
      this.interaction.pointerUp(e);
      this.mode = { type: 'idle' };
    } else if (m.type === 'single' && m.id === e.pointerId) {
      if (m.longPress != null) window.clearTimeout(m.longPress);
      if (e.type === 'pointercancel') this.interaction.abortGesture();
      else this.interaction.pointerUp(e);
      this.mode = { type: 'idle' };
    } else if (m.type === 'pinch') {
      this.mode = { type: 'ignore' };
    }
    if (this.points.size === 0) this.mode = { type: 'idle' };
  }

  dispose(): void {
    this.clearTimers();
    this.points.clear();
    this.mode = { type: 'idle' };
  }

  // --- internals -------------------------------------------------------------

  private forward(): void {
    const m = this.mode;
    if (m.type !== 'pending') return;
    window.clearTimeout(m.timer);
    this.interaction.pointerDown(m.down);
    const start = { x: m.down.clientX, y: m.down.clientY };
    const longPress = window.setTimeout(() => this.longPress(), LONG_PRESS_MS - HOLD_MS);
    this.mode = { type: 'single', id: m.id, longPress, start };
  }

  private longPress(): void {
    const m = this.mode;
    if (m.type !== 'single') return;
    const tool = useEditor.getState().tool;
    // Only where a context menu makes sense; drawing tools keep their press.
    if (tool !== 'select') {
      m.longPress = null;
      return;
    }
    this.interaction.abortGesture();
    this.mode = { type: 'ignore' };
    navigator.vibrate?.(10);
    swallowNextClick();
    window.dispatchEvent(new CustomEvent('gtk:context-menu', { detail: { x: m.start.x, y: m.start.y } }));
  }

  private startPinch(a: number, b: number): void {
    const pa = this.points.get(a);
    const pb = this.points.get(b);
    if (!pa || !pb) {
      this.mode = { type: 'ignore' };
      return;
    }
    this.mode = { type: 'pinch', ids: [a, b], lastDist: Math.max(1, dist(pa, pb)), lastMid: this.local(midpoint(pa, pb)) };
  }

  private clearTimers(): void {
    const m = this.mode;
    if (m.type === 'pending') window.clearTimeout(m.timer);
    if (m.type === 'single' && m.longPress != null) window.clearTimeout(m.longPress);
  }

  private local(p: Pt): Pt {
    const r = this.getRect();
    return { x: p.x - r.left, y: p.y - r.top };
  }
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Lifting the finger after a long-press makes the browser send a click to whatever is now
 * under it, which is the freshly opened context menu. Swallow that one click.
 */
function swallowNextClick(): void {
  const stop = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    done();
  };
  const done = () => {
    window.removeEventListener('click', stop, true);
    window.clearTimeout(timer);
  };
  window.addEventListener('click', stop, true);
  const timer = window.setTimeout(done, 800);
}
