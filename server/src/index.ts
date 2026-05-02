import "./load-env.js";
import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter, taskByIdRouter } from "./routes/tasks.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is required in production");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required in production");
    process.exit(1);
  }
}

if (!process.env.DATABASE_URL) {
  console.warn(
    "[TeamTaskManager] DATABASE_URL is not set. Copy .env.example to .env at the repo root (see README)."
  );
}

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/projects/:projectId/tasks", tasksRouter);
app.use("/api/tasks", taskByIdRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const clientDist = path.resolve(__dirname, "../../client/dist");
const indexHtml = path.join(clientDist, "index.html");
const spaReady = fs.existsSync(indexHtml);

if (spaReady) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  });
} else {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res
      .status(503)
      .type("html")
      .send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>Team Task Manager — UI not built</title></head>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:3rem auto;line-height:1.5;padding:0 1rem">
<h1>API is running; UI bundle is missing</h1>
<p>The server could not find <code>client/dist/index.html</code>. Build the React app once, then reload:</p>
<pre style="background:#f4f4f5;padding:1rem;border-radius:8px">npm run build -w client
# from the TeamTaskManager repo root, then restart this server</pre>
<p>Or during development run the UI separately and open <strong>http://localhost:5173</strong> (Vite proxies <code>/api</code> to this server).</p>
<p><a href="/api/health">Check API health</a></p>
</body></html>`);
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message =
    process.env.NODE_ENV !== "production" && err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
