# 栈与队列

栈和队列是受限的线性表。栈只允许在一端插入和删除，队列只允许在一端插入、另一端删除。408 考试中重点考查基本操作、应用和相互模拟。

## 栈

### 定义

栈（Stack）是只允许在**栈顶**进行插入和删除操作的线性表。特点是**后进先出（LIFO, Last In First Out）**。

```text
       栈顶
        ↓
  ┌───┬───┬───┬───┬───┐
  │ a₄│ a₃│ a₂│ a₁│    │
  └───┴───┴───┴───┴───┘
  ↑
 栈底（固定端）
```

| 操作 | 说明 | 时间复杂度 |
|------|------|-----------|
| `Push(&S, e)` | 入栈（压栈） | O(1) |
| `Pop(&S, &e)` | 出栈（弹栈） | O(1) |
| `GetTop(S, &e)` | 读栈顶元素 | O(1) |
| `StackEmpty(S)` | 判断栈空 | O(1) |

### 顺序栈

```c
#define MaxSize 50
typedef struct {
    ElemType data[MaxSize];
    int top;  // 栈顶指针，初始值 -1（指向栈顶元素）
} SqStack;

// 入栈
bool Push(SqStack &S, ElemType e) {
    if (S.top == MaxSize - 1)  // 栈满
        return false;
    S.data[++S.top] = e;       // 先 top+1，再存入
    return true;
}

// 出栈
bool Pop(SqStack &S, ElemType &e) {
    if (S.top == -1)           // 栈空
        return false;
    e = S.data[S.top--];       // 先取出，再 top-1
    return true;
}
```

::: tip top 指针的两种初始化方式
- `top = -1`：栈顶指针指向栈顶元素，入栈时先 `++top` 再赋值
- `top = 0`：栈顶指针指向栈顶元素的下一个位置，入栈时先赋值再 `++top`

两种方式的操作代码不同，但时间复杂度相同。考试中注意题目给定的初始化方式。
:::

### 共享栈

两个栈共享同一片存储空间，栈底分别在两端，栈顶向中间延伸。

```text
  ← 栈1增长方向    栈2增长方向 →

  ┌───┬───┬───┬───┬───┬───┬───┬───┐
  │ a │ b │   │   │   │ y │ z │   │
  └───┴───┴───┴───┴───┴───┴───┴───┘
  ↑top1 ↑top2
```

**栈满条件**：`top2 - top1 == 1`

### 链栈

用链表实现的栈，栈顶在链表头部，入栈和出栈都是 O(1)。

```c
typedef struct SNode {
    ElemType data;
    struct SNode *next;
} SNode, *LiStack;
```

## 栈的应用

### 1. 括号匹配

从左到右扫描表达式，遇到左括号入栈，遇到右括号与栈顶匹配。最后栈为空则匹配成功。

```c
bool BracketCheck(char *exp) {
    SqStack S;
    InitStack(S);
    for (int i = 0; exp[i] != '\0'; i++) {
        if (exp[i] == '(' || exp[i] == '[' || exp[i] == '{')
            Push(S, exp[i]);
        else if (exp[i] == ')' || exp[i] == ']' || exp[i] == '}') {
            if (StackEmpty(S)) return false;
            char top;
            Pop(S, top);
            if ((exp[i] == ')' && top != '(') ||
                (exp[i] == ']' && top != '[') ||
                (exp[i] == '}' && top != '{'))
                return false;
        }
    }
    return StackEmpty(S);
}
```

### 2. 表达式求值

**中缀表达式 → 后缀表达式（逆波兰表达式）**：

规则：使用运算符栈，从左到右扫描中缀表达式：
- 操作数直接输出
- 运算符：优先级高于栈顶则入栈，否则弹出栈顶运算符直到可以入栈
- 左括号入栈，右括号弹出到左括号

