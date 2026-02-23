# bili-docs

B站视频文稿库 — 自动提取 B 站收藏视频的文字稿，分类整理后以文档站形式展示。

## 技术栈

- **前台**: [Next.js 16](https://nextjs.org) + [Fumadocs](https://fumadocs.dev)（静态生成 + ISR，revalidate 60s）
- **CMS**: [Keystatic](https://keystatic.com)（Git-based，本地模式，直接读写 MDX 文件）
- **内容格式**: MDX + YAML frontmatter
- **部署**: VPS + systemd + OpenResty 反代 + Let's Encrypt HTTPS

## 目录结构

```
content/docs/
  ├─ career/              # 职业发展
  ├─ cognitive-growth/    # 认知成长
  ├─ deep-content/        # 深度内容
  ├─ entertainment/       # 影视娱乐
  ├─ lifestyle/           # 生活方式
  ├─ social-wisdom/       # 人情世故
  ├─ study-exam/          # 学业考试
  └─ tech-tools/          # 技术工具
      └─ {subcategory}/
          ├─ bv1xxxxx.mdx   # 单篇文稿（以 BV 号命名）
          └─ meta.json      # 页面排序配置
```

## MDX Frontmatter

```yaml
title: "视频标题"
displayName: "视频标题"       # Keystatic 列表显示用
description: "一句话摘要"
uploader: "UP主名"
duration: "10:30"
bvUrl: "https://www.bilibili.com/video/BV1xxxxx"
tags:
  - "标签1"
  - "标签2"
```

## 本地开发

```bash
pnpm install
pnpm dev
```

- 前台: http://localhost:3000
- Keystatic 管理: http://localhost:3000/keystatic

## 生产部署

```bash
pnpm build
systemctl restart bili-docs-frontend
```

注意：必须先 stop 服务再 build（`next build` 会覆盖 `.next` 目录），或者 `rm -rf .next` 后再 build。

## 线上地址

- 前台: https://bili.sukisq.me
- CMS 管理: https://bili.sukisq.me/keystatic

## 服务架构

```
OpenResty (443/80)
  └─ /* → Next.js :3000 (前台 + Keystatic + API)

systemd: bili-docs-frontend (enabled)
GitHub webhook: :9877 → 自动拉取 + rebuild
```
