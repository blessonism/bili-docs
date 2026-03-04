'use client';

import Link from 'next/link';
import { AdminLogoutButton } from '@/components/admin-logout-button';

export function DocsNavAdminControls() {
  return (
    <div className="ms-2 flex items-center gap-2">
      <Link
        href="/keystatic"
        className="rounded-md border px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-foreground"
      >
        管理中
      </Link>
      <AdminLogoutButton
        label="退出"
        loadingLabel="退出中..."
        showError={false}
        className="px-2.5 py-1 text-xs"
      />
    </div>
  );
}