| 中缀 | 后缀 |
|------|------|
| `a+b*c` | `abc*+` |
| `(a+b)*c` | `ab+c*` |
| `a+b*(c-d)-e/f` | `abcd-*+ef/-` |

**后缀表达式求值**：

从左到右扫描，遇到操作数入栈，遇到运算符弹出两个操作数计算后结果入栈。

```c
// 后缀表达式求值
int EvalPostfix(char *exp[]) {
    SqStack S;
    InitStack(S);
    for (int i = 0; exp[i] != NULL; i++) {
        if (isOperand(exp[i])) {
            Push(S, atoi(exp[i]));
        } else {
            int b, a;
            Pop(S, b);  // 注意弹栈顺序
            Pop(S, a);
            switch (exp[i][0]) {
                case '+': Push(S, a + b); break;
                case '-': Push(S, a - b); break;
                case '*': Push(S, a * b); break;
                case '/': Push(S, a / b); break;
            }
        }
    }
    int result;
    Pop(S, result);
    return result;
}
```

::: warning 弹栈顺序
运算时先弹出的是**右操作数**，后弹出的是**左操作数**。减法和除法要注意顺序。
:::

### 3. 递归

递归的实现依赖于**递归工作栈**。每次递归调用将当前状态（参数、局部变量、返回地址）压栈，返回时弹栈恢复。

```c
// 阶乘的递归实现
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
```

递归调用过程：

```text
factorial(4)
  → 4 * factorial(3)
    → 3 * factorial(2)
      → 2 * factorial(1)
        → 返回 1
      → 返回 2*1 = 2
    → 返回 3*2 = 6
  → 返回 4*6 = 24
```

::: tip 递归转非递归
任何递归都可以用栈手动模拟转为非递归。408 考试中常考递归过程分析和手动模拟递归栈。
:::

## 队列

### 定义

队列（Queue）是只允许在**队尾**插入、在**队头**删除的线性表。特点是**先进先出（FIFO, First In First Out）**。

```text
  队头（出）                    队尾（入）
    ↓                            ↓
  ┌───┬───┬───┬───┬───┬───┐
  │ a₁│ a₂│ a₃│ a₄│ a₅│   │
  └───┴───┴───┴───┴───┴───┘
```

| 操作 | 说明 | 时间复杂度 |
|------|------|-----------|
| `EnQueue(&Q, e)` | 入队 | O(1) |
| `DeQueue(&Q, &e)` | 出队 | O(1) |
| `GetHead(Q, &e)` | 读队头元素 | O(1) |
| `QueueEmpty(Q)` | 判断队空 | O(1) |

### 顺序队列

```c
#define MaxSize 50
typedef struct {
    ElemType data[MaxSize];
    int front, rear;  // 队头、队尾指针
} SqQueue;
```

**假溢出问题**：多次入队出队后，rear 到达数组末尾但前面有空位。

```text
  ┌───┬───┬───┬───┬───┬───┐
  │   │   │ a₃│ a₄│ a₅│   │
  └───┴───┴───┴───┴───┴───┘
        ↑front       ↑rear（已到末尾，无法入队）
```

### 循环队列

解决假溢出的方法：将数组逻辑上视为环形。

**三种判空/判满方式：**

方式一：牺牲一个存储单元（最常用）

```c
// 初始: front = rear = 0
// 队空: front == rear
// 队满: (rear + 1) % MaxSize == front
// 队长: (rear - front + MaxSize) % MaxSize

bool EnQueue(SqQueue &Q, ElemType e) {
    if ((Q.rear + 1) % MaxSize == Q.front)
        return false;  // 队满
    Q.data[Q.rear] = e;
    Q.rear = (Q.rear + 1) % MaxSize;
    return true;
}

bool DeQueue(SqQueue &Q, ElemType &e) {
    if (Q.front == Q.rear)
        return false;  // 队空
    e = Q.data[Q.front];
    Q.front = (Q.front + 1) % MaxSize;
    return true;
}
```

