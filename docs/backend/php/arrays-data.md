# 数组与数据结构

PHP 数组是语言中最核心的数据结构，它同时扮演了列表（list）和字典（map）的角色。理解其底层实现对于编写高效 PHP 代码至关重要。

## PHP 数组的底层实现

PHP 数组底层是 **HashTable + 双向链表** 的组合结构：

- **HashTable** 提供 O(1) 的键查找
- **双向链表** 保持插入顺序
- 每个元素是一个 **Bucket**，包含 key、value 和指向下一个元素的指针

```php
<?php
// PHP 数组可以同时有数字键和字符串键
$mixed = [
    0       => 'zero',
    'name'  => 'Alice',
    1       => 'one',
    'age'   => 25,
    2       => 'two',
];

// 遍历时保持插入顺序（不是按键排序）
foreach ($mixed as $key => $value) {
    echo "$key => $value\n";
}
// 0 => zero
// name => Alice
// 1 => one
// age => 25
// 2 => two

// 数组的内部结构本质：
// - 每个 Bucket 包含：h (hash值), key, val, next (链表指针)
// - 字符串键：先算 hash，用 hash 定位 HashTable 位置
// - 整数键：直接用整数作为 hash（如果在范围内）
// - 当 hash 冲突时，用链表解决
```

```php
<?php
// 数组的写时复制（Copy-on-Write）
$a = [1, 2, 3, 'name' => 'Alice'];
$b = $a;  // 不复制底层数据，只增加 refcount

// 查看内部信息（需要 xdebug 扩展）
// xdebug_debug_zval('a');  // refcount = 2

$b['name'] = 'Bob';  // COW 触发，$b 拷贝一份
// 此时 $a['name'] 仍然是 'Alice'

// 数组的 packed 优化
// 如果数组只有连续整数键（0, 1, 2, ...），PHP 使用 packed array
// packed array 没有 HashTable 开销，内存更紧凑，遍历更快
$packed = ['apple', 'banana', 'cherry'];  // packed array
$sparse = [0 => 'a', 2 => 'c', 5 => 'f']; // 不是 packed（键不连续）
```

::: tip 提示
在处理纯列表数据时，始终使用从 0 开始的连续整数键。这样 PHP 会使用 packed array 优化，内存占用减少约 50%，遍历速度提升约 20%。使用 `array_values()` 可以重新索引数组。
:::

## 数组函数分类

### 排序函数

```php
<?php
$numbers = [3, 1, 4, 1, 5, 9, 2, 6];

// sort() — 升序排列（修改原数组）
sort($numbers);
// [1, 1, 2, 3, 4, 5, 6, 9]

// rsort() — 降序排列
rsort($numbers);

// asort() — 按值升序，保留键
$scores = ['Alice' => 85, 'Bob' => 92, 'Charlie' => 78];
asort($scores);
// ['Charlie' => 78, 'Alice' => 85, 'Bob' => 92]

// ksort() — 按键升序
ksort($scores);

// usort() — 自定义比较函数
$users = [
    ['name' => 'Alice', 'age' => 25],
    ['name' => 'Bob', 'age' => 30],
    ['name' => 'Charlie', 'age' => 20],
];
usort($users, fn($a, $b) => $a['age'] <=> $b['age']);

// 多维数组排序 — 使用 array_multisort
$names = array_column($users, 'name');
$ages = array_column($users, 'age');
array_multisort($ages, SORT_DESC, $names, SORT_ASC, $users);
```

### 过滤、映射、归约

```php
<?php
// array_filter — 过滤
$numbers = [0, 1, 2, null, 4, false, 6, '', 8, 9];
$filtered = array_values(array_filter($numbers));
// [1, 2, 4, 6, 8, 9]

// array_map — 映射
$prices = [10.5, 20.0, 30.75];
$formatted = array_map(fn($p) => '$' . number_format($p, 2), $prices);
// ['$10.50', '$20.00', '$30.75']

// array_reduce — 归约
$orders = [
    ['amount' => 100, 'status' => 'completed'],
    ['amount' => 200, 'status' => 'completed'],
    ['amount' => 50,  'status' => 'pending'],
    ['amount' => 300, 'status' => 'completed'],
];
$totalCompleted = array_reduce($orders, function(float $sum, array $order): float {
    return $order['status'] === 'completed' ? $sum + $order['amount'] : $sum;
}, 0);
// 600

// array_column — 提取列（非常实用）
$users = [
    ['id' => 1, 'name' => 'Alice', 'email' => 'alice@example.com'],
    ['id' => 2, 'name' => 'Bob', 'email' => 'bob@example.com'],
    ['id' => 3, 'name' => 'Charlie', 'email' => 'charlie@example.com'],
];
$names = array_column($users, 'name');
// ['Alice', 'Bob', 'Charlie']

// 以 id 为键
$indexed = array_column($users, null, 'id');
// [1 => ['id' => 1, 'name' => 'Alice', ...], ...]

// array_unique — 去重
$duplicates = [1, 2, 2, 3, 3, 3, 4];
$unique = array_values(array_unique($duplicates));
// [1, 2, 3, 4]

// array_merge vs + 运算符
$a = ['a' => 1, 'b' => 2];
$b = ['b' => 3, 'c' => 4];
var_dump(array_merge($a, $b));  // ['a' => 1, 'b' => 3, 'c' => 4]（值覆盖）
var_dump($a + $b);               // ['a' => 1, 'b' => 2, 'c' => 4]（键已存在则保留原值）
```

::: warning 警告
`array_merge()` 和 `+` 运算符的行为完全不同。`array_merge` 中后面的值覆盖前面的（对字符串键），而 `+` 中前面的值优先。数字键则 `array_merge` 会重新索引。
:::

