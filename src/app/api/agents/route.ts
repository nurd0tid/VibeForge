import { NextResponse } from 'next/server';
import { listRecords, createRecord } from '@/lib/nocodb';
import { EMPTY_LIST_RESPONSE, isNotFoundError } from '@/lib/api-helpers';
import { toNocoDBFields, AGENT_RUN_FIELD_MAP } from '@/lib/nocodb-fields';
import type { AgentRun } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;
    const where = projectId ? `(Project ID,eq,${projectId})` : undefined;

    const result = await listRecords<AgentRun>('agent_runs', { 
      where,
      limit,
      offset,
      sort: '-CreatedAt' 
    });
    
    return NextResponse.json(result);
  } catch (error) {
    if (isNotFoundError(error)) return NextResponse.json(EMPTY_LIST_RESPONSE<AgentRun>());
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mappedBody = toNocoDBFields(body, AGENT_RUN_FIELD_MAP);
    const result = await createRecord<AgentRun>('agent_runs', mappedBody);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