方式二：增设 size 变量

```c
// 队空: size == 0
// 队满: size == MaxSize
```

方式三：增设 tag 变量

```c
// tag=0 表示最近操作是出队，tag=1 表示最近操作是入队
// 队空: front == rear && tag == 0
// 队满: front == rear && tag == 1
```

### 链式队列

```c
typedef struct LinkNode {
    ElemType data;
    struct LinkNode *next;
} LinkNode;

typedef struct {
    LinkNode *front, *rear;  // 队头和队尾指针
} LinkQueue;
```

::: tip 不带头结点的链队列
队空条件：`front == NULL && rear == NULL`。入队和出队在第一个元素时需要特殊处理。
:::

## 队列的应用

### 1. 层次遍历

BFS（广度优先搜索）使用队列实现，逐层访问结点。

```c
void LevelOrder(BiTree T) {
    if (T == NULL) return;
    LinkQueue Q;
    InitQueue(Q);
    EnQueue(Q, T);
    while (!QueueEmpty(Q)) {
        BiTree node;
        DeQueue(Q, node);
        visit(node);
        if (node->lchild) EnQueue(Q, node->lchild);
        if (node->rchild) EnQueue(Q, node->rchild);
    }
}
```

### 2. 双端队列

两端都可以插入和删除的队列。

```text
  端1 ←→  ┌───┬───┬───┬───┐  ←→ 端2
           │ a │ b │ c │   │
           └───┴───┴───┴───┘
```

- **输出受限**：只有一端可出，两端都可入
- **输入受限**：只有一端可入，两端都可出

::: tip 双端队列的考题
常考给定入队序列，判断哪些出队序列是合法的。用双端队列可以模拟栈和普通队列。
:::

## 栈与队列的相互模拟

### 用两个栈模拟队列

- **入队**：直接压入栈 S1
- **出队**：若 S2 为空，将 S1 全部弹出压入 S2，再从 S2 弹出

```text
入队 a,b,c:
  S1: [a, b, c]    S2: []

出队（需要从 S2 取，S2 为空，先将 S1 倒入 S2）:
  S1: []           S2: [c, b, a]
  弹出 a → 正确

继续入队 d:
  S1: [d]          S2: [c, b]

出队:
  弹出 b → 正确
```

**时间复杂度**：入队 O(1)，出队**均摊** O(1)。

### 用两个队列模拟栈

- **入栈**：将元素入到非空队列
- **出栈**：将非空队列中除最后一个元素外全部转移到另一个队列，弹出最后一个

```text
入栈 a,b,c:
  Q1: [a, b, c]    Q2: []

出栈 c:
  将 Q1 中 a,b 转移到 Q2:
  Q1: [c]          Q2: [a, b]
  弹出 c → 正确

入栈 d:
  Q1: []           Q2: [a, b, d]

出栈 d:
  将 Q2 中 a,b 转移到 Q1:
  Q1: [a, b]       Q2: [d]
  弹出 d → 正确
```

**时间复杂度**：入栈 O(1)，出栈 O(n)。

## 高频考点

| 考点 | 说明 |
|------|------|
| n 个元素入栈的出栈序列数 | 卡特兰数 C(n) = C(2n,n)/(n+1) |
| 共享栈的栈满条件 | `top2 - top1 == 1` |
| 循环队列的队满/队空判断 | 注意 front 和 rear 的初始化和移动规则 |
| 两个栈模拟队列 | 均摊 O(1) |
| 中缀转后缀 | 运算符优先级 + 栈 |
| 后缀表达式求值 | 操作数入栈，运算符弹栈计算 |

::: warning 易错点
1. 出栈序列不唯一，但总数有规律（卡特兰数）
2. 循环队列的 `front` 和 `rear` 初始都为 0，注意取模运算
3. 栈和队列都是线性结构，但存取规则不同，不能混用
:::
