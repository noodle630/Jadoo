var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
const viteLogger = createLogger();
export function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
export function setupVite(app, server) {
    return __awaiter(this, void 0, void 0, function* () {
        const serverOptions = {
            middlewareMode: true,
            hmr: { server },
            allowedHosts: true,
        };
        const vite = yield createViteServer(Object.assign(Object.assign({}, viteConfig), { configFile: false, customLogger: Object.assign(Object.assign({}, viteLogger), { error: (msg, options) => {
                    viteLogger.error(msg, options);
                    process.exit(1);
                } }), server: serverOptions, appType: "custom" }));
        app.use(vite.middlewares);
        app.use("*", (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const url = req.originalUrl;
            try {
                const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");
                // always reload the index.html file from disk incase it changes
                let template = yield fs.promises.readFile(clientTemplate, "utf-8");
                template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
                const page = yield vite.transformIndexHtml(url, template);
                res.status(200).set({ "Content-Type": "text/html" }).end(page);
            }
            catch (e) {
                vite.ssrFixStacktrace(e);
                next(e);
            }
        }));
    });
}
export function serveStatic(app) {
    const distPath = path.resolve(import.meta.dirname, "public");
    if (!fs.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express.static(distPath));
    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
