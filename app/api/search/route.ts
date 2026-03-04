import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { filterSearchPayloadByVisibility, getDocVisibilityMap } from '@/lib/doc-visibility';

const { GET: baseSearchGET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (isAdminRequest(request)) {
    return baseSearchGET(request);
  }

  const response = await baseSearchGET(request);
  if (!response.ok) return response;

  const payload = await response.json().catch(() => null);
  if (!payload) return response;

  const visibilityMap = await getDocVisibilityMap();
  const filteredPayload = filterSearchPayloadByVisibility(payload, visibilityMap);
  return NextResponse.json(filteredPayload, { status: response.status });
}
