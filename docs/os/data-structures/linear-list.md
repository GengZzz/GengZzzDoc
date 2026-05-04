# 线性表

线性表是最基本的数据结构，由 n 个具有相同数据类型的数据元素组成的有限序列。408 考试中线性表是必考内容，重点考查顺序表和链表的基本操作及时间复杂度分析。

## 基本概念

线性表（Linear List）是具有相同数据类型的 n 个数据元素的有限序列，记作 L = (a₁, a₂, ..., aₙ)。

- **a₁** 称为表头元素，**aₙ** 称为表尾元素
- 除 a₁ 外，每个元素有且仅有一个**直接前驱**
- 除 aₙ 外，每个元素有且仅有一个**直接后继**
- 表中元素个数 n 称为**表长**，n=0 时称为**空表**

线性表是一种**逻辑结构**，它的物理实现可以是顺序表（数组）或链表。

## 基本操作

| 操作 | 说明 |
|------|------|
| `InitList(&L)` | 初始化空表 |
| `Length(L)` | 求表长 |
| `LocateElem(L, e)` | 按值查找，返回位序 |
| `GetElem(L, i)` | 按位查找，返回第 i 个元素 |
| `ListInsert(&L, i, e)` | 在第 i 个位置插入元素 e |
| `ListDelete(&L, i, &e)` | 删除第 i 个位置的元素，用 e 返回 |
| `PrintList(L)` | 输出表中所有元素 |
| `Empty(L)` | 判断是否为空表 |
| `DestroyList(&L)` | 销毁线性表 |

::: tip 考点提示
考试中经常考基本操作的**时间复杂度分析**，以及不同实现方式（顺序 vs 链式）下同一操作的复杂度差异。
:::

## 顺序表

顺序表用一段**地址连续的存储单元**依次存放线性表的数据元素。逻辑上相邻的元素在物理位置上也相邻。

### 存储结构

```c
#define MaxSize 50
typedef struct {
    ElemType data[MaxSize];  // 静态分配数组
    int length;              // 当前长度
} SqList;

// 动态分配
#define InitSize 100
typedef struct {
    ElemType *data;          // 指向动态分配数组的指针
    int MaxSize, length;     // 最大容量和当前长度
} SeqList;
```

### 基本操作实现

**插入操作**：在第 i 个位置插入元素 e

```c
bool ListInsert(SqList &L, int i, ElemType e) {
    if (i < 1 || i > L.length + 1)  // 位置不合法
        return false;
    if (L.length >= MaxSize)          // 存储空间已满
        return false;
    for (int j = L.length; j >= i; j--)  // 第 i 个位置及之后的元素后移
        L.data[j] = L.data[j - 1];
    L.data[i - 1] = e;  // 插入元素
    L.length++;
    return true;
}
```

**时间复杂度分析：**

| 情况 | 移动次数 | 复杂度 |
|------|---------|--------|
| 最好（插入末尾） | 0 | O(1) |
| 最坏（插入开头） | n | O(n) |
| 平均 | n/2 | O(n) |

**删除操作**：删除第 i 个位置的元素

```c
bool ListDelete(SqList &L, int i, ElemType &e) {
    if (i < 1 || i > L.length)
        return false;
    e = L.data[i - 1];                // 取出被删元素
    for (int j = i; j < L.length; j++) // 第 i 个位置之后的元素前移
        L.data[j - 1] = L.data[j];
    L.length--;
    return true;
}
```

**按值查找**：

```c
int LocateElem(SqList L, ElemType e) {
    for (int i = 0; i < L.length; i++)
        if (L.data[i] == e)
            return i + 1;  // 返回位序（从 1 开始）
    return 0;              // 查找失败
}
```

::: tip 平均查找长度（ASL）
顺序查找的平均查找长度：ASL = (n+1)/2，时间复杂度 O(n)。若顺序表有序，可用折半查找，ASL = log₂(n+1)-1，时间复杂度 O(log n)。
:::

