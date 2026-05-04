<script setup lang="ts">
import { computed, ref } from 'vue'

const selectedNode = ref<number | null>(null)
const scenario = ref<'normal' | 'election' | 'rebalance' | 'split'>('normal')

interface ShardInfo {
  name: string
  type: 'primary' | 'replica'
  index: string
}

interface NodeInfo {
  id: number
  name: string
  role: string
  shards: ShardInfo[]
}

const nodes = computed<NodeInfo[]>(() => {
  if (scenario.value === 'normal') {
    return [
      {
        id: 1, name: 'node-1', role: 'Master-eligible / Data',
        shards: [
          { name: 'P1', type: 'primary', index: 'orders' },
          { name: 'R2', type: 'replica', index: 'orders' },
          { name: 'P3', type: 'primary', index: 'orders' }
        ]
      },
      {
        id: 2, name: 'node-2', role: 'Master-eligible / Data',
        shards: [
          { name: 'P2', type: 'primary', index: 'orders' },
          { name: 'R1', type: 'replica', index: 'orders' },
          { name: 'R3', type: 'replica', index: 'orders' }
        ]
      },
      {
        id: 3, name: 'node-3', role: 'Master-eligible / Data',
        shards: [
          { name: 'R1', type: 'replica', index: 'products' },
          { name: 'P1', type: 'primary', index: 'products' }
        ]
      }
    ]
  }
  if (scenario.value === 'election') {
    return [
      {
        id: 1, name: 'node-1', role: 'Master (已当选)',
        shards: [
          { name: 'P1', type: 'primary', index: 'orders' }
        ]
      },
      {
        id: 2, name: 'node-2', role: 'Master-eligible / Data',
        shards: [
          { name: 'P2', type: 'primary', index: 'orders' },
          { name: 'R1', type: 'replica', index: 'orders' }
        ]
      },
      {
        id: 3, name: 'node-3', role: 'Master-eligible / Data',
        shards: [
          { name: 'R2', type: 'replica', index: 'orders' },
          { name: 'P3', type: 'primary', index: 'orders' }
        ]
      }
    ]
  }
  if (scenario.value === 'rebalance') {
    return [
      {
        id: 1, name: 'node-1', role: 'Data (Hot)',
        shards: [
          { name: 'P1', type: 'primary', index: 'logs' },
          { name: 'P2', type: 'primary', index: 'logs' },
          { name: 'R3', type: 'replica', index: 'logs' }
        ]
      },
      {
        id: 2, name: 'node-2', role: 'Data (Hot)',
        shards: [
          { name: 'P3', type: 'primary', index: 'logs' },
          { name: 'R1', type: 'replica', index: 'logs' },
          { name: 'R2', type: 'replica', index: 'logs' }
        ]
      },
      {
        id: 3, name: 'node-3', role: 'Data (Warm)',
        shards: [
          { name: 'P1_old', type: 'primary', index: 'logs-2025' },
          { name: 'P2_old', type: 'primary', index: 'logs-2025' }
        ]
      }
    ]
  }
  // Split brain
  return [
    {
      id: 1, name: 'node-1', role: 'Master (脑裂-主)',
      shards: [
        { name: 'P1', type: 'primary', index: 'orders' },
        { name: 'P2', type: 'primary', index: 'orders' }
      ]
    },
    {
      id: 2, name: 'node-2', role: 'Master (脑裂-从)',
      shards: [
        { name: 'R1', type: 'replica', index: 'orders' },
        { name: 'R2', type: 'replica', index: 'orders' }
      ]
    },
    {
      id: 3, name: 'node-3', role: 'Master (脑裂-从)',
      shards: [
        { name: 'P3', type: 'primary', index: 'orders' },
        { name: 'R3', type: 'replica', index: 'orders' }
      ]
    }
  ]
})

const scenarioDescriptions: Record<string, string> = {
  normal: '3 节点集群，分片均匀分布，node-1 为 Master',
  election: 'Master 选举过程：需要 quorum（多数派）票数',
  rebalance: '新节点加入后，分片自动再平衡',
  split: '网络分区导致脑裂：两个 Master 各自管理部分数据'
}

function selectNode(id: number) {
  selectedNode.value = selectedNode.value === id ? null : id
}

const selectedNodeInfo = computed(() => {
  if (selectedNode.value === null) return null
  return nodes.value.find(n => n.id === selectedNode.value)
})
</script>

