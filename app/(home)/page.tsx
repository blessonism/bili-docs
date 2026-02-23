import Link from 'next/link';
export const revalidate = 3600;
import categories from '@/lib/categories.json';

export default function HomePage() {
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">📚 文稿库</h1>
          <p className="text-fd-muted-foreground text-lg">
            收录 {total} 篇 B 站视频文稿，按内容分类整理
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/docs/${cat.slug}`}
              className="group flex flex-col rounded-xl border bg-fd-card p-6 transition-all hover:bg-fd-accent hover:shadow-md"
            >
              <div className="text-3xl mb-3">{cat.emoji}</div>
              <h2 className="font-semibold text-lg mb-1">{cat.name}</h2>
              <p className="text-sm text-fd-muted-foreground mb-3 flex-1">
                {cat.description}
              </p>
              <span className="text-xs font-medium text-fd-muted-foreground">
                {cat.count} 篇文稿
              </span>
            </Link>
          ))}
        </div>
        <div className="text-center mt-12 text-sm text-fd-muted-foreground">
          基于 B 站收藏夹自动生成 · 支持全文搜索
        </div>
      </div>
    </main>
  );
}
