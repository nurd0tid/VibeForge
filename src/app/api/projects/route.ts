import { NextRequest, NextResponse } from 'next/server';
import { listRecords, createRecord } from '@/lib/nocodb';
import { EMPTY_LIST_RESPONSE, isNotFoundError, apiError } from '@/lib/api-helpers';
import { toNocoDBFields, PROJECT_FIELD_MAP } from '@/lib/nocodb-fields';
import type { Project } from '@/types';

const TABLE = 'projects';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 25;
    const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : 0;
    const data = await listRecords<Project>(TABLE, { limit, offset });
    return NextResponse.json(data);
  } catch (error) {
    if (isNotFoundError(error)) {
      return NextResponse.json(EMPTY_LIST_RESPONSE<Project>());
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return apiError(message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mappedBody = toNocoDBFields(body, PROJECT_FIELD_MAP);
    const record = await createRecord<Project>(TABLE, mappedBody);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return apiError(message);
  }
}
