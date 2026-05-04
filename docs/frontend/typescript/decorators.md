# 装饰器

装饰器（Decorators）是一种特殊的声明，可以附加到类、方法、属性或参数上，修改它们的行为。装饰器使用 `@expression` 语法，其中 `expression` 必须是一个函数。

> 装饰器在 TypeScript 5.0 中正式稳定（ECMAScript Stage 3）。以下示例基于 TC39 装饰器提案的语法。

## 类装饰器

类装饰器应用于类的构造函数，可以用来修改或替换类的定义。

```typescript
// 添加日志功能的类装饰器
function logged<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>
): T {
  return class extends target {
    constructor(...args: any[]) {
      super(...args)
      console.log(`[构造] ${target.name} 已创建，参数:`, args)
    }
  }
}

@logged
class UserService {
  constructor(private dbUrl: string) {}
}

const service = new UserService('mongodb://localhost:27017')
// 输出: [构造] UserService 已创建，参数: ['mongodb://localhost:27017']

// 实际场景：单例模式
function singleton<T extends new (...args: any[]) => any>(
  target: T,
  context: ClassDecoratorContext<T>
): T {
  let instance: InstanceType<T>

  return class extends target {
    constructor(...args: any[]) {
      if (instance) return instance
      super(...args)
      instance = this as InstanceType<T>
    }
  } as T
}

@singleton
class Database {
  constructor(public host: string) {}
}

const db1 = new Database('localhost')
const db2 = new Database('remote')
console.log(db1 === db2)  // true
```

## 方法装饰器

方法装饰器应用于类的方法，可以修改方法的描述符或替换方法实现。

```typescript
// 方法计时装饰器
function timed(
  target: (...args: any[]) => any,
  context: ClassMethodDecoratorContext
): (...args: any[]) => any {
  const name = String(context.name)

  return function (this: any, ...args: any[]) {
    const start = performance.now()
    const result = target.apply(this, args)
    const elapsed = (performance.now() - start).toFixed(2)
    console.log(`[计时] ${name} 耗时 ${elapsed}ms`)
    return result
  }
}

// 方法重试装饰器
function retry(maxAttempts = 3) {
  return function (
    target: (...args: any[]) => any,
    context: ClassMethodDecoratorContext
  ): (...args: any[]) => any {
    const name = String(context.name)

    return async function (this: any, ...args: any[]) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await target.apply(this, args)
        } catch (err) {
          console.warn(`[重试] ${name} 第 ${attempt} 次失败`)
          if (attempt === maxAttempts) throw err
        }
      }
    }
  }
}

class ApiClient {
  @timed
  fetchUsers(): string[] {
    // 模拟耗时操作
    return ['张三', '李四', '王五']
  }

  @retry(3)
  async syncData(): Promise<void> {
    // 模拟可能失败的网络请求
    if (Math.random() > 0.5) throw new Error('网络错误')
    console.log('[同步] 数据同步成功')
  }
}
```

## 属性装饰器

属性装饰器应用于类的属性，可以用来定义属性的行为（如只读、响应式等）。

```typescript
// 属性验证装饰器
function range(min: number, max: number) {
  return function (target: undefined, context: ClassFieldDecoratorContext) {
    return function (initialValue: number) {
      if (initialValue < min || initialValue > max) {
        throw new Error(`${String(context.name)} 必须在 ${min}-${max} 之间`)
      }
      return initialValue
    }
  }
}

// 属性默认值装饰器
function defaultValue<T>(value: T) {
  return function (target: undefined, context: ClassFieldDecoratorContext) {
    return function (initialValue: T | undefined) {
      return initialValue ?? value
    }
  }
}

class Product {
  @range(0, 10000)
  price: number = 100

  @defaultValue('未命名')
  name: string

  @defaultValue(0)
  stock: number
}

// 实际场景：响应式属性（Vue 风格）
function reactive(target: undefined, context: ClassFieldDecoratorContext) {
  return function (initialValue: any) {
    let value = initialValue
    const key = String(context.name)

    return {
      get() {
        console.log(`[响应式] 读取 ${key}: ${value}`)
        return value
      },
      set(newValue: any) {
        if (value !== newValue) {
          console.log(`[响应式] ${key} 变更: ${value} → ${newValue}`)
          value = newValue
        }
      }
    }
  }
}
```

