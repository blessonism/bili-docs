'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DocVisibility } from '@/lib/doc-visibility';
import { AdminLogoutButton } from '@/components/admin-logout-button';

type CategoryOption = {
  slug: string;
  name: string;
};

type Props = {
  slug: string[];
  visibility: DocVisibility;
  categories: CategoryOption[];
};

export function DocsAdminToolbar({ slug, visibility, categories }: Props) {
  const router = useRouter();
  const [currentVisibility, setCurrentVisibility] = useState<DocVisibility>(visibility);
  const [targetCategory, setTargetCategory] = useState(slug[0] || '');
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [loadingMove, setLoadingMove] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canMove = slug.length >= 2;
  const canSubmitMove = canMove && targetCategory && targetCategory !== slug[0];

  const targetCategoryName = useMemo(
    () => categories.find((category) => category.slug === targetCategory)?.name || targetCategory,
    [categories, targetCategory],
  );

  async function toggleVisibility() {
    setLoadingToggle(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/docs/toggle-visibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        visibility?: DocVisibility;
        error?: string;
      };
      if (!response.ok || !payload.visibility) {
        setError(payload.error || '切换可见性失败');
        return;
      }
      setCurrentVisibility(payload.visibility);
      setMessage(`可见性已切换为 ${payload.visibility === 'admin' ? '仅管理员' : '公开'}`);
      router.refresh();
    } finally {
      setLoadingToggle(false);
    }
  }

  async function moveCategory() {
    if (!canSubmitMove) return;
    setLoadingMove(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/docs/move-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, category: targetCategory }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        toUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.toUrl) {
        setError(payload.error || '移动分类失败');
        return;
      }
      setMessage(`已移动到「${targetCategoryName}」`);
      router.replace(payload.toUrl);
      router.refresh();
    } finally {
      setLoadingMove(false);
    }
  }

  return (
    <section className="mb-4 rounded-lg border bg-fd-card p-4">
      <p className="text-sm font-medium">管理员工具栏</p>
      <p className="mt-1 text-xs text-fd-muted-foreground">
        当前可见性：{currentVisibility === 'admin' ? '仅管理员' : '公开'}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <AdminLogoutButton className="px-3 py-1.5 text-sm" />
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={loadingToggle}
          className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-fd-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingToggle ? '处理中...' : '切换可见性'}
        </button>

        <select
          value={targetCategory}
          onChange={(event) => setTargetCategory(event.target.value)}
          disabled={!canMove || loadingMove}
          className="rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none ring-fd-ring transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={moveCategory}
          disabled={!canSubmitMove || loadingMove}
          className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-fd-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingMove ? '移动中...' : '移动分类'}
        </button>
      </div>

      {!canMove ? (
        <p className="mt-2 text-xs text-fd-muted-foreground">该页面不支持移动分类。</p>
      ) : null}
      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </section>
  );
}
