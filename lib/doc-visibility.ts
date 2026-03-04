import fs from 'node:fs/promises';
import path from 'node:path';
import { unstable_cache } from 'next/cache';

export type DocVisibility = 'public' | 'admin';

const DOCS_ROOT = path.join(process.cwd(), 'content', 'docs');
const DOC_VISIBILITY_TAG = 'docs-visibility';

function normalizeDocUrl(url: string): string {
  let pure = url.trim();
  if (/^https?:\/\//.test(pure)) {
    try {
      pure = new URL(pure).pathname;
    } catch {
      pure = url;
    }
  }
  if (pure.startsWith('docs/')) {
    pure = `/${pure}`;
  }
  pure = pure.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return pure || '/';
}

export function normalizeVisibility(value: unknown): DocVisibility {
  return value === 'admin' ? 'admin' : 'public';
}

export function slugToDocUrl(slug: string[] | undefined): string {
  if (!slug?.length) return '/docs';
  return normalizeDocUrl(`/docs/${slug.map((segment) => segment.trim()).join('/')}`);
}

export function docUrlToSlug(url: string): string[] {
  const normalized = normalizeDocUrl(url);
  if (!normalized.startsWith('/docs')) return [];
  return normalized
    .replace(/^\/docs\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function parseVisibility(raw: string): DocVisibility {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return 'public';
  const frontmatter = match[1];
  const visibility = frontmatter.match(/^\s*visibility\s*:\s*["']?(public|admin)["']?\s*$/m)?.[1];
  return visibility === 'admin' ? 'admin' : 'public';
}

function filePathToDocUrl(filePath: string): string {
  const relative = path.relative(DOCS_ROOT, filePath).replace(/\\/g, '/');
  const withoutExt = relative.replace(/\.mdx$/, '');
  const normalized = withoutExt.endsWith('/index')
    ? withoutExt.slice(0, -'/index'.length)
    : withoutExt;
  return normalized ? `/docs/${normalized}` : '/docs';
}

async function collectVisibilityMap(
  directory: string,
  output: Record<string, DocVisibility>,
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await collectVisibilityMap(fullPath, output);
        return;
      }
      if (!entry.isFile() || !entry.name.endsWith('.mdx')) return;
      const content = await fs.readFile(fullPath, 'utf-8');
      output[filePathToDocUrl(fullPath)] = parseVisibility(content);
    }),
  );
}

const getCachedVisibilityMap = unstable_cache(
  async () => {
    const visibilityMap: Record<string, DocVisibility> = {};
    await collectVisibilityMap(DOCS_ROOT, visibilityMap);
    return visibilityMap;
  },
  ['doc-visibility-map'],
  { revalidate: 60, tags: [DOC_VISIBILITY_TAG] },
);

export function getDocVisibilityCacheTag(): string {
  return DOC_VISIBILITY_TAG;
}

export async function getDocVisibilityMap(): Promise<Record<string, DocVisibility>> {
  return getCachedVisibilityMap();
}

export async function getDocVisibilityBySlug(slug: string[] | undefined): Promise<DocVisibility> {
  const visibilityMap = await getDocVisibilityMap();
  return visibilityMap[slugToDocUrl(slug)] || 'public';
}

export async function canAccessDocBySlug(
  slug: string[] | undefined,
  isAdmin: boolean,
): Promise<boolean> {
  if (isAdmin) return true;
  const visibility = await getDocVisibilityBySlug(slug);
  return visibility !== 'admin';
}

function isHiddenDocUrl(url: string, visibilityMap: Record<string, DocVisibility>): boolean {
  return visibilityMap[normalizeDocUrl(url)] === 'admin';
}

export function filterPageTreeByVisibility<T>(
  tree: T,
  visibilityMap: Record<string, DocVisibility>,
): T {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map((item) => visit(item)).filter((item) => item !== null);
    }
    if (!node || typeof node !== 'object') return node;

    const record = node as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : null;
    if (url && isHiddenDocUrl(url, visibilityMap)) {
      return null;
    }

    const nextNode: Record<string, unknown> = { ...record };
    const hasChildren = Array.isArray(record.children);
    const hasPages = Array.isArray(record.pages);

    if (hasChildren) {
      nextNode.children = (record.children as unknown[])
        .map((item) => visit(item))
        .filter((item) => item !== null);
    }
    if (hasPages) {
      nextNode.pages = (record.pages as unknown[])
        .map((item) => visit(item))
        .filter((item) => item !== null);
    }

    if (!url && (hasChildren || hasPages)) {
      const childCount = hasChildren ? (nextNode.children as unknown[]).length : 0;
      const pageCount = hasPages ? (nextNode.pages as unknown[]).length : 0;
      if (childCount + pageCount === 0) return null;
    }

    return nextNode;
  };

  const result = visit(tree);
  return (result ?? tree) as T;
}

export function filterSearchPayloadByVisibility(
  payload: unknown,
  visibilityMap: Record<string, DocVisibility>,
): unknown {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((item) => visit(item)).filter((item) => item !== null);
    }
    if (!value || typeof value !== 'object') return value;

    const record = value as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : null;
    if (url && isHiddenDocUrl(url, visibilityMap)) return null;

    const next: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(record)) {
      const filtered = visit(entryValue);
      if (filtered !== null) {
        next[key] = filtered;
      }
    }
    return next;
  };

  return visit(payload);
}
