import fs from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Timer,
  TrendingUp,
  XCircle,
} from 'lucide-react';

type StepStatus = 'success' | 'warn' | 'failed' | 'timeout';

type NewDocItem = {
  path: string;
  category: string;
  sub_category: string;
  bvid?: string;
  title: string;
};

type RunRecord = {
  run_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status: 'success' | 'partial' | 'failed';
  steps: Record<string, { status: StepStatus; duration: number }>;
  stats: {
    new_videos: number;
    new_transcripts: number;
    asr_processed: number;
    asr_queue_remaining: number;
    total_videos: number;
    total_transcripts: number;
  };
  new_files: string[];
  new_docs?: NewDocItem[];
  errors: string[];
};

type PipelineRunsFile = {
  runs: RunRecord[];
};

export const dynamic = 'force-dynamic';

async function loadPipelineRuns(): Promise<PipelineRunsFile> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'pipeline_runs.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as PipelineRunsFile;
    if (!Array.isArray(parsed.runs)) return { runs: [] };
    return parsed;
  } catch {
    return { runs: [] };
  }
}

const stepLabels: Record<string, string> = {
  step0_cookie: 'Cookie',
  step1_metadata: '元数据',
  step2_subtitle: '字幕',
  step3_asr: 'ASR',
  step4a_classify: '分类',
  step4b_polish: '润色',
  step5_docs: '文档',
  step6_mdx: 'MDX',
  step7_git: 'Git',
  step8_deploy: '部署',
};

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const rounded = Math.round(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainSeconds = rounded % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${remainSeconds}s`;
  if (minutes > 0) return `${minutes}m ${remainSeconds}s`;
  return `${remainSeconds}s`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return '未知';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} 天前`;
}

