import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("etag", false);
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ---------------------------------------------------------------------------
// Serve the built frontend (single-service deployment: API + static SPA).
//
// The frontend (artifacts/tabele) is built separately by Vite and its static
// output is copied to the directory pointed to by STATIC_DIR (see the
// project Dockerfile). If that directory isn't present (e.g. local API-only
// dev), static serving is simply skipped.
// ---------------------------------------------------------------------------
const staticDir = process.env["STATIC_DIR"]
  ? path.resolve(process.env["STATIC_DIR"])
  : path.resolve(process.cwd(), "public");

if (fs.existsSync(staticDir)) {
  app.use(
    express.static(staticDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Allow long-term caching of hashed assets, but never cache index.html
        if (path.basename(filePath) === "index.html") {
          res.setHeader("Cache-Control", "no-store");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // SPA fallback: any non-API GET request that isn't a static file resolves
  // to index.html so client-side routing (wouter) can take over.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else {
  logger.warn(
    { staticDir },
    "Static frontend directory not found — serving API only",
  );
}

export default app;
