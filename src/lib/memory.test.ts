import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DONE_WORDS, NOBODY_WORDS, NO_PHOTO_WORDS, SKIP_WORDS, addTyped, eventTitle, imageExt, largestPhoto, looksLikeName, memoryEventText, memoryPool,
  memorySummary, parseDateInput, photoName, photoPick, splitNames, toggleWho, whoLink, whoList, type Who,
} from "./memory";
import { buildCircle, byLastContactOrMeeting } from "./circle";
import { contactEdits, memoryContactEdits } from "./contact";
import { byNumberedName, eventsFor, parseEvent, personName, serializeEvent, uniqueEventDir } from "./events";
import { buildPage } from "./vault";

const TODAY = "2026-11-06";

const person = (file: string, fm = "", body = "# x\n") =>
  buildPage(`wiki/People/${file}.md`, `---\ntitle: ${file}\ntype: person\ntheme: Social & friends\n${fm}---\n\n${body}`, 0);

const event = (date: string, title: string, people: string[]) =>
  parseEvent({ rel: `life/events/${date} ${title}/event.md`, mtime: 0, content: serializeEvent({ title, date, theme: "Memories & Fun", place: "", people, tags: [], body: "" }) }, []);

// ---------- what he types ----------

test("eventTitle: one line; a title with no file name in it or a too long one is sent back", () => {
  assert.deepEqual(eventTitle("  Событие\n  Б "), { ok: true, title: "Событие Б" });
  assert.deepEqual(eventTitle("Событие: Б"), { ok: true, title: "Событие: Б" }, "the colon stays in the title; the folder name loses it");
  assert.deepEqual(eventTitle("???"), { ok: false, why: "empty" });
  assert.deepEqual(eventTitle(" \n "), { ok: false, why: "empty" });
  assert.equal(eventTitle("б".repeat(80)).ok, true);
  assert.deepEqual(eventTitle("б".repeat(81)), { ok: false, why: "long" });
});

test("parseDateInput: ISO, the words, and the way it is written at home", () => {
  const ok = (text: string) => parseDateInput(text, TODAY);
  assert.deepEqual(ok("2026-11-05"), { ok: true, date: "2026-11-05" });
  assert.deepEqual(ok("2026-11-6"), { ok: true, date: "2026-11-06" });
  assert.deepEqual(ok("вчера"), { ok: true, date: "2026-11-05" });
  assert.deepEqual(ok(" Вчера! "), { ok: true, date: "2026-11-05" });
  assert.deepEqual(ok("позавчера"), { ok: true, date: "2026-11-04" });
  assert.deepEqual(ok("сегодня"), { ok: true, date: TODAY });
  assert.deepEqual(ok("05.11"), { ok: true, date: "2026-11-05" });
  assert.deepEqual(ok("5/11."), { ok: true, date: "2026-11-05" });
  assert.deepEqual(ok("5.11.2026"), { ok: true, date: "2026-11-05" });
  assert.deepEqual(ok("05.11.26"), { ok: true, date: "2026-11-05" });
  assert.deepEqual(ok("2024-02-29"), { ok: true, date: "2024-02-29" }, "a leap day");
  assert.deepEqual(ok("28.12"), { ok: true, date: "2025-12-28" }, "a day and month still ahead this year mean last year");
});

test("parseDateInput: a day that does not exist or is not here yet is refused, with the reason", () => {
  const no = (text: string, today = TODAY) => parseDateInput(text, today);
  assert.deepEqual(no("2026-02-31"), { ok: false, why: "format" });
  assert.deepEqual(no("31.02"), { ok: false, why: "format" });
  assert.deepEqual(no("2026-13-01"), { ok: false, why: "format" });
  assert.deepEqual(no("когда-то"), { ok: false, why: "format" });
  assert.deepEqual(no(""), { ok: false, why: "format" });
  assert.deepEqual(no("завтра"), { ok: false, why: "format" });
  assert.deepEqual(no("2026-11-07"), { ok: false, why: "future" });
  assert.deepEqual(no("07.11.2026"), { ok: false, why: "future" });
  assert.deepEqual(no("01.01.2999"), { ok: false, why: "future" });
});

// ---------- with whom ----------

