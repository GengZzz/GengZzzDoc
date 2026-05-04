# 类

## 属性类型

TypeScript 的类可以声明属性的类型，并在构造函数或其他方法中赋值。属性必须先声明再使用。

```typescript
class User {
  // 声明属性类型
  id: number
  name: string
  email: string
  private password: string

  constructor(id: number, name: string, email: string, password: string) {
    this.id = id
    this.name = name
    this.email = email
    this.password = password
  }
}

// 实际场景：数据库实体
class Order {
  id: string
  userId: number
  items: { productId: string; quantity: number; price: number }[]
  total: number
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
  createdAt: Date

  constructor(userId: number, items: { productId: string; quantity: number; price: number }[]) {
    this.id = crypto.randomUUID()
    this.userId = userId
    this.items = items
    this.total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    this.status = 'pending'
    this.createdAt = new Date()
  }
}
```

## 访问修饰符

TypeScript 提供三种访问修饰符控制属性和方法的可见性。

```typescript
class BankAccount {
  public owner: string           // 任何地方都可以访问（默认）
  protected balance: number      // 当前类和子类可以访问
  private pin: string            // 只有当前类可以访问

  constructor(owner: string, balance: number, pin: string) {
    this.owner = owner
    this.balance = balance
    this.pin = pin
  }

  public deposit(amount: number): void {
    this.balance += amount
  }

  public getBalance(pin: string): number | null {
    if (pin !== this.pin) return null
    return this.balance
  }

  private logTransaction(type: string, amount: number): void {
    console.log(`${this.owner}: ${type} ¥${amount}`)
  }
}

class SavingsAccount extends BankAccount {
  private interestRate: number

  constructor(owner: string, balance: number, pin: string, rate: number) {
    super(owner, balance, pin)
    this.interestRate = rate
  }

  // 子类可以访问 protected 成员
  public addInterest(): void {
    const interest = this.balance * this.interestRate
    this.deposit(interest)
  }

  // 不能访问 private 成员
  // getPin() { return this.pin }  // Error: 'pin' is private
}

const account = new BankAccount('张三', 1000, '1234')
console.log(account.owner)          // 正确：public
// console.log(account.balance)     // Error: protected
// console.log(account.pin)         // Error: private
```

## 构造函数参数属性

TypeScript 允许在构造函数参数前添加访问修饰符，自动声明并赋值同名属性，减少样板代码。

```typescript
// 传统写法
class User1 {
  public name: string
  public age: number
  private id: number

  constructor(name: string, age: number, id: number) {
    this.name = name
    this.age = age
    this.id = id
  }
}

// 参数属性简写（推荐）
class User2 {
  constructor(
    public name: string,
    public age: number,
    private id: number,
    readonly createdAt: Date = new Date()
  ) {}

  getInfo(): string {
    return `${this.name} (${this.age}) - ID: ${this.id}`
  }
}

// 实际场景：DTO 类
class CreateUserDto {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly age: number,
    private readonly hashedPassword: string
  ) {}
}
```

## abstract 类

抽象类不能被直接实例化，只能被继承。它用于定义公共的接口和部分实现。

```typescript
abstract class Shape {
  abstract area(): number        // 抽象方法：子类必须实现
  abstract perimeter(): number   // 抽象方法

  // 非抽象方法：子类可以继承
  describe(): string {
    return `面积: ${this.area().toFixed(2)}, 周长: ${this.perimeter().toFixed(2)}`
  }
}

class Circle extends Shape {
  constructor(private radius: number) {
    super()
  }

  area(): number {
    return Math.PI * this.radius ** 2
  }

  perimeter(): number {
    return 2 * Math.PI * this.radius
  }
}

class Rectangle extends Shape {
  constructor(private width: number, private height: number) {
    super()
  }

  area(): number {
    return this.width * this.height
  }

  perimeter(): number {
    return 2 * (this.width + this.height)
  }
}

// const shape = new Shape()  // Error: Cannot create an instance of an abstract class
const circle = new Circle(5)
console.log(circle.describe())  // 面积: 78.54, 周长: 31.42

// 实际场景：数据存储抽象
abstract class DataStore<T> {
  abstract save(item: T): Promise<void>
  abstract findById(id: string): Promise<T | null>
  abstract delete(id: string): Promise<boolean>

  async saveMany(items: T[]): Promise<void> {
    for (const item of items) {
      await this.save(item)
    }
  }
}

class MongoStore<T> extends DataStore<T> {
  async save(item: T): Promise<void> { /* MongoDB 实现 */ }
  async findById(id: string): Promise<T | null> { /* MongoDB 实现 */ return null }
  async delete(id: string): Promise<boolean> { /* MongoDB 实现 */ return true }
}
```

## implements 多接口

类可以通过 `implements` 实现一个或多个接口，确保类满足接口定义的契约。

```typescript
interface Serializable {
  serialize(): string
}

interface Validatable {
  validate(): boolean
  errors: string[]
}

interface Identifiable {
  readonly id: string
}

// 实现多个接口
class UserEntity implements Serializable, Validatable, Identifiable {
  readonly id: string
  errors: string[] = []

  constructor(
    public name: string,
    public email: string
  ) {
    this.id = crypto.randomUUID()
  }

  serialize(): string {
    return JSON.stringify({ id: this.id, name: this.name, email: this.email })
  }

  validate(): boolean {
    this.errors = []
    if (!this.name) this.errors.push('名称不能为空')
    if (!this.email.includes('@')) this.errors.push('邮箱格式无效')
    return this.errors.length === 0
  }
}

// 实际场景：策略模式
interface PricingStrategy {
  calculate(basePrice: number): number
  getDescription(): string
}

class RegularPricing implements PricingStrategy {
  calculate(basePrice: number): number { return basePrice }
  getDescription(): string { return '原价' }
}

class DiscountPricing implements PricingStrategy {
  constructor(private discountRate: number) {}
  calculate(basePrice: number): number { return basePrice * (1 - this.discountRate) }
  getDescription(): string { return `${this.discountRate * 100}% 折扣` }
}

class TieredPricing implements PricingStrategy {
  constructor(private tiers: { threshold: number; price: number }[]) {}

  calculate(basePrice: number): number {
    for (const tier of this.tiers.sort((a, b) => b.threshold - a.threshold)) {
      if (basePrice >= tier.threshold) return tier.price
    }
    return basePrice
  }

  getDescription(): string { return '阶梯定价' }
}
```

## implements type（TypeScript 5.0+）

从 TypeScript 5.0 开始，类也可以 `implements` 类型别名。

```typescript
type Printable = {
  print(): void
}

type Loggable = {
  log(): void
}

class Document2 implements Printable, Loggable {
  constructor(public content: string) {}

  print(): void { console.log('打印:', this.content) }
  log(): void { console.log('[日志]', this.content) }
}
```

## 注意事项

- `private` 只是编译时的限制，编译后的 JavaScript 中所有属性都是公开的。运行时可以通过方括号访问 `obj['privateProp']`。
- `protected` 成员在子类中可以访问，但不能通过实例访问。
- `readonly` 只能在构造函数中赋值，之后不能再修改。
- 抽象类可以有构造函数，用于初始化子类共享的属性。但不能直接 `new AbstractClass()`。
- 实现接口时，类的属性和方法的可见性必须至少是 `public`（接口只定义公共契约）。
