import { defineConfig } from 'vitepress';
import { nav } from './configs/nav';
import { sidebar } from './configs/sidebar';

const giteeIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2Zm4.84 7.78h-6.46a.86.86 0 0 0-.86.86v1.16h5.34c.48 0 .86.39.86.86v.72a3.44 3.44 0 0 1-3.44 3.44H8.9a2.58 2.58 0 0 1-2.58-2.58V10.4A3.44 3.44 0 0 1 9.76 6.96h7.08c.48 0 .86.39.86.86v1.5a.86.86 0 0 1-.86.86Zm-7.32 4.42v.42c0 .47.39.86.86.86h1.9c.63 0 1.17-.43 1.31-1.02l.06-.26H9.52Z"/>
</svg>`;

export default defineConfig({
  title: 'GengZzzDoc',
  description: '一份持续维护的技术文档',
  lang: 'zh-CN',
  base: '/GengZzzDoc/',
  cleanUrls: true,
  ignoreDeadLinks: true,
  lastUpdated: true,
  markdown: {
    languages: [
      { name: 'il', scopeName: 'text.il', embeddedLangs: [] },
      { name: 'gitignore', scopeName: 'text.gitignore', embeddedLangs: [] },
    ],
    languageAlias: {
      conf: 'ini',
    },
  },
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/GengZzzDoc/logo.svg' }]],
  themeConfig: {
    logo: '/logo.svg',
    nav,
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/GengZzz' },
      { icon: { svg: giteeIcon }, link: 'https://gitee.com/GengZzz', ariaLabel: 'Gitee' },
    ],
    footer: {
      copyright: 'Copyright © 2026 GengZzz',
    },
    search: {
      provider: 'local',
    },
    lastUpdatedText: '最后更新',
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    outline: {
      level: 'deep',
      label: '本页目录',
    },
  },
});
