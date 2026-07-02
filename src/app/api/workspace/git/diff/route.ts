import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectPath = searchParams.get('path');
    const file = searchParams.get('file');

    if (!projectPath || !file) {
      return NextResponse.json({ error: 'path and file query parameters are required' }, { status: 400 });
    }

    const resolvedProjectPath = path.resolve(projectPath);
    const resolvedFilePath = path.join(resolvedProjectPath, file);

    // 1. Get HEAD content (original)
    let original = '';
    try {
      const { stdout } = await execAsync(`git show HEAD:${file}`, { cwd: resolvedProjectPath });
      original = stdout;
    } catch {
      // If it's a new untracked file, original is empty
      original = '';
    }

    // 2. Get current working tree content (modified)
    let modified = '';
    try {
      modified = await fs.readFile(resolvedFilePath, 'utf8');
    } catch {
      modified = '';
    }

    return NextResponse.json({ original, modified });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
