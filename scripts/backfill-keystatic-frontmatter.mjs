#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const DOCS_ROOT = path.join(process.cwd(), 'content', 'docs');
const TARGET_FIELDS = ['displayName', 'uploader', 'duration', 'bvUrl', 'tags'];
const dryRun = process.argv.includes('--dry-run');

async function collectMdxFiles(rootDir) {
  const output = [];

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(filePath);
        continue;
      }
      if (entry.isFile() && filePath.endsWith('.mdx')) {
        output.push(filePath);
      }
    }
  }

  await walk(rootDir);
  return output;
}

function parseDoc(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  return {
    frontmatter: match[1],
    body: raw.slice(match[0].length),
  };
}

function splitFrontmatter(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const keyOrder = [];
  const keyIndex = [];

  for (let i = 0; i < lines.length; i += 1) {
    const matched = lines[i].match(/^([A-Za-z][\w-]*)\s*:/);
    if (!matched) continue;
    keyOrder.push(matched[1]);
    keyIndex.push(i);
  }

  const segments = new Map();
  for (let i = 0; i < keyOrder.length; i += 1) {
    const start = keyIndex[i];
    const end = i + 1 < keyOrder.length ? keyIndex[i + 1] - 1 : lines.length - 1;
    segments.set(keyOrder[i], lines.slice(start, end + 1));
  }

  return { keyOrder, segments };
}

function toYamlString(value) {
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function scalarValue(segmentLines) {
  if (!segmentLines || segmentLines.length === 0) return '';
  const first = segmentLines[0];
  const index = first.indexOf(':');
  if (index < 0) return '';
  return first.slice(index + 1).trim();
}

function decodeYamlScalar(raw) {
  const value = raw.trim();
  if (!value || value === 'null') return '';
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\\\/g, '\\').replace(/\\"/g, '"');
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\'/g, "'");
  }
  return value;
}

function isScalarMissing(segmentLines) {
  const value = scalarValue(segmentLines);
  return value === '' || value === '""' || value === "''" || value === 'null';
}

function isTagsMissingOrEmpty(segmentLines) {
  if (!segmentLines || segmentLines.length === 0) return true;
  if (segmentLines.length === 1) {
    const inline = scalarValue(segmentLines).trim();
    if (!inline || inline === '[]' || inline === 'null') return true;
    if (inline.startsWith('[') && inline.endsWith(']')) {
      return inline.slice(1, -1).trim().length === 0;
    }
    return false;
  }

  return !segmentLines.some((line) => /^\s*-\s*\S+/.test(line));
}

function extractFirstBlockquote(body) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trimStart().startsWith('>'));
  if (start < 0) return null;

  const blockquoteLines = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trimStart().startsWith('>')) break;
    blockquoteLines.push(line.replace(/^\s*>\s?/, ''));
  }
  if (blockquoteLines.length === 0) return null;

  const quoteText = blockquoteLines.join('\n');
  const cleanText = (value) => value.replace(/\*\*/g, '').trim();
  const cleanTag = (value) =>
    value
      .replace(/\*\*/g, '')
      .replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1')
      .trim();

  const uploader =
    quoteText.match(/(?:\*\*UP主\*\*|UP主)\s*:\s*([^·\n]+?)(?=\s*·|\n|$)/)?.[1] || '';
  const duration =
    quoteText.match(/(?:\*\*时长\*\*|时长)\s*:\s*([^·\n]+?)(?=\s*·|\n|$)/)?.[1] || '';
  const bvUrl = quoteText.match(/\((https?:\/\/www\.bilibili\.com\/video\/[^)\s]+)\)/i)?.[1] || '';
  const tagsLine = quoteText.match(/(?:\*\*标签\*\*|标签)\s*:\s*([^\n]+)/)?.[1] || '';
  const tags = tagsLine
    ? tagsLine
        .split(/[·｜|,，]/)
        .map((item) => cleanTag(item))
        .filter(Boolean)
    : [];

  return {
    uploader: cleanText(uploader),
    duration: cleanText(duration),
    bvUrl: bvUrl.trim(),
    tags,
  };
}

function resolveUpdates(parsed) {
  const { keyOrder, segments } = splitFrontmatter(parsed.frontmatter);
  const metadata = extractFirstBlockquote(parsed.body);
  const updates = {};

  const title = decodeYamlScalar(scalarValue(segments.get('title')));
  if (title && isScalarMissing(segments.get('displayName'))) {
    updates.displayName = title;
  }

  if (metadata) {
    if (metadata.uploader && isScalarMissing(segments.get('uploader'))) {
      updates.uploader = metadata.uploader;
    }
    if (metadata.duration && isScalarMissing(segments.get('duration'))) {
      updates.duration = metadata.duration;
    }
    if (metadata.bvUrl && isScalarMissing(segments.get('bvUrl'))) {
      updates.bvUrl = metadata.bvUrl;
    }
    if (metadata.tags.length > 0 && isTagsMissingOrEmpty(segments.get('tags'))) {
      updates.tags = metadata.tags;
    }
  }

  if (Object.keys(updates).length === 0) {
    return null;
  }

  const nextSegments = new Map(segments);
  if (updates.displayName) {
    nextSegments.set('displayName', [`displayName: ${toYamlString(updates.displayName)}`]);
  }
  if (updates.uploader) {
    nextSegments.set('uploader', [`uploader: ${toYamlString(updates.uploader)}`]);
  }
  if (updates.duration) {
    nextSegments.set('duration', [`duration: ${toYamlString(updates.duration)}`]);
  }
  if (updates.bvUrl) {
    nextSegments.set('bvUrl', [`bvUrl: ${toYamlString(updates.bvUrl)}`]);
  }
  if (updates.tags && updates.tags.length > 0) {
    nextSegments.set('tags', ['tags:', ...updates.tags.map((tag) => `  - ${toYamlString(tag)}`)]);
  }

  const nextOrder = [...keyOrder];
  for (const field of TARGET_FIELDS) {
    if (field in updates && !nextOrder.includes(field)) {
      nextOrder.push(field);
    }
  }

  const frontmatterLines = [];
  for (const key of nextOrder) {
    const segment = nextSegments.get(key);
    if (!segment) continue;
    frontmatterLines.push(...segment);
  }

  const trimmedBody = parsed.body.replace(/^\r?\n/, '');
  const content = `---\n${frontmatterLines.join('\n')}\n---\n\n${trimmedBody}`;
  return { content, updates };
}

async function processFile(filePath, stats) {
  stats.total += 1;
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = parseDoc(raw);
    if (!parsed) {
      stats.failed += 1;
      return;
    }

    const result = resolveUpdates(parsed);
    if (!result) {
      stats.skipped += 1;
      return;
    }

    if (!dryRun) {
      await fs.writeFile(filePath, result.content, 'utf-8');
    }
    stats.updated += 1;
  } catch {
    stats.failed += 1;
  }
}

async function main() {
  const stats = { total: 0, updated: 0, skipped: 0, failed: 0 };

  const files = await collectMdxFiles(DOCS_ROOT);
  for (const filePath of files) {
    await processFile(filePath, stats);
  }

  console.log(`mode=${dryRun ? 'dry-run' : 'apply'}`);
  console.log(`total=${stats.total}`);
  console.log(`updated=${stats.updated}`);
  console.log(`skipped=${stats.skipped}`);
  console.log(`failed=${stats.failed}`);
}

main().catch((error) => {
  console.error('迁移脚本执行失败:', error);
  process.exitCode = 1;
});
