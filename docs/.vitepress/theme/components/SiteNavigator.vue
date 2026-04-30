<script setup lang="ts">
import { withBase } from 'vitepress'
import { computed, ref } from 'vue'

type SiteItem = {
  title: string
  desc: string
  link: string
  mark?: string
  color: string
}

type SiteGroup = {
  name: string
  items: SiteItem[]
}

const groups: SiteGroup[] = [
  {
    name: '前端',
    items: [
      { title: 'MDN', desc: 'Web 标准与浏览器 API。', link: 'https://developer.mozilla.org/', mark: 'MDN', color: '#2563eb' },
      { title: 'Vue', desc: 'Vue 官方文档。', link: 'https://vuejs.org/', mark: 'Vue', color: '#10b981' },
      { title: 'Vite', desc: '前端构建工具。', link: 'https://vite.dev/', mark: 'Vite', color: '#8b5cf6' },
      { title: 'TypeScript', desc: '类型系统与语言文档。', link: 'https://www.typescriptlang.org/docs/', mark: 'TS', color: '#3178c6' },
      { title: 'React', desc: 'React 官方学习资料。', link: 'https://react.dev/', mark: 'R', color: '#06b6d4' },
      { title: 'Next.js', desc: 'React 全栈框架。', link: 'https://nextjs.org/docs', mark: 'N', color: '#111827' },
      { title: 'Nuxt', desc: 'Vue 全栈框架。', link: 'https://nuxt.com/docs', mark: 'Nuxt', color: '#00dc82' },
      { title: 'Tailwind CSS', desc: '实用优先 CSS 框架。', link: 'https://tailwindcss.com/docs', mark: 'TW', color: '#38bdf8' },
      { title: 'UnoCSS', desc: '即时原子化 CSS 引擎。', link: 'https://unocss.dev/', mark: 'Uno', color: '#334155' },
      { title: 'Element Plus', desc: 'Vue 组件库。', link: 'https://element-plus.org/', mark: 'EP', color: '#409eff' },
      { title: 'Ant Design Vue', desc: '企业级 Vue 组件库。', link: 'https://antdv.com/', mark: 'Ant', color: '#1677ff' },
      { title: 'Can I use', desc: '浏览器兼容性查询。', link: 'https://caniuse.com/', mark: 'Can', color: '#f59e0b' },
      { title: 'Vitest', desc: 'Vite 原生测试框架。', link: 'https://vitest.dev/', mark: 'Vit', color: '#6e9f18' },
      { title: 'Playwright', desc: '端到端测试工具。', link: 'https://playwright.dev/', mark: 'PW', color: '#22c55e' },
      { title: 'ESLint', desc: 'JavaScript 代码检查。', link: 'https://eslint.org/', mark: 'ES', color: '#4b32c3' },
      { title: 'Prettier', desc: '代码格式化工具。', link: 'https://prettier.io/', mark: 'P', color: '#ec4899' }
    ]
  },
  {
    name: '服务端',
    items: [
      { title: 'Spring Boot', desc: 'Spring Boot 官方文档。', link: 'https://spring.io/projects/spring-boot', mark: 'SB', color: '#6db33f' },
      { title: 'Spring', desc: 'Spring 生态入口。', link: 'https://spring.io/', mark: 'S', color: '#5fb832' },
      { title: 'Java', desc: 'Java 平台文档。', link: 'https://docs.oracle.com/en/java/', mark: 'J', color: '#f97316' },
      { title: 'Maven', desc: 'Java 项目构建工具。', link: 'https://maven.apache.org/', mark: 'MVN', color: '#c026d3' },
      { title: 'Gradle', desc: '自动化构建工具。', link: 'https://docs.gradle.org/', mark: 'G', color: '#0f766e' },
      { title: 'Node.js', desc: 'Node.js 官方文档。', link: 'https://nodejs.org/docs/latest/api/', mark: 'Node', color: '#16a34a' },
      { title: 'NestJS', desc: 'Node.js 服务端框架。', link: 'https://docs.nestjs.com/', mark: 'Nest', color: '#e11d48' },
      { title: 'Express', desc: 'Node Web 框架。', link: 'https://expressjs.com/', mark: 'Ex', color: '#374151' },
      { title: 'FastAPI', desc: 'Python API 框架。', link: 'https://fastapi.tiangolo.com/', mark: 'FA', color: '#059669' },
      { title: 'Django', desc: 'Python Web 框架。', link: 'https://docs.djangoproject.com/', mark: 'DJ', color: '#14532d' },
      { title: 'Go', desc: 'Go 语言官方文档。', link: 'https://go.dev/doc/', mark: 'Go', color: '#0ea5e9' },
      { title: 'Gin', desc: 'Go Web 框架。', link: 'https://gin-gonic.com/docs/', mark: 'Gin', color: '#06b6d4' },
      { title: 'Rust', desc: 'Rust 语言学习资料。', link: 'https://www.rust-lang.org/learn', mark: 'RS', color: '#b45309' },
      { title: 'Actix', desc: 'Rust Web 框架。', link: 'https://actix.rs/docs/', mark: 'Act', color: '#ef4444' },
      { title: 'OpenAPI', desc: '接口规范文档。', link: 'https://swagger.io/specification/', mark: 'API', color: '#16a34a' },
      { title: 'Postman', desc: '接口调试与协作。', link: 'https://learning.postman.com/docs/', mark: 'PM', color: '#ff6c37' }
    ]
  },
  {
    name: '数据库',
    items: [
      { title: 'MySQL', desc: 'MySQL 官方文档。', link: 'https://dev.mysql.com/doc/', mark: 'My', color: '#0f766e' },
      { title: 'PostgreSQL', desc: 'PostgreSQL 官方文档。', link: 'https://www.postgresql.org/docs/', mark: 'PG', color: '#336791' },
      { title: 'Redis', desc: '缓存与数据结构文档。', link: 'https://redis.io/docs/latest/', mark: 'R', color: '#dc2626' },
      { title: 'MongoDB', desc: '文档数据库文档。', link: 'https://www.mongodb.com/docs/', mark: 'MDB', color: '#16a34a' },
      { title: 'SQLite', desc: '轻量数据库文档。', link: 'https://www.sqlite.org/docs.html', mark: 'SQL', color: '#0ea5e9' },
      { title: 'MariaDB', desc: 'MariaDB 官方文档。', link: 'https://mariadb.com/kb/en/documentation/', mark: 'Maria', color: '#7c3aed' },
      { title: 'Elastic', desc: '搜索与分析引擎。', link: 'https://www.elastic.co/guide/', mark: 'ES', color: '#f59e0b' },
      { title: 'ClickHouse', desc: '列式分析数据库。', link: 'https://clickhouse.com/docs', mark: 'CH', color: '#eab308' },
      { title: 'Prisma', desc: 'TypeScript ORM。', link: 'https://www.prisma.io/docs', mark: 'Pr', color: '#111827' },
      { title: 'MyBatis', desc: 'Java 持久层框架。', link: 'https://mybatis.org/mybatis-3/', mark: 'MB', color: '#b91c1c' },
      { title: 'Hibernate', desc: 'Java ORM 框架。', link: 'https://hibernate.org/orm/documentation/', mark: 'H', color: '#6b7280' },
      { title: 'Sequelize', desc: 'Node.js ORM。', link: 'https://sequelize.org/docs/v6/', mark: 'Seq', color: '#2563eb' },
      { title: 'TypeORM', desc: 'TypeScript ORM。', link: 'https://typeorm.io/', mark: 'TO', color: '#f97316' },
      { title: 'Supabase', desc: 'Postgres 后端平台。', link: 'https://supabase.com/docs', mark: 'Sup', color: '#10b981' },
      { title: 'PlanetScale', desc: '云原生 MySQL 平台。', link: 'https://planetscale.com/docs', mark: 'PS', color: '#334155' },
      { title: 'DBeaver', desc: '通用数据库工具。', link: 'https://dbeaver.com/docs/dbeaver/', mark: 'DB', color: '#92400e' }
    ]
  },
  {
    name: '工具',
    items: [
      { title: 'Git', desc: '版本控制文档。', link: 'https://git-scm.com/doc', mark: 'Git', color: '#f05032' },
      { title: 'GitHub', desc: '代码托管与协作。', link: 'https://docs.github.com/', mark: 'GH', color: '#111827' },
      { title: 'Gitee', desc: '代码托管与国内协作。', link: 'https://gitee.com/help', mark: 'GE', color: '#c71d23' },
      { title: 'Docker', desc: '容器与镜像文档。', link: 'https://docs.docker.com/', mark: 'D', color: '#2496ed' },
      { title: 'Kubernetes', desc: '容器编排文档。', link: 'https://kubernetes.io/docs/', mark: 'K8s', color: '#326ce5' },
      { title: 'Nginx', desc: 'Web 服务器文档。', link: 'https://nginx.org/en/docs/', mark: 'Nx', color: '#009639' },
      { title: 'VS Code', desc: '编辑器文档。', link: 'https://code.visualstudio.com/docs', mark: 'VS', color: '#007acc' },
      { title: 'JetBrains', desc: 'IDE 帮助文档。', link: 'https://www.jetbrains.com/help/', mark: 'JB', color: '#7c3aed' },
      { title: 'npm', desc: 'Node 包管理器。', link: 'https://docs.npmjs.com/', mark: 'npm', color: '#cb3837' },
      { title: 'pnpm', desc: '高性能包管理器。', link: 'https://pnpm.io/motivation', mark: 'pn', color: '#f59e0b' },
      { title: 'Yarn', desc: '包管理器文档。', link: 'https://yarnpkg.com/getting-started', mark: 'Y', color: '#2563eb' },
      { title: 'Homebrew', desc: 'macOS 包管理器。', link: 'https://docs.brew.sh/', mark: 'Brew', color: '#fbbf24' },
      { title: 'PowerShell', desc: 'Shell 与自动化文档。', link: 'https://learn.microsoft.com/powershell/', mark: 'PS', color: '#2563eb' },
      { title: 'Regex101', desc: '正则表达式调试。', link: 'https://regex101.com/', mark: 'Re', color: '#0f766e' },
      { title: 'Carbon', desc: '代码图片生成。', link: 'https://carbon.now.sh/', mark: 'C', color: '#111827' },
      { title: 'Excalidraw', desc: '手绘风图表工具。', link: 'https://excalidraw.com/', mark: 'Ex', color: '#8b5cf6' }
    ]
  },
  {
    name: 'AI',
    items: [
      { title: 'OpenAI Docs', desc: '模型与 API 文档。', link: 'https://platform.openai.com/docs', mark: 'AI', color: '#0f766e' },
      { title: 'ChatGPT', desc: 'ChatGPT 产品入口。', link: 'https://chatgpt.com/', mark: 'GPT', color: '#10a37f' },
      { title: 'Hugging Face', desc: '模型与数据集社区。', link: 'https://huggingface.co/', mark: 'HF', color: '#f59e0b' },
      { title: 'Papers with Code', desc: '论文、代码与榜单。', link: 'https://paperswithcode.com/', mark: 'PWC', color: '#2563eb' },
      { title: 'arXiv', desc: '论文预印本平台。', link: 'https://arxiv.org/', mark: 'arXiv', color: '#b91c1c' },
      { title: 'LangChain', desc: 'LLM 应用开发框架。', link: 'https://python.langchain.com/docs/', mark: 'LC', color: '#16a34a' },
      { title: 'LlamaIndex', desc: '数据增强 LLM 应用框架。', link: 'https://docs.llamaindex.ai/', mark: 'LI', color: '#7c3aed' },
      { title: 'Ollama', desc: '本地模型运行工具。', link: 'https://ollama.com/', mark: 'Ol', color: '#111827' },
      { title: 'ModelScope', desc: '模型与应用社区。', link: 'https://www.modelscope.cn/', mark: 'MS', color: '#2563eb' },
      { title: '魔搭文档', desc: 'ModelScope 使用文档。', link: 'https://modelscope.cn/docs', mark: 'Doc', color: '#0ea5e9' },
      { title: '通义千问', desc: '通义模型产品入口。', link: 'https://tongyi.aliyun.com/', mark: 'QW', color: '#7c3aed' },
      { title: '智谱 AI', desc: 'GLM 模型与开放平台。', link: 'https://open.bigmodel.cn/', mark: 'GLM', color: '#2563eb' },
      { title: 'DeepSeek', desc: 'DeepSeek 产品与 API。', link: 'https://www.deepseek.com/', mark: 'DS', color: '#334155' },
      { title: 'Claude', desc: 'Claude 产品入口。', link: 'https://claude.ai/', mark: 'Cl', color: '#b45309' },
      { title: 'Gemini', desc: 'Google AI 产品入口。', link: 'https://gemini.google.com/', mark: 'G', color: '#4285f4' },
      { title: 'Replicate', desc: '模型部署与调用平台。', link: 'https://replicate.com/docs', mark: 'Rep', color: '#111827' }
    ]
  },
  {
    name: '学习',
    items: [
      { title: '掘金', desc: '中文技术社区。', link: 'https://juejin.cn/', mark: '掘', color: '#1e80ff' },
      { title: 'InfoQ', desc: '技术新闻与架构实践。', link: 'https://www.infoq.cn/', mark: 'IQ', color: '#0ea5e9' },
      { title: '阮一峰博客', desc: '技术文章与周刊。', link: 'https://www.ruanyifeng.com/blog/', mark: '阮', color: '#0f766e' },
      { title: 'Stack Overflow', desc: '开发问答社区。', link: 'https://stackoverflow.com/', mark: 'SO', color: '#f97316' },
      { title: 'LeetCode', desc: '算法练习平台。', link: 'https://leetcode.cn/', mark: 'LC', color: '#f59e0b' },
      { title: 'freeCodeCamp', desc: '免费编程学习。', link: 'https://www.freecodecamp.org/', mark: 'FCC', color: '#334155' },
      { title: 'Codecademy', desc: '交互式编程学习。', link: 'https://www.codecademy.com/', mark: 'CA', color: '#7c3aed' },
      { title: 'Coursera', desc: '在线课程平台。', link: 'https://www.coursera.org/', mark: 'Co', color: '#2563eb' },
      { title: 'edX', desc: '开放在线课程。', link: 'https://www.edx.org/', mark: 'edX', color: '#dc2626' },
      { title: 'MIT OCW', desc: 'MIT 开放课程。', link: 'https://ocw.mit.edu/', mark: 'MIT', color: '#b91c1c' },
      { title: 'Roadmap.sh', desc: '开发者学习路线。', link: 'https://roadmap.sh/', mark: 'RM', color: '#8b5cf6' },
      { title: 'DevDocs', desc: '聚合式开发文档。', link: 'https://devdocs.io/', mark: 'DD', color: '#111827' },
      { title: '中文技术文档', desc: '中文文档索引。', link: 'https://docschina.org/', mark: '中', color: '#0f766e' },
      { title: 'W3Schools', desc: 'Web 入门参考。', link: 'https://www.w3schools.com/', mark: 'W3', color: '#16a34a' },
      { title: 'CSS Tricks', desc: 'CSS 技巧与文章。', link: 'https://css-tricks.com/', mark: 'CSS', color: '#ec4899' },
      { title: 'Smashing', desc: '前端设计与开发文章。', link: 'https://www.smashingmagazine.com/', mark: 'SM', color: '#dc2626' }
    ]
  }
]

