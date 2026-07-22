// Synthesized game-audio cues via WebAudio — no asset files, works offline,
// weighs nothing. Each cue is a tiny envelope-shaped oscillator phrase.
// Callers gate on the store's `soundOn`; this module just makes noise.

export type SoundId = 'reward' | 'damage' | 'levelup' | 'rankup' | 'achievement' | 'item';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    // Browsers suspend fresh contexts until a user gesture; most cues fire
    // inside click handlers so resume() succeeds. If not, we fail silently.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface NoteOpts {
  type?: OscillatorType;
  gain?: number;
  /** Slide to this frequency over the note's duration (for thuds/sweeps). */
  slideTo?: number;
}

function note(c: AudioContext, freq: number, startIn: number, dur: number, opts: NoteOpts = {}) {
  const { type = 'sine', gain = 0.12, slideTo } = opts;
  const t = c.currentTime + startIn;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012); // fast attack, no click
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function playSound(id: SoundId) {
  const c = ac();
  if (!c) return;
  switch (id) {
    case 'reward': // quick two-note "coin up"
      note(c, 660, 0, 0.09, { type: 'triangle' });
      note(c, 880, 0.08, 0.14, { type: 'triangle' });
      break;
    case 'item': // chest-ish: low latch, then sparkle
      note(c, 262, 0, 0.1, { type: 'square', gain: 0.07 });
      note(c, 784, 0.1, 0.1, { type: 'triangle' });
      note(c, 1319, 0.18, 0.16, { type: 'sine', gain: 0.09 });
      break;
    case 'damage': // falling thud
      note(c, 140, 0, 0.22, { type: 'sawtooth', gain: 0.15, slideTo: 50 });
      break;
    case 'levelup': // rising arpeggio
      [523, 659, 784, 1046].forEach((f, i) => note(c, f, i * 0.09, 0.16, { type: 'triangle' }));
      break;
    case 'rankup': // longer fanfare
      [392, 523, 659, 784].forEach((f, i) => note(c, f, i * 0.11, 0.18, { type: 'triangle' }));
      note(c, 1046, 0.44, 0.4, { type: 'triangle', gain: 0.14 });
      break;
    case 'achievement': // bright shimmer
      [880, 1109, 1319].forEach((f, i) => note(c, f, i * 0.07, 0.12, { type: 'sine' }));
      note(c, 1760, 0.22, 0.24, { type: 'sine', gain: 0.08 });
      break;
  }
}
