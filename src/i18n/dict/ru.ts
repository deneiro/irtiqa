import type { Dict } from '..';
import { RU_CONTENT } from './ru.content';
import { RU_GAME } from './ru.game';
import { RU_UI } from './ru.ui';

export const RU: Dict = { ...RU_CONTENT, ...RU_GAME, ...RU_UI };
