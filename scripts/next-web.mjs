import { spawn } from "node:child_process";

const mode = process.argv[2] === "start" ? "start" : "dev";
const host = process.env.VK_WEB_HOST?.trim() || "127.0.0.1";
const port = process.env.VK_WEB_PORT?.trim() || "3456";

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", mode, "--hostname", host, "--port", port],
  {
    cwd: new URL("../apps/web", import.meta.url),
    stdio: "inherit",
    windowsHide: true,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
