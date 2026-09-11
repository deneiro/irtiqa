export type Zone = "resource" | "wiki" | "overview" | "person" | "profile" | "tool" | "personal" | "other";

export interface Page {
  rel: string; // e.g. "wiki/Health & sport/Resource/Foo.md"
  segments: string[]; // path segments below wiki/, without the file
  file: string; // filename without .md
  title: string;
  type: string;
  theme: string | undefined; // one of the 8, or undefined
  project: string | undefined;
  zone: Zone;
  created: string | undefined; // YYYY-MM-DD
  updated: string | undefined;
  tags: string[];
  sources: string[]; // raw strings from frontmatter
  sourceUrl: string | undefined;
  aliases: string[];
  fm: Record<string, unknown>;
  body: string; // markdown without frontmatter
  links: string[]; // outgoing wikilink targets (raw, before resolution)
  mtime: number;
  words: number;
}

export interface RawEntry {
  rel: string;
  size: number;
  mtime: number;
}

export interface MdFile {
  rel: string;
  content: string;
  mtime: number;
}

export interface Scan {
  root: string;
  pages: MdFile[];
  /** Everything under life/ — app-owned state. Parsed by lib/life.ts (slice 1). */
  life?: MdFile[];
  raw: RawEntry[];
  log: string;
  claude_md: string;
}

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  dateRaw: string; // may include "evening"
  op: string; // ingest, build, ...
  subject: string;
  body: string;
  index: number;
}

export interface Vault {
  root: string;
  pages: Page[];
  byRel: Map<string, Page>;
  raw: RawEntry[];
  life: MdFile[];
  log: LogEntry[];
  claudeMd: string;
  resolve: (target: string) => Page | undefined;
  backlinks: Map<string, Page[]>; // rel -> pages linking to it
  deadLinks: { from: Page; target: string }[];
  scannedAt: number;
}
