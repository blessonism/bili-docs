import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { toggleDocVisibility } from '@/lib/doc-admin';
import { getDocVisibilityCacheTag } from '@/lib/doc-visibility';

type ToggleBody = {
  slug?: string[];
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ToggleBody;
  if (!Array.isArray(body.slug) || body.slug.length === 0) {
    return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
  }

  try {
    const result = await toggleDocVisibility(body.slug);
    revalidatePath(result.url);
    revalidatePath('/docs', 'layout');
    revalidateTag(getDocVisibilityCacheTag(), 'max');
    return NextResponse.json({
      ok: true,
      visibility: result.visibility,
      url: result.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '切换可见性失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
