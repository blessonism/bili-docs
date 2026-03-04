import { source } from '@/lib/source';
export const revalidate = 60;
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { isAdmin } from '@/lib/auth';
import { getDocVisibilityBySlug } from '@/lib/doc-visibility';
import { DocsAdminToolbar } from '@/components/docs-admin-toolbar';
import categories from '@/lib/categories.json';

function buildDocPath(slug: string[] | undefined): string {
  if (!slug?.length) return '/docs';
  return `/docs/${slug.join('/')}`;
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page && !params.slug?.length) {
    redirect('/');
  }
  if (!page) notFound();

  const admin = await isAdmin();
  const visibility = await getDocVisibilityBySlug(params.slug);
  if (!admin && visibility === 'admin') {
    redirect(`/unauthorized?from=${encodeURIComponent(buildDocPath(params.slug))}`);
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      {admin && params.slug?.length ? (
        <DocsAdminToolbar
          slug={params.slug}
          visibility={visibility}
          categories={categories.map((category) => ({ slug: category.slug, name: category.name }))}
        />
      ) : null}
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page && !params.slug?.length) {
    return {
      title: '文稿库',
      description: 'B 站文稿知识库',
    };
  }
  if (!page) notFound();
  const admin = await isAdmin();
  const visibility = await getDocVisibilityBySlug(params.slug);
  if (!admin && visibility === 'admin') {
    return {
      title: '无权限访问',
      description: '当前文档仅管理员可访问',
    };
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
