# 异步并发实战

异步编程的难点不只是 `Promise` 语法，而是如何控制请求顺序、并发数量、超时、取消、重试和错误边界。

## 串行、并行、并发

| 模式 | 特点 | 适合场景 |
| --- | --- | --- |
| 串行 | 一个完成后再执行下一个 | 后一个依赖前一个结果 |
| 并行 | 一次性全部发起 | 多个互不依赖的请求 |
| 限制并发 | 同时只运行固定数量 | 批量请求、上传、爬取、任务队列 |

### 串行

```javascript
const results = [];

for (const id of ids) {
  const detail = await fetchDetail(id);
  results.push(detail);
}
```

适合“后一步依赖前一步”的流程。如果请求互不依赖，这种写法会浪费时间。

### 并行

```javascript
const results = await Promise.all(
  ids.map(id => fetchDetail(id))
);
```

适合数量可控的请求。如果一次性发起几百个请求，可能压垮浏览器、网关或后端。

## 限制并发

常见需求：批量处理 100 个任务，但同一时间最多只跑 5 个。

<JsAsyncConcurrencyDemo />

```javascript
async function limitConcurrency(items, worker, limit = 5) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    run
  );

  await Promise.all(runners);
  return results;
}
```

使用：

```javascript
const files = await limitConcurrency(
  fileList,
  file => uploadFile(file),
  3
);
```

这个实现的关键是共享 `nextIndex`。每个 runner 完成当前任务后，会继续领取下一个任务，直到任务池耗尽。

## 错误策略

批量任务出错时，先确定产品语义：

| 策略 | 行为 | API |
| --- | --- | --- |
| 快速失败 | 任一失败，整体失败 | `Promise.all` |
| 全量收集 | 每个任务都执行，分别记录成功失败 | `Promise.allSettled` |
| 任一成功 | 谁先成功用谁 | `Promise.any` |
| 谁先结束 | 成功或失败都算 | `Promise.race` |

### 全量收集

```javascript
const settled = await Promise.allSettled(
  ids.map(id => fetchDetail(id))
);

const success = [];
const failed = [];

settled.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    success.push(result.value);
  } else {
    failed.push({ id: ids[index], reason: result.reason });
  }
});
```

上传、批量导入、批量消息发送，通常更适合全量收集。

## 超时控制

`fetch` 本身不会因为业务超时自动失败，需要使用 `AbortController`。

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}
```

使用：

```javascript
try {
  const res = await fetchWithTimeout('/api/user', {}, 5000);
  const data = await res.json();
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('请求超时');
  } else {
    console.error('请求失败', error);
  }
}
```

## 取消过期请求

搜索框联想、筛选条件切换、路由切换时，旧请求结果不应该覆盖新请求结果。

```javascript
let currentController;

async function search(keyword) {
  currentController?.abort();

  const controller = new AbortController();
  currentController = controller;

  try {
    const res = await fetch(`/api/search?q=${keyword}`, {
      signal: controller.signal
    });
    return await res.json();
  } catch (error) {
    if (error.name === 'AbortError') return null;
    throw error;
  }
}
```

取消请求比“返回后判断是不是最新请求”更彻底，因为它还能释放网络和浏览器资源。

## 重试与退避

重试只适合临时失败：网络抖动、限流、短暂服务异常。不要对参数错误、权限错误、业务校验失败盲目重试。

```javascript
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(fn, options = {}) {
  const {
    times = 3,
    baseDelay = 300,
    shouldRetry = () => true
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === times || !shouldRetry(error)) break;

      const delay = baseDelay * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}
```

使用：

```javascript
const data = await retry(
  () => fetch('/api/report').then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }),
  {
    times: 3,
    shouldRetry: error => !String(error.message).includes('HTTP 400')
  }
);
```

## Promise 链中的错误传播

`then` 里抛出的异常会变成 rejected Promise。

```javascript
Promise.resolve()
  .then(() => {
    throw new Error('boom');
  })
  .catch(error => {
    console.error(error.message);
  });
```

`catch` 如果返回正常值，后续链会恢复为 fulfilled：

```javascript
fetchUser()
  .catch(() => ({ name: 'Guest' }))
  .then(user => {
    console.log(user.name);
  });
```

如果希望错误继续向上传递，必须重新抛出：

```javascript
fetchUser()
  .catch(error => {
    reportError(error);
    throw error;
  });
```

## async 函数的隐藏返回值

`async` 函数永远返回 Promise。

```javascript
async function getNumber() {
  return 1;
}

getNumber(); // Promise<number>
```

错误也会变成 rejected Promise：

```javascript
async function run() {
  throw new Error('failed');
}

run().catch(console.error);
```

所以事件处理、生命周期、定时器里调用 async 函数时，要么 `await`，要么显式 `.catch()`。

```javascript
button.addEventListener('click', () => {
  submitForm().catch(showError);
});
```

## 任务队列封装

当任务不断进入系统，而不是一次性全部给出，可以封装一个简单队列。

```javascript
class AsyncQueue {
  constructor(limit = 3) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  next() {
    if (this.running >= this.limit || this.queue.length === 0) return;

    const { task, resolve, reject } = this.queue.shift();
    this.running++;

    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        this.running--;
        this.next();
      });
  }
}
```

使用：

```javascript
const queue = new AsyncQueue(2);

queue.add(() => uploadFile(fileA));
queue.add(() => uploadFile(fileB));
queue.add(() => uploadFile(fileC));
```

## 日常判断清单

- 请求之间是否有依赖？没有依赖就不要写成串行。
- 最大并发数是多少？后端、浏览器、用户网络是否承受得住？
- 失败后是整体失败，还是允许部分成功？
- 请求是否需要超时和取消？
- 是否需要重试？哪些错误可以重试？
- async 函数的返回 Promise 是否被处理？
