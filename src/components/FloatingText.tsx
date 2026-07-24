import { Coins, Minus, Plus, Sparkles, Zap } from 'lucide-react';
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from 'framer-motion';
import { motionForTheme } from '../game/engine';
import { useGame } from '../store';
import type { VFXEffect } from '../lib/vfx';

// Colours track the active theme's tokens so combat text re-themes with everything else.
const CONFIG: Record<VFXEffect['type'], { color: string; icon: React.ReactNode; label: string }> = {
  xp: { color: 'var(--xp)', icon: <Zap size={14} />, label: 'XP' },
  gold: { color: 'var(--gold)', icon: <Coins size={14} />, label: 'Gold' },
  damage: { color: 'var(--danger)', icon: <Minus size={14} />, label: 'HP' },
  heal: { color: 'var(--success)', icon: <Plus size={14} />, label: 'HP' },
  item: { color: 'var(--accent2)', icon: <Sparkles size={14} />, label: 'Used' },
};

type Variant = { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition };

/** Per-theme motion signature for the click-anchored combat text. */
function variantFor(key: string, x: number, y: number, drift: number): Variant {
  switch (key) {
    case 'stamp': // brutalism — hard, no drift, no bounce, linear
      return {
        initial: { opacity: 0, scale: 1.4, x, y },
        animate: { opacity: [0, 1, 1, 0], scale: [1.4, 1, 1, 1], y: y - 70, x },
        transition: { duration: 1.1, times: [0, 0.12, 0.8, 1], ease: 'linear' },
      };
    case 'squish': // clay
    case 'emboss': // neu
    case 'bevel': // skeuo — springy overshoot
      return {
        initial: { opacity: 0, scale: 0.3, x, y },
        animate: { opacity: [0, 1, 1, 0], scale: [0.3, 1.35, 0.95, 0.9], y: y - 110, x: x + drift },
        transition: { duration: 1.6, times: [0, 0.25, 0.55, 1], ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
      };
    case 'none': // minimalism / parchment — quiet rise, no pop
      return {
        initial: { opacity: 0, x, y },
        animate: { opacity: [0, 1, 1, 0], y: y - 80, x },
        transition: { duration: 1.3, times: [0, 0.15, 0.75, 1], ease: 'easeOut' },
      };
    default: // glass / liquid / maximal / neon … — lively float
      return {
        initial: { opacity: 0, scale: 0.5, x, y },
        animate: { opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.85], y: y - 120, x: x + drift },
        transition: { duration: 1.5, times: [0, 0.2, 0.8, 1], ease: 'easeOut' },
      };
  }
}

export function FloatingText({ type, amount, label, x, y }: VFXEffect) {
  const cfg = CONFIG[type];
  const isPositive = type !== 'damage';
  const motionKey = motionForTheme(useGame(s => s.theme));
  const reduce = useReducedMotion();
  const drift = Math.random() * 40 - 20;

  // Reduced motion: fade in place, barely drifting, whatever the theme.
  const v: Variant = reduce
    ? {
        initial: { opacity: 0, x, y },
        animate: { opacity: [0, 1, 1, 0], y: y - 18, x },
        transition: { duration: 0.9, times: [0, 0.2, 0.7, 1], ease: 'easeOut' },
      }
    : variantFor(motionKey, x, y, drift);

  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      transition={v.transition}
      className="vfx-floating-text"
      style={{ color: cfg.color, boxShadow: `0 0 18px -4px ${cfg.color}` }}
    >
      <span className="vfx-icon">{cfg.icon}</span>
      <span>{isPositive ? '+' : '−'}{amount}</span>
      <span className="vfx-label">{label ?? cfg.label}</span>
    </motion.div>
  );
}
