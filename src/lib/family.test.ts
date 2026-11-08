import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFamily, kindOf, ME } from "./family";
import { allGroups, groupsOf } from "./people";
import { buildPage } from "./vault";

const page = (file: string, extra = "") =>
  buildPage(`wiki/People/${file}.md`, `---\ntitle: ${file}\ntype: person\ntheme: Social & friends\n${extra}---\n\n# ${file}\n`, 0);

test("kindOf: role words, cousins are not siblings", () => {
  assert.equal(kindOf("отец"), "parent");
  assert.equal(kindOf("Сын"), "child");
  assert.equal(kindOf("брат"), "sibling");
  assert.equal(kindOf("братишка"), "cousin");
  assert.equal(kindOf("сестрёнка"), "cousin");
  assert.equal(kindOf("дядя (брат отца)"), "uncle");
  assert.equal(kindOf("тётя (сестра матери)"), "uncle");
  assert.equal(kindOf("Муж"), "spouse");
  assert.equal(kindOf("одноклассник"), undefined);
});

test("buildFamily: generations, parents shared by siblings and couples, an uncle next to his side, the rest loose", () => {
  const pages = [
    page("Отец А", "connection: отец\ncategory: семья\n"),
    page("Мать А", 'connection: мать\ncategory: семья\nrelated: ["Муж: [[Отец А]]", "Сын: [[Брат А]]"]\n'),
    page("Брат А", "connection: брат\ncategory: семья\n"),
    page("Дядя Б", "connection: дядя (брат отца)\ncategory: родня\n"),
    page("Кузен В", 'connection: братишка\ncategory: родня\nrelated: ["отец: [[Дядя Б]]"]\n'),
    page("Сват Г", "connection: родственник (куда)\ncategory: родня\n"),
    page("Друг Д", "connection: одноклассник\ncategory: друг\n"),
  ];
  const f = buildFamily(pages);
  const genOf = (name: string) => f.rows.findIndex((r) => r.some((n) => n.name === name));
  assert.equal(f.rows.length, 2);
  assert.equal(genOf("Отец А"), 0);
  assert.equal(genOf("Дядя Б"), 0);
  assert.equal(genOf("Я"), 1);
  assert.equal(genOf("Кузен В"), 1);
  const has = (p: string, c: string) => f.edges.some(([a, b]) => a.endsWith(`${p}.md`) && (c === ME ? b === ME : b.endsWith(`${c}.md`)));
  assert.ok(has("Отец А", ME) && has("Мать А", ME), "both parents of me");
  assert.ok(has("Отец А", "Брат А"), "a sibling gets my parents, a couple shares children");
  assert.ok(has("Дядя Б", "Кузен В"));
  assert.ok(!has("Отец А", "Кузен В"), "a cousin is not my sibling");
  const top = f.rows[0].map((n) => n.name);
  assert.ok(top.indexOf("Дядя Б") === top.indexOf("Отец А") - 1, "the father's brother stands next to the father");
  assert.deepEqual(f.loose.map((p) => p.title), ["Сват Г"]);
  assert.equal(f.spouses.length, 1);
});

test("groupsOf: one word, a list, or none", () => {
  assert.deepEqual(groupsOf(page("А", "group: 12C\n")), ["12C"]);
  assert.deepEqual(groupsOf(page("Б", "group: [Crocus, Shym]\n")), ["Crocus", "Shym"]);
  assert.deepEqual(groupsOf(page("В")), []);
  assert.deepEqual(allGroups([page("А", "group: 12C\n"), page("Б", "group: [12C, Shym]\n")]), [{ name: "12C", n: 2 }, { name: "Shym", n: 1 }]);
});

test("layoutFamily: two lineages apart, children by age, a wife from the other family beside her husband as a ghost", async () => {
  const { layoutFamily } = await import("./familyLayout");
  const pages = [
    page("Дед А", 'connection: дедушка (папа отца)\ncategory: родня\nrelated: ["Жена: [[Бабушка А]]", "Сын: [[Дядя Б]]", "Сын: [[Отец А]]"]\n'),
    page("Бабушка А", "connection: бабушка (мама отца)\ncategory: родня\n"),
    page("Дед Б", 'connection: дедушка (папа мамы)\ncategory: родня\nrelated: ["Дочь: [[Мать А]]"]\n'),
    page("Отец А", "connection: отец\ncategory: семья\n"),
    page("Мать А", 'connection: мать\ncategory: семья\nrelated: ["Муж: [[Отец А]]"]\n'),
    page("Дядя Б", "connection: дядя (брат отца)\ncategory: родня\n"),
  ];
  const L = layoutFamily(buildFamily(pages));
  const x = (name: string, ghost = false) => L.cards.find((c) => c.node.name === name && !!c.ghost === ghost)!.x;
  assert.ok(x("Дед А") < x("Дед Б"), "the father's lineage is left of the mother's");
  assert.ok(x("Дядя Б") < x("Отец А"), "the elder son first");
  assert.ok(L.cards.some((c) => c.node.name === "Мать А" && c.ghost), "mother beside father as a ghost");
  assert.ok(x("Мать А") > x("Дед Б") - 200, "her own card stands in her family's tree");
  assert.ok(L.lines.some((l) => l.kind === "ghost"));
  assert.deepEqual(L.left, []);
});