### 分组与集合操作

```php
<?php
// array_group_by — 手动分组（PHP 8.4 有原生支持）
function groupBy(array $items, string $key): array
{
    $result = [];
    foreach ($items as $item) {
        $groupKey = $item[$key];
        $result[$groupKey][] = $item;
    }
    return $result;
}

$orders = [
    ['id' => 1, 'status' => 'completed', 'amount' => 100],
    ['id' => 2, 'status' => 'pending', 'amount' => 200],
    ['id' => 3, 'status' => 'completed', 'amount' => 150],
];
$byStatus = groupBy($orders, 'status');
// ['completed' => [...2 items...], 'pending' => [...1 item...]]

// array_diff — 差集
$a = [1, 2, 3, 4, 5];
$b = [3, 4, 5, 6, 7];
$diff = array_diff($a, $b);  // [1, 2]（在 $a 中但不在 $b 中）

// array_intersect — 交集
$common = array_intersect($a, $b);  // [3, 4, 5]

// array_chunk — 分块
$batch = array_chunk(range(1, 100), 10);
// 10 个数组，每个 10 个元素（常用于批量处理）

// array_combine — 组合键值
$keys = ['name', 'age', 'city'];
$values = ['Alice', 25, 'Beijing'];
$combined = array_combine($keys, $values);
// ['name' => 'Alice', 'age' => 25, 'city' => 'Beijing']
```

## SPL 数据结构

SPL（Standard PHP Library）提供了专门的数据结构类，比普通数组在特定场景下更高效。

```php
<?php
// SplStack — 栈（后进先出）
$stack = new SplStack();
$stack->push('first');
$stack->push('second');
$stack->push('third');
echo $stack->pop();   // "third"
echo $stack->top();   // "second"（查看栈顶但不弹出）
echo $stack->count(); // 2

// SplQueue — 队列（先进先出）
$queue = new SplQueue();
$queue->enqueue('task-1');
$queue->enqueue('task-2');
$queue->enqueue('task-3');
echo $queue->dequeue();  // "task-1"
echo $queue->dequeue();  // "task-2"

// SplPriorityQueue — 优先队列
$pq = new SplPriorityQueue();
$pq->insert('low-task', 1);
$pq->insert('high-task', 10);
$pq->insert('medium-task', 5);
echo $pq->extract();  // "high-task"（最高优先级先出）

// SplHeap — 堆
class MinHeap extends SplMinHeap
{
    protected function compare($value1, $value2): int
    {
        return $value1 <=> $value2;
    }
}

$heap = new MinHeap();
$heap->insert(5);
$heap->insert(1);
$heap->insert(3);
echo $heap->extract();  // 1（最小值）
echo $heap->extract();  // 3

// SplFixedArray — 固定大小数组
// 比普通数组更省内存（不需要 hash table）
$fixed = new SplFixedArray(1000);
$fixed[0] = 'first';
$fixed[999] = 'last';
echo $fixed->getSize();  // 1000
```

::: warning 警告
SPL 数据结构是 PHP 对象，操作比原生数组慢（有方法调用开销）。只有在需要特定行为（栈/队列/优先队列）时才使用。纯粹追求内存效率的场景，SplFixedArray 有优势。
:::

## 生成器（yield）与惰性迭代

生成器允许你编写惰性迭代逻辑，一次只产生一个值，不需要将所有数据加载到内存中。

```php
<?php
declare(strict_types=1);

// 基本生成器
function range_generator(int $start, int $end): Generator
{
    for ($i = $start; $i <= $end; $i++) {
        yield $i;  // 暂停执行，返回 $i，下次调用从这里继续
    }
}

// 遍历 100 万个数字，只占一个 int 的内存
foreach (range_generator(1, 1_000_000) as $num) {
    if ($num > 5) break;
    echo "$num ";  // 1 2 3 4 5
}

// 带键的生成器
function readLines(string $filename): Generator
{
    $handle = fopen($filename, 'r');
    $lineNum = 0;
    while (($line = fgets($handle)) !== false) {
        yield ++$lineNum => trim($line);
    }
    fclose($handle);
}

// 逐行读取大文件，不占内存
foreach (readLines('/var/log/large.log') as $num => $line) {
    if (str_contains($line, 'ERROR')) {
        echo "Error at line $num: $line\n";
    }
}

// 生成器管道 — 组合多个生成器
function map(Generator $gen, callable $func): Generator
{
    foreach ($gen as $key => $value) {
        yield $key => $func($value);
    }
}

function filter(Generator $gen, callable $predicate): Generator
{
    foreach ($gen as $key => $value) {
        if ($predicate($value)) {
            yield $key => $value;
        }
    }
}

// 数据管道：读取 → 过滤 → 转换
$pipeline = map(
    filter(
        readLines('users.csv'),
        fn(string $line): bool => !empty($line)
    ),
    fn(string $line): array => str_getcsv($line)
);

foreach ($pipeline as $row) {
    // 处理每个 CSV 行
}

// yield from — 委托生成器
function multiRange(): Generator
{
    yield from range_generator(1, 3);   // 委托给另一个生成器
    yield from range_generator(10, 12);
}
// 输出: 1, 2, 3, 10, 11, 12
```

::: tip 提示
生成器的核心价值是惰性求值（lazy evaluation）。处理大型数据集（如 CSV 导入、日志分析、API 分页数据）时，生成器可以将内存使用量从 O(n) 降低到 O(1)。在 Laravel 中，数据库查询的 `cursor()` 方法底层就使用了生成器。
:::
