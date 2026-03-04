import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { moveDocCategory } from '@/lib/doc-admin';
import { getDocVisibilityCacheTag } from '@/lib/doc-visibility';

type MoveCategoryBody = {
  slug?: string[];
  category?: string;
};

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as MoveCategoryBody;
  if (!Array.isArray(body.slug) || body.slug.length === 0) {
    return NextResponse.json({ error: '缺少 slug 参数' }, { status: 400 });
  }
  if (typeof body.category !== 'string' || !body.category.trim()) {
    return NextResponse.json({ error: '缺少目标分类' }, { status: 400 });
  }

  try {
    const result = await moveDocCategory(body.slug, body.category);
    revalidatePath(result.fromUrl);
    revalidatePath(result.toUrl);
    revalidatePath('/docs', 'layout');
    revalidateTag(getDocVisibilityCacheTag(), 'max');
    return NextResponse.json({
      ok: true,
      fromUrl: result.fromUrl,
      toUrl: result.toUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '移动分类失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
