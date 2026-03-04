import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { getDocsLayoutOptions } from '@/lib/layout.shared';
import { isAdmin } from '@/lib/auth';
import { filterPageTreeByVisibility, getDocVisibilityMap } from '@/lib/doc-visibility';
import { DocsNavAdminControls } from '@/components/docs-nav-admin-controls';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  const admin = await isAdmin();
  const tree = source.getPageTree();
  const visibilityMap = admin ? null : await getDocVisibilityMap();
  const filteredTree = visibilityMap ? filterPageTreeByVisibility(tree, visibilityMap) : tree;
  const options = getDocsLayoutOptions(admin, admin ? <DocsNavAdminControls /> : undefined);

  return (
    <DocsLayout tree={filteredTree} {...options}>
      {children}
    </DocsLayout>
  );
}
