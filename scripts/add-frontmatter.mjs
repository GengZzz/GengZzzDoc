// 维护脚本：为缺少 frontmatter 的文档补 title + description 草稿。
// title 取自首个 H1；description 取自首段正文，清洗 markdown 后截断。
// 已有 frontmatter 的文件跳过。生成的是草稿，建议人工过一遍。
//
// 用法：node scripts/add-frontmatter.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DRY = process.argv.includes('--dry');
const MAX_DESC = 110;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.vitepress' || name === 'public') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

function cleanInline(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 -> 文本
    .replace(/`([^`]*)`/g, '$1') // 行内代码
    .replace(/\*\*([^*]*)\*\*/g, '$1') // 粗体
    .replace(/\*([^*]*)\*/g, '$1') // 斜体
    .replace(/[_~]/g, '')
    .replace(/<[^>]+>/g, '') // 内联 html
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text) {
  if (text.length <= MAX_DESC) return text;
  const slice = text.slice(0, MAX_DESC);
  // 优先在句读处截断
  const m = slice.match(/^[\s\S]*[。！？；，,.!?;]/);
  if (m && m[0].length >= MAX_DESC * 0.5) return m[0].replace(/[，,；;]\s*$/, '。');
  return slice.trim() + '…';
}

function extract(md) {
  const lines = md.split('\n');
  let title = '';
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+?)\s*$/);
    if (m) {
      title = cleanInline(m[1])
        .replace(/（旧入口）|\(旧入口\)/g, '')
        .trim();
      i++;
      break;
    }
  }
  // 找首段正文
  let desc = '';
  let inFence = false;
  for (; i < lines.length; i++) {
    let l = lines[i];
    if (/^```|^~~~/.test(l.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const t = l.trim();
    if (!t) continue;
    if (/^#{1,6}\s/.test(t)) continue; // 标题
    if (/^:::/.test(t)) continue; // 容器
    if (/^>/.test(t)) continue; // 引用
    if (/^[-*+]\s|^\d+\.\s/.test(t)) {
      // 无正文段，用首个列表项兜底
      desc = cleanInline(t.replace(/^[-*+]\s|^\d+\.\s/, ''));
      break;
    }
    if (/^\|/.test(t)) continue; // 表格
    desc = cleanInline(t);
    break;
  }
  return { title, desc };
}

const files = walk('docs');
let changed = 0;
const skipped = [];
for (const f of files) {
  const raw = readFileSync(f, 'utf8');

  if (raw.startsWith('---')) {
    // 已有 frontmatter：若缺 title/description 则补进去（home 布局除外）
    const close = raw.indexOf('\n---', 3);
    if (close === -1) continue;
    const fmBlock = raw.slice(0, close);
    const rest = raw.slice(close); // 含结尾 ---
    if (/\blayout:\s*home/.test(fmBlock)) continue; // 首页无需 title/description
    const needTitle = !/\btitle:\s*\S/.test(fmBlock);
    const needDesc = !/\bdescription:\s*\S/.test(fmBlock);
    if (!needTitle && !needDesc) continue;
    const { title, desc } = extract(raw.slice(close + 4));
    if (!title) {
      skipped.push(f + ' (无 H1)');
      continue;
    }
    let injected = '';
    if (needTitle) injected += `title: ${JSON.stringify(title)}\n`;
    if (needDesc) injected += `description: ${JSON.stringify(truncate(desc || title))}\n`;
    if (!DRY) writeFileSync(f, fmBlock + '\n' + injected + rest.slice(1), 'utf8');
    changed++;
    continue;
  }

  const { title, desc } = extract(raw);
  if (!title) {
    skipped.push(f + ' (无 H1)');
    continue;
  }
  const description = truncate(desc || title);
  const fm =
    `---\n` +
    `title: ${JSON.stringify(title)}\n` +
    `description: ${JSON.stringify(description)}\n` +
    `---\n\n`;
  if (!DRY) writeFileSync(f, fm + raw, 'utf8');
  changed++;
}
console.log(`${DRY ? '[dry] ' : ''}已处理 ${changed} 个文件`);
if (skipped.length) console.log(`跳过(无 H1) ${skipped.length} 个:\n` + skipped.join('\n'));
