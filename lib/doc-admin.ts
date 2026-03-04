import fs from 'node:fs/promises';
import path from 'node:path';
import categories from '@/lib/categories.json';
import { normalizeVisibility, slugToDocUrl, type DocVisibility } from '@/lib/doc-visibility';

const DOCS_ROOT = path.join(process.cwd(), 'content', 'docs');
const VALID_SEGMENT = /^[A-Za-z0-9._-]+$/;

type ResolvedDocFile = {
  filePath: string;
  kind: 'file' | 'index';
};

function isPathInsideDocsRoot(filePath: string): boolean {
  const relative = path.relative(DOCS_ROOT, filePath);
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function validateSlug(slug: string[]): string[] {
  if (!Array.isArray(slug) || slug.length === 0) {
    throw new Error('文档路径不能为空');
  }
  const normalized = slug.map((segment) => segment.trim());
  if (normalized.some((segment) => !segment || !VALID_SEGMENT.test(segment))) {
    throw new Error('文档路径格式不合法');
  }
  return normalized;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function getValidCategorySlugs(): string[] {
  return categories.map((category) => category.slug);
}

function parseVisibility(content: string): DocVisibility {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return 'public';
  const rawValue = match[1].match(/^\s*visibility\s*:\s*["']?(public|admin)["']?\s*$/m)?.[1];
  return normalizeVisibility(rawValue);
}

function upsertVisibility(content: string, visibility: DocVisibility): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n)?/);
  if (!match) {
    return `---\nvisibility: ${visibility}\n---\n\n${content}`;
  }

  const frontmatter = match[1];
  const lines = frontmatter.split(/\r?\n/);
  let replaced = false;
  const nextLines = lines.map((line) => {
    if (/^\s*visibility\s*:/.test(line)) {
      replaced = true;
      return `visibility: ${visibility}`;
    }
    return line;
  });

  if (!replaced) {
    nextLines.push(`visibility: ${visibility}`);
  }

  const rest = content.slice(match[0].length).replace(/^\r?\n/, '');
  return `---\n${nextLines.join('\n')}\n---\n\n${rest}`;
}

export async function resolveDocFile(slug: string[]): Promise<ResolvedDocFile | null> {
  const normalizedSlug = validateSlug(slug);
  const directPath = path.join(DOCS_ROOT, ...normalizedSlug) + '.mdx';
  const indexPath = path.join(DOCS_ROOT, ...normalizedSlug, 'index.mdx');

  if (isPathInsideDocsRoot(directPath) && (await exists(directPath))) {
    return { filePath: directPath, kind: 'file' };
  }

  if (isPathInsideDocsRoot(indexPath) && (await exists(indexPath))) {
    return { filePath: indexPath, kind: 'index' };
  }

  return null;
}

export async function readVisibility(slug: string[]): Promise<DocVisibility> {
  const resolved = await resolveDocFile(slug);
  if (!resolved) {
    throw new Error('文档不存在');
  }
  const content = await fs.readFile(resolved.filePath, 'utf-8');
  return parseVisibility(content);
}

export async function toggleDocVisibility(slug: string[]): Promise<{
  visibility: DocVisibility;
  url: string;
}> {
  const normalizedSlug = validateSlug(slug);
  const resolved = await resolveDocFile(normalizedSlug);
  if (!resolved) {
    throw new Error('文档不存在');
  }

  const content = await fs.readFile(resolved.filePath, 'utf-8');
  const current = parseVisibility(content);
  const next = current === 'admin' ? 'public' : 'admin';
  await fs.writeFile(resolved.filePath, upsertVisibility(content, next), 'utf-8');

  return {
    visibility: next,
    url: slugToDocUrl(normalizedSlug),
  };
}

export async function moveDocCategory(slug: string[], targetCategory: string): Promise<{
  fromUrl: string;
  toUrl: string;
}> {
  const normalizedSlug = validateSlug(slug);
  const categorySlug = targetCategory.trim();
  if (!getValidCategorySlugs().includes(categorySlug)) {
    throw new Error('目标分类不合法');
  }
  if (normalizedSlug.length < 2) {
    throw new Error('当前页面不支持移动分类');
  }
  if (normalizedSlug[0] === categorySlug) {
    throw new Error('目标分类与当前分类一致');
  }

  const resolved = await resolveDocFile(normalizedSlug);
  if (!resolved) {
    throw new Error('文档不存在');
  }

  const nextSlug = [categorySlug, ...normalizedSlug.slice(1)];
  const targetPath =
    resolved.kind === 'index'
      ? path.join(DOCS_ROOT, ...nextSlug, 'index.mdx')
      : path.join(DOCS_ROOT, ...nextSlug) + '.mdx';

  if (!isPathInsideDocsRoot(targetPath)) {
    throw new Error('目标路径非法');
  }
  if (await exists(targetPath)) {
    throw new Error('目标分类下已存在同名文档');
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rename(resolved.filePath, targetPath);

  return {
    fromUrl: slugToDocUrl(normalizedSlug),
    toUrl: slugToDocUrl(nextSlug),
  };
}
