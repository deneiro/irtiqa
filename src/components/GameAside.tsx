import { Link } from "react-router-dom";
import { rankOf } from "../lib/game";
import { useGame } from "../lib/useGame";
import { FlameIcon, LevelMark, WeekBars } from "./GameBits";

/**
 * What a painted header says on its right side when the page has no number of its own: the level of the page's theme
 * with its eight weeks of XP, or — with no theme — the player's level and the fire. Nothing while the vault loads.
 */
export default function GameAside({ theme }: { theme?: string }) {
  const game = useGame();
  if (!game) return null;
  const xp = theme ? game.themes.find((x) => x.theme === theme) : undefined;
  if (xp) return <><LevelMark level={xp.level} caption="уровень темы" note={`всего ${xp.total}`} /><WeekBars weeks={xp.weeks} /></>;
  return (
    <>
      <LevelMark level={game.level} caption={`уровень · ${rankOf(game.level.level)}`} note={`всего ${game.total}`} />
      <Link className="gb-fireline" to="/"><FlameIcon />{game.flame.days} подряд · открыть «Сегодня» →</Link>
    </>
  );
}
