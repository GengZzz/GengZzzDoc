<script setup lang="ts">
import { computed, ref } from 'vue'

type SiteItem = {
  title: string
  desc: string
  link: string
  color: string
}

type SiteGroup = {
  name: string
  desc: string
  items: SiteItem[]
}

const groups: SiteGroup[] = [
  {
    name: '前端开发',
    desc: '框架、语言、构建、测试与浏览器兼容性。',
    items: [
      { title: 'MDN', desc: 'Web 标准与浏览器 API。', link: 'https://developer.mozilla.org/', color: '#2563eb' },
      { title: 'Vue', desc: 'Vue 官方文档。', link: 'https://vuejs.org/', color: '#10b981' },
      { title: 'Vite', desc: '前端构建工具。', link: 'https://vite.dev/', color: '#8b5cf6' },
      { title: 'TypeScript', desc: '类型系统与语言文档。', link: 'https://www.typescriptlang.org/docs/', color: '#3178c6' },
      { title: 'React', desc: 'React 官方学习资料。', link: 'https://react.dev/', color: '#06b6d4' },
      { title: 'Next.js', desc: 'React 全栈框架。', link: 'https://nextjs.org/docs', color: '#111827' },
      { title: 'Nuxt', desc: 'Vue 全栈框架。', link: 'https://nuxt.com/docs', color: '#00dc82' },
      { title: 'Tailwind CSS', desc: '实用优先 CSS 框架。', link: 'https://tailwindcss.com/docs', color: '#38bdf8' },
      { title: 'Element Plus', desc: 'Vue 组件库。', link: 'https://element-plus.org/', color: '#409eff' },
      { title: 'Ant Design Vue', desc: '企业级 Vue 组件库。', link: 'https://antdv.com/', color: '#1677ff' },
      { title: 'Vitest', desc: 'Vite 原生测试框架。', link: 'https://vitest.dev/', color: '#6e9f18' },
      { title: 'Playwright', desc: '端到端测试工具。', link: 'https://playwright.dev/', color: '#22c55e' },
      { title: 'ESLint', desc: 'JavaScript 代码检查。', link: 'https://eslint.org/', color: '#4b32c3' },
      { title: 'Prettier', desc: '代码格式化工具。', link: 'https://prettier.io/', color: '#ec4899' },
      { title: 'Can I use', desc: '浏览器兼容性查询。', link: 'https://caniuse.com/', color: '#f59e0b' },
      { title: 'UnoCSS', desc: '即时原子化 CSS 引擎。', link: 'https://unocss.dev/', color: '#334155' }
    ]
  },
  {
    name: '服务端开发',
    desc: '后端框架、接口、构建工具与服务治理资料。',
    items: [
      { title: 'Spring Boot', desc: 'Spring Boot 官方文档。', link: 'https://spring.io/projects/spring-boot', color: '#6db33f' },
      { title: 'Java', desc: 'Java 平台文档。', link: 'https://docs.oracle.com/en/java/', color: '#f97316' },
      { title: 'Maven', desc: 'Java 项目构建工具。', link: 'https://maven.apache.org/', color: '#c026d3' },
      { title: 'Gradle', desc: '自动化构建工具。', link: 'https://docs.gradle.org/', color: '#0f766e' },
      { title: 'Node.js', desc: 'Node.js 官方文档。', link: 'https://nodejs.org/docs/latest/api/', color: '#16a34a' },
      { title: 'NestJS', desc: 'Node.js 服务端框架。', link: 'https://docs.nestjs.com/', color: '#e11d48' },
      { title: 'FastAPI', desc: 'Python API 框架。', link: 'https://fastapi.tiangolo.com/', color: '#059669' },
      { title: 'Django', desc: 'Python Web 框架。', link: 'https://docs.djangoproject.com/', color: '#14532d' },
      { title: 'Go', desc: 'Go 语言官方文档。', link: 'https://go.dev/doc/', color: '#0ea5e9' },
      { title: 'Rust', desc: 'Rust 语言学习资料。', link: 'https://www.rust-lang.org/learn', color: '#b45309' },
      { title: 'OpenAPI', desc: '接口规范文档。', link: 'https://swagger.io/specification/', color: '#16a34a' },
      { title: 'Postman', desc: '接口调试与协作。', link: 'https://learning.postman.com/docs/', color: '#ff6c37' },
      { title: 'Express', desc: 'Node Web 框架。', link: 'https://expressjs.com/', color: '#374151' },
      { title: 'Gin', desc: 'Go Web 框架。', link: 'https://gin-gonic.com/docs/', color: '#06b6d4' },
      { title: 'Actix', desc: 'Rust Web 框架。', link: 'https://actix.rs/docs/', color: '#ef4444' },
      { title: 'Swagger', desc: '接口文档与调试工具。', link: 'https://swagger.io/tools/', color: '#85ea2d' }
    ]
  },
  {
    name: '数据库与数据',
    desc: '数据库、缓存、搜索、ORM 与数据库工具。',
    items: [
      { title: 'MySQL', desc: 'MySQL 官方文档。', link: 'https://dev.mysql.com/doc/', color: '#0f766e' },
      { title: 'PostgreSQL', desc: 'PostgreSQL 官方文档。', link: 'https://www.postgresql.org/docs/', color: '#336791' },
      { title: 'Redis', desc: '缓存与数据结构文档。', link: 'https://redis.io/docs/latest/', color: '#dc2626' },
      { title: 'MongoDB', desc: '文档数据库文档。', link: 'https://www.mongodb.com/docs/', color: '#16a34a' },
      { title: 'SQLite', desc: '轻量数据库文档。', link: 'https://www.sqlite.org/docs.html', color: '#0ea5e9' },
      { title: 'Elastic', desc: '搜索与分析引擎。', link: 'https://www.elastic.co/guide/', color: '#f59e0b' },
      { title: 'ClickHouse', desc: '列式分析数据库。', link: 'https://clickhouse.com/docs', color: '#eab308' },
      { title: 'Prisma', desc: 'TypeScript ORM。', link: 'https://www.prisma.io/docs', color: '#111827' },
      { title: 'MyBatis', desc: 'Java 持久层框架。', link: 'https://mybatis.org/mybatis-3/', color: '#b91c1c' },
      { title: 'Hibernate', desc: 'Java ORM 框架。', link: 'https://hibernate.org/orm/documentation/', color: '#6b7280' },
      { title: 'Supabase', desc: 'Postgres 后端平台。', link: 'https://supabase.com/docs', color: '#10b981' },
      { title: 'DBeaver', desc: '通用数据库工具。', link: 'https://dbeaver.com/docs/dbeaver/', color: '#92400e' },
      { title: 'MariaDB', desc: 'MariaDB 官方文档。', link: 'https://mariadb.com/kb/en/documentation/', color: '#7c3aed' },
      { title: 'TypeORM', desc: 'TypeScript ORM。', link: 'https://typeorm.io/', color: '#f97316' },
      { title: 'Sequelize', desc: 'Node.js ORM。', link: 'https://sequelize.org/docs/v6/', color: '#2563eb' },
      { title: 'PlanetScale', desc: '云原生 MySQL 平台。', link: 'https://planetscale.com/docs', color: '#334155' }
    ]
  },
  {
    name: '工程工具',
    desc: '版本控制、容器、编辑器、包管理与效率工具。',
    items: [
      { title: 'Git', desc: '版本控制文档。', link: 'https://git-scm.com/doc', color: '#f05032' },
      { title: 'GitHub', desc: '代码托管与协作。', link: 'https://docs.github.com/', color: '#111827' },
      { title: 'Gitee', desc: '代码托管与国内协作。', link: 'https://gitee.com/help', color: '#c71d23' },
      { title: 'Docker', desc: '容器与镜像文档。', link: 'https://docs.docker.com/', color: '#2496ed' },
      { title: 'Kubernetes', desc: '容器编排文档。', link: 'https://kubernetes.io/docs/', color: '#326ce5' },
      { title: 'Nginx', desc: 'Web 服务器文档。', link: 'https://nginx.org/en/docs/', color: '#009639' },
      { title: 'VS Code', desc: '编辑器文档。', link: 'https://code.visualstudio.com/docs', color: '#007acc' },
      { title: 'JetBrains', desc: 'IDE 帮助文档。', link: 'https://www.jetbrains.com/help/', color: '#7c3aed' },
      { title: 'npm', desc: 'Node 包管理器。', link: 'https://docs.npmjs.com/', color: '#cb3837' },
      { title: 'pnpm', desc: '高性能包管理器。', link: 'https://pnpm.io/motivation', color: '#f59e0b' },
      { title: 'PowerShell', desc: 'Shell 与自动化文档。', link: 'https://learn.microsoft.com/powershell/', color: '#2563eb' },
      { title: 'Regex101', desc: '正则表达式调试。', link: 'https://regex101.com/', color: '#0f766e' },
      { title: 'Yarn', desc: '包管理器文档。', link: 'https://yarnpkg.com/getting-started', color: '#2563eb' },
      { title: 'Homebrew', desc: 'macOS 包管理器。', link: 'https://docs.brew.sh/', color: '#fbbf24' },
      { title: 'Carbon', desc: '代码图片生成。', link: 'https://carbon.now.sh/', color: '#111827' },
      { title: 'Excalidraw', desc: '手绘风图表工具。', link: 'https://excalidraw.com/', color: '#8b5cf6' }
    ]
  },
  {
    name: 'AI 与模型',
    desc: '模型、提示词、Agent、论文与 AI 工具链。',
    items: [
      { title: 'OpenAI Docs', desc: '模型与 API 文档。', link: 'https://platform.openai.com/docs', color: '#0f766e' },
      { title: 'ChatGPT', desc: 'ChatGPT 产品入口。', link: 'https://chatgpt.com/', color: '#10a37f' },
      { title: 'Hugging Face', desc: '模型与数据集社区。', link: 'https://huggingface.co/', color: '#f59e0b' },
      { title: 'Papers with Code', desc: '论文、代码与榜单。', link: 'https://paperswithcode.com/', color: '#2563eb' },
      { title: 'arXiv', desc: '论文预印本平台。', link: 'https://arxiv.org/', color: '#b91c1c' },
      { title: 'LangChain', desc: 'LLM 应用开发框架。', link: 'https://python.langchain.com/docs/', color: '#16a34a' },
      { title: 'LlamaIndex', desc: '数据增强 LLM 应用框架。', link: 'https://docs.llamaindex.ai/', color: '#7c3aed' },
      { title: 'Ollama', desc: '本地模型运行工具。', link: 'https://ollama.com/', color: '#111827' },
      { title: 'ModelScope', desc: '模型与应用社区。', link: 'https://www.modelscope.cn/', color: '#2563eb' },
      { title: '智谱 AI', desc: 'GLM 模型与开放平台。', link: 'https://open.bigmodel.cn/', color: '#2563eb' },
      { title: 'DeepSeek', desc: 'DeepSeek 产品与 API。', link: 'https://www.deepseek.com/', color: '#334155' },
      { title: 'Replicate', desc: '模型部署与调用平台。', link: 'https://replicate.com/docs', color: '#111827' },
      { title: 'Claude', desc: 'Claude 产品入口。', link: 'https://claude.ai/', color: '#b45309' },
      { title: 'Gemini', desc: 'Google AI 产品入口。', link: 'https://gemini.google.com/', color: '#4285f4' },
      { title: '通义千问', desc: '通义模型产品入口。', link: 'https://tongyi.aliyun.com/', color: '#7c3aed' },
      { title: '魔搭文档', desc: 'ModelScope 使用文档。', link: 'https://modelscope.cn/docs', color: '#0ea5e9' }
    ]
  },
  {
    name: '学习资料',
    desc: '技术社区、课程、学习路线与文档聚合。',
    items: [
      { title: '掘金', desc: '中文技术社区。', link: 'https://juejin.cn/', color: '#1e80ff' },
      { title: 'InfoQ', desc: '技术新闻与架构实践。', link: 'https://www.infoq.cn/', color: '#0ea5e9' },
      { title: '阮一峰博客', desc: '技术文章与周刊。', link: 'https://www.ruanyifeng.com/blog/', color: '#0f766e' },
      { title: 'Stack Overflow', desc: '开发问答社区。', link: 'https://stackoverflow.com/', color: '#f97316' },
      { title: 'LeetCode', desc: '算法练习平台。', link: 'https://leetcode.cn/', color: '#f59e0b' },
      { title: 'freeCodeCamp', desc: '免费编程学习。', link: 'https://www.freecodecamp.org/', color: '#334155' },
      { title: 'Codecademy', desc: '交互式编程学习。', link: 'https://www.codecademy.com/', color: '#7c3aed' },
      { title: 'Coursera', desc: '在线课程平台。', link: 'https://www.coursera.org/', color: '#2563eb' },
      { title: 'MIT OCW', desc: 'MIT 开放课程。', link: 'https://ocw.mit.edu/', color: '#b91c1c' },
      { title: 'Roadmap.sh', desc: '开发者学习路线。', link: 'https://roadmap.sh/', color: '#8b5cf6' },
      { title: 'DevDocs', desc: '聚合式开发文档。', link: 'https://devdocs.io/', color: '#111827' },
      { title: '中文技术文档', desc: '中文文档索引。', link: 'https://docschina.org/', color: '#0f766e' },
      { title: 'W3Schools', desc: 'Web 入门参考。', link: 'https://www.w3schools.com/', color: '#16a34a' },
      { title: 'CSS Tricks', desc: 'CSS 技巧与文章。', link: 'https://css-tricks.com/', color: '#ec4899' },
      { title: 'Smashing', desc: '前端设计与开发文章。', link: 'https://www.smashingmagazine.com/', color: '#dc2626' },
      { title: 'edX', desc: '开放在线课程。', link: 'https://www.edx.org/', color: '#dc2626' }
    ]
  },
  {
    name: '设计资源',
    desc: '设计工具、图标、配色、图片和灵感资源。',
    items: [
      { title: 'Figma', desc: '协作式界面设计工具。', link: 'https://www.figma.com/', color: '#a259ff' },
      { title: 'Dribbble', desc: '视觉设计作品社区。', link: 'https://dribbble.com/', color: '#ea4c89' },
      { title: 'Behance', desc: '创意作品展示平台。', link: 'https://www.behance.net/', color: '#1769ff' },
      { title: 'Mobbin', desc: '移动端界面参考库。', link: 'https://mobbin.com/', color: '#111827' },
      { title: 'Awwwards', desc: '优秀网站设计案例。', link: 'https://www.awwwards.com/', color: '#111827' },
      { title: 'Lucide', desc: '开源线性图标库。', link: 'https://lucide.dev/', color: '#f97316' },
      { title: 'Iconify', desc: '图标集合与搜索。', link: 'https://iconify.design/', color: '#1769aa' },
      { title: 'Heroicons', desc: 'Tailwind 官方图标。', link: 'https://heroicons.com/', color: '#38bdf8' },
      { title: 'Unsplash', desc: '免费高质量图片。', link: 'https://unsplash.com/', color: '#111827' },
      { title: 'Pexels', desc: '免费图片与视频素材。', link: 'https://www.pexels.com/', color: '#05a081' },
      { title: 'Coolors', desc: '配色方案生成工具。', link: 'https://coolors.co/', color: '#06b6d4' },
      { title: 'Color Hunt', desc: '精选配色方案。', link: 'https://colorhunt.co/', color: '#f43f5e' },
      { title: 'Google Fonts', desc: '开源字体资源。', link: 'https://fonts.google.com/', color: '#4285f4' },
      { title: 'Fontshare', desc: '免费商用字体。', link: 'https://www.fontshare.com/', color: '#111827' },
      { title: 'Shots', desc: '快速生成产品截图。', link: 'https://shots.so/', color: '#8b5cf6' },
      { title: 'Haikei', desc: 'SVG 背景生成工具。', link: 'https://haikei.app/', color: '#14b8a6' }
    ]
  },
  {
    name: '云服务',
    desc: '云平台、部署、监控、域名与静态站点服务。',
    items: [
      { title: 'Vercel', desc: '前端应用部署平台。', link: 'https://vercel.com/docs', color: '#111827' },
      { title: 'Netlify', desc: '静态站点与函数部署。', link: 'https://docs.netlify.com/', color: '#00ad9f' },
      { title: 'Cloudflare', desc: 'CDN、DNS 与边缘服务。', link: 'https://developers.cloudflare.com/', color: '#f38020' },
      { title: 'AWS', desc: '亚马逊云服务文档。', link: 'https://docs.aws.amazon.com/', color: '#ff9900' },
      { title: 'Azure', desc: '微软云服务文档。', link: 'https://learn.microsoft.com/azure/', color: '#0078d4' },
      { title: 'Google Cloud', desc: 'Google 云平台文档。', link: 'https://cloud.google.com/docs', color: '#4285f4' },
      { title: '阿里云', desc: '阿里云官方文档。', link: 'https://help.aliyun.com/', color: '#ff6a00' },
      { title: '腾讯云', desc: '腾讯云官方文档。', link: 'https://cloud.tencent.com/document', color: '#2563eb' },
      { title: '华为云', desc: '华为云官方文档。', link: 'https://support.huaweicloud.com/', color: '#dc2626' },
      { title: 'Railway', desc: '应用托管平台。', link: 'https://docs.railway.app/', color: '#7c3aed' },
      { title: 'Render', desc: '云应用部署平台。', link: 'https://render.com/docs', color: '#46e3b7' },
      { title: 'Fly.io', desc: '全球应用部署平台。', link: 'https://fly.io/docs/', color: '#8b5cf6' },
      { title: 'Sentry', desc: '错误监控与性能追踪。', link: 'https://docs.sentry.io/', color: '#362d59' },
      { title: 'Grafana', desc: '监控与可视化平台。', link: 'https://grafana.com/docs/', color: '#f97316' },
      { title: 'UptimeRobot', desc: '站点可用性监控。', link: 'https://uptimerobot.com/', color: '#16a34a' },
      { title: 'Namecheap', desc: '域名注册与管理。', link: 'https://www.namecheap.com/support/', color: '#f97316' }
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
  'AWS': 'aws.amazon.com',
  'Azure': 'azure.microsoft.com',
  'Google Cloud': 'cloud.google.com',
  'Cloudflare': 'cloudflare.com',
  'Railway': 'railway.app',
  'Sentry': 'sentry.io',
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
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="22" fill="${item.color}"/>
      <circle cx="70" cy="24" r="18" fill="rgba(255,255,255,.22)"/>
      <path d="M18 66 C32 44, 46 82, 78 48" fill="none" stroke="rgba(255,255,255,.72)" stroke-width="8" stroke-linecap="round"/>
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
  <section class="directory-page">
    <div class="directory-hero">
      <p>站点导航</p>
      <h1>开发者常用站点</h1>
      <span>沉淀高频工具与优质资料，让查找更快，让学习更连续。</span>
    </div>

    <div class="directory-tabs" role="tablist" aria-label="站点导航分类">
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

    <div class="directory-section">
      <div class="directory-section-heading">
        <div>
          <h2>{{ activeGroup.name }}</h2>
          <p>{{ activeGroup.desc }}</p>
        </div>
        <span>{{ activeGroup.items.length }} 个站点</span>
      </div>

      <div class="directory-grid">
        <a
          v-for="item in activeGroup.items"
          :key="`${activeGroup.name}-${item.title}`"
          class="directory-card"
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
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
