import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryEdits } from "./contact";
import { MEMORY_THEME } from "./memory";
import { parseEvent } from "./events";
import { buildLife } from "./life";
import { newPersonPage } from "./people";
import { buildPage } from "./vault";

const TODAY = "2030-02-01";
const events = buildLife([{ rel: "life/events/2030-02-01 Кино/event.md", mtime: 0, content: "---\ntitle: Кино\ntype: event\ndate: 2030-02-01\npeople: []\n---\n" }]).events;
const A = { name: "Человек А", rel: "wiki/People/Человек А.md", file: "Человек А" };
const FORM = { title: "  Поход   в горы ", place: "Горы", people: ["[[Человек Б]]", "[[Человек А]]", "Без страницы", "[[человек б]]"], body: "Пара слов.", theme: "" };

test("memoryEdits: the event of a memory — its folder, the person first among its people, «Досуг» by default", () => {
  const e = memoryEdits(A, FORM, TODAY, events);
  assert.equal(e.rel, "life/events/2030-02-01 Поход в горы/event.md");
  const ev = parseEvent({ rel: e.rel, content: e.content, mtime: 0 }, []);
  assert.deepEqual(
    { title: ev.title, date: ev.date, theme: ev.theme, place: ev.place, people: ev.people, tags: ev.tags, body: ev.body },
    { title: "Поход в горы", date: TODAY, theme: MEMORY_THEME, place: "Горы", people: ["[[Человек А]]", "[[Человек Б]]", "Без страницы"], tags: [], body: "Пара слов." },
  );
  assert.equal(parseEvent({ rel: e.rel, content: memoryEdits(A, { ...FORM, theme: "Social & friends" }, TODAY, events).content, mtime: 0 }, []).theme, "Social & friends");
});

test("memoryEdits: the same name on the same day is «уже есть», whatever its case; a name that makes no folder is refused", () => {
  assert.throws(() => memoryEdits(A, { ...FORM, title: "кино" }, TODAY, events), /уже есть/);
  assert.doesNotThrow(() => memoryEdits(A, { ...FORM, title: "Кино" }, "2030-01-31", events));
  assert.throws(() => memoryEdits(A, { ...FORM, title: " #?* " }, TODAY, events), /название/);
});

test("newPersonPage: the title is the file name; the frontmatter of a new person with his category and closeness; the body", () => {
  const p = newPersonPage({ name: " Человек:  Д? ", category: "друг", closeness: 7, how: "через работу", theme: "Social & friends" }, TODAY, []);
  assert.equal(p.rel, "wiki/People/Человек Д.md");
  const page = buildPage(p.rel, p.content, 0);
  assert.deepEqual(
    { title: page.title, type: page.type, theme: page.theme, zone: page.zone, aliases: page.aliases, tags: page.tags },
    { title: "Человек Д", type: "person", theme: "Social & friends", zone: "person", aliases: [], tags: [] },
  );
  assert.deepEqual(
    [page.fm.connection, page.fm.how_we_met, page.fm.category, page.fm.closeness, page.fm.created, page.fm.updated],
    ["друг", "через работу", "друг", "7", TODAY, TODAY],
  );
  assert.equal(page.body, "\n# Человек Д\n\n## Об отношениях\n\n");
});

test("newPersonPage: nothing chosen is «знакомый» and «—»; an author or a closeness out of 1–10 is not taken; a person already there is refused", () => {
  const page = buildPage("x.md", newPersonPage({ name: "Человек Е", category: "автор", closeness: 11, how: " ", theme: "Family & relationship" }, TODAY, []).content, 0);
  assert.deepEqual([page.fm.connection, page.fm.how_we_met, page.fm.category, page.fm.closeness, page.theme], ["знакомый", "—", undefined, undefined, "Family & relationship"]);
  assert.throws(() => newPersonPage({ name: "человек е", how: "", theme: "Social & friends" }, TODAY, ["wiki/People/Человек Е.md"]), /уже есть/);
  assert.throws(() => newPersonPage({ name: "?*", how: "", theme: "Social & friends" }, TODAY, []), /не годится/);
  assert.throws(() => newPersonPage({ name: "Имя ".repeat(20), how: "", theme: "Social & friends" }, TODAY, []), /не длиннее/);
});
