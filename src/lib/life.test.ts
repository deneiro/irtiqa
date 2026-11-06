import assert from "node:assert/strict";
import { test } from "node:test";
import { nextStep, parseQuest, questSteps, serializeQuest, stepTally, withQuestSteps } from "./life";

const BODY = [
  "Что это и как понять, что идёт хорошо.",
  "",
  "## Шаги",
  "- [x] Сделанный шаг — ты",
  "  ✓ 2030-01-05",
  "- [-] Снятый шаг — делает другой",
  "  деталь снятого",
  "- [ ] Открытый шаг — Claude",
  "",
  "## Журнал",
  "- 2030-01-05 · запись",
].join("\n");

test("questSteps reads «- [-]» as a dropped step: neither done nor open", () => {
  const steps = questSteps(BODY);
  assert.deepEqual(steps.map((s) => [s.done, s.dropped, s.text]), [
    [true, false, "Сделанный шаг — ты"],
    [false, true, "Снятый шаг — делает другой"],
    [false, false, "Открытый шаг — Claude"],
  ]);
  assert.equal(steps[1].detail, "деталь снятого");
  assert.equal(nextStep(steps)?.text, "Открытый шаг — Claude");
  assert.deepEqual(stepTally(steps), { done: 1, total: 2 }); // «1 из 2 шагов»: the dropped one is not counted
  assert.equal(nextStep(questSteps("## Шаги\n- [-] только снятый\n")), undefined);
});

test("withQuestSteps writes «[-]» back as it was; ticking another step keeps it", () => {
  const steps = questSteps(BODY);
  assert.equal(withQuestSteps(BODY, steps), BODY + "\n");
  const ticked = withQuestSteps(BODY, steps.map((s, i) => (i === 2 ? { ...s, done: true } : s)));
  assert.match(ticked, /^- \[-\] Снятый шаг — делает другой\n {2}деталь снятого$/m);
  assert.match(ticked, /^- \[x\] Открытый шаг — Claude$/m);
});

test("parseQuest reads stage and stage_note; a rewrite writes them once, as they were", () => {
  const file = {
    rel: "life/activities/Дело.md", mtime: 0,
    content: '---\ntitle: Дело\ntype: activity\ntheme: Business & career\nstatus: active\nstage: ждёт\nstage_note: "ждёт ответа (2030-01-05)"\n---\nТекст.\n',
  };
  const q = parseQuest(file);
  assert.equal(q.stage, "ждёт");
  assert.equal(q.stageNote, "ждёт ответа (2030-01-05)");
  const again = serializeQuest(q);
  assert.equal(again.match(/^stage:/gm)?.length, 1);
  assert.equal(again.match(/^stage_note:/gm)?.length, 1);
  assert.deepEqual([parseQuest({ ...file, content: again }).stage, parseQuest({ ...file, content: again }).stageNote], ["ждёт", "ждёт ответа (2030-01-05)"]);
  // «идет» without ё is the same stage; a word that is not a stage is no stage
  assert.equal(parseQuest({ ...file, content: file.content.replace("stage: ждёт", "stage: идет") }).stage, "идёт");
  assert.equal(parseQuest({ ...file, content: file.content.replace("stage: ждёт", "stage: думаю") }).stage, undefined);
});
