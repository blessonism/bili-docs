#!/usr/bin/env python3
"""Generate MDX files from bili-transcripts for Fumadocs."""
import json, os, re, datetime

DATA_DIR = "/root/projects/bili-transcripts/data"
OUTPUT_DIR = "/root/projects/bili-docs-v2/content/docs"

CAT_SLUG = {
    "人情世故": "social-wisdom", "学业考试": "study-exam",
    "影视娱乐": "entertainment", "技术工具": "tech-tools",
    "深度内容": "deep-content", "生活方式": "lifestyle",
    "职业发展": "career", "认知成长": "cognitive-growth",
}
CAT_EMOJI = {
    "人情世故": "🎭", "学业考试": "📚", "影视娱乐": "🎬", "技术工具": "💻",
    "深度内容": "🌍", "生活方式": "🏡", "职业发展": "💼", "认知成长": "🧠",
}
CAT_DESC = {
    "人情世故": "恋爱关系、社交沟通、职场人际、饭局酒局",
    "学业考试": "公考、大学课程、学术科研、英语学习",
    "影视娱乐": "影视解说、综艺脱口秀、音乐ASMR",
    "技术工具": "AI应用、效率工具、编程开发、设计创作",
    "深度内容": "人物访谈、投资理财、社会观察、行业洞察",
    "生活方式": "摄影拍照、数码好物、生活技巧、美食烹饪",
    "职业发展": "创业商业、求职面试、职业规划、职场成长",
    "认知成长": "哲学思辨、心理自我、思维方法",
}
SUB_SLUG = {
    "恋爱关系": "love", "社交沟通": "social", "职场人际": "workplace-social",
    "饭局酒局": "dining", "公考": "civil-exam", "大学课程": "college",
    "学术科研": "research", "英语": "english", "影视解说": "film-review",
    "综艺脱口秀": "variety-show", "音乐ASMR": "music-asmr",
    "AI 应用": "ai-apps", "AI应用": "ai-apps", "效率工具": "productivity",
    "编程开发": "programming", "设计创作": "design", "人物访谈": "interview",
    "投资理财": "investment", "社会观察": "society", "行业洞察": "industry",
    "摄影拍照": "photography", "数码好物": "digital-gear", "生活技巧": "life-hacks",
    "美食烹饪": "cooking", "创业商业": "entrepreneurship", "求职面试": "job-interview",
    "职业规划": "career-planning", "职场成长": "career-growth",
    "哲学思辨": "philosophy", "心理自我": "psychology", "思维方法": "thinking",
}

def strip_emoji(text):
    return re.sub(r'^[\U0001F300-\U0001FAFF\U00002702-\U000027B0\U0000FE00-\U0000FE0F\U0000200D]+\s*', '', text).strip()

def norm_sub(s):
    return re.sub(r'（.*?）', '', s).strip()

def get_transcript(bvid):
    for d in ["transcripts_polished", "transcripts_asr", "transcripts"]:
        p = os.path.join(DATA_DIR, d, f"{bvid}.txt")
        if os.path.exists(p):
            with open(p, "rb") as f:
                return f.read().decode("utf-8", errors="replace").strip()
    return None

def fmt_dur(s):
    if s >= 3600:
        return f"{s//3600}h{(s%3600)//60:02d}m"
    return f"{s//60}:{s%60:02d}"

def escape_yaml(s):
    s = s.replace('\\', '\\\\').replace('"', '\\"')
    return s

def fmt_ts(ts):
    """Unix timestamp → YYYY-MM-DD，无效返回空字符串"""
    if isinstance(ts, (int, float)) and ts > 0:
        return datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
    return ""

