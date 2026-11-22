import assert from "node:assert/strict";
import { test } from "node:test";
import { claudeScript, projectsOf } from "./projects";
import { buildLife } from "./life";
import { toggleGoalTask, parseGoals } from "./goals";
import type { MdFile } from "./types";

const act = (file: string, fm: string): MdFile => ({ rel: `life/activities/${file}.md`, mtime: 0, content: `---\ntitle: ${file}\ntype: activity\ntheme: Business & career\n${fm}\n---\n## Сейчас\n- шаг\n` });

test("projects are the activities with a folder that are not done, active first", () => {
  const life = buildLife([
    act("Б", 'status: paused\nfolder: "/x/б"'),
    act("А", 'status: active\nfolder: "/x/а"'),
    act("В", "status: active"),
    act("Г", 'status: done\nfolder: "/x/г"'),
  ]);
  assert.deepEqual(projectsOf(life).map((q) => [q.title, q.folder]), [["А", "/x/а"], ["Б", "/x/б"]]);
});

test("the Terminal script quotes the folder, spaces, & and quotes included", () => {
  const [e1, s1, e2, s2] = claudeScript('/Users/e/Memories & Fun/Земля "X"');
  assert.equal(e1, "-e");
  assert.equal(s1, 'tell application "Terminal" to do script "cd " & quoted form of "/Users/e/Memories & Fun/Земля \\"X\\"" & " && claude"');
  assert.equal(e2, "-e");
  assert.equal(s2, 'tell application "Terminal" to activate');
});

test("a week task is ticked with its date and unticked back; a carried line and a note are not counted", () => {
  const file = "---\ntype: goals\n---\n# Неделя\n\n## Задачи\n- [>] перенесено\nзаметка без галочки\n- [ ] **B01** банк — [[Банк]]\n- [ ] поговорить с имамом\n\n## Фокус\n- [ ] не задача\n";
  const ticked = toggleGoalTask(file, 1, "2030-01-05");
  assert.match(ticked, /- \[x\] поговорить с имамом ✓ 2030-01-05\n/);
  assert.match(ticked, /- \[ \] \*\*B01\*\* банк/);
  assert.deepEqual(parseGoals("2030-W01", ticked).tasks.map((t) => t.done), [false, true]);
  assert.equal(toggleGoalTask(ticked, 1, "2030-01-06"), file);
  assert.equal(toggleGoalTask(file, 5, "2030-01-05"), file);
});
