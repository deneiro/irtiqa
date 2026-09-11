/**
 * Runs of `claude -p` started from the Claude panel. Kept outside React state
 * so the stream keeps flowing while the user navigates elsewhere, and so the
 * sidebar can show a live dot.
 */
import { useSyncExternalStore } from "react";

export type Block =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; detail: string }
  | { kind: "result"; text: string; costUsd: number | undefined; durationMs: number | undefined; isError: boolean }
  | { kind: "note"; text: string };

export type OpKind = "ingest" | "digest" | "lint" | "ask";

export interface Run {
  id: string;
  op: OpKind;
  title: string;
  prompt: string;
  status: "running" | "done" | "error" | "cancelled";
  startedAt: number;
  endedAt: number | undefined;
  blocks: Block[];
  sessionId: string | undefined;
  exitCode: number | undefined;
}

let runs: Run[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getRuns(): Run[] {
  return runs;
}
export function addRun(r: Run): void {
  runs = [r, ...runs].slice(0, 30);
  emit();
}
export function patchRun(id: string, f: (r: Run) => Run): void {
  runs = runs.map((r) => (r.id === id ? f(r) : r));
  emit();
}
export function useRuns(): Run[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => runs, () => runs);
}
export function anyRunning(rs: Run[]): boolean {
  return rs.some((r) => r.status === "running");
}
