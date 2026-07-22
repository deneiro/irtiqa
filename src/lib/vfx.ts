import { create } from 'zustand';

export type VFXType = 'xp' | 'gold' | 'damage' | 'heal' | 'item';

export interface VFXEffect {
  id: string;
  type: VFXType;
  amount: number;
  label?: string;
  x: number;
  y: number;
}

interface VFXState {
  effects: VFXEffect[];
}

const LIFETIME_MS = 1500;

export const useVFX = create<VFXState>(() => ({ effects: [] }));

/** Spawns a floating combat-text badge at the given viewport coordinates. Purely cosmetic — the authoritative reward still comes from the game store. */
export function spawnVFX(type: VFXType, amount: number, x: number, y: number, label?: string): void {
  const id = crypto.randomUUID();
  useVFX.setState(s => ({ effects: [...s.effects, { id, type, amount, label, x, y }] }));
  setTimeout(() => {
    useVFX.setState(s => ({ effects: s.effects.filter(e => e.id !== id) }));
  }, LIFETIME_MS);
}

/** Convenience: spawn straight from a click/pointer event's coordinates. */
export function spawnVFXAt(e: { clientX: number; clientY: number }, type: VFXType, amount: number, label?: string): void {
  spawnVFX(type, amount, e.clientX, e.clientY, label);
}
