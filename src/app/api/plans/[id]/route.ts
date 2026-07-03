import { NextRequest, NextResponse } from 'next/server';
import { getRecord, updateRecord, deleteRecord } from '@/lib/nocodb';
import { toNocoDBFields, TASK_PLAN_FIELD_MAP } from '@/lib/nocodb-fields';
import type { TaskPlan } from '@/types';

const TABLE = 'task_plans';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const record = await getRecord<TaskPlan>(TABLE, Number(id));
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const mappedBody = toNocoDBFields(body, TASK_PLAN_FIELD_MAP);
    const record = await updateRecord<TaskPlan>(TABLE, Number(id), mappedBody);
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteRecord(TABLE, Number(id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
