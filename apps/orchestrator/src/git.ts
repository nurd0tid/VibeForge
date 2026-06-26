import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import spawn from "cross-spawn";
import type { Project, Session } from "@vk/contracts";
import { config } from "./config.js";
import { runFile, runGit } from "./process.js";

const memoryCandidates = [
  "AGENTS.md",
  "CLAUDE.md",
  ".clinerules",
  "docs/ai/README.md",
  "docs/ai/project-context.md",
  "docs/ai/architecture.md",
  "opencode.json",
  "opencode.jsonc",
  "package.json",
];

async function realPathIfExists(candidate: string) {
  if (!fs.existsSync(candidate)) return null;
  return fs.promises.realpath(candidate);
}

async function findWorkspaceRoot() {
  let current = await fs.promises.realpath(process.cwd());
  for (let depth = 0; depth < 8; depth += 1) {
    const packageJson = path.join(current, "package.json");
    const gitDir = path.join(current, ".git");
    if (fs.existsSync(packageJson) || fs.existsSync(gitDir)) {
      if (fs.existsSync(gitDir)) return current;
      try {
        const content = JSON.parse(
          await fs.promises.readFile(packageJson, "utf8"),
        ) as { workspaces?: unknown };
        if (content.workspaces) return current;
      } catch {
        // Keep walking if package.json is unreadable or not JSON.
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

async function defaultBrowseRoot() {
  const documents = path.join(os.homedir(), "Documents");
  const programmingWork = path.join(documents, "Programming", "Work");
  return (
    (await realPathIfExists(programmingWork)) ||
    (await realPathIfExists(documents)) ||
    os.homedir()
  );
}

export async function inspectProject(
  inputPath: string,
  requestedName?: string,
): Promise<Project> {
  const localPath = await fs.promises.realpath(path.resolve(inputPath));
  const stat = await fs.promises.stat(localPath);
  if (!stat.isDirectory()) throw new Error("Selected path is not a directory");

  const gitCheck = await runGit(
    ["rev-parse", "--show-toplevel"],
    localPath,
    true,
  );
  const isGit = gitCheck.exitCode === 0;
  let currentBranch = "";
  let defaultBranch = "";
  let remoteUrl: string | null = null;
  let isClean = false;
  let fingerprintSource = localPath;

  if (isGit) {
    const topLevel = await fs.promises.realpath(gitCheck.stdout);
    if (topLevel.toLowerCase() !== localPath.toLowerCase()) {
      throw new Error(`Choose the Git repository root: ${topLevel}`);
    }
    currentBranch =
      (await runGit(["branch", "--show-current"], localPath)).stdout || "HEAD";
    const remote = await runGit(
      ["remote", "get-url", "origin"],
      localPath,
      true,
    );
    remoteUrl = remote.exitCode === 0 ? remote.stdout : null;
    const symbolic = await runGit(
      ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
      localPath,
      true,
    );
    defaultBranch =
      symbolic.exitCode === 0
        ? symbolic.stdout.replace(/^origin\//, "")
        : currentBranch;
    isClean =
      (await runGit(["status", "--porcelain=v1"], localPath)).stdout.length ===
      0;
    fingerprintSource =
      remoteUrl ||
      `${localPath}:${(await runGit(["rev-parse", "--git-dir"], localPath)).stdout}`;
  }

  const memoryFiles = memoryCandidates.filter((candidate) =>
    fs.existsSync(path.join(localPath, candidate)),
  );
  const now = new Date().toISOString();
  return {
    uid: randomUUID(),
    name: requestedName?.trim() || path.basename(localPath),
    localPath,
    repoFingerprint: createHash("sha256")
      .update(fingerprintSource)
      .digest("hex")
      .slice(0, 24),
    remoteUrl,
    defaultBranch: defaultBranch || currentBranch || "main",
    currentBranch: currentBranch || "not-a-git-repository",
    isGit,
    isClean,
    memoryFiles,
    dailyLogMirror: memoryFiles.includes("docs/ai/README.md"),
    dailyLogPath: "docs/ai/daily-logs/YYYY-MM-DD.md",
    createdAt: now,
    updatedAt: now,
  };
}

export async function createWorktree(
  project: Project,
  values: {
    sessionUid: string;
    name: string;
    providerId: string;
    modelId: string;
    agentMode: "plan" | "build";
    permissionMode: "supervised" | "auto";
    targetBranch: string;
  },
): Promise<Session> {
  if (!project.isGit) throw new Error("Execution requires a Git repository");
  const status = await runGit(["status", "--porcelain=v1"], project.localPath);
  if (status.stdout)
    throw new Error(
      "The source worktree must be clean before creating a session",
    );
  const currentBranch = (
    await runGit(["branch", "--show-current"], project.localPath)
  ).stdout;
  if (currentBranch !== values.targetBranch) {
    throw new Error(
      `Target branch ${values.targetBranch} must be checked out in the source worktree`,
    );
  }

  const baseCommit = (
    await runGit(["rev-parse", values.targetBranch], project.localPath)
  ).stdout;
  const slug =
    values.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 36) || "session";
  const branch = `kd/${values.sessionUid.slice(0, 8)}-${slug}`;
  const projectDir = path.join(config.worktreeDir, project.uid);
  const worktreePath = path.join(projectDir, values.sessionUid);
  await fs.promises.mkdir(projectDir, { recursive: true });
  await runGit(
    ["worktree", "add", "-b", branch, worktreePath, values.targetBranch],
    project.localPath,
  );
  const now = new Date().toISOString();
  return {
    uid: values.sessionUid,
    projectUid: project.uid,
    name: values.name,
    cliId: "opencode",
    providerId: values.providerId,
    modelId: values.modelId,
    agentMode: values.agentMode,
    permissionMode: values.permissionMode,
    targetBranch: values.targetBranch,
    baseCommit,
    branch,
    worktreePath,
    opencodeSessionId: null,
    status: "idle",
    activeTaskUid: null,
    pendingTaskUids: [],
    reviewGate: "batch_end",
    createdAt: now,
    updatedAt: now,
  };
}

export async function checkpoint(
  session: Session,
  taskNumber: number,
  title: string,
) {
  await runGit(["add", "-A"], session.worktreePath);
  const staged = await runGit(
    ["diff", "--cached", "--quiet"],
    session.worktreePath,
    true,
  );
  if (staged.exitCode === 0) return null;
  const message = `karsadesk(task-${taskNumber}): ${title}`.slice(0, 180);
  await runGit(
    [
      "-c",
      "user.name=KarsaDesk",
      "-c",
      "user.email=karsadesk@localhost",
      "commit",
      "-m",
      message,
    ],
    session.worktreePath,
  );
  return (await runGit(["rev-parse", "HEAD"], session.worktreePath)).stdout;
}

export async function getDiff(session: Session) {
  const diff = await runGit(
    [
      "diff",
      "--no-ext-diff",
      "--find-renames",
      "--binary",
      `${session.targetBranch}...HEAD`,
    ],
    session.worktreePath,
    true,
  );
  const stats = await runGit(
    ["diff", "--numstat", `${session.targetBranch}...HEAD`],
    session.worktreePath,
    true,
  );
  const files = stats.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [added, deleted, ...name] = line.split("\t");
      return {
        path: name.join("\t"),
        added: added === "-" ? 0 : Number(added),
        deleted: deleted === "-" ? 0 : Number(deleted),
        binary: added === "-",
      };
    });
  const hash = createHash("sha256").update(diff.stdout).digest("hex");
  return { diff: diff.stdout, files, hash };
}

export async function discardManagedChanges(session: Session) {
  const resolved = path.resolve(session.worktreePath);
  const root = path.resolve(config.worktreeDir) + path.sep;
  if (!resolved.startsWith(root))
    throw new Error("Refusing to reset a non-managed worktree");
  await runGit(["reset", "--hard", "HEAD"], resolved);
  await runGit(["clean", "-fd"], resolved);
}

export async function removeManagedWorktree(
  project: Project,
  session: Session,
) {
  const resolved = path.resolve(session.worktreePath);
  const root = path.resolve(config.worktreeDir) + path.sep;
  if (!resolved.startsWith(root))
    throw new Error("Refusing to remove a non-managed worktree");
  await runGit(["worktree", "remove", "--force", resolved], project.localPath);
}

export async function squashMerge(
  project: Project,
  session: Session,
  message: string,
) {
  const current = (
    await runGit(["branch", "--show-current"], project.localPath)
  ).stdout;
  if (current !== session.targetBranch)
    throw new Error(`Check out ${session.targetBranch} before merging`);
  if ((await runGit(["status", "--porcelain=v1"], project.localPath)).stdout) {
    throw new Error("The source worktree must be clean before merging");
  }
  const targetHead = (
    await runGit(["rev-parse", session.targetBranch], project.localPath)
  ).stdout;
  if (targetHead !== session.baseCommit) {
    await runGit(["rebase", session.targetBranch], session.worktreePath);
  }
  const merge = await runGit(
    ["merge", "--squash", session.branch],
    project.localPath,
    true,
  );
  if (merge.exitCode !== 0) {
    await runGit(["reset", "--merge", "HEAD"], project.localPath, true);
    throw new Error(`Merge conflict: ${merge.stderr || merge.stdout}`);
  }
  const changed = await runGit(
    ["diff", "--cached", "--quiet"],
    project.localPath,
    true,
  );
  if (changed.exitCode === 0) throw new Error("There are no changes to merge");
  await runGit(
    [
      "-c",
      "user.name=KarsaDesk",
      "-c",
      "user.email=karsadesk@localhost",
      "commit",
      "-m",
      message.slice(0, 180),
    ],
    project.localPath,
  );
  const newHead = (await runGit(["rev-parse", "HEAD"], project.localPath))
    .stdout;
  await runGit(["reset", "--hard", newHead], session.worktreePath);
  return newHead;
}

export async function listDirectories(inputPath?: string) {
  const current = await fs.promises.realpath(
    path.resolve(inputPath || (await defaultBrowseRoot())),
  );
  const entries = await fs.promises.readdir(current, { withFileTypes: true });
  const workspaceRoot = await findWorkspaceRoot();
  const roots = [
    { name: "Projects", path: await defaultBrowseRoot() },
    { name: "Workspace", path: workspaceRoot },
    { name: "Home", path: os.homedir() },
    { name: "Documents", path: path.join(os.homedir(), "Documents") },
    { name: "Desktop", path: path.join(os.homedir(), "Desktop") },
  ];
  if (process.platform === "win32") {
    for (let code = 67; code <= 90; code += 1) {
      const drive = `${String.fromCharCode(code)}:\\`;
      if (fs.existsSync(drive))
        roots.push({ name: drive.replace(/\\$/, ""), path: drive });
    }
  } else {
    roots.push({ name: "Root", path: "/" });
  }
  const uniqueRoots = Array.from(
    new Map(
      roots
        .filter((root) => fs.existsSync(root.path))
        .map((root) => [
          path.resolve(root.path).toLowerCase(),
          { name: root.name, path: root.path },
        ]),
    ).values(),
  );
  return {
    current,
    parent: path.dirname(current) === current ? null : path.dirname(current),
    isGit: fs.existsSync(path.join(current, ".git")),
    roots: uniqueRoots,
    directories: entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => {
        const directoryPath = path.join(current, entry.name);
        return {
          name: entry.name,
          path: directoryPath,
          isGit: fs.existsSync(path.join(directoryPath, ".git")),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function pickFolderNative() {
  if (process.platform === "win32") {
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
      "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
      "$dialog.Description = 'Choose a project folder for KarsaDesk'",
      "$dialog.ShowNewFolderButton = $false",
      "if ($dialog.PSObject.Properties.Name -contains 'AutoUpgradeEnabled') { $dialog.AutoUpgradeEnabled = $true }",
      "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }",
    ].join("; ");
    const result = await runFile(
      "powershell",
      ["-NoProfile", "-Sta", "-ExecutionPolicy", "Bypass", "-Command", script],
      undefined,
      true,
      { timeoutMs: 120_000, windowsHide: false },
    );
    return {
      path: result.exitCode === 0 && result.stdout ? result.stdout : null,
    };
  }

  if (process.platform === "darwin") {
    const result = await runFile(
      "osascript",
      [
        "-e",
        'POSIX path of (choose folder with prompt "Choose a project folder for KarsaDesk")',
      ],
      undefined,
      true,
      { timeoutMs: 120_000 },
    );
    return {
      path: result.exitCode === 0 && result.stdout ? result.stdout : null,
    };
  }

  const zenity = await runFile(
    "zenity",
    [
      "--file-selection",
      "--directory",
      "--title=Choose a project folder for KarsaDesk",
    ],
    undefined,
    true,
    { timeoutMs: 120_000 },
  );
  if (zenity.exitCode === 0 && zenity.stdout) return { path: zenity.stdout };

  const kdialog = await runFile(
    "kdialog",
    ["--getexistingdirectory", os.homedir()],
    undefined,
    true,
    { timeoutMs: 120_000 },
  );
  return {
    path: kdialog.exitCode === 0 && kdialog.stdout ? kdialog.stdout : null,
  };
}

export function paginateDiff(
  diff: Awaited<ReturnType<typeof getDiff>>,
  page = 1,
  pageSize = 1200,
  file?: string,
) {
  const source = file
    ? diff.diff
        .split(/(?=^diff --git )/m)
        .find((chunk) => chunk.includes(` b/${file}`)) || ""
    : diff.diff;
  const lines = source.split("\n");
  const safeSize = Math.min(5000, Math.max(200, pageSize));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safeSize;
  return {
    ...diff,
    diff: lines.slice(offset, offset + safeSize).join("\n"),
    page: safePage,
    pageSize: safeSize,
    totalLines: lines.length,
    hasMore: offset + safeSize < lines.length,
    selectedFile: file || null,
  };
}

export function openInVsCode(targetPath: string) {
  const binary = process.env.CODE_BIN?.trim() || "code";
  const child = spawn(binary, [targetPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

export function dailyLogFile(project: Project, date: string) {
  return path.join(
    project.localPath,
    project.dailyLogPath.replace("YYYY-MM-DD", date),
  );
}
