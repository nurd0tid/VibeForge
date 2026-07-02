import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getRecord } from '@/lib/nocodb';
import type { Project } from '@/types';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  collapsed?: boolean; // true = folder shown but contents not scanned
}

// Folders that are shown in explorer but NOT recursively scanned (collapsed leaf)
const COLLAPSED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  '.cache',
  '__pycache__',
  '.vercel',
  '.output',
  'coverage',
]);

// Folders hidden entirely from explorer
const HIDDEN_DIRS = new Set([
  '.idea',
  '.DS_Store',
]);

// Files hidden from explorer
const HIDDEN_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
]);

async function buildFileTree(
  dirPath: string,
  currentDepth: number,
  maxDepth: number
): Promise<FileNode[]> {
  if (currentDepth > maxDepth) {
    return [];
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    const nodes: FileNode[] = [];

    for (const entry of sortedEntries) {
      // Hidden entirely
      if (HIDDEN_DIRS.has(entry.name) && entry.isDirectory()) continue;
      if (HIDDEN_FILES.has(entry.name) && !entry.isDirectory()) continue;

      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (COLLAPSED_DIRS.has(entry.name)) {
          // Show the folder itself but don't scan its contents
          nodes.push({
            name: entry.name,
            path: fullPath,
            isDirectory: true,
            children: [],
            collapsed: true,
          });
        } else {
          nodes.push({
            name: entry.name,
            path: fullPath,
            isDirectory: true,
            children: await buildFileTree(fullPath, currentDepth + 1, maxDepth),
          });
        }
      } else {
        nodes.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false,
        });
      }
    }

    return nodes;
  } catch (error) {
    console.error(`Failed to read directory ${dirPath}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    let targetPath = searchParams.get('path');
    const projectId = searchParams.get('projectId');
    
    const maxDepth = searchParams.get('depth') ? Number(searchParams.get('depth')) : 10;

    if (!targetPath && projectId) {
      try {
        const project = await getRecord<Project>('projects', Number(projectId));
        if (project.local_path) {
          targetPath = project.local_path;
        }
      } catch {
        console.warn(`Could not fetch project ${projectId} to resolve path`);
      }
    }

    if (!targetPath) {
      return NextResponse.json({ error: 'Either path or projectId is required' }, { status: 400 });
    }

    const resolvedPath = path.resolve(targetPath);

    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Directory not found or inaccessible' }, { status: 404 });
    }

    const tree = await buildFileTree(resolvedPath, 1, maxDepth);
    
    return NextResponse.json(tree);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
