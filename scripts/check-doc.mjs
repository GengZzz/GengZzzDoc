// 单篇文档健壮性自检（AI harness 的「验证回路」一环）。
// 对照 site-doc-author 的单篇 checklist，做可机检的项：
//   - frontmatter title + description（硬性，缺失 = error）
//   - 至少一个 H2 小节
//   - 有「取舍/对比/误区」类信号（取舍段、warning 容器或选型表）
//   - 有「延伸阅读/参考」或外链
//   - 代码块是否标注语言
// index 页与建设中/重定向页只校验 frontmatter。
//
// 用法：
//   node scripts/check-doc.mjs                      # 扫描全部 docs
//   node scripts/check-doc.mjs docs/ai/x.md a.md    # 只查指定文件
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'public') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const files = args.length ? args : walk('docs');

let errors = 0;
let warned = 0;

function stripFrontmatter(raw) {
  if (!raw.startsWith('---')) return { fm: '', body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { fm: '', body: raw };
  return { fm: raw.slice(0, end), body: raw.slice(end + 4) };
}

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const { fm, body } = stripFrontmatter(raw);
  const issues = [];

  // 硬性：frontmatter（首页 layout: home 豁免）
  const isHome = /\blayout:\s*home/.test(fm);
  if (!isHome) {
    const hasFm = raw.startsWith('---');
    const hasTitle = /\btitle:\s*\S/.test(fm);
    const hasDesc = /\bdescription:\s*\S/.test(fm);
    if (!hasFm || !hasTitle || !hasDesc) {
      issues.push(['error', '缺少 frontmatter title/description']);
    }
  }

  const isIndex = basename(file) === 'index.md';
  const isStubLike = /🚧|建设中|旧链接兼容入口/.test(body);

  if (!isIndex && !isStubLike) {
    if (!/^##\s/m.test(body)) issues.push(['warn', '没有 H2 小节，结构偏薄']);

    const hasTradeoff =
      /(取舍|权衡|对比|选型|边界|误区|什么时候不|注意事项)/.test(body) ||
      /:::\s*(warning|danger)/.test(body) ||
      /\|\s*-+\s*\|/.test(body);
    if (!hasTradeoff) issues.push(['warn', '未见取舍/对比/误区信号（原则一·深意）']);

    const hasFurther = /^#{2,3}\s.*(延伸|参考|相关)/m.test(body) || /\]\(https?:\/\//.test(body);
    if (!hasFurther) issues.push(['warn', '未见延伸阅读/参考链接']);

    // 逐行跟踪围栏状态，只检查「开围栏」是否带语言
    let inFence = false;
    let bareFence = false;
    for (const line of body.split('\n')) {
      const m = line.match(/^\s*(```|~~~)(.*)$/);
      if (!m) continue;
      if (!inFence) {
        inFence = true;
        if (!m[2].trim()) bareFence = true; // 开围栏后无语言标注
      } else {
        inFence = false;
      }
    }
    if (bareFence) issues.push(['warn', '存在未标注语言的代码块']);
  }

  if (issues.length) {
    console.log(`\n${file}`);
    for (const [level, msg] of issues) {
      console.log(`  ${level === 'error' ? '✗' : '⚠'} ${msg}`);
      if (level === 'error') errors++;
      else warned++;
    }
  }
}

console.log(`\n检查 ${files.length} 篇：${errors} 个错误，${warned} 个提醒。`);
if (errors) {
  console.log('存在硬性问题（frontmatter），请修复。');
  process.exit(1);
}
