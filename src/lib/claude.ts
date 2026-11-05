/**
 * The Claude panel: run `claude -p` in the vault folder and stream its output.
 * The regulation lives in the vault's CLAUDE.md; the app only names the
 * operation. In Tauri the Rust `run_stream` command does the spawning; in the
 * browser dev mode the Vite middleware does.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { inTauri } from "./native";
import { addRun, patchRun, type Block, type OpKind, type Run } from "./claudeRuns";
import { addDays, weekdayIndex } from "./dates";
import { isoWeekKey, monthKey } from "./goals";

// No `find`: `-exec` and `-delete` make it a shell. Glob and Grep cover the reading.
const ALLOWED_TOOLS = ["Bash(git add:*)", "Bash(git commit:*)", "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)", "Bash(ls:*)", "Bash(wc:*)"];
/**
 * A run reads untrusted text (raw/ sources, web pages), so it gets only the
 * tools above: `.claude/settings.local.json` in the vault collects every
 * "always allow" from interactive sessions and is not loaded, and neither are
 * MCP servers (Gmail). User settings stay for the model choice.
 */
const ISOLATION = ["--setting-sources", "user,project", "--strict-mcp-config"];
/** Roles need the open web: JH1 checks vacancies, ET1 checks materials. Reading only — they still send nothing. */
const ROLE_TOOLS = ["WebSearch", "WebFetch"];
const isRole = (agent?: string) => !!agent && agent.startsWith("eldar-");

export function buildPrompt(op: OpKind, arg: string, today: string, agent?: string): { title: string; prompt: string } {
  switch (op) {
    case "focus": {
      const month = arg === "month";
      // On a Sunday the week's focus is written for the coming week.
      const key = month ? monthKey(today) : isoWeekKey(weekdayIndex(today) === 0 ? addDays(today, 1) : today);
      return {
        title: month ? "Фокус месяца" : "Фокус недели",
        prompt: `Run the Focus operation for the ${month ? "month" : "week"}: .claude/skills/vault-ops/goals/SKILL.md, section «Фокус». Today is ${today}. Target file: life/goals/${key}.md. Write only what that section says — the «## Фокус» lines, the goals file if it is missing, one log.md line. Report in Russian: the lines you wrote and the file.`,
      };
    }
    case "habit":
      return {
        title: "Привычка месяца",
        prompt: `Run the Habit recommendation operation from CLAUDE.md. Today is ${today}. Read the profile, the theme overviews, life/skills, the last 30 files in life/days and every existing file in life/habits. Propose one to three habits as new files in life/habits with status: proposed, each with a theme, a freq, a source pointing at the vault page that argues for it, and a body of two or three sentences saying why this habit and why now, citing the page by name. Never duplicate an existing habit by title or by meaning, including archived ones. Report in Russian: what you proposed and what argued for it.`,
      };
    case "ingest":
      return {
        title: `Ingest: ${arg.split("/").pop()}`,
        prompt: `Run the Ingest operation from CLAUDE.md on the source file "${arg}". Follow every step, including the «## Применить» section on the new Resource page when the source carries concrete practices (Apply plan: one quest with steps, habits apart), the overview update, and the log.md entry. Do not create files in life/ from an ingest: the page itself is the offer. Do not add «Resources — added» sections to overviews (schema 3.1). Report in Russian: what was created, what was updated, what the page offers to do, any contradictions.`,
      };
    case "apply":
      return {
        title: `Применить: ${arg.split("/").pop()?.replace(/\.md$/, "")}`,
        prompt: `Run the Apply plan operation from CLAUDE.md on the Resource page "${arg}". Today is ${today}. Read the page in full, the profile, and every file in life/habits and life/quests so nothing is duplicated. Write or rewrite only the «## Применить» section of that page, in the exact format CLAUDE.md gives: one quest with concrete steps, then habits and things to give up, if the source really carries them. Touch nothing else: no files in life/, no other section of the page. Append the log.md entry. Report in Russian: the quest and its steps, the habits, and why.`,
      };
    case "digest":
      return {
        title: "Дайджест недели",
        prompt: `Run the Week digest operation from CLAUDE.md. Today is ${today}; the week is the last 7 files in life/days/. Follow every step: profile facts, affected overviews, proposals as status: proposed files, the log.md entry. Report in Russian: what changed, what was proposed, what contradicted the profile.`,
      };
    case "lint":
      return {
        title: "Lint",
        prompt: `Run the Lint operation from CLAUDE.md. Produce the report only; do not fix anything. Include the schema 3.1 checks (a theme folder not declared in sections:, an overview missing sections: or carrying a «Resources — added» section). Append the lint entry to wiki/log.md. Report in Russian, grouped by category, most important first.`,
      };
    default:
      return {
        title: arg.length > 60 ? arg.slice(0, 57) + "…" : arg,
        prompt: isRole(agent)
          // A role is given work, not a question. Its own definition holds the style, the desk and the boundary.
          ? `${arg}\n\nToday is ${today}. This is a task for you as a role agent, not a Query: do the work, write it where your definition says it belongs, and file a quest with status: proposed for anything started. Draft only — send and publish nothing yourself. Report in Russian.`
          : `${arg}\n\nThis is a Query operation from CLAUDE.md: read the profile if needed, follow wikilinks, cite vault pages by name. Answer in Russian.`,
      };
  }
}

