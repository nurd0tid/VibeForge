import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] === "start" ? "start" : "dev";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const webDir = path.join(rootDir, "apps", "web");
const nextBin = path.join(
  rootDir,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const host =
  process.env.VK_WEB_BIND_HOST?.trim() ||
  process.env.VK_WEB_HOST?.trim() ||
  "127.0.0.1";
const port = process.env.VK_WEB_PORT?.trim() || "3456";

const child = spawn(
  process.execPath,
  [nextBin, mode, "--hostname", host, "--port", port],
  {
    cwd: webDir,
    stdio: "inherit",
    windowsHide: true,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
