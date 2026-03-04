import Link from 'next/link';

export default async function UnauthorizedPage(props: PageProps<'/unauthorized'>) {
  const searchParams = await props.searchParams;
  const from = typeof searchParams.from === 'string' ? searchParams.from : '/docs';
  const nextPath = from.startsWith('/') ? from : '/docs';
  const loginHref = `/admin/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-xl border bg-fd-card p-8 text-center">
        <h1 className="text-2xl font-semibold">无权限访问</h1>
        <p className="mt-3 text-sm text-fd-muted-foreground">
          当前文档仅管理员可见，请使用管理员账号登录后再访问。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={loginHref}
            className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition hover:opacity-90"
          >
            前往管理员登录
          </Link>
          <Link
            href="/docs"
            className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-fd-accent"
          >
            返回文档首页
          </Link>
        </div>
      </section>
    </main>
  );
}
