/**
 * The Library, in Russian.
 *
 * Filled sector by sector — 100 entries and ~67k words is too much for one pass.
 * Any key absent here falls back to the English entry, so a partially translated
 * Library reads as English prose rather than as a broken page. `libraryProgress`
 * in the i18n test reports how far along this is and refuses to let it go
 * backwards.
 */
import type { Dict } from '..';

export const RU_LIBRARY: Dict = {};
