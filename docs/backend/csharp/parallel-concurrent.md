# 并行与并发

## Task.WhenAll / WhenAny

```csharp
// WhenAll：等待所有任务完成（并发执行）
var tasks = urls.Select(url => _httpClient.GetStringAsync(url));
string[] results = await Task.WhenAll(tasks);

// WhenAll 异常处理：所有异常聚合在 AggregateException 中
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
}

// WhenAny：等待任意一个完成
var fastest = await Task.WhenAll(
    QueryDatabaseAsync(),
    QueryCacheAsync(),
    QueryApiAsync()
);
// 注意：WhenAny 返回第一个完成的 Task，其他 Task 仍在后台运行
```

## Parallel.For / Parallel.ForEach

对 CPU 密集型的集合处理进行并行化。

```csharp
// Parallel.For：并行循环
Parallel.For(0, 1000, i =>
{
    // 自动分配到多个线程
    ProcessItem(i);
});

// Parallel.ForEach：并行遍历集合
var files = Directory.GetFiles("/data");
Parallel.ForEach(files, file =>
{
    CompressFile(file);
});

// 控制并行度
var options = new ParallelOptions
{
    MaxDegreeOfParallelism = 4  // 最多 4 个线程并行
};
Parallel.ForEach(files, options, file => CompressFile(file));

// 有状态的并行（线程本地存储）
long total = 0;
Parallel.ForEach(files,
    () => 0L,  // 线程本地初始值
    (file, state, localTotal) =>  // 循环体
    {
        return localTotal + new FileInfo(file).Length;
    },
    localTotal =>  // 线程结束时合并
    {
        Interlocked.Add(ref total, localTotal);
    }
);
```

::: tip Parallel.ForEach vs async
`Parallel.ForEach` 不支持异步 lambda。对于 IO 密集型任务（HTTP 请求、数据库查询），用 `Task.WhenAll` + `SemaphoreSlim` 控制并发：

```csharp
var semaphore = new SemaphoreSlim(10);  // 最多 10 个并发
var tasks = urls.Select(async url =>
{
    await semaphore.WaitAsync();
    try { return await _httpClient.GetStringAsync(url); }
    finally { semaphore.Release(); }
});
var results = await Task.WhenAll(tasks);
```
:::

## 线程安全集合

`System.Collections.Concurrent` 命名空间提供内置线程安全的集合。

### ConcurrentDictionary

```csharp
var cache = new ConcurrentDictionary<string, Lazy<Data>>();

// GetOrAdd：原子性的「获取或添加」
var data = cache.GetOrAdd(key, k => new Lazy<Data>(() => LoadData(k))).Value;

// AddOrUpdate：添加或更新
cache.AddOrUpdate(key, k => LoadData(k), (k, old) => LoadData(k));

// TryRemove：原子性移除
cache.TryRemove(key, out _);
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
// 生产者-消费者模式
var collection = new BlockingCollection<int>(boundedCapacity: 100);

// 生产者
Task.Run(() =>
{
    for (int i = 0; i < 1000; i++)
    {
        collection.Add(i);  // 满了会阻塞
    }
    collection.CompleteAdding();
});

// 消费者
foreach (var item in collection.GetConsumingEnumerable())
{
    Process(item);
}
```

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

### SemaphoreSlim

控制同时访问资源的线程数量，支持异步等待。

```csharp
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

### ReaderWriterLockSlim

读写分离锁，允许多个读线程并发，写线程独占。

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

## Channel\<T\> 生产者消费者

`Channel<T>` 是 .NET Core 3.0+ 引入的高性能生产者-消费者模式。

```csharp
using System.Threading.Channels;

// 创建有界通道（缓冲区满时生产者阻塞）
var channel = Channel.CreateBounded<WorkItem>(new BoundedChannelOptions(100)
{
    SingleWriter = false,
    SingleReader = false,
    FullMode = BoundedChannelFullMode.Wait
});

// 生产者
async Task ProduceAsync(ChannelWriter<WorkItem> writer)
{
    for (int i = 0; i < 1000; i++)
    {
        await writer.WriteAsync(new WorkItem { Id = i });
    }
    writer.Complete();  // 标记不再写入
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
    {
        await channel.Writer.WriteAsync($"item-{i}");
    }
    channel.Writer.Complete();
});

// 3 个消费者并发处理
var consumers = Enumerable.Range(0, 3).Select(_ => Task.Run(async () =>
{
    await foreach (var item in channel.Reader.ReadAllAsync())
    {
        Console.WriteLine($"[{Environment.CurrentManagedThreadId}] {item}");
        await Task.Delay(50);  // 模拟处理
    }
}));

await Task.WhenAll(consumers);
```
