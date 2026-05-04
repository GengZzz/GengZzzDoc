# 错误处理

## Error 类型

```javascript
// 内置错误类型
new Error('通用错误');
new TypeError('类型不匹配');          // 操作的值类型不对
new ReferenceError('引用未定义');     // 访问未声明的变量
new SyntaxError('语法错误');          // eval 或 JSON.parse
new RangeError('范围越界');           // 递归过深、数组长度为负
new URIError('URI 编码错误');         // encodeURI/decodeURI

// 错误属性
try { null.toString(); } catch (e) {
  e.message;  // "Cannot read properties of null"
  e.name;     // "TypeError"
  e.stack;    // 调用栈信息
}
```

## 自定义错误

```javascript
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} (id=${id}) not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

// 使用
function validateAge(age) {
  if (typeof age !== 'number') {
    throw new ValidationError('age', '必须是数字');
  }
  if (age < 0 || age > 150) {
    throw new ValidationError('age', '范围 0-150');
  }
}
```

## 错误链（cause）

ES2022 引入了 `cause` 属性，用于保留原始错误。

```javascript
try {
  await fetchData(url);
} catch (originalError) {
  throw new ServiceError('获取数据失败', {
    cause: originalError
  });
}

// 读取完整错误链
try { /* ... */ } catch (e) {
  console.error(e.message);        // '获取数据失败'
  console.error(e.cause.message);  // 原始错误信息
}
```

## 异步错误处理

```javascript
// Promise
fetchData()
  .then(handleSuccess)
  .catch(handleError)
  .finally(cleanup);

// async/await
async function load() {
  try {
    const data = await fetchData();
    return process(data);
  } catch (error) {
    if (error instanceof NetworkError) {
      return retry();
    }
    throw error;  // 未知错误重新抛出
  }
}

// Promise.all 错误处理
const results = await Promise.allSettled([
  fetch('/api/a'),
  fetch('/api/b'),
]);
const errors = results
  .filter(r => r.status === 'rejected')
  .map(r => r.reason);
```

## 全局错误捕获

```javascript
// 浏览器：未捕获的错误
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  reportToSentry(event.error);
});

// 浏览器：未捕获的 Promise 拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason);
  event.preventDefault();  // 阻止默认行为（控制台输出）
});

// Node.js
process.on('uncaughtException', (error) => {
  console.error('未捕获异常:', error);
  process.exit(1);  // 应该退出进程
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason);
});
```

## 错误边界模式

```javascript
// 包装异步函数，统一处理错误
function withErrorHandling(fn) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      if (error instanceof ValidationError) {
        showToast(error.message);
      } else {
        logError(error);
        showGenericError();
      }
    }
  };
}

// 使用
const safeFetch = withErrorHandling(fetchData);
await safeFetch(url);  // 错误被统一处理
```