test("splitNames: commas, semicolons and lines; [[ ]] dropped; the same name once", () => {
  assert.deepEqual(splitNames("Человек А, [[Человек Б]]; человек а\n  Человек   В "), ["Человек А", "Человек Б", "Человек В"]);
  assert.deepEqual(splitNames(" , ;; "), []);
});

test("addTyped: a name is matched to a page by title or alias, else kept as plain text; no page is made", () => {
  const a = person("Человек А", "aliases: [Ч.А.]\n");
  const b = person("Человек Б");
  const pages = [a, b];
  const r = addTyped([], pages, "ч.а., Человек Г");
  assert.deepEqual(r.people, [{ name: "Человек А", rel: a.rel, file: "Человек А" }, { name: "Человек Г" }]);
  assert.deepEqual(r.added, r.people);
  assert.deepEqual(r.rejected, []);
  // Already chosen — by the button, by the title, by the alias, or as plain text — is not added again.
  const again = addTyped(r.people, pages, "Человек А, человек г, Человек Б");
  assert.deepEqual(again.added, [{ name: "Человек Б", rel: b.rel, file: "Человек Б" }]);
  assert.equal(again.people.length, 3);
  // A sentence typed at this step is not a name.
  const s = addTyped([], pages, "Ездили в горы вместе с друзьями на выходные");
  assert.deepEqual(s.people, []);
  assert.deepEqual(s.rejected, ["Ездили в горы вместе с друзьями на выходные"]);
  // A page is accepted even when its title is long: it is a page.
  const long = person("Очень Длинное Имя Человека Номер Пять Из Списка");
  assert.deepEqual(addTyped([], [long], "очень длинное имя человека номер пять из списка").added, [{ name: long.title, rel: long.rel, file: long.file }]);
});

test("toggleWho: a tap on a chosen person takes them off, on another adds them; whoList names pages and the rest", () => {
  const a: Who = { name: "Человек А", rel: "wiki/People/Человек А.md", file: "Человек А" };
  const b: Who = { name: "Человек Б", rel: "wiki/People/Человек Б.md", file: "Человек Б" };
  const plain: Who = { name: "Человек Г" };
  let chosen = toggleWho([], a);
  chosen = toggleWho(chosen, b);
  chosen = toggleWho(chosen, plain);
  assert.deepEqual(chosen, [a, b, plain]);
  assert.deepEqual(toggleWho(chosen, b), [a, plain]);
  assert.equal(whoList(chosen), "Человек А, Человек Б, Человек Г (нет страницы)");
  assert.equal(whoList([]), "");
});

test("looksLikeName: a name has a letter; «-», «.», «👍», a number are noise, and are not kept as people", () => {
  for (const junk of ["-", ".", "👍", "123", "...", "—", "!!", ""]) assert.equal(looksLikeName(junk), false, JSON.stringify(junk));
  for (const ok of ["Человек А", "Ёжик", "O'Neil", "Человек 2", "Ж"]) assert.equal(looksLikeName(ok), true, ok);
  const r = addTyped([], [person("Человек А")], "👍, -, ., Человек Г");
  assert.deepEqual(r.people, [{ name: "Человек Г" }]);
  assert.deepEqual(r.rejected, ["👍", "-", "."]);
  assert.deepEqual(addTyped([], [], "-").added, [], "nothing is added, and nothing is said to be 'already chosen' either");
});

test("typed words that stand for a button: «нет» at «С кем?» means nobody, and only that exact word", () => {
  for (const w of ["ни с кем", "Ни с кем!", "никого", "один", "нет", "Нет."]) assert.ok(NOBODY_WORDS.test(w), w);
  for (const w of ["Нетта", "нет такого", "Человек А", "ни", ""]) assert.ok(!NOBODY_WORDS.test(w), w);
  for (const w of ["готово", "Готово!", "всё", "хватит"]) assert.ok(DONE_WORDS.test(w), w);
  assert.ok(!DONE_WORDS.test("готовность"));
  for (const w of ["без фото", "Нет", "не надо"]) assert.ok(NO_PHOTO_WORDS.test(w), w);
  for (const w of ["пропустить", "-", "—", "нет."]) assert.ok(SKIP_WORDS.test(w), w);
  assert.ok(!SKIP_WORDS.test("Человек А"));
});