export function claudeArgs(prompt: string, resume: string | undefined, agent?: string): string[] {
  const tools = isRole(agent) ? [...ALLOWED_TOOLS, ...ROLE_TOOLS] : ALLOWED_TOOLS;
  const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits", ...ISOLATION, "--allowedTools", ...tools];
  if (agent) args.push("--agent", agent);
  if (resume) args.push("--resume", resume);
  return args;
}

function toolDetail(name: string, input: Record<string, unknown>): string {
  const s = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : "");
  switch (name) {
    case "Read": case "Write": case "Edit": case "MultiEdit": return s("file_path").replace(/^.*personal-obsidian\//, "");
    case "Glob": return s("pattern");
    case "Grep": return `${s("pattern")}${s("path") ? " в " + s("path").replace(/^.*personal-obsidian\//, "") : ""}`;
    case "Bash": return s("command").slice(0, 120);
    default: return JSON.stringify(input).slice(0, 100);
  }
}

const TOOL_RU: Record<string, string> = { Read: "читает", Write: "пишет", Edit: "правит", MultiEdit: "правит", Glob: "ищет файлы", Grep: "ищет", Bash: "выполняет", Task: "запускает агента", WebFetch: "открывает", WebSearch: "ищет в сети" };

/** Turn one stream-json line into panel blocks; returns the session id when seen. */
export function parseLine(line: string): { blocks: Block[]; sessionId?: string } {
  const t = line.trim();
  if (!t.startsWith("{")) return { blocks: t ? [{ kind: "note", text: t }] : [] };
  let j: Record<string, unknown>;
  try { j = JSON.parse(t); } catch { return { blocks: [{ kind: "note", text: t.slice(0, 200) }] }; }
  const sessionId = typeof j.session_id === "string" ? j.session_id : undefined;
  const blocks: Block[] = [];
  if (j.type === "assistant") {
    const msg = j.message as { content?: { type: string; text?: string; name?: string; input?: Record<string, unknown> }[] } | undefined;
    for (const c of msg?.content ?? []) {
      if (c.type === "text" && c.text?.trim()) blocks.push({ kind: "text", text: c.text });
      else if (c.type === "tool_use" && c.name) blocks.push({ kind: "tool", name: `${TOOL_RU[c.name] ?? c.name}`, detail: toolDetail(c.name, c.input ?? {}) });
    }
  } else if (j.type === "result") {
    const text = typeof j.result === "string" ? j.result : "";
    blocks.push({ kind: "result", text, costUsd: typeof j.total_cost_usd === "number" ? j.total_cost_usd : undefined, durationMs: typeof j.duration_ms === "number" ? j.duration_ms : undefined, isError: !!j.is_error });
  } else if (j.type === "system" && j.subtype === "api_retry") {
    blocks.push({ kind: "note", text: `повтор запроса (${String(j.error ?? "")})` });
  }
  return { blocks, sessionId };
}

