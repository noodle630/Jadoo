import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./replitAuth";
import { createSimpleRoutes } from "./simple-routes";
import { setupDirectRoutes } from "./direct-routes";
import routes from "./routes"; // FIXED: default import

console.log("✅ Loaded OPENAI_API_KEY:", process.env.OPENAI_API_KEY);

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Log API requests
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;
    const logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms :: ${JSON.stringify(data).slice(0, 100)}`;
    if (req.path.startsWith("/api")) log(logLine);
    return originalJson.call(this, data);
  };
  next();
});

(async () => {
  if (process.env.NODE_ENV === "development") {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        id: "local-dev",
        email: "dev@local.test",
        name: "Local Dev"
      };
      next();
    });
  } else {
    await setupAuth(app);
  }

  app.use("/api", createSimpleRoutes());
  setupDirectRoutes(app);
  app.use("/api", routes); // FIXED: actual API routes

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || "Server error" });
    console.error("❌ Unhandled Error:", err);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`🌐 API & Frontend served on http://localhost:${port}`);
  });
})();
