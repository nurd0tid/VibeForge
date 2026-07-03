import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let targetPath = searchParams.get('path') || '';

    if (!targetPath) {
      targetPath = process.cwd();
    }

    const resolvedPath = path.resolve(targetPath);

    let is_git = false;
    try {
      const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', { cwd: resolvedPath });
      is_git = stdout.trim() === 'true';
    } catch {
      // Not a git repo
    }

    let repoUrl = '';
    if (is_git) {
      try {
        const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: resolvedPath });
        repoUrl = stdout.trim();
      } catch {
        // No origin
      }
    }

    let branch = '';
    if (is_git) {
      try {
        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: resolvedPath });
        branch = stdout.trim();
      } catch {
        // Not on a branch/no HEAD
      }
    }

    let is_dirty = false;
    let changes_count = 0;
    if (is_git) {
      try {
        const { stdout } = await execAsync('git status --porcelain', { cwd: resolvedPath });
        const lines = stdout.split('\n').filter(Boolean);
        is_dirty = lines.length > 0;
        changes_count = lines.length;
      } catch {
        // ignore
      }
    }

    const projectName = path.basename(resolvedPath);

    return NextResponse.json({
      repository_url: repoUrl,
      default_branch: branch || 'main',
      local_path: resolvedPath,
      project_name: projectName,
      is_git,
      is_dirty,
      changes_count,
      branch: branch || 'main',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