const activeName = ref(groups[0].name)
const activeGroup = computed(() => groups.find((group) => group.name === activeName.value) ?? groups[0])

const iconHostByTitle: Record<string, string> = {
  'GitHub': 'github.com',
  'Java': 'oracle.com',
  'Gradle': 'gradle.org',
  'Node.js': 'nodejs.org',
  'NestJS': 'nestjs.com',
  'Django': 'djangoproject.com',
  'Postman': 'postman.com',
  'MySQL': 'mysql.com',
  'Elastic': 'elastic.co',
  'PowerShell': 'microsoft.com',
  'OpenAI Docs': 'openai.com',
  'LangChain': 'langchain.com',
  'LlamaIndex': 'llamaindex.ai',
  'ModelScope': 'modelscope.cn',
  '魔搭文档': 'modelscope.cn',
  '智谱 AI': 'bigmodel.cn',
  'Gemini': 'google.com',
  '通义千问': 'aliyun.com',
  '腾讯云': 'cloud.tencent.com',
  '阿里云': 'aliyun.com',
  '华为云': 'huaweicloud.com',
  '中文技术文档': 'docschina.org'
}

function hostnameFor(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return link
  }
}

function iconHostFor(item: SiteItem) {
  return iconHostByTitle[item.title] ?? hostnameFor(item.link)
}

