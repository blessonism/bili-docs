'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

type Props = {
  className?: string;
  label?: string;
  loadingLabel?: string;
  showError?: boolean;
};

export function AdminLogoutButton({
  className,
  label = '退出管理',
  loadingLabel = '退出中...',
  showError = true,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error || '退出失败，请稍后重试');
        return;
      }
      router.refresh();
    } catch {
      setError('退出失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={cn(
          'rounded-md border px-3 py-1.5 text-sm transition hover:bg-fd-accent disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        {loading ? loadingLabel : label}
      </button>
      {showError && error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