test("memoryPool: the circle most recently touched first — by contact or by a meeting — then the never touched, the closer first", () => {
  const a = person("Человек А", "last_contact: 2026-10-01\ncloseness: 5\n");
  const b = person("Человек Б", "last_contact: 2026-11-01\ncloseness: 3\n");
  const c = person("Человек В"); // met in an event, no last_contact
  const d = person("Человек Г", "closeness: 9\n");
  const e = person("Человек Д");
  const author = person("Автор Э", "connection: author\n");
  const template = buildPage("wiki/People/Шаблон.md", "---\ntitle: Шаблон\ntype: template\n---\n", 0);
  const events = [event("2026-10-20", "Событие Б", ["[[Человек В]]"])];
  const items = buildCircle([a, b, c, d, e, author, template], events, TODAY);
  assert.deepEqual(memoryPool(items).map((x) => x.name), ["Человек Б", "Человек В", "Человек А", "Человек Г", "Человек Д"]);
  assert.deepEqual(memoryPool(items, 2).map((x) => x.rel), [b.rel, c.rel]);
  // Not the order of the contact list, which puts the longest silence first.
  assert.notDeepEqual(byLastContactOrMeeting(items).map((x) => x.name), items.map((x) => x.name));
});

// ---------- photos ----------

test("largestPhoto: the biggest of the sizes Telegram sends; on a tie the heavier file", () => {
  const sizes = [
    { file_id: "s", width: 90, height: 90 },
    { file_id: "l", width: 1280, height: 960 },
    { file_id: "m", width: 320, height: 240, file_size: 9 },
  ];
  assert.equal(largestPhoto(sizes)?.file_id, "l");
  assert.equal(largestPhoto([{ file_id: "x", width: 10, height: 10, file_size: 1 }, { file_id: "y", width: 10, height: 10, file_size: 2 }])?.file_id, "y");
  assert.equal(largestPhoto([]), undefined);
});

test("imageExt: from the file name when the app can show it, else from the mime type", () => {
  assert.equal(imageExt("IMG_1.JPG", undefined), ".jpg");
  assert.equal(imageExt("a.heic", ""), ".heic");
  assert.equal(imageExt(undefined, "image/png"), ".png");
  assert.equal(imageExt("noext", "image/jpeg"), ".jpg");
  assert.equal(imageExt("scan.tiff", "image/tiff"), undefined);
  assert.equal(imageExt(undefined, undefined), undefined);
});

test("photoPick: a photo is its largest size as .jpg; an image document keeps its own extension; anything else is no photo", () => {
  const photo = [{ file_id: "s", width: 90, height: 90 }, { file_id: "l", width: 800, height: 600 }];
  assert.deepEqual(photoPick({ photo }), { fileId: "l", ext: ".jpg" });
  assert.deepEqual(photoPick({ document: { file_id: "d", file_name: "x.PNG", mime_type: "image/png" } }), { fileId: "d", ext: ".png" });
  assert.deepEqual(photoPick({ document: { file_id: "d", mime_type: "image/webp" } }), { fileId: "d", ext: ".webp" });
  assert.deepEqual(photoPick({ document: { file_id: "d", file_name: "x.jpeg" } }), { fileId: "d", ext: ".jpeg" });
  assert.equal(photoPick({ document: { file_id: "d", file_name: "x.pdf", mime_type: "application/pdf" } }), undefined);
  assert.equal(photoPick({ document: { file_id: "d", file_name: "x.tiff", mime_type: "image/tiff" } }), "unsupported");
  assert.equal(photoPick({ photo: [] }), undefined);
  assert.equal(photoPick({}), undefined);
});

test("photoName and the order of photos in an event: by the number, so photo-2 is before photo-10", () => {
  assert.equal(photoName(3, ".png"), "photo-3.png");
  const media = [10, 2, 1, 11].map((n) => `life/events/2026-11-05 Событие Б/${photoName(n, ".jpg")}`);
  media.push("life/events/2026-11-05 Событие Б/02.jpg", "life/events/2026-11-05 Событие Б/01.jpg", "life/events/другое/photo-1.jpg");
  const content = serializeEvent({ title: "Событие Б", date: "2026-11-05", theme: "Memories & Fun", place: "", people: [], tags: [], body: "" });
  const e = parseEvent({ rel: "life/events/2026-11-05 Событие Б/event.md", mtime: 0, content }, media);
  assert.deepEqual(e.photos.map((p) => p.split("/").pop()), ["01.jpg", "02.jpg", "photo-1.jpg", "photo-2.jpg", "photo-10.jpg", "photo-11.jpg"]);
  assert.ok(byNumberedName("a2.jpg", "a10.jpg") < 0 && byNumberedName("a10.jpg", "a2.jpg") > 0 && byNumberedName("a1.jpg", "a1.jpg") === 0);
  assert.ok(byNumberedName("b.jpg", "a9.jpg") > 0, "text parts are still compared as text");
});

