import assert from "node:assert/strict";
import { test } from "node:test";
import { addZikr, parseZikrs, setZikr, zikrWeek } from "./zikr";
import { emptyDay, mergeDay, parseDay, serializeDay, type Day } from "./life";

const PAGE = `# Зикры

текст

| Зикр | Слова | Смысл | Цель в день |
|---|---|---|---|
| Истигфар | Астагфируллах | Прошу прощения у Аллаха | |
| Салауат | Аллахумма салли | О Аллах, благослови | 100 |

## Changes
`;

test("the dhikr list is the table of the page; an empty goal is no goal", () => {
  assert.deepEqual(parseZikrs(PAGE), [
    { name: "Истигфар", words: "Астагфируллах", meaning: "Прошу прощения у Аллаха", goal: undefined },
    { name: "Салауат", words: "Аллахумма салли", meaning: "О Аллах, благослови", goal: 100 },
  ]);
});

test("a count adds up, never goes below zero, and survives the day file both ways", () => {
  let d: Day = emptyDay("2030-01-05");
  d = addZikr(addZikr(d, "Истигфар", 100), "Истигфар", 33);
  d = addZikr(d, "Салауат", 10);
  d = addZikr(d, "Салауат", -50);
  assert.deepEqual(d.zikr, { Истигфар: 133 });
  const text = serializeDay(d);
  assert.match(text, /^zikr: \[.*Истигфар: 133.*\]$/m);
  const back = parseDay({ rel: "life/days/2030-01-05.md", mtime: 0, content: text });
  assert.deepEqual(back.zikr, { Истигфар: 133 });
  // a day without dhikr writes no line
  assert.doesNotMatch(serializeDay(emptyDay("2030-01-05")), /^zikr:/m);
  // the week counts seven days back
  const days = new Map([["2030-01-05", back], ["2029-12-30", addZikr(emptyDay("2029-12-30"), "Истигфар", 7)], ["2029-12-29", addZikr(emptyDay("2029-12-29"), "Истигфар", 1000)]]);
  assert.equal(zikrWeek(days, "Истигфар", "2030-01-05"), 140);
});

test("two writers adding dhikr at once keep both", () => {
  const base = addZikr(emptyDay("2030-01-05"), "Истигфар", 100);
  const ours = addZikr(base, "Истигфар", 33);
  const theirs = addZikr(addZikr(base, "Истигфар", 10), "Салауат", 5);
  assert.deepEqual(mergeDay(base, ours, theirs).zikr, { Истигфар: 143, Салауат: 5 });
});

test("setZikr writes the number he counted himself; zero takes the name off", () => {
  let d = setZikr(emptyDay("2026-11-25"), "Истигфар", 200);
  assert.deepEqual(d.zikr, { "Истигфар": 200 });
  d = setZikr(d, "Истигфар", 150);
  assert.deepEqual(d.zikr, { "Истигфар": 150 });
  d = setZikr(d, "Истигфар", 0);
  assert.deepEqual(d.zikr, {});
});
