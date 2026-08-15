import type { Dict } from '..';
import { EN_LIBRARY } from './en.library';
import { EN_CONTENT } from './en.content';
import { EN_GAME } from './en.game';
import { EN_UI } from './en.ui';

export const EN: Dict = { ...EN_LIBRARY, ...EN_CONTENT, ...EN_GAME, ...EN_UI };
