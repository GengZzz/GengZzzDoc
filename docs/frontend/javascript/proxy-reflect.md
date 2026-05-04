# Proxy 与 Reflect

`Proxy` 可以拦截对象的基本操作，`Reflect` 提供了与 Proxy 拦截器对应的标准方法。它们是实现响应式系统、数据验证、日志记录等高级功能的基础。

## Proxy 基础

```javascript
const target = { name: 'Alice', age: 25 };

const proxy = new Proxy(target, {
  get(obj, prop, receiver) {
    console.log(`读取属性: ${prop}`);
    return Reflect.get(obj, prop, receiver);
  },
  set(obj, prop, value, receiver) {
    console.log(`设置属性: ${prop} = ${value}`);
    if (prop === 'age' && typeof value !== 'number') {
      throw new TypeError('age 必须是数字');
    }
    return Reflect.set(obj, prop, value, receiver);
  }
});

proxy.name;        // 读取属性: name → 'Alice'
proxy.age = 30;    // 设置属性: age = 30
proxy.age = 'old'; // TypeError: age 必须是数字
```

## 拦截器完整列表

| 拦截器 | 触发时机 | 对应 Reflect 方法 |
|--------|----------|------------------|
| `get` | 读取属性 | `Reflect.get()` |
| `set` | 设置属性 | `Reflect.set()` |
| `has` | `in` 操作符 | `Reflect.has()` |
| `deleteProperty` | `delete` 操作 | `Reflect.deleteProperty()` |
| `apply` | 函数调用 | `Reflect.apply()` |
| `construct` | `new` 操作 | `Reflect.construct()` |
| `getOwnPropertyDescriptor` | `Object.getOwnPropertyDescriptor()` | `Reflect.getOwnPropertyDescriptor()` |
| `defineProperty` | `Object.defineProperty()` | `Reflect.defineProperty()` |
| `getPrototypeOf` | `Object.getPrototypeOf()` | `Reflect.getPrototypeOf()` |
| `setPrototypeOf` | `Object.setPrototypeOf()` | `Reflect.setPrototypeOf()` |
| `ownKeys` | `Object.keys()` / `for...in` / `Object.getOwnPropertyNames()` | `Reflect.ownKeys()` |
| `preventExtensions` | `Object.preventExtensions()` | `Reflect.preventExtensions()` |
| `isExtensible` | `Object.isExtensible()` | `Reflect.isExtensible()` |

## Vue3 响应式原理

Vue3 的 `reactive()` 底层就是基于 Proxy 实现的。

```javascript
// 简化版 Vue3 响应式系统
let activeEffect = null;

function effect(fn) {
  activeEffect = fn;
  fn();  // 执行时触发 get，收集依赖
  activeEffect = null;
}

const targetMap = new WeakMap();  // target → depsMap → prop → Set<effect>

function track(target, prop) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let dep = depsMap.get(prop);
  if (!dep) depsMap.set(prop, (dep = new Set()));
  dep.add(activeEffect);
}

function trigger(target, prop) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(prop);
  if (dep) dep.forEach(effect => effect());
}

function reactive(obj) {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      track(target, prop);  // 收集依赖
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const result = Reflect.set(target, prop, value, receiver);
      trigger(target, prop);  // 触发更新
      return result;
    }
  });
}

// 使用
const state = reactive({ count: 0, name: 'Alice' });

effect(() => {
  console.log(`count = ${state.count}`);  // 自动收集依赖
});

state.count++;  // 自动触发 effect → 输出 'count = 1'
```

## 常见应用

### 数据验证

```javascript
function validated(target, validators) {
  return new Proxy(target, {
    set(obj, prop, value) {
      const validate = validators[prop];
      if (validate && !validate(value)) {
        throw new TypeError(`${prop} 验证失败: ${value}`);
      }
      return Reflect.set(obj, prop, value);
    }
  });
}

const user = validated({}, {
  name: v => typeof v === 'string' && v.length > 0,
  age: v => Number.isInteger(v) && v > 0
});

user.name = 'Alice';  // OK
user.age = -1;        // TypeError: age 验证失败
```

### 不可变对象

```javascript
function immutable(obj) {
  return new Proxy(obj, {
    set() { throw new Error('对象不可变'); },
    deleteProperty() { throw new Error('对象不可变'); }
  });
}
```

## Reflect 的作用

`Reflect` 的方法与 Proxy 拦截器一一对应，保证了默认行为的正确性。

```javascript
const proxy = new Proxy({}, {
  get(target, prop, receiver) {
    // 用 Reflect.get 而非 target[prop] 的原因：
    // 1. receiver 会正确传递给 getter
    // 2. 返回值与 Proxy 拦截器一致
    return Reflect.get(target, prop, receiver);
  }
});

// Reflect 代替 Object 上的操作方法
Reflect.defineProperty(obj, 'x', { value: 1 });  // 返回 boolean
Reflect.deleteProperty(obj, 'x');                 // 返回 boolean
Reflect.ownKeys(obj);                             // 返回所有键（含 Symbol）
```
