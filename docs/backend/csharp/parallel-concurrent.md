# 并行与并发

TaskScheduler 和 ThreadPool 的内部机制决定了并行任务的调度效率。理解 Hill Climbing 算法、Channel 的完整生产者消费者模式、以及各种锁的实现原理，是编写高并发代码的基础。

## TaskScheduler 工作原理

TaskScheduler 是 Task 调度的抽象层，默认使用 ThreadPool：

```
Task.Factory.StartNew(action)
  │
  ▼
[TaskScheduler.Default] → ThreadPoolTaskScheduler
  │
  ▼
[ThreadPool.QueueUserWorkItem]
  │
  ▼
[工作线程执行 Task]
```

可以自定义 TaskScheduler 实现特殊调度策略（如 StaTaskScheduler 用于 COM 互操作、LimitedConcurrencyLevelTaskScheduler 限制并发度）。

## ThreadPool 演进与 Hill Climbing

.NET Core 后的 ThreadPool 使用 **Hill Climbing 算法** 动态调整工作线程数量：

```
吞吐量
  │      ╱╲
  │     ╱  ╲
  │    ╱    ╲ ← 最佳线程数附近波动
  │   ╱      ╲
  │  ╱        ╲
  │ ╱          ╲
  └──────────────── 线程数

Hill Climbing 算法：
1. 增加少量线程
2. 测量吞吐量变化
3. 吞吐量增加 → 继续增加（沿梯度上升）
4. 吞吐量减少 → 减少线程（改变方向）
5. 在最优值附近稳定
```

- 默认最小线程数：处理器数量
- 默认最大线程数：32767（64 位）或 1023（32 位）
- Hill Climbing 每 500ms 评估一次

## Task.WhenAll / WhenAny

```csharp
// WhenAll：等待所有任务完成
var tasks = urls.Select(url => _httpClient.GetStringAsync(url));
string[] results = await Task.WhenAll(tasks);

// WhenAll 异常处理
try
{
    await Task.WhenAll(
        DownloadAsync("url1"),
        DownloadAsync("url2"),  // 这个会抛异常
        DownloadAsync("url3")
    );
}
catch
{
    // 只捕获到第一个异常，但所有 Task 的状态都可检查
    var allErrors = new[] { t1, t2, t3 }
        .Where(t => t.IsFaulted)
        .SelectMany(t => t.Exception!.InnerExceptions);
}

// WhenAny：等待任意一个完成
var tasks2 = new[] { QueryDatabaseAsync(), QueryCacheAsync(), QueryApiAsync() };
var fastest = await Task.WhenAny(tasks2);
// 注意：其他 Task 仍在后台运行
var result = await fastest;
```

## Parallel.For / Parallel.ForEach

CPU 密集型的集合并行处理：

```csharp
Parallel.For(0, 1000, i =>
{
    ProcessItem(i);  // 自动分配到多个线程
});

// 控制并行度
var options = new ParallelOptions { MaxDegreeOfParallelism = 4 };
Parallel.ForEach(files, options, file => CompressFile(file));

// 有状态的并行（线程本地存储）
long total = 0;
Parallel.ForEach(files,
    () => 0L,  // 线程本地初始值
    (file, state, localTotal) => localTotal + new FileInfo(file).Length,
    localTotal => Interlocked.Add(ref total, localTotal)
);
```

::: tip Parallel.ForEach 不支持 async
`Parallel.ForEach` 不支持异步 lambda。对于 IO 密集型任务，用 `Task.WhenAll` + `SemaphoreSlim` 控制并发：

```csharp
var semaphore = new SemaphoreSlim(10);
var tasks = urls.Select(async url =>
{
    await semaphore.WaitAsync();
    try { return await _httpClient.GetStringAsync(url); }
    finally { semaphore.Release(); }
});
var results = await Task.WhenAll(tasks);
```
:::

## 锁机制

### lock（Monitor 的语法糖）

```csharp
private readonly object _lockObj = new();
private int _counter;

public void Increment()
{
    lock (_lockObj)
    {
        _counter++;
    }
    // 编译为：
    // Monitor.Enter(_lockObj);
    // try { _counter++; }
    // finally { Monitor.Exit(_lockObj); }
}
```

### ReaderWriterLockSlim 实现原理

读写分离锁，允许多个读线程并发，写线程独占：

```
ReaderWriterLockSlim 内部状态：
┌──────────────────────────────────────────┐
│  _ownersReadCount：当前读持有者数量       │
│  _ownersUpgradeableReadCount：可升级读    │
│  _ownersWriteCount：当前写持有者数量      │
│  _waitReadCount：等待读的线程数           │
│  _waitWriteCount：等待写的线程数          │
└──────────────────────────────────────────┘

读锁：允许多个线程同时持有
写锁：独占，等待所有读锁释放
可升级读锁：先获取读锁，之后可升级为写锁
```

```csharp
private readonly ReaderWriterLockSlim _rwLock = new();
private Dictionary<string, string> _data = new();

public string Get(string key)
{
    _rwLock.EnterReadLock();
    try { return _data[key]; }
    finally { _rwLock.ExitReadLock(); }
}

public void Set(string key, string value)
{
    _rwLock.EnterWriteLock();
    try { _data[key] = value; }
    finally { _rwLock.ExitWriteLock(); }
}
```

### SemaphoreSlim vs Semaphore

| 特性 | SemaphoreSlim | Semaphore |
| --- | --- | --- |
| 跨进程 | 否 | 是 |
| 支持 async | 是（WaitAsync） | 否 |
| 性能 | 更快（用户态） | 较慢（内核态） |
| 适用场景 | 单进程内并发控制 | 跨进程资源限制 |

