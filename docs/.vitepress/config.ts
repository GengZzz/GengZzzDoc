import { defineConfig } from 'vitepress'

const giteeIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2Zm4.84 7.78h-6.46a.86.86 0 0 0-.86.86v1.16h5.34c.48 0 .86.39.86.86v.72a3.44 3.44 0 0 1-3.44 3.44H8.9a2.58 2.58 0 0 1-2.58-2.58V10.4A3.44 3.44 0 0 1 9.76 6.96h7.08c.48 0 .86.39.86.86v1.5a.86.86 0 0 1-.86.86Zm-7.32 4.42v.42c0 .47.39.86.86.86h1.9c.63 0 1.17-.43 1.31-1.02l.06-.26H9.52Z"/>
</svg>`

export default defineConfig({
  title: 'GengZzzDoc',
  description: '一份持续维护的技术文档',
  lang: 'zh-CN',
  base: '/GengZzzDoc/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '前端', link: '/frontend/' },
      {
        text: '服务端',
        items: [
          { text: 'C', link: '/backend/c/' },
          { text: 'C++', link: '/backend/cpp/' },
          { text: 'Java', link: '/backend/java/' },
          { text: 'Python', link: '/backend/python/' }
        ]
      },
      { text: '数据库', link: '/database/' },
      { text: 'CICD', link: '/cicd/' },
      { text: '插件', link: '/plugins/' },
      { text: '操作系统', link: '/os/' },
      { text: '工具', link: '/tools/' },
      { text: 'AI', link: '/ai/' },
      { text: '其他', link: '/other/' }
    ],
    sidebar: {
      '/backend/c/': [
        {
          text: 'C',
          items: [
            { text: '概览', link: '/backend/c/' },
            { text: '语言基础', link: '/backend/c/language-basics' },
            { text: '内存管理', link: '/backend/c/memory-management' },
            { text: '网络编程', link: '/backend/c/network-programming' },
            { text: '工程实践', link: '/backend/c/engineering-practice' }
          ]
        }
      ],
      '/backend/java/': [
        {
          text: 'Java',
          items: [
            { text: '概览', link: '/backend/java/' },
            { text: '语言基础', link: '/backend/java/language-basics' },
            { text: '集合与泛型', link: '/backend/java/collections-generics' },
            { text: '并发编程', link: '/backend/java/concurrency' },
            { text: 'JVM', link: '/backend/java/jvm' },
            { text: 'Spring Boot', link: '/backend/spring-boot' }
          ]
        }
      ],
      '/backend/python/': [
        {
          text: 'Python',
          items: [
            { text: '概览', link: '/backend/python/' },
            { text: '语言基础', link: '/backend/python/language-basics' },
            { text: 'Web 服务', link: '/backend/python/web-service' },
            { text: '自动化脚本', link: '/backend/python/automation' },
            { text: '工程实践', link: '/backend/python/engineering-practice' }
          ]
        }
      ],
      '/backend/': [
        {
          text: '服务端',
          collapsed: false,
          items: [
            { text: '概览', link: '/backend/' },
            { text: 'C', link: '/backend/c/' },
            { text: 'C++', link: '/backend/cpp/' },
            { text: 'Java', link: '/backend/java/' },
            { text: 'Python', link: '/backend/python/' },
            { text: '接口设计', link: '/backend/api-design' }
          ]
        }
      ],
      '/frontend/': [
        {
          text: '前端',
          collapsed: false,
          items: [
            { text: '概览', link: '/frontend/' },
            { text: 'Vue', link: '/frontend/vue' },
            { text: 'TypeScript', link: '/frontend/typescript' },
            { text: 'Vite', link: '/frontend/vite' }
          ]
        }
      ],
      '/database/': [
        {
          text: '数据库',
          collapsed: true,
          items: [
            { text: '概览', link: '/database/' },
            { text: 'MySQL', link: '/database/mysql' },
            { text: 'Redis', link: '/database/redis' },
            { text: 'MongoDB', link: '/database/mongodb' },
            { text: 'PostgreSQL', link: '/database/postgresql' }
          ]
        }
      ],
      '/cicd/': [
        {
          text: 'CICD',
          collapsed: true,
          items: [
            { text: '概览', link: '/cicd/' },
            { text: 'GitHub Actions', link: '/cicd/github-actions' },
            { text: 'Gitee Pages', link: '/cicd/gitee-pages' },
            { text: '部署清单', link: '/cicd/deploy-checklist' }
          ]
        }
      ],
      '/plugins/': [
        {
          text: '插件',
          collapsed: true,
          items: [
            { text: '概览', link: '/plugins/' }
          ]
        }
      ],
      '/os/': [
        {
          text: '操作系统',
          collapsed: true,
          items: [
            { text: '概览', link: '/os/' },
            { text: 'Windows', link: '/os/windows' },
            { text: 'Linux', link: '/os/linux' }
          ]
        }
      ],
      '/tools/': [
        {
          text: '工具',
          collapsed: true,
          items: [
            { text: '概览', link: '/tools/' },
            { text: 'Git', link: '/tools/git' },
            { text: 'Docker', link: '/tools/docker' }
          ]
        }
      ],
      '/ai/': [
        {
          text: 'AI',
          collapsed: true,
          items: [
            { text: '概览', link: '/ai/' },
            { text: '模型基础', link: '/ai/model-basics' },
            { text: 'Prompt', link: '/ai/prompt' },
            { text: 'Agent', link: '/ai/agent' }
          ]
        }
      ],
      '/other/': [
        {
          text: '其他',
          collapsed: true,
          items: [
            { text: '概览', link: '/other/' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/GengZzz' },
      { icon: { svg: giteeIcon }, link: 'https://gitee.com/GengZzz', ariaLabel: 'Gitee' }
    ],
    footer: {
      copyright: 'Copyright © 2026 GengZzz'
    },
    search: {
      provider: 'local'
    },
    lastUpdatedText: '最后更新',
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    outline: {
      level: 'deep',
      label: '本页目录'
    }
  }
})
