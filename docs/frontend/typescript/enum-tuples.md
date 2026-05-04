# 枚举与元组

## 数字枚举

数字枚举自动为成员赋予从 0 开始递增的数值。它在编译后会生成一个双向映射对象（名称到值、值到名称）。

```typescript
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right    // 3
}

const move = Direction.Up
console.log(move)           // 0
console.log(Direction[0])   // 'Up'（反向映射）

// 自定义起始值
enum HttpStatus {
  OK = 200,
  NotFound = 404,
  ServerError = 500
}

// 实际场景：游戏状态
enum GameState {
  Menu,       // 0
  Playing,    // 1
  Paused,     // 2
  GameOver    // 3
}

function handleState(state: GameState): void {
  switch (state) {
    case GameState.Menu:
      console.log('显示菜单')
      break
    case GameState.Playing:
      console.log('游戏进行中')
      break
  }
}
```

## 字符串枚举

字符串枚举每个成员都需要显式赋值字符串。它不会生成反向映射，序列化时更可读。

```typescript
enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR'
}

function log(level: LogLevel, message: string): void {
  console.log(`[${level}] ${message}`)
}

log(LogLevel.Info, '服务启动')  // [INFO] 服务启动

// 实际场景：HTTP 方法
enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

// 实际场景：主题模式
enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system'
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}
```

## 常量枚举

`const enum` 在编译时会被完全内联（inline），不会生成运行时对象。性能更好，但无法通过索引访问成员。

```typescript
const enum Direction {
  Up,
  Down,
  Left,
  Right
}

// 编译后直接内联为数字
const d = Direction.Up  // 编译结果：const d = 0

// 实际场景：性能敏感的循环判断
const enum IterationResult {
  Continue,
  Break
}

function processItems(items: number[]): void {
  for (const item of items) {
    const result = checkItem(item)
    if (result === IterationResult.Break) break  // 内联为 1
  }
}
```

## 联合枚举

枚举类型本身可以作为联合类型使用，枚举成员可以作为字面量类型。

```typescript
enum Color {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE'
}

// 枚举成员类型
function paint(c: Color.Red | Color.Blue): void {
  console.log(`涂色：${c}`)
}

paint(Color.Red)   // 正确
// paint(Color.Green)  // Error: 'GREEN' 不能赋值给 'RED' | 'BLUE'

// 实际场景：结合 typeof 用于函数参数
enum Alignment {
  Left = 'left',
  Center = 'center',
  Right = 'right'
}

function align(element: HTMLElement, alignment: Alignment): void {
  element.style.textAlign = alignment
}
```

## 元组类型

元组（Tuple）是一种固定长度、每个位置有独立类型的数组。它比普通数组更精确。

```typescript
// 基本元组
const point: [number, number] = [10, 20]
const x = point[0]  // 类型：number
const y = point[1]  // 类型：number

// 实际场景：React useState 的返回值
type UseStateReturn<T> = [T, (value: T) => void]

function useState<T>(initial: T): UseStateReturn<T> {
  let state = initial
  const setState = (value: T) => { state = value }
  return [state, setState]
}

const [count, setCount] = useState(0)
// count 类型为 number
// setCount 类型为 (value: number) => void

// 实际场景：数据库查询结果
type QueryResult = [rows: any[], totalCount: number]

async function paginate(
  table: string,
  page: number,
  pageSize: number
): Promise<QueryResult> {
  const rows: any[] = []  // 模拟查询
  const totalCount = 100
  return [rows, totalCount]
}
```

## 命名元组

命名元组为元组的每个位置赋予有意义的名称，提升代码可读性。

```typescript
// 未命名
const user: [string, number, boolean] = ['张三', 25, true]

// 命名后可读性大幅提升
const user2: [name: string, age: number, isActive: boolean] = ['张三', 25, true]

// 实际场景：函数返回多个值
function getUserInfo(): [name: string, email: string, role: string] {
  return ['张三', 'zhangsan@example.com', 'admin']
}

const [name, email, role] = getUserInfo()

// 实际场景：坐标与尺寸
type Rectangle = [x: number, y: number, width: number, height: number]

function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a[0] < b[0] + b[2] &&
    a[0] + a[2] > b[0] &&
    a[1] < b[1] + b[3] &&
    a[1] + a[3] > b[1]
  )
}
```

## 只读元组

使用 `readonly` 修饰符或 `as const` 让元组不可变，防止意外修改。

```typescript
// readonly 修饰符
const locked: readonly [string, number] = ['版本', 1]
// locked[0] = '其他'  // Error: Index signature in type 'readonly [string, number]' only permits reading

// as const 效果相同
const locked2 = ['版本', 1] as const
// 类型：readonly ["版本", 1]

// 实际场景：不可变的状态机转换
type Transition = readonly [from: string, to: string, event: string]

const transitions: readonly Transition[] = [
  ['idle', 'loading', 'FETCH'],
  ['loading', 'success', 'RESOLVE'],
  ['loading', 'error', 'REJECT'],
  ['success', 'loading', 'FETCH'],
  ['error', 'loading', 'RETRY']
] as const
```

## 元组与数组的区别

```typescript
// 数组：长度不固定，所有元素类型相同
const arr: number[] = [1, 2, 3, 4, 5]

// 元组：长度固定，每个位置类型可以不同
const tuple: [string, number] = ['hello', 42]

// 元组可以有可选元素
type FlexTuple = [string, number, boolean?]
const t1: FlexTuple = ['a', 1]
const t2: FlexTuple = ['a', 1, true]

// 元组可以有剩余元素
type NamedList = [name: string, ...values: number[]]
const list: NamedList = ['scores', 90, 85, 92, 88]
```

## 注意事项

- 数字枚举是反向映射的（值可以查到名称），字符串枚举没有反向映射。在 `const enum` 中，两种都不支持反向映射。
- 枚举在运行时会生成实际的 JavaScript 对象（除了 `const enum`），会增加包体积。如果只需要类型层面的约束，联合字面量类型通常是更好的选择。
- 元组的可读性在没有命名时较差。建议始终使用命名元组（TypeScript 4.0+）。
- `readonly` 元组比普通元组更安全，推荐在不需要修改的场景使用。
