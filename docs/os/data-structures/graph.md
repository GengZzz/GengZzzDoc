# 图

图是比树更一般化的非线性结构，任意两个顶点之间都可以有边。408 考试中图是重点章节，考查存储、遍历和经典算法。

## 基本概念

图 G 由顶点集 V 和边集 E 组成，记作 G = (V, E)。

### 分类

| 类型 | 边的性质 | 边数上限 |
|------|---------|---------|
| 无向图 | 边无方向，(v,w) = (w,v) | n(n-1)/2 |
| 有向图 | 边有方向，<v,w> ≠ <w,v> | n(n-1) |
| 简单图 | 无自环、无重边 | — |
| 完全图 | 任意两顶点间都有边 | — |
| 稠密图/稀疏图 | 边数接近/远小于 n² | — |

### 基本术语

| 术语 | 含义 |
|------|------|
| 度 | 与顶点关联的边数 |
| 入度/出度（有向图） | 指向/离开该顶点的边数 |
| 路径 | 顶点序列，相邻顶点间有边 |
| 回路（环） | 起点和终点相同的路径 |
| 连通图 | 任意两顶点间存在路径（无向图） |
| 强连通图 | 任意两顶点间互相可达（有向图） |
| 连通分量 | 无向图的极大连通子图 |
| 强连通分量 | 有向图的极大强连通子图 |
| 生成树 | 包含图所有顶点的极小连通子图 |
| 权/网 | 边上的数值（带权图称为网） |

::: tip 度与边数的关系
无向图：所有顶点度之和 = 2 × 边数
有向图：所有顶点入度之和 = 所有顶点出度之和 = 边数
:::

## 图的存储

### 邻接矩阵

用二维数组 `A[n][n]` 存储，`A[i][j]` 表示顶点 i 和 j 之间是否有边（或权值）。

```c
#define MaxVertexNum 100
typedef struct {
    char Vex[MaxVertexNum];              // 顶点表
    int Edge[MaxVertexNum][MaxVertexNum]; // 邻接矩阵
    int vexnum, arcnum;                  // 顶点数、边数
} MGraph;
```

```text
无向图 G:           邻接矩阵:
  1 — 2             0 1 1 0
  | \ |             1 0 1 1
  3 — 4             1 1 0 1
                    0 1 1 0
```

**特点**：

- 空间 O(n²)，适合稠密图
- 判断两顶点是否有边：O(1)
- 统计顶点的度：O(n)
- 邻接矩阵的第 i 行（列）非零元素个数 = 顶点 i 的度（出度/入度）

### 邻接表

对每个顶点建立一个单链表，存放其所有邻接顶点。

```c
typedef struct ArcNode {
    int adjvex;            // 邻接顶点编号
    struct ArcNode *next;   // 下一条边
    // InfoType info;       // 边的权值等信息
} ArcNode;

typedef struct VNode {
    char data;             // 顶点信息
    ArcNode *first;        // 第一条边
} VNode, AdjList[MaxVertexNum];

typedef struct {
    AdjList vertices;
    int vexnum, arcnum;
} ALGraph;
```

```text
无向图 G 的邻接表:

  0: [1] → [2] → NULL
  1: [0] → [2] → [3] → NULL
  2: [0] → [1] → [3] → NULL
  3: [1] → [2] → NULL
```

**特点**：

- 空间 O(n+e)，适合稀疏图
- 无向图：某顶点的度 = 该顶点链表长度
- 有向图：链表长度 = 出度；入度需要遍历所有链表或建立逆邻接表

::: tip 邻接矩阵 vs 邻接表

| 操作 | 邻接矩阵 | 邻接表 |
|------|---------|--------|
| 判断是否有边 | O(1) | O(V) |
| 统计度 | O(V) | O(度数) |
| 空间 | O(V²) | O(V+E) |
| 适合场景 | 稠密图 | 稀疏图 |
:::

### 十字链表（有向图）

同时包含出边链表和入边链表，解决了邻接表求入度困难的问题。

### 邻接多重表（无向图）

每条边只用一个结点表示，解决邻接表中同一条边存储两次的问题。

