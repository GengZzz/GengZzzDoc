# 控制流

## 条件判断

### if / else

```javascript
const score = 85;

if (score >= 90) {
  console.log('A');
} else if (score >= 80) {
  console.log('B');
} else if (score >= 60) {
  console.log('C');
} else {
  console.log('F');
}
```

### 三目运算符

```javascript
// 简单赋值
const status = age >= 18 ? 'adult' : 'minor';

// 嵌套（不推荐，可读性差）
const level = score >= 90 ? 'A' : score >= 80 ? 'B' : 'C';
```

### switch

```javascript
const action = 'DELETE';

switch (action) {
  case 'CREATE':
    create();
    break;  // 必须 break，否则 fall-through
  case 'UPDATE':
    update();
    break;
  case 'DELETE':
    delete();
    break;
  default:
    unknown();
}
```

::: warning switch 的 fall-through
忘记写 `break` 会穿透到下一个 case，这是常见 Bug。ESLint 规则 `no-fallthrough` 可以检测。
:::

## 循环

### for 循环家族

```javascript
// 经典 for
for (let i = 0; i < arr.length; i++) {
  if (arr[i] === target) break;
}

// for...of（遍历值，适用于可迭代对象）
for (const item of [1, 2, 3]) {
  console.log(item);
}

// for...in（遍历键，适用于对象，会遍历原型链上的可枚举属性）
for (const key in obj) {
  if (obj.hasOwnProperty(key)) {  // 过滤原型链属性
    console.log(key, obj[key]);
  }
}

// for await...of（遍历异步迭代器）
for await (const chunk of stream) {
  process(chunk);
}
```

### while / do-while

```javascript
// while：先判断后执行
let n = 0;
while (n < 5) {
  console.log(n++);
}

// do-while：先执行后判断（至少执行一次）
let input;
do {
  input = getUserInput();
} while (input !== 'quit');
```

### 循环控制

```javascript
// break：退出整个循环
// continue：跳过本次迭代

// 标签循环（退出外层循环）
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (i === 1 && j === 1) break outer;  // 退出外层循环
    console.log(i, j);
  }
}
```

## 异常处理

```javascript
try {
  const data = JSON.parse(input);
  validate(data);
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error('JSON 格式错误:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('数据校验失败:', error.message);
  } else {
    throw error;  // 未知错误重新抛出
  }
} finally {
  cleanup();  // 无论是否异常都会执行
}
```

### Error 类型

```javascript
// 内置错误类型
new Error('通用错误');
new TypeError('类型错误');
new ReferenceError('引用错误');
new SyntaxError('语法错误');
new RangeError('范围错误（如递归过深）');

// 错误信息
try {
  null.toString();
} catch (e) {
  e.message;  // "Cannot read properties of null"
  e.stack;    // 调用栈（开发利器）
}
```