test("uniqueEventDir: a folder name that is taken gets (2), then (3)", () => {
  const taken = new Set<string>();
  const dir = () => uniqueEventDir("2026-11-05", "Событие: Б?", (d) => taken.has(d));
  assert.equal(dir(), "life/events/2026-11-05 Событие Б");
  taken.add("life/events/2026-11-05 Событие Б");
  assert.equal(dir(), "life/events/2026-11-05 Событие Б (2)");
  taken.add("life/events/2026-11-05 Событие Б (2)");
  assert.equal(dir(), "life/events/2026-11-05 Событие Б (3)");
  assert.throws(() => uniqueEventDir("2026-11-05", "Событие Б", () => true));
});

// ---------- what is written and said ----------

test("memoryEventText: what the app's own form writes, plus the description as the body", () => {
  const a: Who = { name: "Человек А", rel: "wiki/People/Человек А.md", file: "Человек А" };
  // No description: byte for byte the text EventForm saves.
  assert.equal(
    memoryEventText({ title: "Событие Б", date: "2026-11-05", people: [a], text: "" }),
    serializeEvent({ title: "Событие Б", date: "2026-11-05", theme: "Memories & Fun", place: "", people: ["[[Человек А]]"], tags: [], body: "" }),
  );
  const text = memoryEventText({ title: "Событие: Б", date: "2026-11-05", people: [a, { name: "Человек Г" }], text: "Первая строка.\n\nВторая." });
  const e = parseEvent({ rel: "life/events/2026-11-05 Событие Б/event.md", mtime: 0, content: text }, []);
  assert.equal(e.title, "Событие: Б");
  assert.equal(e.date, "2026-11-05");
  assert.equal(e.theme, "Memories & Fun");
  assert.deepEqual(e.people, ["[[Человек А]]", "Человек Г"], "a page is a link, a name without a page stays plain text");
  assert.equal(e.body, "Первая строка.\n\nВторая.");
  assert.equal(e.place, "");
  assert.deepEqual(e.tags, []);
  assert.deepEqual(parseEvent({ rel: e.rel, mtime: 0, content: memoryEventText({ title: "Событие Б", date: "2026-11-05", people: [], text: "" }) }, []).people, []);
});

test("memoryEventText: a chosen person is linked by file name — the title after a bar when they differ — and still found", () => {
  const odd = buildPage("wiki/People/Файл Х.md", "---\ntitle: Человек Х\ntype: person\ntheme: Social & friends\n---\n\n# x\n", 0); // title is not the file name
  const same = person("Человек А");
  const who = (p: typeof odd): Who => ({ name: p.title, rel: p.rel, file: p.file });
  const text = memoryEventText({ title: "Событие Б", date: "2026-11-05", people: [who(odd), who(same), { name: "Человек Г" }], text: "" });
  const e = parseEvent({ rel: "life/events/2026-11-05 Событие Б/event.md", mtime: 0, content: text }, []);
  assert.deepEqual(e.people, ["[[Файл Х|Человек Х]]", "[[Человек А]]", "Человек Г"]);
  assert.deepEqual(e.people.map(personName), ["Файл Х", "Человек А", "Человек Г"], "the file name is what the app reads as the person");
  // The circle and the person page's own list find the event by the file name ...
  const items = buildCircle([odd, same], [e], TODAY);
  assert.equal(items.find((i) => i.page.rel === odd.rel)?.lastMeet, "2026-11-05");
  assert.equal(items.find((i) => i.page.rel === same.rel)?.lastMeet, "2026-11-05");
  assert.deepEqual(eventsFor([odd.title, odd.file, ...odd.aliases], [e]), [e]);
  // ... and an event that links the title (how the app's form writes it) is still found, too.
  const byTitle = event("2026-11-04", "Событие В", ["[[Человек Х]]"]);
  assert.equal(buildCircle([odd], [byTitle], TODAY)[0].lastMeet, "2026-11-04");
  // A title with a bar or a bracket would break the alias: the file name alone then.
  assert.equal(whoLink({ name: "Человек | Х", rel: "wiki/People/Файл Х.md", file: "Файл Х" }), "[[Файл Х]]");
  assert.equal(whoLink({ name: "Человек Г" }), "Человек Г");
});

