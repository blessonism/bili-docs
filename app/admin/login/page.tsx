import { AdminLoginForm } from '@/components/admin-login-form';

export default async function AdminLoginPage(props: PageProps<'/admin/login'>) {
  const searchParams = await props.searchParams;
  const rawNext = typeof searchParams.next === 'string' ? searchParams.next : '/docs';
  const nextPath = rawNext.startsWith('/') ? rawNext : '/docs';

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-12">
      <section className="w-full rounded-xl border bg-fd-card p-6">
        <h1 className="text-xl font-semibold">管理员登录</h1>
        <p className="mt-2 text-sm text-fd-muted-foreground">
          请输入管理员密码以启用文档管理能力。
        </p>

        <AdminLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