## 单链表

单链表中每个结点包含数据域和指针域，指针域存放后继结点的地址。逻辑上相邻的元素在物理位置上可以不相邻。

### 存储结构

```c
typedef struct LNode {
    ElemType data;           // 数据域
    struct LNode *next;      // 指针域
} LNode, *LinkList;
```

### 头结点与头指针

- **头指针**：指向链表第一个结点的指针，标识整个链表
- **头结点**：在第一个元素结点之前附加的结点，数据域可不设信息

使用头结点的好处：统一空表和非空表的操作逻辑，插入和删除第一个结点时不需要特殊处理。

```text
带头结点的单链表：

头指针 → [头结点] → [a₁] → [a₂] → ... → [aₙ] → NULL
              ↑
           L（头指针）
```

### 基本操作实现

**头插法建表**：新结点插入到链表头部

```c
LinkList List_HeadInsert(LinkList &L) {
    LNode *s;
    int x;
    L = (LinkList)malloc(sizeof(LNode));  // 创建头结点
    L->next = NULL;
    scanf("%d", &x);
    while (x != 9999) {                   // 输入 9999 表示结束
        s = (LNode *)malloc(sizeof(LNode));
        s->data = x;
        s->next = L->next;                // 新结点指向原第一个结点
        L->next = s;                      // 头结点指向新结点
        scanf("%d", &x);
    }
    return L;
}
```

::: warning 逆序问题
头插法建立的链表中，元素顺序与输入顺序**相反**。考试中常考这个性质。
:::

**尾插法建表**：新结点插入到链表尾部

```c
LinkList List_TailInsert(LinkList &L) {
    int x;
    L = (LinkList)malloc(sizeof(LNode));
    LNode *s, *r = L;  // r 为尾指针
    scanf("%d", &x);
    while (x != 9999) {
        s = (LNode *)malloc(sizeof(LNode));
        s->data = x;
        r->next = s;
        r = s;         // 尾指针指向新的尾结点
        scanf("%d", &x);
    }
    r->next = NULL;    // 尾结点指针置空
    return L;
}
```

**按位查找**：

```c
LNode *GetElem(LinkList L, int i) {
    if (i < 0) return NULL;
    LNode *p = L;           // 从头结点开始
    int j = 0;
    while (p != NULL && j < i) {
        p = p->next;
        j++;
    }
    return p;  // i=0 返回头结点，i>表长返回 NULL
}
```

**插入操作**：在第 i 个位置插入结点

```c
bool ListInsert(LinkList &L, int i, ElemType e) {
    LNode *p = GetElem(L, i - 1);  // 找到第 i-1 个结点
    if (p == NULL) return false;
    LNode *s = (LNode *)malloc(sizeof(LNode));
    s->data = e;
    s->next = p->next;
    p->next = s;
    return true;
}
```

::: tip 插入操作的时间复杂度
虽然按位查找是 O(n)，但如果已知前驱结点 p，插入本身只需 O(1)。考试中"在 p 结点之后插入"这类问题直接考察 O(1) 操作。
:::

**删除操作**：删除第 i 个结点

```c
bool ListDelete(LinkList &L, int i, ElemType &e) {
    LNode *p = GetElem(L, i - 1);   // 找到前驱
    if (p == NULL || p->next == NULL)
        return false;
    LNode *q = p->next;              // q 指向被删结点
    e = q->data;
    p->next = q->next;               // 摘链
    free(q);
    return true;
}
```

**求表长**：

```c
int Length(LinkList L) {
    int len = 0;
    LNode *p = L->next;
    while (p != NULL) {
        len++;
        p = p->next;
    }
    return len;
}
```

## 双链表

双链表在单链表的基础上增加了一个指向前驱的指针，可以双向访问。

### 存储结构

