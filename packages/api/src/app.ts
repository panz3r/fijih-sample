import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { BookmarkStore, ValidationError } from "./store.js";

function send(res: ServerResponse, status: number, body?: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export function createApp(store = new BookmarkStore()): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
      if (req.method === "GET" && url.pathname === "/bookmarks") return send(res, 200, store.list());
      if (req.method === "POST" && url.pathname === "/bookmarks") {
        const body = (await readJson(req)) as { url?: string; title?: string; tags?: string[] };
        return send(res, 201, store.add({ url: body.url ?? "", title: body.title ?? "", tags: body.tags }));
      }
      const match = url.pathname.match(/^\/bookmarks\/([^/]+)$/);
      if (req.method === "DELETE" && match) return send(res, store.remove(match[1]) ? 204 : 404);
      return send(res, 404, { error: "not found" });
    } catch (error) {
      if (error instanceof ValidationError) return send(res, 400, { error: error.message });
      if (error instanceof SyntaxError) return send(res, 400, { error: "invalid json" });
      return send(res, 500, { error: "internal error" });
    }
  });
}
