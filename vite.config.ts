import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
// @ts-expect-error type error without @types/node package
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;

/**
 * Dev-only: serve the vault scan over HTTP so the UI can run in a plain browser
 * (no Tauri) for quick visual checks. The packaged app never uses this.
 */
function vaultDevServer(): Plugin {
  const walk = (dir: string, out: string[]) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
  };
  return {
    name: "vault-dev-server",
    configureServer(server) {
      // Dev stand-in for the Tauri `write_text` command. Same boundary rules.
      server.middlewares.use("/__vault/write", (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const { root, rel, content } = JSON.parse(body) as { root: string; rel: string; content: string };
            const target = resolve(root, rel);
            if (!target.startsWith(resolve(root) + sep) || rel.startsWith("raw/") || rel === "CLAUDE.md") throw new Error(`Refusing to write ${rel}`);
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target + ".tmp", content);
            renameSync(target + ".tmp", target);
            res.end("ok");
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
      // Dev stand-in for the Tauri `run_stream` command: spawn a program in the
      // vault and stream its stdout/stderr as prefixed lines ("O ", "E ", "X code").
      // Dev stand-ins for the Tauri binary-file commands and the asset protocol.
      const guard = (root: string, rel: string) => {
        const target = resolve(root, rel);
        if (!target.startsWith(resolve(root) + sep) || !rel.startsWith("life/")) throw new Error(`Refusing ${rel}`);
        return target;
      };
      server.middlewares.use("/__vault/write-binary", (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const { root, rel, base64 } = JSON.parse(body) as { root: string; rel: string; base64: string };
            const target = guard(root, rel);
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, Buffer.from(base64, "base64"));
            res.end("ok");
          } catch (e) { res.statusCode = 400; res.end(String(e)); }
        });
      });
      server.middlewares.use("/__vault/delete", (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const { root, rel } = JSON.parse(body) as { root: string; rel: string };
            rmSync(guard(root, rel), { recursive: true, force: true });
            res.end("ok");
          } catch (e) { res.statusCode = 400; res.end(String(e)); }
        });
      });
      server.middlewares.use("/__vault/rename", (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const { root, from, to } = JSON.parse(body) as { root: string; from: string; to: string };
            for (const rel of [from, to]) {
              const t = resolve(root, rel);
              if (!t.startsWith(resolve(root) + sep) || rel.startsWith("raw/") || rel === "CLAUDE.md" || !rel.endsWith(".md")) throw new Error(`Refusing ${rel}`);
            }
            const src = resolve(root, from);
            const dst = resolve(root, to);
            if (existsSync(dst) && dst !== src) throw new Error(`${to} already exists`);
            mkdirSync(dirname(dst), { recursive: true });
            renameSync(src, dst);
            res.end("ok");
          } catch (e) { res.statusCode = 400; res.end(String(e)); }
        });
      });
      server.middlewares.use("/__vault/file", (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://x");
          const root = url.searchParams.get("root") ?? "";
          const rel = url.searchParams.get("rel") ?? "";
          const target = guard(root, rel);
          const ext = target.slice(target.lastIndexOf(".") + 1).toLowerCase();
          const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", heic: "image/heic", avif: "image/avif" };
          res.setHeader("content-type", types[ext] ?? "application/octet-stream");
          res.end(readFileSync(target));
        } catch (e) { res.statusCode = 404; res.end(String(e)); }
      });
      server.middlewares.use("/__vault/stream", (req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const { root, program, args } = JSON.parse(body) as { root: string; program: string; args: string[] };
            const env: Record<string, string> = {};
            for (const [k, v] of Object.entries(process.env as Record<string, string>)) if (!k.startsWith("CLAUDE") && k !== "ANTHROPIC_BASE_URL") env[k] = v;
            env.PATH = [env.PATH, `${env.HOME}/.local/bin`, `${env.HOME}/.cargo/bin`, "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean).join(":");
            const child = spawn(program, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.setHeader("cache-control", "no-cache");
            res.setHeader("x-content-type-options", "nosniff");
            (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();
            const pipe = (stream: NodeJS.ReadableStream, tag: string) => {
              let buf = "";
              stream.on("data", (c: Buffer) => {
                buf += c.toString("utf8");
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const l of lines) res.write(`${tag} ${l}\n`);
              });
              stream.on("end", () => { if (buf) res.write(`${tag} ${buf}\n`); });
            };
            pipe(child.stdout!, "O");
            pipe(child.stderr!, "E");
            child.on("close", (code) => { res.write(`X ${code ?? -1}\n`); res.end(); });
            child.on("error", (e) => { res.write(`E ${String(e)}\nX -1\n`); res.end(); });
            res.on("close", () => { if (child.exitCode === null) child.kill(); });
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
      server.middlewares.use("/__vault", (req, res) => {
        try {
          const url = new URL(req.url ?? "/", "http://x");
          const root = url.searchParams.get("root") ?? "";
          const files: string[] = [];
          walk(join(root, "wiki"), files);
          const pages = files
            .filter((f) => f.endsWith(".md") && relative(root, f) !== "wiki/log.md")
            .map((f) => ({ rel: relative(root, f), content: readFileSync(f, "utf8"), mtime: Math.floor(statSync(f).mtimeMs / 1000) }));
          const lifeFiles: string[] = [];
          try { walk(join(root, "life"), lifeFiles); } catch { /* no life folder yet */ }
          const life = lifeFiles
            .filter((f) => f.endsWith(".md"))
            .map((f) => ({ rel: relative(root, f), content: readFileSync(f, "utf8"), mtime: Math.floor(statSync(f).mtimeMs / 1000) }));
          const media = lifeFiles.filter((f) => !f.endsWith(".md")).map((f) => relative(root, f)).sort();
          const rawFiles: string[] = [];
          try { walk(join(root, "raw"), rawFiles); } catch { /* no raw folder */ }
          const raw = rawFiles.map((f) => { const s = statSync(f); return { rel: relative(root, f), size: s.size, mtime: Math.floor(s.mtimeMs / 1000) }; });
          const log = readFileSync(join(root, "wiki/log.md"), "utf8");
          let claude_md = ""; try { claude_md = readFileSync(join(root, "CLAUDE.md"), "utf8"); } catch { /* optional */ }
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ root, pages, life, media, raw, log, claude_md }));
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
    },
  };
}

export default defineConfig(() => ({
  plugins: [react(), vaultDevServer()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
