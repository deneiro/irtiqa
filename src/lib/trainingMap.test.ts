import assert from "node:assert/strict";
import { test } from "node:test";
import { nextStrength, planOf, dayOf, hitDay, hitExercise, inProgram, mirror, programWeek, type Exercise, type Program } from "./trainingMap";

const ex: Record<string, Exercise> = {
  push: { id: "push", eq: "body", name: "Push", p: ["chest"], s: ["triceps", "front_delt"], cues: [] },
  dip: { id: "dip", eq: "dips", name: "Dip", p: ["triceps"], s: ["chest"], cues: [] },
};
const prog: Program = {
  from: "2026-11-09", goal: "", rules: [], research: [], track: "",
  week: [["пн", "1"], ["вт", "walk"], ["ср", "2"], ["чт", "walk"], ["пт", "3"], ["сб", "game"], ["вс", "rest"]],
  days: [{ k: "1", name: "A", focus: "", items: [["push", 3, "8–15"], ["dip", 2, "6"]] }, { k: "2", name: "B", focus: "", items: [["push", 2, "10"]] }],
};

test("trainingMap: mirrors around the body's middle", () => assert.deepEqual(mirror([[90, 10]]), [[110, 10]]));
test("trainingMap: an exercise: main wins over helping", () => assert.deepEqual(hitExercise(ex.push), { chest: "p", triceps: "s", front_delt: "s" }));
test("trainingMap: a day: a muscle is main if any exercise makes it main", () => assert.deepEqual(hitDay(prog.days[0], ex), { chest: "p", triceps: "p", front_delt: "s" }));
test("trainingMap: lists the days an exercise is in", () => assert.deepEqual(inProgram(prog).push.map((x) => x.k), ["1", "2"]));
test("trainingMap: weeks from the start, none before", () => {
    assert.equal(programWeek(prog, "2026-11-08"), undefined);
    assert.equal(programWeek(prog, "2026-11-09"), 1);
    assert.equal(programWeek(prog, "2026-11-16"), 2);
  });
test("trainingMap: today's strength day by the weekday", () => {
    assert.equal(dayOf(prog, "2026-11-09")?.k, "1"); // Monday
    assert.equal(dayOf(prog, "2026-11-10"), undefined); // walk
    assert.equal(dayOf(prog, "2026-11-11")?.k, "2");
  });

test("trainingMap: a rest day names the next strength day", () => {
  assert.equal(planOf(prog, "2026-11-10").text, "walk");
  assert.equal(nextStrength(prog, "2026-11-10")?.wd, "ср");
});
