import { spawn } from "node:child_process";
import http from "node:http";
import { createServer } from "node:net";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const discoverJavaHome = () => {
  const pathCandidates = (process.env.PATH || "").split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.basename(entry).toLowerCase() === "bin" ? path.dirname(entry) : entry);
  const installRoots = process.platform === "win32"
    ? [
        "C:\\Program Files\\Eclipse Adoptium",
        "C:\\Program Files\\Java",
        "C:\\Program Files\\Microsoft",
        "C:\\Program Files\\BellSoft"
      ]
    : ["/usr/lib/jvm"];
  const installedCandidates = installRoots.flatMap((root) => {
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /(?:jdk|java).*17|17.*(?:jdk|java)/i.test(entry.name))
      .map((entry) => path.join(root, entry.name));
  });
  const candidates = [process.env.JAVA_HOME, ...pathCandidates, ...installedCandidates].filter(Boolean);
  return candidates.find((candidate) =>
    existsSync(path.join(candidate, "bin", process.platform === "win32" ? "java.exe" : "java")) &&
    existsSync(path.join(candidate, "bin", process.platform === "win32" ? "javac.exe" : "javac"))
  );
};

const canListen = (port) =>
  new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });

let port = Number(process.env.PORT || 3317);
while (port < 3399) {
  const apiPortAvailable = await canListen(port);
  const webPortAvailable = await canListen(port + 1000);
  if (apiPortAvailable && webPortAvailable) break;
  port += 1;
}

const discoveredJavaHome = discoverJavaHome();
const env = {
  ...process.env,
  PORT: String(port),
  VITE_API_URL: `http://127.0.0.1:${port}`,
  VITE_PORT: String(port + 1000),
  ...(discoveredJavaHome ? {
    JAVA_HOME: discoveredJavaHome,
    PATH: `${path.join(discoveredJavaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`
  } : {})
};

console.log(`[AlgoShell] API http://127.0.0.1:${port}`);
console.log(`[AlgoShell] Web http://127.0.0.1:${port + 1000}`);
console.log(`[AlgoShell] Java ${discoveredJavaHome ? `JDK at ${discoveredJavaHome}` : "JDK 17 not found"}`);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];
let stopping = false;

const stop = () => {
  stopping = true;
  for (const child of children) if (!child.killed) child.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const spawnChild = (workspace) => {
  const child = spawn(npmCommand, ["run", "dev", "-w", workspace], {
    env,
    stdio: "inherit",
    shell: false
  });
  children.push(child);
  child.on("exit", (code) => {
    if (!stopping && code !== 0) {
      stop();
      process.exit(code ?? 1);
    }
  });
  return child;
};

const isHttpReady = (targetPort, targetPath = "/") =>
  new Promise((resolve) => {
    const request = http.get({
      hostname: "127.0.0.1",
      port: targetPort,
      path: targetPath,
      timeout: 1000
    }, (response) => {
      response.resume();
      resolve(Boolean(response.statusCode && response.statusCode < 500));
    });
    request.once("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.once("error", () => resolve(false));
  });

const waitForHttp = async (targetPort, targetPath, label) => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await isHttpReady(targetPort, targetPath)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready within 30 seconds.`);
};

try {
  console.log("[AlgoShell] Starting API...");
  spawnChild("@algoshell/server");
  await waitForHttp(port, "/api/health", "API");
  console.log("[AlgoShell] API ready. Starting web interface...");

  spawnChild("@algoshell/web");
  await waitForHttp(port + 1000, "/", "Web interface");
  console.log("[AlgoShell] Web interface ready.");

  if (process.platform === "win32" && process.env.NO_BROWSER !== "1") {
    const opener = spawn("cmd.exe", ["/c", "start", "", `http://127.0.0.1:${port + 1000}`], {
      stdio: "ignore",
      windowsHide: true,
      shell: false
    });
    opener.unref();
  }
} catch (error) {
  console.error(`[AlgoShell] Startup failed: ${error instanceof Error ? error.message : String(error)}`);
  stop();
  process.exit(1);
}
