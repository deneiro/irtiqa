/** The paintings of the game (2026-11-21): headers of the dashboard tabs and of the eight themes, 1536 × 640, the subject on the right and a calm left side for the text. */
import week from "./banner-week.webp";
import month from "./banner-month.webp";
import levels from "./banner-levels.webp";
import overview from "./banner-overview.webp";
import people from "./banner-people.webp";
import day from "./banner-day.webp";
import habits from "./banner-habits.webp";
import quests from "./banner-quests.webp";
import calendar from "./banner-calendar.webp";
import training from "./banner-training.webp";
import wheel from "./banner-wheel.webp";
import trends from "./banner-trends.webp";
import spirit from "./theme-spirit.webp";
import social from "./theme-social.webp";
import growth from "./theme-growth.webp";
import health from "./theme-health.webp";
import finance from "./theme-finance.webp";
import family from "./theme-family.webp";
import business from "./theme-business.webp";
import fun from "./theme-fun.webp";

export const BANNER = { week, month, levels, overview, people, day, habits, quests, calendar, training, wheel, trends };

export const THEME_ART: Record<string, string> = {
  "Spirituality & Religion": spirit,
  "Social & friends": social,
  "Personal growth": growth,
  "Health & sport": health,
  "Finance & money": finance,
  "Family & relationship": family,
  "Business & career": business,
  "Memories & Fun": fun,
};