function faviconFor(item: SiteItem) {
  return `https://favicon.im/${iconHostFor(item)}?larger=true`
}

function fallbackFaviconFor(item: SiteItem) {
  return `https://icons.duckduckgo.com/ip3/${iconHostFor(item)}.ico`
}

function fallbackImageFor(item: SiteItem) {
  const seed = [...item.title].reduce((total, char) => total + char.charCodeAt(0), 0)
  const cx = 34 + (seed % 28)
  const cy = 24 + (seed % 18)
  const rx = 54 + (seed % 18)
  const ry = 38 + (seed % 16)

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 108">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${item.color}"/>
          <stop offset="1" stop-color="#14b8a6"/>
        </linearGradient>
        <radialGradient id="r" cx=".2" cy=".1" r="1">
          <stop offset="0" stop-color="rgba(255,255,255,.55)"/>
          <stop offset=".68" stop-color="rgba(255,255,255,.12)"/>
          <stop offset="1" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <rect width="180" height="108" rx="18" fill="url(#g)"/>
      <circle cx="${cx}" cy="${cy}" r="42" fill="url(#r)"/>
      <circle cx="146" cy="28" r="22" fill="rgba(255,255,255,.18)"/>
      <path d="M0 ${ry} C38 ${ry - 22}, 70 ${ry + 28}, 112 ${ry + 4} S160 ${ry - 8}, 180 ${ry + 18} V108 H0 Z" fill="rgba(255,255,255,.18)"/>
      <rect x="24" y="68" width="${rx}" height="8" rx="4" fill="rgba(255,255,255,.42)"/>
      <rect x="24" y="84" width="${Math.max(38, rx - 22)}" height="7" rx="3.5" fill="rgba(255,255,255,.28)"/>
    </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function useFallbackImage(event: Event, item: SiteItem) {
  const image = event.target as HTMLImageElement
  const fallback = image.dataset.fallback

  if (fallback) {
    image.dataset.fallback = ''
    image.src = fallback
    return
  }

  image.src = fallbackImageFor(item)
}
</script>

<template>
  <section class="site-navigator" aria-labelledby="site-nav-title">
    <div class="section-heading">
      <h2 id="site-nav-title">站点导航</h2>
      <a class="section-more" :href="withBase('/nav/')" aria-label="查看更多站点导航">
        更多
        <span aria-hidden="true">→</span>
      </a>
    </div>

    <div class="site-tabs" role="tablist" aria-label="网站分类">
      <button
        v-for="group in groups"
        :key="group.name"
        class="site-tab"
        :class="{ active: activeName === group.name }"
        type="button"
        role="tab"
        :aria-selected="activeName === group.name"
        @click="activeName = group.name"
      >
        {{ group.name }}
      </button>
    </div>

    <div class="site-grid">
      <a
        v-for="item in activeGroup.items"
        :key="item.title"
        class="site-card"
        :href="item.link"
        target="_blank"
        rel="noreferrer"
      >
        <div class="site-card-visual">
          <img
            class="site-card-image"
            :src="faviconFor(item)"
            :data-fallback="fallbackFaviconFor(item)"
            :alt="`${item.title} 图标`"
            loading="lazy"
            @error="useFallbackImage($event, item)"
          >
        </div>
        <div class="site-card-body">
          <span>{{ item.title }}</span>
          <p>{{ item.desc }}</p>
        </div>
      </a>
    </div>
  </section>
</template>
