# 异步编程

JavaScript 是单线程语言，异步编程是处理 IO 密集型任务的核心手段。从回调到 Promise 再到 async/await，每一步都在解决前一步的痛点。

<JsPromiseChainDemo />

## 回调函数

异步编程最原始的方式，但嵌套过深会产生"回调地狱"。

```javascript
// 回调地狱
getUser(id, (user) => {
  getOrders(user.id, (orders) => {
    getOrderDetails(orders[0].id, (details) => {
      updateInventory(details.productId, (result) => {
        console.log('完成');
      }, handleError);
    }, handleError);
  }, handleError);
}, handleError);
```

## Promise

Promise 是对异步操作的封装，有三种状态：pending → fulfilled / rejected。

### 基本用法

```javascript
const p = new Promise((resolve, reject) => {
  setTimeout(() => {
    if (Math.random() > 0.5) {
      resolve('成功');
    } else {
      reject(new Error('失败'));
    }
  }, 1000);
});

p.then(
  (value) => console.log(value),     // 成功回调
  (error) => console.error(error)    // 失败回调
);
```

### 链式调用

```javascript
// then 返回新 Promise，可以链式调用
fetchUser(id)
  .then(user => fetchOrders(user.id))    // 返回 Promise
  .then(orders => orders[0])             // 返回值自动包装为 Promise.resolve(值)
  .then(order => console.log(order))
  .catch(error => console.error(error))  // 捕获链中任何位置的错误
  .finally(() => hideLoading());         // 无论成功失败都执行
```

::: tip then 的返回值规则
- 返回值 → 包装为 `Promise.resolve(值)`
- 返回 Promise → 直接使用该 Promise
- 抛出异常 → 包装为 `Promise.reject(错误)`
:::

### Promise 静态方法

```javascript
// Promise.all：全部成功才成功，任一失败即失败
const [users, orders, products] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchProducts()
]);

// Promise.allSettled：全部完成后返回每个结果的状态
const results = await Promise.allSettled([
  fetch('api/a'),
  fetch('api/b'),
  fetch('api/c')
]);
results.forEach(r => {
  if (r.status === 'fulfilled') console.log(r.value);
  else console.error(r.reason);
});

// Promise.race：第一个完成的结果（成功或失败）
const result = await Promise.race([
  fetchData(),
  timeout(5000)  // 5 秒超时
]);

// Promise.any：第一个成功的结果（全部失败才失败）
const fastest = await Promise.any([
  fetchFromCDN1(),
  fetchFromCDN2(),
  fetchFromCDN3()
]);
```

### 手写 Promise（简化版）

```javascript
class MyPromise {
  constructor(executor) {
    this.state = 'pending';
    this.value = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.state !== 'pending') return;
      this.state = 'fulfilled';
      this.value = value;
      // 异步执行回调（模拟微任务）
      queueMicrotask(() => {
        this.onFulfilledCallbacks.forEach(fn => fn());
      });
    };

    const reject = (reason) => {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.value = reason;
      queueMicrotask(() => {
        this.onRejectedCallbacks.forEach(fn => fn());
      });
    };

    try { executor(resolve, reject); }
    catch (err) { reject(err); }
  }

  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const handleFulfilled = () => {
        try {
          const result = onFulfilled?.(this.value);
          resolve(result);
        } catch (e) { reject(e); }
      };

      if (this.state === 'fulfilled') {
        queueMicrotask(handleFulfilled);
      } else if (this.state === 'pending') {
        this.onFulfilledCallbacks.push(handleFulfilled);
      }
      // rejected 省略类似处理
    });
  }
}
```

## async / await

async/await 是 Promise 的语法糖，让异步代码看起来像同步。

```javascript
async function fetchUserData(userId) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    const details = await getOrderDetails(orders[0].id);
    return details;
  } catch (error) {
    console.error('获取用户数据失败:', error);
    throw error;
  }
}
```

### 并发执行

```javascript
// 串行（慢）：每个请求等上一个完成
for (const id of ids) {
  const data = await fetchData(id);  // 总时间 = N × 单次时间
}

// 并行（快）：所有请求同时发起
const promises = ids.map(id => fetchData(id));
const results = await Promise.all(promises);  // 总时间 ≈ 最慢的一次

// 控制并发数
async function mapWithConcurrency(items, fn, concurrency = 3) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const promise = fn(item).then(result => {
      executing.delete(promise);
      return result;
    });
    results.push(promise);
    executing.add(promise);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}
```

::: warning async/await 常见陷阱
1. **串行执行**：在循环中 await 每个请求，应改用 `Promise.all`
2. **忘记 await**：`fetchData()` 返回 Promise 而非值
3. **错误吞没**：async 函数返回的 Promise 未被 catch
4. **顶层 await**：仅在 ES Module 中支持（`<script type="module">`）
:::
