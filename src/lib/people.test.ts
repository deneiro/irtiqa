import assert from "node:assert/strict";
import { test } from "node:test";
import { PERSON_THEMES, findPerson, nameKey, personPage, personRel, safeTitle } from "./people";
import { THEME_BY_NAME } from "./themes";
import { buildPage } from "./vault";

const page = (file: string, extra = "", title = file) =>
  buildPage(`wiki/People/${file}.md`, `---\ntitle: ${title}\ntype: person\ntheme: Social & friends\n${extra}---\n\n# ${title}\n`, 0);

test("safeTitle: what the vault forbids in a name is dropped, spaces are single, no hidden or special start", () => {
  assert.equal(safeTitle("  Человек   А "), "Человек А");
  assert.equal(safeTitle('Человек: А/Б*?"<>|#[]^\\'), "Человек АБ");
  assert.equal(safeTitle("Человек А / Б"), "Человек А Б");
  assert.equal(safeTitle("._ Человек А"), "Человек А");
  assert.equal(safeTitle("Человек А-Б (родня)"), "Человек А-Б (родня)");
  assert.equal(safeTitle('?*<>"'), "", "nothing left is an empty name, not a file called «.md»");
  assert.equal(safeTitle("..."), "");
});

test("personRel: every person page is in wiki/People/", () => {
  assert.equal(personRel("Человек А"), "wiki/People/Человек А.md");
});

test("nameKey: case, ё and е, spaces and the form of the letters do not make two names different", () => {
  assert.equal(nameKey("  ЁЖИК   Е "), nameKey("ежик е"));
  assert.equal(nameKey("й".normalize("NFD")), nameKey("й".normalize("NFC")));
  assert.equal(nameKey(""), "");
});

test("findPerson: title or file name first, then an alias; case, ё and spaces do not matter", () => {
  const a = page("Человек А", "aliases: [Ч.А., Ёжик Ё]\n");
  const b = page("Человек Б");
  const c = page("Человек В (2)", "", "Человек В");
  const pages = [a, b, c];
  assert.equal(findPerson(pages, "человек а"), a);
  assert.equal(findPerson(pages, " Человек   Б "), b);
  assert.equal(findPerson(pages, "ч.а."), a, "an alias");
  assert.equal(findPerson(pages, "ежик е"), a, "ё and е are one letter");
  assert.equal(findPerson(pages, "Человек В (2)"), c, "the file name, when the title differs");
  assert.equal(findPerson(pages, "Человек В"), c, "the title");
  assert.equal(findPerson(pages, "Человек Г"), undefined);
  assert.equal(findPerson(pages, "   "), undefined);
  // A page's own title beats another page's alias for the same word.
  const d = page("Человек Д", "aliases: [Человек Б]\n");
  assert.equal(findPerson([d, b], "Человек Б"), b);
});

test("personPage: the frontmatter keys the bot may write, the body skeleton, nothing of the app's", () => {
  const text = personPage({ title: "Человек А", theme: "Social & friends", connection: "друг", howWeMet: "школа", date: "2026-11-06" });
  assert.equal(
    text,
    [
      "---",
      "title: Человек А",
      "type: person",
      "theme: Social & friends",
      "connection: друг",
      "how_we_met: школа",
      "created: 2026-11-06",
      "updated: 2026-11-06",
      "aliases: []",
      "tags: []",
      "---",
      "",
      "# Человек А",
      "",
      "## Об отношениях",
      "",
      "Добавлен через бота 2026-11-06.",
      "",
      "## Changes",
      "",
      "- 2026-11-06 — страница создана через бота",
      "",
    ].join("\n"),
  );
  const p = buildPage(personRel("Человек А"), text, 0);
  assert.equal(p.zone, "person");
  assert.equal(p.type, "person");
  assert.equal(p.title, "Человек А");
  assert.equal(p.theme, "Social & friends");
  assert.deepEqual(p.aliases, []);
  assert.deepEqual(p.tags, []);
  assert.equal(p.created, "2026-11-06");
  assert.deepEqual(Object.keys(p.fm), ["title", "type", "theme", "connection", "how_we_met", "created", "updated", "aliases", "tags"]);
  for (const owned of ["last_contact", "closeness", "radicals", "category", "lives", "work", "related", "phone", "birthday"]) {
    assert.ok(!(owned in p.fm), `${owned} is the app's and the owner's, not the bot's`);
  }
});

test("personPage: a skipped answer is «—», nothing is guessed", () => {
  const p = buildPage("wiki/People/Человек Б.md", personPage({ title: "Человек Б", theme: "Family & relationship", connection: "  ", howWeMet: "", date: "2026-11-06" }), 0);
  assert.equal(p.fm.connection, "—");
  assert.equal(p.fm.how_we_met, "—");
  assert.equal(p.theme, "Family & relationship");
});

test("personPage: free text comes back from the frontmatter exactly, whatever YAML could make of it", () => {
  const awkward = [
    "друг: из школы", '"сосед" и #1', "- первый", "true", "2026-11-06", "123", "~", "null", "[[Человек Б]] познакомил",
    "{как-то}", "d'Артаньян", "на связи, редко", "50% друг", "@друг", "*звёздочка", "!важно", "1e3", ".5", "yes",
  ];
  for (const text of awkward) {
    const built = buildPage("wiki/People/Человек А.md", personPage({ title: "Человек А", theme: "Social & friends", connection: text, howWeMet: text, date: "2026-11-06" }), 0);
    assert.equal(built.fm.connection, text, `connection ${JSON.stringify(text)}`);
    assert.equal(built.fm.how_we_met, text, `how_we_met ${JSON.stringify(text)}`);
    assert.equal(built.title, "Человек А");
  }
  const multi = buildPage("wiki/People/Человек А.md", personPage({ title: "Человек А", theme: "Social & friends", connection: "строка\n  вторая", howWeMet: "", date: "2026-11-06" }), 0);
  assert.equal(multi.fm.connection, "строка вторая", "a line break would end the value");
  // A title that starts like a number or a sign is still a title.
  const odd = buildPage("wiki/People/3-й Человек.md", personPage({ title: "3-й Человек", theme: "Social & friends", connection: "", howWeMet: "", date: "2026-11-06" }), 0);
  assert.equal(odd.title, "3-й Человек");
});

test("PERSON_THEMES: the five buttons of «Кто он тебе?» and the theme each means", () => {
  assert.deepEqual(PERSON_THEMES.map((t) => t.label), ["друзья", "семья", "бизнес", "духовность", "другое"]);
  assert.deepEqual(
    PERSON_THEMES.map((t) => t.theme),
    ["Social & friends", "Family & relationship", "Business & career", "Spirituality & Religion", "Social & friends"],
  );
  assert.equal(new Set(PERSON_THEMES.map((t) => t.code)).size, PERSON_THEMES.length, "callback codes are distinct");
  for (const t of PERSON_THEMES) assert.ok(THEME_BY_NAME.has(t.theme), `${t.theme} is one of the eight themes, verbatim`);
  for (const t of PERSON_THEMES) assert.ok(`psn:0:${t.code}`.length <= 64, "a button's callback data is capped at 64 bytes");
});
