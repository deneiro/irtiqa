import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
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
          const rawFiles: string[] = [];
          try { walk(join(root, "raw"), rawFiles); } catch { /* no raw folder */ }
          const raw = rawFiles.map((f) => { const s = statSync(f); return { rel: relative(root, f), size: s.size, mtime: Math.floor(s.mtimeMs / 1000) }; });
          const log = readFileSync(join(root, "wiki/log.md"), "utf8");
          let claude_md = ""; try { claude_md = readFileSync(join(root, "CLAUDE.md"), "utf8"); } catch { /* optional */ }
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ root, pages, life, raw, log, claude_md }));
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
