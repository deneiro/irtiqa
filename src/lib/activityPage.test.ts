import assert from "node:assert/strict";
import { test } from "node:test";
import { activityJournal, activityParts } from "./activityPage";

const FULL = `Что это за деятельность, первой строкой,
и продолжение той же мысли [[Проект В]].

Второй абзац.

---

## Сейчас
- Сделать шаг А с [[Страница Б|подписью]] — ты

## Этапы
1. **Первый** — описание.
2. Второй.

## Шаги
- [x] Шаг А — Claude
  ✓ 2030-01-02
- [ ] Шаг Б — ты

## Метрики
| Дата | Сколько |
|---|---|

## Пустая

## Журнал
- 2030-01-01 — заведена со слов
- 2030-01-03 · 45 мин — сессия таймера
  и строка под ней
- 2030-01-03 · запись Claude
- 2030-01-02 · 5 минут на разговор
просто текст без даты
`;

test("activityParts: the intro as paragraphs, «Сейчас», and the file's own sections; the rules and the empty ones left out", () => {
  const p = activityParts(FULL);
  assert.deepEqual(p.intro, ["Что это за деятельность, первой строкой, и продолжение той же мысли [[Проект В]].", "Второй абзац."]);
  assert.deepEqual(p.now, ["Сделать шаг А с [[Страница Б|подписью]] — ты"]);
  assert.deepEqual(p.other.map((s) => s.heading), ["Этапы", "Метрики"]);
});

test("activityParts: a file without any of it", () => {
  assert.deepEqual(activityParts(""), { intro: [], now: [], other: [] });
  assert.deepEqual(activityParts("## Сейчас\nшаг одной строкой\n\n## Шаги\n- [ ] шаг").now, ["шаг одной строкой"]);
});

test("activityJournal: every way a line is written, newest first, the lower line of a day first", () => {
  assert.deepEqual(activityJournal(FULL), [
    { date: "2030-01-03", note: "запись Claude" },
    { date: "2030-01-03", minutes: 45, note: "сессия таймера и строка под ней" },
    { date: "2030-01-02", note: "5 минут на разговор" },
    { date: "2030-01-01", note: "заведена со слов" },
  ]);
  assert.deepEqual(activityJournal("## Сейчас\n- шаг"), []);
});