## 参数装饰器

参数装饰器应用于方法的参数，常用于元数据注入和依赖注入框架。

```typescript
// 参数日志装饰器
function logParam(
  target: undefined,
  context: ClassFieldDecoratorContext | ClassMethodDecoratorContext
) {
  // TC39 装饰器不直接支持参数装饰器
  // 通常通过方法装饰器 + 元数据实现
}

// 实际场景：方法参数验证
function validate(
  target: (...args: any[]) => any,
  context: ClassMethodDecoratorContext
) {
  const name = String(context.name)

  return function (this: any, ...args: any[]) {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === null || args[i] === undefined) {
        throw new Error(`${name} 的第 ${i + 1} 个参数不能为 null/undefined`)
      }
    }
    return target.apply(this, args)
  }
}

class UserService2 {
  @validate
  createUser(name: string, email: string): void {
    console.log(`创建用户: ${name} <${email}>`)
  }
}
```

## 装饰器工厂

装饰器工厂是一个返回装饰器的函数，它允许传入参数来自定义装饰器的行为。

```typescript
// 通用权限检查装饰器工厂
function requireRole(...roles: string[]) {
  return function (
    target: (...args: any[]) => any,
    context: ClassMethodDecoratorContext
  ) {
    const name = String(context.name)

    return function (this: any, ...args: any[]) {
      const currentUser = this.getCurrentUser?.()
      if (!currentUser || !roles.includes(currentUser.role)) {
        throw new Error(`无权访问 ${name}，需要角色: ${roles.join(' | ')}`)
      }
      return target.apply(this, args)
    }
  }
}

// 缓存装饰器工厂
function cache(ttlMs: number = 60000) {
  return function (
    target: (...args: any[]) => any,
    context: ClassMethodDecoratorContext
  ) {
    const cacheMap = new Map<string, { value: any; expires: number }>()

    return function (this: any, ...args: any[]) {
      const key = JSON.stringify(args)
      const cached = cacheMap.get(key)
      if (cached && cached.expires > Date.now()) {
        console.log('[缓存] 命中缓存')
        return cached.value
      }
      const result = target.apply(this, args)
      cacheMap.set(key, { value: result, expires: Date.now() + ttlMs })
      return result
    }
  }
}

class AdminPanel {
  getCurrentUser() {
    return { role: 'admin' }
  }

  @requireRole('admin')
  deleteUser(id: number): void {
    console.log(`删除用户 ${id}`)
  }

  @cache(5000)
  getStats(): { users: number; orders: number } {
    console.log('[查询] 从数据库获取统计...')
    return { users: 1000, orders: 5000 }
  }
}
```

## 装饰器执行顺序

当同一个目标上有多个装饰器时，它们按从上到下的顺序执行（求值），但实际调用顺序是从下到上（组合）。

```typescript
function first() {
  return function (target: any, context: any) {
    console.log('first 求值')
    return target
  }
}

function second() {
  return function (target: any, context: any) {
    console.log('second 求值')
    return target
  }
}

class Example {
  // 求值顺序：first → second
  // 执行顺序：second → first
  @first()
  @second()
  method() {}
}
// 输出：
// first 求值
// second 求值

// 装饰器执行顺序（TC39）：
// 1. 属性装饰器（从上到下）
// 2. 方法装饰器（从上到下）
// 3. 类装饰器（从上到下）
// 4. 参数装饰器（从上到下）
```

## 注意事项

- 装饰器是 ECMAScript Stage 3 提案，TypeScript 5.0+ 使用 `experimentalDecorators: false` 时为新语法，旧语法需要 `experimentalDecorators: true`。
- 类装饰器可以返回一个新的类来替换原始类，但新类必须兼容原始类的接口。
- 方法装饰器中的 `this` 指向实例，需要使用 `this` 参数类型或箭头函数来确保正确绑定。
- 装饰器不能直接访问实例的私有属性，只能通过公共接口交互。
- 装饰器增加了代码的隐式行为，过度使用会导致代码难以理解和调试。