## 图的遍历

### 广度优先搜索（BFS）

类似树的层序遍历，使用队列，逐层扩展。

```c
bool visited[MaxVertexNum];

void BFS(Graph G, int v) {
    visit(v);
    visited[v] = true;
    EnQueue(Q, v);
    while (!QueueEmpty(Q)) {
        DeQueue(Q, v);
        for (int w = FirstNeighbor(G, v); w >= 0; w = NextNeighbor(G, v, w)) {
            if (!visited[w]) {
                visit(w);
                visited[w] = true;
                EnQueue(Q, w);
            }
        }
    }
}

void BFSTraverse(Graph G) {
    for (int i = 0; i < G.vexnum; i++)
        visited[i] = false;
    for (int i = 0; i < G.vexnum; i++)
        if (!visited[i]) BFS(G, i);  // 处理非连通图
}
```

**时间复杂度**：邻接矩阵 O(n²)，邻接表 O(n+e)

### 深度优先搜索（DFS）

类似树的先序遍历，使用递归（或栈），尽可能深地搜索。

```c
void DFS(Graph G, int v) {
    visit(v);
    visited[v] = true;
    for (int w = FirstNeighbor(G, v); w >= 0; w = NextNeighbor(G, v, w)) {
        if (!visited[w])
            DFS(G, w);
    }
}
```

**时间复杂度**：邻接矩阵 O(n²)，邻接表 O(n+e)

::: tip BFS 和 DFS 的对比

| 对比 | BFS | DFS |
|------|-----|-----|
| 数据结构 | 队列 | 递归/栈 |
| 遍历顺序 | 逐层扩展 | 尽可能深 |
| 最短路径 | 是（无权图） | 否 |
| 连通分量 | 可求 | 可求 |
:::

## 最小生成树

在连通无向网中找到一棵生成树，使得所有边的权值之和最小。

### Prim 算法

从一个顶点出发，每次选择距离已选顶点集合最近的顶点加入。

```text
贪心策略: 每次选"距离生成树最近"的非树顶点

步骤示例 (权值图):
    A —4— B
   /|     |\
  1  3    2  5
 /   |   |   \
C —8— D —6— E

从 A 开始:
1. 选 A, 加入边 AC(1)
2. 选 AB(4), 加入 B
3. 选 AB(4) vs AD(3) → AD(3), 加入 D
4. 选 BD(2), 加入
5. 选 DE(6), 加入

总权值: 1+3+2+4+6 = 16 (此例 Prim 结果)
```

**时间复杂度**：O(n²)，适合稠密图

### Kruskal 算法

按边的权值从小到大排序，依次选择不构成环的边加入。

```text
贪心策略: 每次选"权值最小"且"不成环"的边

步骤:
1. 所有边按权值排序
2. 依次检查每条边，用并查集判断是否会成环
3. 不成环则加入，跳过成环的边
4. 直到选够 n-1 条边
```

**时间复杂度**：O(e log e)，适合稀疏图

::: tip Prim vs Kruskal

- Prim：适合边多（稠密图），O(n²)
- Kruskal：适合边少（稀疏图），O(e log e)
- 两者都使用贪心策略，都能得到最小生成树
- 最小生成树可能不唯一，但权值之和唯一
:::

## 最短路径

### Dijkstra 算法（单源最短路径）

从一个源点出发，找到到所有其他顶点的最短路径。不能处理负权边。

```text
维护三个集合:
- S: 已确定最短路径的顶点
- U: 未确定的顶点
- dist[]: 源点到各顶点的当前最短距离

步骤:
1. 初始化 dist[]，源点 dist=0，其余 ∞
2. 从 U 中选 dist 最小的顶点 v 加入 S
3. 用 v 更新其邻居的 dist: dist[w] = min(dist[w], dist[v] + weight(v,w))
4. 重复 2-3 直到 S 包含所有顶点
```

**时间复杂度**：O(n²)，用优先队列可优化到 O((n+e) log n)

::: warning Dijkstra 不能处理负权边
Dijkstra 假设"已确定最短路径的顶点不会再被更新"。如果有负权边，这个假设不成立。负权边需要用 Bellman-Ford 算法。
:::