test("memorySummary: the closing reply, without «с кем» when nobody was named", () => {
  const people: Who[] = [{ name: "Человек А", rel: "x", file: "x" }, { name: "Человек Г" }];
  assert.equal(memorySummary({ title: "Событие Б", date: "2026-11-05", people, photos: 3 }), "📸 Записано: Событие Б · 2026-11-05 · с кем: Человек А, Человек Г · фото: 3");
  assert.equal(memorySummary({ title: "Событие Б", date: "2026-11-05", people: [], photos: 0 }), "📸 Записано: Событие Б · 2026-11-05 · фото: 0");
});

// ---------- the contact ----------

const RAW = [
  "---",
  "title: Человек А",
  "type: person",
  "theme: Social & friends",
  "updated: 2026-10-14",
  'closeness: "7"',
  "last_contact: 2026-10-14",
  "radicals: [Р1]",
  "---",
  "",
  "# Человек А",
  "",
  "Текст страницы остаётся как есть.",
  "",
].join("\n");

test("memoryContactEdits: last_contact is the day of the event, updated is today, the rest of the page is untouched", () => {
  const edits = memoryContactEdits([{ rel: "wiki/People/Человек А.md", file: "Человек А", raw: RAW }], "2026-11-03", TODAY);
  assert.equal(edits.length, 1, "the person page only: the event is the meeting, no «Встреча» event is added");
  assert.equal(edits[0].rel, "wiki/People/Человек А.md");
  assert.equal(edits[0].content, RAW.replace("updated: 2026-10-14", "updated: 2026-11-06").replace("last_contact: 2026-10-14", "last_contact: 2026-11-03"));
});

test("memoryContactEdits: last_contact does not go back, does not run ahead, and a missing one is written", () => {
  const file = { rel: "wiki/People/Человек А.md", file: "Человек А" };
  assert.deepEqual(memoryContactEdits([{ ...file, raw: RAW }], "2026-10-14", TODAY), [], "the same day");
  assert.deepEqual(memoryContactEdits([{ ...file, raw: RAW }], "2026-10-01", TODAY), [], "an earlier day than the page holds");
  assert.deepEqual(memoryContactEdits([{ ...file, raw: RAW }], "2026-11-07", TODAY), [], "a day that is not here yet");
  const bare = "---\ntitle: Человек А\ntype: person\n---\n\n# Человек А\n";
  const [edit] = memoryContactEdits([{ ...file, raw: bare }], "2026-11-03", TODAY);
  assert.match(edit.content, /^last_contact: 2026-11-03$/m);
  assert.match(edit.content, /^updated: 2026-11-06$/m);
  assert.ok(edit.content.endsWith("\n\n# Человек А\n"));
  // A value that is not a date is replaced, not trusted.
  const junk = memoryContactEdits([{ ...file, raw: RAW.replace("last_contact: 2026-10-14", "last_contact: недавно") }], "2026-11-03", TODAY);
  assert.match(junk[0].content, /^last_contact: 2026-11-03$/m);
  // Several people: one edit each, for those who need it.
  const two = memoryContactEdits([{ ...file, raw: RAW }, { rel: "wiki/People/Человек Б.md", file: "Человек Б", raw: bare }], "2026-11-03", TODAY);
  assert.deepEqual(two.map((x) => x.rel), ["wiki/People/Человек А.md", "wiki/People/Человек Б.md"]);
});

test("contactEdits: the older callers (Circle screen, /contact) still stamp updated with the day of the contact", () => {
  const [edit] = contactEdits({ rel: "wiki/People/Человек А.md", file: "Человек А", raw: RAW }, [], TODAY, false);
  assert.match(edit.content, /^last_contact: 2026-11-06$/m);
  assert.match(edit.content, /^updated: 2026-11-06$/m);
  const met = contactEdits({ rel: "wiki/People/Человек А.md", file: "Человек А", raw: RAW }, [], TODAY, true);
  assert.equal(met.length, 2, "«виделись» still joins the day's «Встреча» event");
});