function toDocHref(path: string): string {
  const normalized = path.replace(/^content\/docs\//, '').replace(/\.mdx$/, '');
  const segments = normalized.split('/').filter(Boolean).map(encodeURIComponent);
  return `/docs/${segments.join('/')}`;
}

type GroupedDocMap = Record<string, Record<string, NewDocItem[]>>;

function getRunDocs(run: RunRecord): NewDocItem[] {
  return (run.new_docs || []).length > 0
    ? (run.new_docs || [])
    : (run.new_files || []).map((file) => {
        const normalized = file.replace(/^content\/docs\//, '').replace(/^content\//, '').trim();
        const parts = normalized.replace(/\.mdx$/, '').split('/').filter(Boolean);
        const category = parts[0] || 'unknown';
        const subCategory = parts[1] || 'misc';
        const stem = normalized.split('/').pop()?.replace(/\.mdx$/, '') || normalized;
        return {
          path: normalized,
          category,
          sub_category: subCategory,
          title: stem,
        };
      });
}

function groupDocs(latestRun: RunRecord): GroupedDocMap {
  const grouped: GroupedDocMap = {};
  const docs = getRunDocs(latestRun);

  for (const doc of docs) {
    const category = doc.category || 'unknown';
    const subCategory = doc.sub_category || 'misc';
    grouped[category] ||= {};
    grouped[category][subCategory] ||= [];
    grouped[category][subCategory].push(doc);
  }

  return grouped;
}

function getRunBadge(status: RunRecord['status']) {
  if (status === 'success') {
    return {
      label: 'Success',
      className: 'bg-green-100 text-green-800',
      icon: CheckCircle2,
    };
  }
  if (status === 'partial') {
    return {
      label: 'Partial',
      className: 'bg-yellow-100 text-yellow-800',
      icon: AlertTriangle,
    };
  }
  return {
    label: 'Failed',
    className: 'bg-red-100 text-red-800',
    icon: XCircle,
  };
}

function getStepBadge(status: StepStatus) {
  if (status === 'success') return { text: '成功', className: 'text-green-700' };
  if (status === 'warn') return { text: '警告', className: 'text-yellow-700' };
  if (status === 'timeout') return { text: '超时', className: 'text-orange-700' };
  return { text: '失败', className: 'text-red-700' };
}

function calculateNextRun(now = new Date()): Date {
  const current = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  let candidate = new Date(current);
  candidate.setUTCHours(4, 0, 0, 0);
  if (candidate.getTime() <= current.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  while (candidate.getUTCDate() % 2 === 0) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    candidate.setUTCHours(4, 0, 0, 0);
  }
  return new Date(candidate.getTime() - 8 * 60 * 60 * 1000);
}

export default async function PipelineStatusPage() {
  const data = await loadPipelineRuns();
  const latestRun = data.runs[0];
  const history = data.runs.slice(1, 11);
  const nextRun = calculateNextRun();

  if (!latestRun) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <div className="rounded-lg border p-6">
          <h1 className="text-2xl font-semibold">Pipeline 运行状态</h1>
          <p className="mt-2 text-sm text-fd-muted-foreground">
            自动化流水线执行记录与监控
          </p>
          <p className="mt-8 text-sm text-fd-muted-foreground">
            暂无运行记录，请先触发一次 pipeline。
          </p>
        </div>
      </div>
    );
  }

  const runBadge = getRunBadge(latestRun.status);
  const RunBadgeIcon = runBadge.icon;
  const groupedFiles = groupDocs(latestRun);
  const asrDone = latestRun.stats.asr_processed;
  const asrQueue = latestRun.stats.asr_queue_remaining;
  const asrTotal = asrDone + asrQueue;
  const asrPercent = asrTotal > 0 ? Math.round((asrDone / asrTotal) * 100) : 0;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-lg border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <Activity className="h-6 w-6" />
              Pipeline 运行状态
            </h1>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              自动化流水线执行记录与监控
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${runBadge.className}`}
          >
            <RunBadgeIcon className="h-3.5 w-3.5" />
            {runBadge.label}
          </span>
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">最近一次运行</h2>
        <div className="mt-3 grid gap-3 text-sm text-fd-muted-foreground md:grid-cols-3">
          <p>
            运行时间：{formatRelativeTime(latestRun.start_time)}（
            {formatDateTime(latestRun.start_time)}）
          </p>
          <p>总耗时：{formatDuration(latestRun.duration_seconds)}</p>
          <p>运行 ID：{latestRun.run_id}</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(latestRun.steps).map(([key, value]) => {
            const badge = getStepBadge(value.status);
            return (
              <div key={key} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{stepLabels[key] ?? key}</p>
                <p className={`mt-1 text-xs ${badge.className}`}>{badge.text}</p>
                <p className="mt-2 text-xs text-fd-muted-foreground">
                  {formatDuration(value.duration)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            本次新增
          </h3>
          <p className="mt-3 text-2xl font-semibold">{latestRun.stats.new_videos}</p>
          <p className="text-sm text-fd-muted-foreground">个视频</p>
          <p className="mt-2 text-lg font-semibold">{latestRun.stats.new_transcripts}</p>
          <p className="text-sm text-fd-muted-foreground">篇文稿</p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            ASR 进度
          </h3>
          <p className="mt-3 text-sm">
            {asrDone}/{asrTotal || asrDone} ({asrPercent}%)
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-fd-muted">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${asrPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-fd-muted-foreground">
            队列：{latestRun.stats.asr_queue_remaining} 待处理
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            总计
          </h3>
          <p className="mt-3 text-2xl font-semibold">{latestRun.stats.total_videos}</p>
          <p className="text-sm text-fd-muted-foreground">个视频</p>
          <p className="mt-2 text-lg font-semibold">{latestRun.stats.total_transcripts}</p>
          <p className="text-sm text-fd-muted-foreground">篇文稿</p>
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">
          本次新增文稿 ({latestRun.stats.new_transcripts} 篇)
        </h2>
        <div className="mt-4 space-y-4">
          {Object.entries(groupedFiles).length === 0 ? (
            <p className="text-sm text-fd-muted-foreground">本次没有新增 MDX 文件。</p>
          ) : (
            Object.entries(groupedFiles).map(([category, subMap]) => (
              <div key={category} className="rounded-lg border p-4">
                <p className="font-medium">
                  {category} ({Object.values(subMap).reduce((acc, items) => acc + items.length, 0)})
                </p>
                <div className="mt-2 space-y-2">
                  {Object.entries(subMap).map(([subCategory, items]) => (
                    <div key={subCategory}>
                      <p className="text-sm text-fd-muted-foreground">{subCategory}</p>
                      <ul className="mt-1 space-y-1">
                        {items.map((doc) => {
                          const rawPath = doc.path;
                          return (
                            <li key={rawPath}>
                              <Link
                                href={toDocHref(rawPath)}
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {doc.title}
                              </Link>
                              {doc.bvid ? (
                                <span className="ml-2 text-xs text-fd-muted-foreground">{doc.bvid}</span>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">历史记录（最近 10 次）</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-fd-muted-foreground">
              <tr>
                <th className="py-2 pr-4">运行时间</th>
                <th className="py-2 pr-4">耗时</th>
                <th className="py-2 pr-4">状态</th>
                <th className="py-2 pr-4">新增文稿</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-fd-muted-foreground">
                    暂无历史记录（当前仅 1 次运行）
                  </td>
                </tr>
              ) : (
                history.map((run) => {
                  const badge = getRunBadge(run.status);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={run.run_id} className="border-b align-top">
                      <td className="py-3 pr-4">
                        <p>{formatRelativeTime(run.start_time)}</p>
                        <p className="text-xs text-fd-muted-foreground">
                          {formatDateTime(run.start_time)}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{formatDuration(run.duration_seconds)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{run.stats.new_transcripts}</td>
                      <td className="py-3">
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:underline">
                            详情
                          </summary>
                          <div className="mt-2 rounded border p-2 text-xs space-y-2">
                            <div>
                              {Object.entries(run.steps).map(([name, detail]) => (
                                <p key={name}>
                                  {stepLabels[name] ?? name}：{detail.status} / {formatDuration(detail.duration)}
                                </p>
                              ))}
                            </div>

                            {getRunDocs(run).length > 0 ? (
                              <div className="border-t pt-2">
                                <p className="font-medium text-fd-foreground">新增文稿</p>
                                <ul className="mt-1 space-y-1">
                                  {getRunDocs(run).slice(0, 8).map((doc) => (
                                    <li key={`${run.run_id}-${doc.path}`}>
                                      <Link href={toDocHref(doc.path)} className="text-blue-600 hover:underline">
                                        {doc.title}
                                      </Link>
                                      {doc.bvid ? (
                                        <span className="ml-2 text-fd-muted-foreground">{doc.bvid}</span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                                {getRunDocs(run).length > 8 ? (
                                  <p className="mt-1 text-fd-muted-foreground">仅展示前 8 条（共 {getRunDocs(run).length} 条）</p>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="h-5 w-5" />
          下次运行倒计时
        </h2>
        <p className="mt-3 text-sm text-fd-muted-foreground">
          下次运行：{formatDateTime(nextRun.toISOString())} CST
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm">
          <Timer className="h-4 w-4" />
          计划表达式：`0 20 */2 * *`（UTC）= CST 每两天 04:00
        </p>
      </section>
    </div>
  );
}
