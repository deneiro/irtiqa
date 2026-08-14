import type { AttributeKey, IconName } from './types';
import { t } from '../i18n';

// The weekly boss turns the radar chart's diagnosis into gameplay: it always
// spawns from whichever attribute you've fed the least, so slaying it IS
// rebalancing your life. The reward is about a day's worth of gold.
//
// It is pure upside: an unslain boss costs nothing, it just leaves Monday.
// It used to take 15 HP for going unchallenged — which meant a rough week
// ended by billing you for it, on the attribute you were already worst at.
export const BOSS_REQUIRED = 3; // meaningful tagged actions to slay it
export const BOSS_REWARD = { xp: 60, gold: 30 };

// Names and taunts live in the dictionaries under `boss.<attr>.*`.
export const BOSSES: Record<AttributeKey, { name: string; icon: IconName; taunt: string }> = Object.fromEntries(
  (['health', 'friends', 'family', 'money', 'career', 'spirituality', 'development', 'brightness'] as AttributeKey[]).map(k => [
    k,
    {
      icon: `boss${k[0].toUpperCase()}${k.slice(1)}` as IconName,
      get name() {
        return t(`boss.${k}.name`);
      },
      get taunt() {
        return t(`boss.${k}.taunt`);
      },
    },
  ]),
) as Record<AttributeKey, { name: string; icon: IconName; taunt: string }>;