### Floyd 算法（全源最短路径）

求所有顶点对之间的最短路径。动态规划。

```c
// dist[i][j] 表示 i 到 j 的最短距离
for (int k = 0; k < n; k++)           // 考虑经过顶点 k
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (dist[i][k] + dist[k][j] < dist[i][j])
                dist[i][j] = dist[i][k] + dist[k][j];
```

**时间复杂度**：O(n³)，可以处理负权边（但不能有负权回路）

::: tip Dijkstra vs Floyd

| 对比 | Dijkstra | Floyd |
|------|----------|-------|
| 求解范围 | 单源 | 全源 |
| 时间 | O(n²) | O(n³) |
| 负权边 | 不支持 | 支持 |
| 空间 | O(n) | O(n²) |
| 适用 | 单源、稀疏图 | 多对多、稠密图 |
:::

## 拓扑排序

对有向无环图（DAG）的顶点排序，使得对于每条边 <u,v>，u 排在 v 之前。

### 算法步骤

1. 找到所有入度为 0 的顶点，入队
2. 弹出队首顶点，输出到拓扑序列
3. 删除该顶点的所有出边（邻接顶点入度减 1）
4. 如果邻接顶点入度变为 0，入队
5. 重复 2-4，直到队列为空
6. 若输出顶点数 < n，说明图中有环

```c
bool TopologicalSort(Graph G) {
    InitStack(S);
    for (int i = 0; i < G.vexnum; i++)
        if (indegree[i] == 0) Push(S, i);
    int count = 0;
    while (!StackEmpty(S)) {
        int v;
        Pop(S, v);
        printf("%d ", v);
        count++;
        for (ArcNode *p = G.vertices[v].first; p; p = p->next) {
            int w = p->adjvex;
            if (--indegree[w] == 0) Push(S, w);
        }
    }
    return count == G.vexnum;  // false 表示有环
}
```

::: tip 拓扑排序的用途

- 判断有向图是否有环
- 任务调度（先修课程、编译依赖）
- 关键路径的基础
:::

## 关键路径

在 AOE 网（Activity On Edge）中，从源点到汇点的最长路径就是**关键路径**，关键路径上的活动是**关键活动**。

### 核心概念

| 术语 | 含义 |
|------|------|
| 事件最早发生时间 ve(v) | 从源点到 v 的最长路径长度 |
| 事件最迟发生时间 vl(v) | 不推迟工期的前提下，v 最晚发生时间 |
| 活动最早开始时间 e(a) | e(<i,j>) = ve(i) |
| 活动最迟开始时间 l(a) | l(<i,j>) = vl(j) - weight(i,j) |
| 时间余量 | l(a) - e(a)，为 0 则是关键活动 |

### 计算步骤

1. **拓扑排序**求 ve：正向遍历，ve(v) = max{ve(u) + weight(u,v)}
2. **逆拓扑排序**求 vl：反向遍历，vl(v) = min{vl(w) - weight(v,w)}
3. 计算每条边的 e(a) 和 l(a)
4. l(a) - e(a) = 0 的活动为关键活动，关键活动构成关键路径

::: warning 关键路径的注意事项

1. 关键路径可能不唯一
2. 缩短关键活动不一定缩短总工期（可能产生新的关键路径）
3. 拓扑排序结果不唯一，ve/vl 的计算依赖于具体的拓扑序列
:::

## 高频考点总结

| 考点 | 频率 | 说明 |
|------|------|------|
| 邻接矩阵/邻接表的性质 | 极高 | 空间、时间复杂度、适用场景 |
| BFS/DFS 遍历 | 极高 | 手动模拟遍历过程 |
| 最小生成树 | 高 | Prim/Kruskal 手动模拟 |
| Dijkstra 最短路径 | 高 | 手动模拟 dist 数组变化 |
| 拓扑排序 | 高 | 判断有环、排序序列 |
| Floyd 算法 | 中 | 三重循环的含义 |
| 关键路径 | 中 | ve/vl/e/l 的计算 |
