import { NextRequest, NextResponse } from 'next/server';
import { getRecord, updateRecord, deleteRecord } from '@/lib/nocodb';
import { toNocoDBFields, fromNocoDBFields, TASK_FIELD_MAP } from '@/lib/nocodb-fields';
import type { Task } from '@/types';

const TABLE = 'tasks';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const record = await getRecord<Record<string, unknown>>(TABLE, Number(id));
    return NextResponse.json(fromNocoDBFields<Task>(record, TASK_FIELD_MAP));
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
    const mappedBody = toNocoDBFields(body, TASK_FIELD_MAP);
    const record = await updateRecord<Record<string, unknown>>(TABLE, Number(id), mappedBody);
    return NextResponse.json(fromNocoDBFields<Task>(record, TASK_FIELD_MAP));
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