<template>
  <div class="cluster-demo">
    <div class="scenario-tabs">
      <button
        v-for="s in (['normal', 'election', 'rebalance', 'split'] as const)"
        :key="s"
        :class="{ active: scenario === s }"
        @click="scenario = s; selectedNode = null"
      >
        {{ { normal: '集群架构', election: 'Master 选举', rebalance: 'Rebalance', split: '脑裂' }[s] }}
      </button>
    </div>

    <div class="desc">{{ scenarioDescriptions[scenario] }}</div>

    <!-- Nodes Grid -->
    <div class="nodes-grid" :class="{ 'split-brain': scenario === 'split' }">
      <div
        v-for="node in nodes"
        :key="node.id"
        class="node-card"
        :class="{
          selected: selectedNode === node.id,
          master: node.role.includes('Master'),
          split: scenario === 'split'
        }"
        @click="selectNode(node.id)"
      >
        <div class="node-header">
          <span class="node-icon" :class="{ 'is-master': node.role.includes('Master') }">
            {{ node.role.includes('Master') ? 'M' : 'D' }}
          </span>
          <span class="node-name">{{ node.name }}</span>
        </div>
        <div class="node-role">{{ node.role }}</div>
        <div class="shard-list">
          <div
            v-for="(shard, si) in node.shards"
            :key="si"
            class="shard-chip"
            :class="shard.type"
          >
            {{ shard.name }}
            <small>{{ shard.index }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Network partition line for split brain -->
    <div v-if="scenario === 'split'" class="partition-line">
      <span>网络分区</span>
    </div>

    <!-- Selected Node Detail -->
    <div v-if="selectedNodeInfo" class="node-detail">
      <h4>{{ selectedNodeInfo.name }} 详情</h4>
      <div class="detail-row">
        <span class="detail-label">角色：</span>
        <span>{{ selectedNodeInfo.role }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Shard 数：</span>
        <span>{{ selectedNodeInfo.shards.length }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Primary：</span>
        <span>{{ selectedNodeInfo.shards.filter(s => s.type === 'primary').length }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Replica：</span>
        <span>{{ selectedNodeInfo.shards.filter(s => s.type === 'replica').length }}</span>
      </div>
    </div>

    <!-- Election Steps -->
    <div v-if="scenario === 'election'" class="election-steps">
      <div class="election-step"><span class="badge">1</span> 节点启动，发现种子节点（discovery.seed_hosts）</div>
      <div class="election-step"><span class="badge">2</span> 节点互相 Ping，交换信息</div>
      <div class="election-step"><span class="badge">3</span> 投票选举 Master（Zen2 基于 Term，类似 Raft）</div>
      <div class="election-step"><span class="badge">4</span> 得到 quorum = (3/2)+1 = 2 票的节点当选</div>
      <div class="election-step"><span class="badge">5</span> Master 广播 Cluster State，其他节点加入</div>
    </div>

    <!-- Split Brain Warning -->
    <div v-if="scenario === 'split'" class="split-warning">
      <strong>脑裂风险</strong>
      <p>Node1 与其他节点断开后，自行选举为 Master。Node2 和 Node3 继续认为 Node2 是 Master。两个 Master 各自接受写入，导致数据不一致。</p>
      <p><strong>防护措施：</strong>使用 3 个专用 Master 节点 + Zen2 协议（quorum 机制自动防止脑裂）。</p>
    </div>
  </div>
</template>

<style scoped>
.cluster-demo {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}

.scenario-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.scenario-tabs button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
}

.scenario-tabs button.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: #fff;
}

.desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.nodes-grid.split-brain {
  grid-template-columns: 1fr 1fr;
}

.nodes-grid.split-brain .node-card:first-child {
  grid-column: 1;
}

.node-card {
  border: 2px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: all 0.3s;
}

.node-card:hover {
  border-color: var(--vp-c-brand-1);
}

.node-card.selected {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.2);
}

.node-card.master {
  border-color: #f59e0b;
}

.node-card.split {
  border-color: #ef4444;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.node-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  background: #dbeafe;
  color: #1e40af;
}

.node-icon.is-master {
  background: #fef3c7;
  color: #b45309;
}

.node-name {
  font-weight: 600;
  font-size: 14px;
}

.node-role {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}

.shard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.shard-chip {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.shard-chip.primary {
  background: #fee2e2;
  color: #dc2626;
}

.shard-chip.replica {
  background: #dcfce7;
  color: #16a34a;
}

.shard-chip small {
  font-weight: 400;
  margin-left: 4px;
  opacity: 0.7;
}

.partition-line {
  text-align: center;
  padding: 8px;
  margin-bottom: 12px;
  border: 2px dashed #ef4444;
  border-radius: 6px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
}

.node-detail {
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--vp-c-bg);
}

.node-detail h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.detail-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  padding: 2px 0;
}

.detail-label {
  color: var(--vp-c-text-2);
  min-width: 60px;
}

.election-steps {
  margin-bottom: 12px;
}

.election-step {
  padding: 6px 0;
  font-size: 13px;
}

.badge {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  color: #fff;
  text-align: center;
  line-height: 20px;
  font-size: 11px;
  margin-right: 6px;
}

.split-warning {
  border: 1px solid #ef4444;
  border-radius: 6px;
  padding: 12px;
  background: #fef2f2;
  font-size: 13px;
  color: #991b1b;
}

.split-warning p {
  margin: 6px 0 0;
}

@media (max-width: 560px) {
  .nodes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