const uid = () => Math.random().toString(36).slice(2, 10);

/** Start a run; the run object is added to the runs store and updated as lines arrive. */
export async function startRun(root: string, op: OpKind, arg: string, today: string, resume: string | undefined, agent?: string): Promise<string> {
  const { title, prompt } = buildPrompt(op, arg, today, agent);
  const id = uid();
  const run: Run = { id, op, title, prompt, status: "running", startedAt: Date.now(), endedAt: undefined, blocks: [], sessionId: undefined, exitCode: undefined, agent };
  addRun(run);
  const args = claudeArgs(prompt, resume, agent);
  const onLine = (stream: string, line: string) => {
    if (stream === "err") { if (line.trim()) patchRun(id, (r) => ({ ...r, blocks: [...r.blocks, { kind: "note", text: line.trim().slice(0, 300) }] })); return; }
    const { blocks, sessionId } = parseLine(line);
    if (blocks.length || sessionId) patchRun(id, (r) => {
      let prev = r.blocks;
      // The CLI repeats the final answer as the last assistant text and as the result: keep one.
      const res = blocks.find((b) => b.kind === "result");
      const last = prev[prev.length - 1];
      if (res && last && last.kind === "text" && last.text.trim() === res.text.trim()) prev = prev.slice(0, -1);
      return { ...r, blocks: [...prev, ...blocks], sessionId: sessionId ?? r.sessionId };
    });
  };
  const onExit = (code: number) => {
    patchRun(id, (r) => {
      const failed = code !== 0 || r.blocks.some((b) => b.kind === "result" && b.isError);
      return { ...r, status: r.status === "cancelled" ? "cancelled" : failed ? "error" : "done", endedAt: Date.now(), exitCode: code };
    });
  };
  if (inTauri) {
    const unlisten: UnlistenFn[] = [];
    unlisten.push(await listen<{ id: string; stream: string; line: string }>("stream-line", (e) => { if (e.payload.id === id) onLine(e.payload.stream, e.payload.line); }));
    unlisten.push(await listen<{ id: string; code: number }>("stream-exit", (e) => { if (e.payload.id === id) { onExit(e.payload.code); unlisten.forEach((u) => u()); } }));
    try {
      await invoke("run_stream", { root, id, program: "claude", args });
    } catch (e) {
      unlisten.forEach((u) => u());
      patchRun(id, (r) => ({ ...r, status: "error", endedAt: Date.now(), blocks: [...r.blocks, { kind: "note", text: String(e) }] }));
    }
    return id;
  }
  // Browser dev mode: stream over fetch.
  const ctrl = new AbortController();
  aborters.set(id, ctrl);
  void (async () => {
    try {
      const r = await fetch("/__vault/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ root, program: "claude", args }), signal: ctrl.signal });
      if (!r.ok || !r.body) throw new Error(await r.text());
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let code = -1;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (l.startsWith("O ")) onLine("out", l.slice(2));
          else if (l.startsWith("E ")) onLine("err", l.slice(2));
          else if (l.startsWith("X ")) code = Number(l.slice(2));
        }
      }
      onExit(code);
    } catch (e) {
      if (ctrl.signal.aborted) onExit(-2);
      else patchRun(id, (r) => ({ ...r, status: "error", endedAt: Date.now(), blocks: [...r.blocks, { kind: "note", text: String(e) }] }));
    } finally { aborters.delete(id); }
  })();
  return id;
}

const aborters = new Map<string, AbortController>();

export async function cancelRun(id: string): Promise<void> {
  patchRun(id, (r) => ({ ...r, status: "cancelled", endedAt: Date.now() }));
  if (inTauri) await invoke("kill_stream", { id }).catch(() => undefined);
  else aborters.get(id)?.abort();
}