def main():
    with open(os.path.join(DATA_DIR, "classified/classification.json")) as f:
        data = json.load(f)

    # Load videos.json for fav_time (not in classification.json)
    fav_time_map = {}
    videos_path = os.path.join(DATA_DIR, "videos.json")
    if os.path.exists(videos_path):
        with open(videos_path) as f:
            for v in json.load(f):
                bvid = v.get("bvid", "")
                if bvid and v.get("fav_time"):
                    fav_time_map[bvid] = v["fav_time"]

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    stats = {"total": 0, "skipped": 0, "cats": {}}

    for v in data["videos"]:
        cl = v.get("classification", {})
        pc = strip_emoji(cl.get("primary_category", ""))
        sc = norm_sub(cl.get("sub_category", ""))
        cs = CAT_SLUG.get(pc)
        ss = SUB_SLUG.get(sc)
        if not cs or not ss:
            stats["skipped"] += 1
            continue

        transcript = get_transcript(v["bvid"])
        if not transcript or len(transcript) < 20:
            stats["skipped"] += 1
            continue

        out_dir = os.path.join(OUTPUT_DIR, cs, ss)
        os.makedirs(out_dir, exist_ok=True)

        title = escape_yaml(v["title"])
        summary = escape_yaml(cl.get("summary", ""))
        upper = v.get("upper", "")
        dur = fmt_dur(v.get("duration", 0))
        link = v.get("link", f"https://www.bilibili.com/video/{v['bvid']}")
        tags = cl.get("tags", [])
        pub_date = fmt_ts(v.get("pubdate", 0))
        fav_date = fmt_ts(v.get("fav_time", 0) or fav_time_map.get(v["bvid"], 0))

        # Escape MDX special chars in transcript (JSX expressions)
        safe_transcript = transcript.replace('{', '\\{').replace('}', '\\}')
        # Escape bare < that aren't part of markdown links/html
        safe_transcript = re.sub(r'<(?!/|a |br|hr|img |div |span |p>|p |ul|ol|li|table|tr|td|th|h[1-6]|!--)', r'\\<', safe_transcript)

        lines = [
            '---',
            f'title: "{title}"',
            f'description: "{summary}"',
        ]
        if pub_date:
            lines.append(f'pubDate: "{pub_date}"')
        if fav_date:
            lines.append(f'favDate: "{fav_date}"')
        lines += [
            '---',
            '',
        ]

        # Build info line
        info_parts = [f'**UP主**: {upper}', f'**时长**: {dur}']
        if pub_date:
            info_parts.append(f'**发布**: {pub_date}')
        if fav_date:
            info_parts.append(f'**收录**: {fav_date}')
        info_parts.append(f'[🔗 B站原视频]({link})')

        lines += [
            f'> {" · ".join(info_parts)}',
            '>',
            f'> **标签**: {" · ".join(tags)}' if tags else '',
            '',
            safe_transcript,
            '',
        ]

        mdx_path = os.path.join(out_dir, f"{v['bvid'].lower()}.mdx")
        content = '\n'.join(lines)
        # Final safety: remove any surrogate chars
        content = content.encode("utf-8", errors="replace").decode("utf-8")
        with open(mdx_path, "w", encoding="utf-8") as f:
            f.write(content)

        key = f"{pc}/{sc}"
        stats["cats"][key] = stats["cats"].get(key, 0) + 1
        stats["total"] += 1

    # Generate meta.json files
    cat_subs = {}  # cat_slug -> {sub_slug: sub_name}
    for cs_dir in os.listdir(OUTPUT_DIR):
        cs_path = os.path.join(OUTPUT_DIR, cs_dir)
        if not os.path.isdir(cs_path) or cs_dir.startswith('.'):
            continue
        cat_subs[cs_dir] = {}
        for ss_dir in os.listdir(cs_path):
            ss_path = os.path.join(cs_path, ss_dir)
            if not os.path.isdir(ss_path):
                continue
            # Find the sub_name from reverse lookup
            sub_name = ss_dir
            for k, v in SUB_SLUG.items():
                if v == ss_dir:
                    sub_name = k
                    break
            cat_subs[cs_dir][ss_dir] = sub_name

            # Sub-category meta.json
            mdx_files = sorted([fn.replace(".mdx", "") for fn in os.listdir(ss_path) if fn.endswith(".mdx")])
            with open(os.path.join(ss_path, "meta.json"), "w", encoding="utf-8") as f:
                json.dump({"title": sub_name, "pages": mdx_files}, f, ensure_ascii=False, indent=2)

    # Category meta.json
    slug_to_name = {v: k for k, v in CAT_SLUG.items()}
    for cs, subs in cat_subs.items():
        cat_name = slug_to_name.get(cs, cs)
        emoji = CAT_EMOJI.get(cat_name, "")
        with open(os.path.join(OUTPUT_DIR, cs, "meta.json"), "w", encoding="utf-8") as f:
            json.dump({"title": f"{emoji} {cat_name}", "pages": sorted(subs.keys())}, f, ensure_ascii=False, indent=2)

    # Root meta.json
    ordered = ["social-wisdom", "study-exam", "entertainment", "tech-tools", "deep-content", "lifestyle", "career", "cognitive-growth"]
    root_pages = [s for s in ordered if s in cat_subs]
    with open(os.path.join(OUTPUT_DIR, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({"title": "文稿库", "pages": root_pages}, f, ensure_ascii=False, indent=2)

    # Category stats for homepage
    cat_stats = []
    for cat_name in ["人情世故", "学业考试", "影视娱乐", "技术工具", "深度内容", "生活方式", "职业发展", "认知成长"]:
        count = sum(v for k, v in stats["cats"].items() if k.startswith(cat_name))
        if count > 0:
            cat_stats.append({
                "name": cat_name, "slug": CAT_SLUG[cat_name],
                "emoji": CAT_EMOJI[cat_name], "description": CAT_DESC[cat_name],
                "count": count,
            })
    with open("/root/projects/bili-docs-v2/lib/categories.json", "w", encoding="utf-8") as f:
        json.dump(cat_stats, f, ensure_ascii=False, indent=2)

    print(f"Generated {stats['total']} MDX files, skipped {stats['skipped']}")
    for k in sorted(stats["cats"]):
        print(f"  {k}: {stats['cats'][k]}")

if __name__ == "__main__":
    main()
