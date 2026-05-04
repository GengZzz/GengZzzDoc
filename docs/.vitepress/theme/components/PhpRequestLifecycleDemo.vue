<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 7

const steps = [
  {
    title: 'Nginx 接收请求',
    icon: '🌐',
    detail: '客户端发送 HTTP 请求到 Nginx，Nginx 根据 location ~ \\.php$ 将请求通过 FastCGI 协议转发给 PHP-FPM',
    nodes: [
      { name: 'Client', role: '发送 HTTP GET /api/users', active: true },
      { name: 'Nginx', role: '解析请求 → 匹配 location 规则', active: true },
      { name: 'PHP-FPM', role: '等待 FastCGI 请求', active: false }
    ]
  },
  {
    title: 'PHP-FPM Worker 启动',
    icon: '⚙️',
    detail: 'PHP-FPM master 进程将请求分配给空闲 worker，worker 加载 php.ini 配置并检查 OPcache 缓存',
    nodes: [
      { name: 'PHP-FPM Master', role: '分配请求给空闲 Worker', active: true },
      { name: 'Worker', role: '加载 php.ini + 检查 OPcache', active: true },
      { name: 'OPcache', role: '返回缓存的 Opcodes', active: true }
    ]
  },
  {
    title: 'Laravel 入口',
    icon: '📂',
    detail: '请求进入 public/index.php，Composer autoload 加载依赖，创建 Application 容器实例，注册核心服务提供者',
    nodes: [
      { name: 'index.php', role: '引导文件入口', active: true },
      { name: 'Autoload', role: 'PSR-4 自动加载', active: true },
      { name: 'Application', role: '服务容器实例化', active: true }
    ]
  },
  {
    title: '中间件管道',
    icon: '🧅',
    detail: 'HTTP Kernel 将请求送入中间件管道（洋葱模型）：HandleCors → Auth → Throttle → 控制器',
    nodes: [
      { name: 'HandleCors', role: '跨域检查', active: true },
      { name: 'Auth', role: '身份认证', active: true },
      { name: 'Throttle', role: '请求限流', active: true },
      { name: 'Controller', role: '业务处理', active: true }
    ]
  },
  {
    title: '路由匹配与控制器',
    icon: '🎯',
    detail: 'Router 匹配路由定义，解析参数，调用控制器方法。控制器可能通过 Eloquent 查询数据库',
    nodes: [
      { name: 'Router', role: 'GET /api/users → UserController@index', active: true },
      { name: 'Controller', role: '调用业务逻辑', active: true },
      { name: 'Eloquent', role: '查询数据库 N+1?', active: true }
    ]
  },
  {
    title: '响应返回',
    icon: '📤',
    detail: '控制器返回 Response 对象，沿中间件洋葱外层逐层返回，最终通过 FastCGI → Nginx → 客户端',
    nodes: [
      { name: 'Controller', role: '返回 JsonResponse', active: true },
      { name: 'Middleware', role: '洋葱外层：添加 Header', active: true },
      { name: 'Nginx', role: '发送响应给客户端', active: true }
    ]
  },
  {
    title: 'Worker 回收',
    icon: '♻️',
    detail: '请求处理完毕，PHP-FPM Worker 清理状态并回到空闲池，等待下一个请求。可复用进程，避免频繁创建销毁',
    nodes: [
      { name: 'Worker', role: '清理变量、关闭连接', active: true },
      { name: 'Pool', role: '回到空闲队列', active: true },
      { name: 'Master', role: '监控 Worker 状态', active: false }
    ]
  }
]

const current = computed(() => steps[step.value])

function next() {
  if (step.value < totalSteps - 1) step.value++
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="lifecycle-demo">
    <div class="step-indicator">
      <span
        v-for="i in totalSteps"
        :key="i"
        class="dot"
        :class="{ active: step === i - 1 }"
      />
    </div>

    <div class="step-header">
      <span class="icon">{{ current.icon }}</span>
      <h4>{{ current.title }}</h4>
    </div>

    <p class="detail">{{ current.detail }}</p>

    <div class="nodes">
      <div
        v-for="node in current.nodes"
        :key="node.name"
        class="node"
        :class="{ active: node.active }"
      >
        <div class="node-name">{{ node.name }}</div>
        <div class="node-role">{{ node.role }}</div>
      </div>
    </div>

    <div class="flow-bar">
      <span v-for="i in totalSteps" :key="i" class="flow-segment" :class="{ filled: step >= i - 1 }">
        {{ i }}
      </span>
    </div>

    <div class="actions">
      <button type="button" @click="next" :disabled="step >= totalSteps - 1">下一步</button>
      <button type="button" @click="reset">重置</button>
      <span class="step-label">{{ step + 1 }} / {{ totalSteps }}</span>
    </div>
  </div>
</template>

<style scoped>
.lifecycle-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-border);
  transition: background 0.3s;
}

.dot.active {
  background: var(--vp-c-brand-1);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.icon {
  font-size: 20px;
}

.step-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--vp-c-text-1);
}

.detail {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
  line-height: 1.6;
}

.nodes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.node {
  padding: 10px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  transition: border-color 0.3s;
}

.node.active {
  border-color: var(--vp-c-brand-1);
}

.node-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.node-role {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.flow-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.flow-segment {
  flex: 1;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  border: 1px solid var(--vp-c-border);
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  transition: all 0.3s;
}

.flow-segment.filled {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-left: auto;
}
</style>
