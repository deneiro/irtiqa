import { Coins, Minus, Plus, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { VFXEffect } from '../lib/vfx';

const CONFIG: Record<VFXEffect['type'], { color: string; icon: React.ReactNode; label: string }> = {
  xp: { color: '#8b5cf6', icon: <Zap size={14} />, label: 'XP' },
  gold: { color: '#fbbf24', icon: <Coins size={14} />, label: 'Gold' },
  damage: { color: '#f87171', icon: <Minus size={14} />, label: 'HP' },
  heal: { color: '#34d399', icon: <Plus size={14} />, label: 'HP' },
  item: { color: '#22d3ee', icon: <Sparkles size={14} />, label: 'Used' },
};

export function FloatingText({ type, amount, label, x, y }: VFXEffect) {
  const cfg = CONFIG[type];
  const isPositive = type !== 'damage';
  const drift = (Math.random() * 40 - 20).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x, y }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.85], y: y - 120, x: x + Number(drift) }}
      transition={{ duration: 1.5, times: [0, 0.2, 0.8, 1], ease: 'easeOut' }}
      className="vfx-floating-text"
      style={{ color: cfg.color, boxShadow: `0 0 18px -4px ${cfg.color}` }}
    >
      <span className="vfx-icon">{cfg.icon}</span>
      <span>{isPositive ? '+' : '−'}{amount}</span>
      <span className="vfx-label">{label ?? cfg.label}</span>
    </motion.div>
  );
}
