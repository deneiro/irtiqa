import { Icon } from './Icon';
import type { ClassId } from '../game/types';

/**
 * The character portrait: class icon in a circle, optionally wrapped in an
 * equipped cosmetic frame (chest loot). Frame styles live in styles.css
 * under `.avatar.frame-*`.
 */
export function Avatar({ classId, size = 40, frameId }: { classId: ClassId; size?: number; frameId?: string | null }) {
  return (
    <span
      className={`avatar ${frameId ? `avatar-${frameId}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name={classId} size={Math.round(size * 0.55)} />
    </span>
  );
}