```csharp
// SemaphoreSlim：轻量级信号量，支持异步等待
private readonly SemaphoreSlim _semaphore = new(3, 3);  // 最多 3 个并发

public async Task<Data> GetDataAsync(string key)
{
    await _semaphore.WaitAsync();
    try
    {
        return await FetchFromApiAsync(key);
    }
    finally
    {
        _semaphore.Release();
    }
}
```

### Interlocked 原子操作

```csharp
// 原子递增
Interlocked.Increment(ref _counter);

// 原子加法
Interlocked.Add(ref _total, value);

// CompareExchange：CAS（Compare-And-Swap）
int original;
do
{
    original = _value;
} while (Interlocked.CompareExchange(ref _value, original + 1, original) != original);
```

::: warning 死锁
两个线程以不同顺序获取锁会导致死锁：

```csharp
// 线程 1
lock (lockA) { lock (lockB) { /* ... */ } }

// 线程 2
lock (lockB) { lock (lockA) { /* ... */ } }  // 死锁！

// 解决方案：始终按固定顺序获取锁
```
:::

## 线程安全集合

### ConcurrentDictionary

分段锁（Striped Lock）实现，读操作大部分不需要加锁：

```csharp
var cache = new ConcurrentDictionary<string, Lazy<Data>>();

// GetOrAdd：原子性的「获取或添加」
var data = cache.GetOrAdd(key, k => new Lazy<Data>(() => LoadData(k))).Value;

// AddOrUpdate：添加或更新
cache.AddOrUpdate(key, k => LoadData(k), (k, old) => LoadData(k));
```

### ConcurrentQueue / ConcurrentStack

```csharp
var queue = new ConcurrentQueue<WorkItem>();
queue.Enqueue(new WorkItem());
if (queue.TryDequeue(out var item))
{
    Process(item);
}
```

### BlockingCollection

```csharp
var collection = new BlockingCollection<int>(boundedCapacity: 100);

// 生产者
Task.Run(() =>
{
    for (int i = 0; i < 1000; i++)
        collection.Add(i);  // 满了会阻塞
    collection.CompleteAdding();
});

// 消费者
foreach (var item in collection.GetConsumingEnumerable())
{
    Process(item);
}
```

## Channel\<T\> 完整生产者消费者模式

`Channel<T>` 是 .NET Core 3.0+ 引入的高性能生产者-消费者模式，比 `BlockingCollection` 更灵活：

```csharp
using System.Threading.Channels;

// 创建有界通道
var channel = Channel.CreateBounded<WorkItem>(new BoundedChannelOptions(100)
{
    SingleWriter = false,
    SingleReader = false,
    FullMode = BoundedChannelFullMode.Wait  // 满时等待
});

// 生产者
async Task ProduceAsync(ChannelWriter<WorkItem> writer)
{
    for (int i = 0; i < 1000; i++)
    {
        await writer.WriteAsync(new WorkItem { Id = i });
    }
    writer.Complete();
}

// 消费者
async Task ConsumeAsync(ChannelReader<WorkItem> reader)
{
    await foreach (var item in reader.ReadAllAsync())
    {
        await ProcessItemAsync(item);
    }
}

// 启动
var producer = ProduceAsync(channel.Writer);
var consumer = ConsumeAsync(channel.Reader);
await Task.WhenAll(producer, consumer);
```

### 多消费者模式

```csharp
var channel = Channel.CreateUnbounded<string>();

// 1 个生产者
_ = Task.Run(async () =>
{
    for (int i = 0; i < 100; i++)
        await channel.Writer.WriteAsync($"item-{i}");
    channel.Writer.Complete();
});

// 3 个消费者并发处理
var consumers = Enumerable.Range(0, 3).Select(_ => Task.Run(async () =>
{
    await foreach (var item in channel.Reader.ReadAllAsync())
    {
        Console.WriteLine($"[{Environment.CurrentManagedThreadId}] {item}");
        await Task.Delay(50);
    }
}));

await Task.WhenAll(consumers);
```

::: tip Channel 的 BoundedChannelFullMode 选项
| 模式 | 行为 |
| --- | --- |
| `Wait` | 生产者阻塞等待空间 |
| `DropNewest` | 丢弃最新元素 |
| `DropOldest` | 丢弃最旧元素 |
| `DropWrite` | 丢弃刚写入的元素 |
:::

## System.Threading.Tasks.Dataflow

Dataflow 库提供了更高级的并行数据流处理：

```csharp
using System.Threading.Tasks.Dataflow;

// 处理管道：下载 → 解析 → 保存
var downloadBlock = new TransformBlock<string, byte[]>(
    async url => await _httpClient.GetByteArrayAsync(url),
    new ExecutionDataflowBlockOptions { MaxDegreeOfParallelism = 4 });

var parseBlock = new TransformBlock<byte[], ParsedData>(
    data => ParseData(data),
    new ExecutionDataflowBlockOptions { MaxDegreeOfParallelism = 2 });

var saveBlock = new ActionBlock<ParsedData>(
    async data => await SaveToDbAsync(data));

// 连接管道
downloadBlock.LinkTo(parseBlock, new DataflowLinkOptions { PropagateCompletion = true });
parseBlock.LinkTo(saveBlock, new DataflowLinkOptions { PropagateCompletion = true });

// 投入数据
foreach (var url in urls)
    downloadBlock.Post(url);

downloadBlock.Complete();
await saveBlock.Completion;
```
