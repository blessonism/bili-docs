import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { isAdmin } from '@/lib/auth';
import { filterPageTreeByVisibility, getDocVisibilityMap } from '@/lib/doc-visibility';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const admin = await isAdmin();
  const tree = source.getPageTree();
  const visibilityMap = admin ? null : await getDocVisibilityMap();
  const filteredTree = visibilityMap ? filterPageTreeByVisibility(tree, visibilityMap) : tree;

  return (
    <DocsLayout tree={filteredTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
