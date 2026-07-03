import { NextRequest, NextResponse } from 'next/server';
import { getRecord, updateRecord, deleteRecord } from '@/lib/nocodb';
import { getProviderLocalConfig, setProviderLocalConfig, deleteProviderLocalConfig } from '@/lib/local-config';
import type { Provider } from '@/types';

const TABLE = 'providers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const record = await getRecord<Provider>(TABLE, Number(id));
    const localConfig = getProviderLocalConfig(id);
    return NextResponse.json({ ...record, localConfig });
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
    
    const { apiKeyMode, apiKeyEnvName, directApiKey, presetId, ...rest } = body;
    
    const nocoData: Record<string, any> = {
      name: rest.name,
      type: rest.type,
      // NocoDB Title Case mapping
      'Base URL': rest.base_url,
      'Default Model': rest.default_model,
      'Is Active': rest.is_active ?? true,
      'Supports Reasoning': rest.supports_reasoning ?? false,
      'Supports Tools': rest.supports_tools ?? false,
      'Context Window': rest.context_window,
      'Max Output Tokens': rest.max_output_tokens,
      // Fallbacks
      base_url: rest.base_url,
      default_model: rest.default_model,
      is_active: rest.is_active ?? true,
      supports_reasoning: rest.supports_reasoning ?? false,
      supports_tools: rest.supports_tools ?? false,
      context_window: rest.context_window,
      max_output_tokens: rest.max_output_tokens,
    };
    
    const record = await updateRecord<Provider>(TABLE, Number(id), nocoData);
    
    if (apiKeyMode) {
      setProviderLocalConfig(id, {
        directApiKey: apiKeyMode === 'direct-local' ? directApiKey : undefined,
        apiKeyMode,
        apiKeyEnvName,
        presetId,
      });
    }
    
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
    const numericId = Number(id);
    await deleteRecord(TABLE, numericId);
    deleteProviderLocalConfig(numericId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
