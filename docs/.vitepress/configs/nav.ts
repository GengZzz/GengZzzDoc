import type { DefaultTheme } from 'vitepress';

export const nav: DefaultTheme.NavItem[] = [
  { text: '首页', link: '/' },
  {
    text: '前端',
    items: [
      {
        text: '基础',
        items: [
          { text: 'HTML', link: '/frontend/html/' },
          { text: 'CSS3', link: '/frontend/css3/' },
          { text: 'JavaScript', link: '/frontend/javascript/' },
          { text: 'TypeScript', link: '/frontend/typescript/' },
        ],
      },
      {
        text: '框架',
        items: [
          { text: 'Vue', link: '/frontend/vue/' },
          { text: 'React', link: '/frontend/react/' },
        ],
      },
      {
        text: '工程',
        items: [{ text: 'Vite', link: '/frontend/vite/' }],
      },
    ],
  },
  {
    text: '后端',
    items: [
      {
        text: '编程语言',
        items: [
          { text: 'C', link: '/backend/c/' },
          { text: 'C++', link: '/backend/cpp/' },
          { text: 'Java', link: '/backend/java/' },
          { text: 'C#', link: '/backend/csharp/' },
          { text: 'Python', link: '/backend/python/' },
          { text: 'PHP', link: '/backend/php/' },
        ],
      },
      {
        text: '框架',
        items: [
          { text: 'Spring', link: '/backend/framework/spring/' },
          { text: 'Spring Boot', link: '/backend/framework/springboot/' },
          { text: 'MyBatis', link: '/backend/framework/mybatis/' },
          { text: 'MyBatis-Plus', link: '/backend/framework/mybatisplus/' },
          { text: 'Laravel', link: '/backend/framework/laravel/' },
          { text: 'ThinkPHP', link: '/backend/framework/thinkphp/' },
        ],
      },
    ],
  },
  {
    text: '数据库',
    items: [
      {
        text: '关系型',
        items: [
          { text: 'MySQL', link: '/database/mysql/' },
          { text: 'PostgreSQL', link: '/database/postgresql/' },
        ],
      },
      {
        text: 'NoSQL',
        items: [
          { text: 'Redis', link: '/database/redis/' },
          { text: 'MongoDB', link: '/database/mongodb/' },
          { text: 'Elasticsearch', link: '/database/elasticsearch/' },
        ],
      },
    ],
  },
  {
    text: '工程化',
    items: [
      {
        text: 'CI/CD',
        items: [
          { text: '概览', link: '/cicd/' },
          { text: 'GitHub Actions', link: '/cicd/github-actions' },
          { text: 'Gitee Pages', link: '/cicd/gitee-pages' },
          { text: '部署清单', link: '/cicd/deploy-checklist' },
        ],
      },
      {
        text: '工具',
        items: [
          { text: 'Git', link: '/tools/git' },
          { text: 'Docker', link: '/tools/docker' },
          { text: 'npm', link: '/tools/npm' },
          { text: 'yarn', link: '/tools/yarn' },
          { text: 'pnpm', link: '/tools/pnpm' },
          { text: 'nvm', link: '/tools/nvm' },
          { text: 'nrm', link: '/tools/nrm' },
        ],
      },
      {
        text: '插件',
        items: [{ text: '概览', link: '/plugins/' }],
      },
    ],
  },
  {
    text: 'AI',
    items: [
      {
        text: '基础概念',
        items: [
          { text: 'AI 入门', link: '/ai/' },
          { text: '大语言模型', link: '/ai/llm' },
          { text: '核心参数', link: '/ai/parameters' },
        ],
      },
      {
        text: 'Prompt',
        items: [
          { text: '基础技巧', link: '/ai/prompt-basics' },
          { text: '进阶技巧', link: '/ai/prompt-advanced' },
        ],
      },
      {
        text: 'Agent',
        items: [{ text: '概念与实战', link: '/ai/agent' }],
      },
      {
        text: 'AI 工具',
        items: [
          { text: 'Codex', link: '/ai/codex' },
          { text: 'Claude', link: '/ai/claude' },
          { text: 'Gemini', link: '/ai/gemini' },
          { text: 'OpenCode', link: '/ai/opencode' },
          { text: 'OpenClaw', link: '/ai/openclaw' },
          { text: 'Hermes', link: '/ai/hermes' },
        ],
      },
      {
        text: '工程实践',
        items: [
          { text: 'API 接入', link: '/ai/api-integration' },
          { text: '成本与安全', link: '/ai/cost-security' },
        ],
      },
    ],
  },
  {
    text: '架构',
    items: [
      {
        text: '工程能力',
        items: [
          { text: '总览', link: '/architecture/' },
          { text: '系统设计', link: '/architecture/system-design' },
          { text: '分布式与中间件', link: '/architecture/distributed' },
          { text: '安全', link: '/architecture/security' },
          { text: '测试', link: '/architecture/testing' },
          { text: '可观测性', link: '/architecture/observability' },
        ],
      },
    ],
  },
  {
    text: '计算机基础',
    items: [
      {
        text: '408 专题',
        items: [
          { text: '操作系统', link: '/os/operating-system/' },
          { text: '组成原理', link: '/os/computer-organization/' },
          { text: '数据结构', link: '/os/data-structures/' },
          { text: '计算机网络', link: '/os/computer-networks/' },
        ],
      },
    ],
  },
  { text: '导航', link: '/nav/' },
];
