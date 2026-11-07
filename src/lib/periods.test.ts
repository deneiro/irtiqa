import assert from "node:assert/strict";
import { test } from "node:test";
import { ayahsOf } from "./ayah";
import { tickTask } from "./bank";
import { carriedFrom } from "./carry";
import { asrOn, fajrOn, ishaOn, prayerTimes, sunset, zuhrOn } from "./maghrib";
import { byPeriod, parsePeriod, periodAt, periodOf, stripPeriod, withPeriod } from "./periods";
import { parseTraining } from "./training";

const CITY = { lat: 42.34, lon: 69.59 };
const hm = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty" });

test("the five times come in order, asr by the Hanafi shadow", () => {
  const d = "2026-11-08";
  const t = [fajrOn(d, CITY.lat, CITY.lon), zuhrOn(d, CITY.lat, CITY.lon), asrOn(d, CITY.lat, CITY.lon), sunset(d, CITY.lat, CITY.lon), ishaOn(d, CITY.lat, CITY.lon)];
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1], `${i}: ${t.map(hm)}`);
  // Hanafi asr is later than the shadow-of-one asr
  assert.ok(asrOn(d, CITY.lat, CITY.lon, 2) > asrOn(d, CITY.lat, CITY.lon, 1));
  // isha some 75–95 minutes after maghrib at this latitude in November
  const gap = (t[4].getTime() - t[3].getTime()) / 60000;
  assert.ok(gap > 70 && gap < 100, String(gap));
});

test("a task carries its part before the carry suffix and keeps it when it moves", () => {
  assert.equal(withPeriod("Позвонить — [[X]]", "зухр"), "Позвонить — [[X]] · @зухр");
  assert.equal(withPeriod("Позвонить · с 2026-11-08", "фаджр"), "Позвонить · @фаджр · с 2026-11-08");
  assert.equal(withPeriod("Позвонить · @аср · с 2026-11-08", "иша"), "Позвонить · @иша · с 2026-11-08");
  const t = "Позвонить · @фаджр · с 2026-11-08";
  assert.equal(periodOf(t), "фаджр");
  assert.equal(carriedFrom(t), "2026-11-08");
  assert.equal(stripPeriod(t), "Позвонить · с 2026-11-08");
  assert.equal(periodOf("встреча @вечер"), undefined);
  assert.deepEqual(["2", "II", "@зухр", "Зухр", "6"].map(parsePeriod), ["зухр", "зухр", "зухр", "зухр", undefined]);
});

test("tasks group by part in the order of the day, the rest last", () => {
  const g = byPeriod([{ text: "a · @магриб" }, { text: "b" }, { text: "c · @фаджр" }]);
  assert.deepEqual(g.map((x) => [x.key, x.tasks.map((t) => t.text)]).filter(([, t]) => (t as string[]).length), [["фаджр", ["c · @фаджр"]], ["магриб", ["a · @магриб"]], [undefined, ["b"]]]);
});

test("the part of a moment", () => {
  const t = prayerTimes("2026-11-08", CITY.lat, CITY.lon);
  assert.equal(periodAt(new Date(t.fajr.getTime() - 60000), t), "иша");
  assert.equal(periodAt(new Date(t.fajr.getTime() + 60000), t), "фаджр");
  assert.equal(periodAt(new Date(t.asr.getTime() + 60000), t), "аср");
  assert.equal(periodAt(new Date(t.isha.getTime() + 60000), t), "иша");
});

test("tickTask ticks one open line by ID, once", () => {
  const c = "## Задачи\n- [ ] **F01.1.1.1** Узнать — [[Б]] · с 2026-W45\n- [ ] **F01.1.1.10** Другое\n";
  const once = tickTask(c, "F01.1.1.1", "2026-11-09");
  assert.equal(once, "## Задачи\n- [x] **F01.1.1.1** Узнать — [[Б]] · с 2026-W45 ✓ 2026-11-09\n- [ ] **F01.1.1.10** Другое\n");
  assert.equal(tickTask(once, "F01.1.1.1", "2026-11-10"), once);
});

test("ayahsOf reads the meaning lines of «## Текст» only, short ones", () => {
  const body = "## Текст\n\n### 2:1\n\n**Кулиев:** Алиф. Лам. Мим.\n\n### 2:2\n\n**Кулиев:** Это Писание, в котором нет сомнения, верный путеводитель для богобоязненных.\n\n## Разбор\n\n### 2:3\n\n**Кулиев:** не отсюда — это разбор, а не текст суры, его брать нельзя никак.\n";
  assert.deepEqual(ayahsOf(body).map((a) => a.ayah), [2]);
});

test("parseTraining reads one row a weekday", () => {
  const md = "Текст.\n\n| День | Тип | Что | Упражнения |\n|---|---|---|---|\n| пн | силовая | грудь | отжимания; жим лёжа |\n| вт | кардио | 30 минут | — |\n| вс | отдых | | |\n";
  const t = parseTraining(md);
  assert.deepEqual(t.map((x) => [x.day, x.kind, x.exercises]), [["пн", "силовая", ["отжимания", "жим лёжа"]], ["вт", "кардио", []], ["вс", "отдых", []]]);
});
