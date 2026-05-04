<script setup lang="ts">
import { computed, ref } from 'vue'

const step = ref(0)
const totalSteps = 5

const descriptions = [
  '服务端：socket() 创建套接字 → bind() 绑定地址 → listen() 开始监听',
  '客户端：connect() 发起连接请求，触发 TCP 三次握手',
  '服务端：accept() 接受连接，返回新的已连接套接字',
  '数据传输：send() / recv() 双向通信',
  'close() 关闭连接，触发 TCP 四次挥手'
]

const serverSteps = [
  ['int fd = socket(AF_INET, SOCK_STREAM, 0);', 'bind(fd, (struct sockaddr*)&addr, len);', 'listen(fd, 128);'],
  ['// 等待客户端连接...', ''],
  ['int conn = accept(fd, ...);', '// conn 是已连接描述符'],
  ['send(conn, "Hello", 5, 0);', 'recv(conn, buf, sizeof(buf), 0);'],
  ['close(conn);', 'close(fd);']
]

const clientSteps = [
  ['// 客户端尚未启动', ''],
  ['int fd = socket(AF_INET, SOCK_STREAM, 0);', 'connect(fd, (struct sockaddr*)&addr, len);'],
  ['// 连接已建立'],
  ['send(fd, "Hi", 2, 0);', 'recv(fd, buf, sizeof(buf), 0);'],
  ['close(fd);']
]

const handshakeLabels = [
  '',
  'SYN →\n← SYN+ACK\nACK →',
  '',
  '',
  'FIN →\n← ACK\n← FIN\nACK →'
]

const activeLines = computed(() => {
  const s = step.value
  return {
    server: serverSteps[s] || [],
    client: clientSteps[s] || [],
    handshake: handshakeLabels[s],
    serverActive: s >= 0,
    clientActive: s >= 1
  }
})

function next() {
  step.value = (step.value + 1) % totalSteps
}

function reset() {
  step.value = 0
}
</script>

<template>
  <div class="socket-demo">
    <div class="step-indicator">
      步骤 {{ step + 1 }} / {{ totalSteps }}
    </div>
    <p class="desc">{{ descriptions[step] }}</p>
    <div class="panels">
      <section class="server" :class="{ active: activeLines.serverActive }">
        <h4>Server</h4>
        <div class="code-block">
          <div v-for="(line, i) in activeLines.server" :key="i" class="code-line">{{ line }}</div>
        </div>
      </section>
      <section class="handshake">
        <pre v-if="activeLines.handshake" class="shake-label">{{ activeLines.handshake }}</pre>
        <div v-else class="shake-placeholder">...</div>
      </section>
      <section class="client" :class="{ active: activeLines.clientActive }">
        <h4>Client</h4>
        <div class="code-block">
          <div v-for="(line, i) in activeLines.client" :key="i" class="code-line">{{ line }}</div>
        </div>
      </section>
    </div>
    <div class="state-bar">
      <span class="tag" :class="{ on: step >= 0 }">socket</span>
      <span class="tag" :class="{ on: step >= 1 }">connect</span>
      <span class="tag" :class="{ on: step >= 2 }">accept</span>
      <span class="tag" :class="{ on: step >= 3 }">transfer</span>
      <span class="tag" :class="{ on: step >= 4 }">close</span>
    </div>
    <div class="actions">
      <button type="button" @click="next">下一步</button>
      <button type="button" @click="reset">重置</button>
    </div>
  </div>
</template>

<style scoped>
.socket-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.step-indicator {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}

.desc {
  margin: 0 0 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.panels {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: start;
}

.server h4 {
  color: #8b5cf6;
  margin: 0 0 8px;
}

.client h4 {
  color: #10b981;
  margin: 0 0 8px;
}

.code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 10px 12px;
  border-radius: 6px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  min-height: 80px;
}

.code-line {
  line-height: 1.6;
}

.server .code-block {
  border: 1px solid #8b5cf633;
}

.client .code-block {
  border: 1px solid #10b98133;
}

.server:not(.active) .code-block {
  opacity: 0.4;
}

.client:not(.active) .code-block {
  opacity: 0.4;
}

.handshake {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;
}

.shake-label {
  font-size: 12px;
  color: #f59e0b;
  white-space: pre-line;
  text-align: center;
  line-height: 1.5;
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
}

.shake-placeholder {
  font-size: 24px;
  color: var(--vp-c-text-2);
}

.state-bar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tag {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-border);
  transition: all 0.2s;
}

.tag.on {
  background: var(--vp-c-brand-1);
  color: #fff;
  border-color: var(--vp-c-brand-1);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
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

@media (max-width: 560px) {
  .panels {
    grid-template-columns: 1fr;
  }
  .handshake {
    min-height: 60px;
  }
}
</style>