```c
typedef struct DNode {
    ElemType data;
    struct DNode *prior, *next;  // 前驱和后继指针
} DNode, *DLinkList;
```

### 插入操作（在 p 结点之后插入 s）

```c
s->next = p->next;
s->prior = p;
p->next->prior = s;  // 注意：需判断 p->next 是否为 NULL
p->next = s;
```

### 删除操作（删除 p 的后继结点 q）

```c
p->next = q->next;
q->next->prior = p;  // 注意：需判断 q->next 是否为 NULL
free(q);
```

::: warning 双链表的指针操作顺序
插入和删除操作涉及多个指针修改，操作顺序不能随意颠倒。考试中常见的错误是：先断开了某个指针，导致后续指针无法访问。建议画图辅助分析。
:::

## 循环链表

### 循环单链表

最后一个结点的指针不为 NULL，而是指向头结点。

```text
L → [头] → [a₁] → [a₂] → ... → [aₙ] ——┐
  └──────────────────────────────────────┘
```

**判空条件**：`L->next == L`

**用途**：从任意结点出发都能遍历整个链表。常用于需要循环访问的场景（如约瑟夫问题）。

### 循环双链表

头结点的 prior 指向尾结点，尾结点的 next 指向头结点。

```text
L → [头] ⇄ [a₁] ⇄ [a₂] ⇄ ... ⇄ [aₙ] ——┐
  └─────────────────────────────────────────┘
```

**判空条件**：`L->next == L && L->prior == L`（或 `L->next == L`）

## 顺序表与链表对比

| 对比维度 | 顺序表 | 链表 |
|---------|--------|------|
| 存储方式 | 连续存储 | 离散存储 |
| 访问元素 | 随机访问 O(1) | 顺序访问 O(n) |
| 插入/删除 | O(n)（需移动元素） | O(1)（已知前驱时） |
| 空间利用 | 需预分配，可能浪费 | 动态分配，无浪费 |
| 缓存命中 | 高（连续内存） | 低（离散内存） |

::: tip 考试选择依据
- **频繁查找、少插入删除** → 顺序表
- **频繁插入删除、少查找** → 链表
- **无法预估数据规模** → 链表
:::

## 高频考点

### 1. 反转链表

```c
// 迭代法反转单链表
LinkList Reverse(LinkList &L) {
    LNode *pre = L->next;
    LNode *p = pre->next;
    pre->next = NULL;  // 原第一个结点变为尾结点
    while (p != NULL) {
        LNode *r = p->next;
        p->next = pre;
        pre = p;
        p = r;
    }
    L->next = pre;  // 头结点指向新的第一个结点
    return L;
}
```

### 2. 快慢指针找中间结点

```c
LNode *FindMid(LinkList L) {
    LNode *slow = L->next, *fast = L->next;
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;  // slow 即为中间结点
}
```

### 3. 判断链表是否有环

```c
bool HasCycle(LinkList L) {
    LNode *slow = L->next, *fast = L->next;
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;  // 快慢指针相遇
    }
    return false;
}
```

### 4. 两个有序链表合并

```c
LinkList Merge(LinkList L1, LinkList L2) {
    LNode *p1 = L1->next, *p2 = L2->next;
    LNode *r = L1;  // r 指向结果链表的尾部
    while (p1 != NULL && p2 != NULL) {
        if (p1->data <= p2->data) {
            r->next = p1;
            r = p1;
            p1 = p1->next;
        } else {
            r->next = p2;
            r = p2;
            p2 = p2->next;
        }
    }
    r->next = (p1 != NULL) ? p1 : p2;
    return L1;
}
```

::: warning 考试注意事项
1. 插入/删除操作中位序从 **1** 开始，数组下标从 **0** 开始，注意转换
2. 链表操作一定要画图，先连后断
3. 快慢指针是高频考点，可用于找中间结点、判断环、找倒数第 k 个结点
4. 注意边界条件：空表、单结点、头/尾结点特殊处理
:::
