import { AnimatePresence } from 'framer-motion';
import { useVFX } from '../lib/vfx';
import { FloatingText } from './FloatingText';

/** Fixed full-screen layer of click-anchored floating reward/damage text. Mount once near the app root. */
export function VFXLayer() {
  const effects = useVFX(s => s.effects);
  return (
    <div className="vfx-layer">
      <AnimatePresence>
        {effects.map(e => (
          <FloatingText key={e.id} {...e} />
        ))}
      </AnimatePresence>
    </div>
  );
}
