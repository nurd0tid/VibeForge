import { NextRequest, NextResponse } from 'next/server';
import { listRecords, createRecord } from '@/lib/nocodb';
import { EMPTY_LIST_RESPONSE, isNotFoundError } from '@/lib/api-helpers';
import { toNocoDBFields, fromNocoDBFields, TASK_PLAN_FIELD_MAP } from '@/lib/nocodb-fields';
import type { TaskPlan } from '@/types';

const TABLE = 'task_plans';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;
    const project_id = searchParams.get('project_id');
    const where = project_id ? `(Project ID,eq,${project_id})` : undefined;
    const data = await listRecords<Record<string, unknown>>(TABLE, { limit, offset, where });
    const normalized = {
      ...data,
      list: data.list.map(r => fromNocoDBFields<TaskPlan>(r, TASK_PLAN_FIELD_MAP)),
    };
    return NextResponse.json(normalized);
  } catch (error) {
    if (isNotFoundError(error)) return NextResponse.json(EMPTY_LIST_RESPONSE<TaskPlan>());
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mappedBody = toNocoDBFields(body, TASK_PLAN_FIELD_MAP);
    const record = await createRecord<Record<string, unknown>>(TABLE, mappedBody);
    return NextResponse.json(fromNocoDBFields<TaskPlan>(record, TASK_PLAN_FIELD_MAP), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
