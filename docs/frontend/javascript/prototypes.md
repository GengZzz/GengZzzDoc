# 原型与继承

JavaScript 的继承机制基于**原型链**（Prototype Chain），而非类继承。ES6 的 `class` 语法只是原型继承的语法糖。

<JsPrototypeChainDemo />

## 原型链

每个对象都有一个内部属性 `[[Prototype]]`，指向它的原型对象。访问属性时，沿原型链向上查找，直到找到或到达 `null`。

```javascript
const animal = {
  eat() { console.log('eating'); }
};

const dog = Object.create(animal);  // dog 的原型是 animal
dog.bark = function() { console.log('woof'); };

dog.bark();  // 在 dog 自身找到
dog.eat();   // dog 没有，沿原型链找到 animal.eat
```

### 原型关系图

```
dog  ──→  animal  ──→  Object.prototype  ──→  null
(own)    (proto)      (proto)
```

```javascript
// 验证原型关系
Object.getPrototypeOf(dog) === animal;  // true
dog.__proto__ === animal;               // true（不推荐，已废弃）
animal.isPrototypeOf(dog);              // true
```

## 构造函数模式

```javascript
function Person(name, age) {
  this.name = name;    // 实例属性
  this.age = age;
}

// 方法定义在 prototype 上（共享，不每个实例复制一份）
Person.prototype.greet = function() {
  console.log(`Hi, I'm ${this.name}`);
};

const alice = new Person('Alice', 25);
const bob = new Person('Bob', 30);

alice.greet === bob.greet;  // true（同一个函数引用）
```

### new 的内部过程

```javascript
function myNew(Constructor, ...args) {
  // 1. 创建新对象，原型指向构造函数的 prototype
  const obj = Object.create(Constructor.prototype);

  // 2. 执行构造函数，this 指向新对象
  const result = Constructor.apply(obj, args);

  // 3. 如果构造函数返回了对象，使用返回值；否则使用新对象
  return (typeof result === 'object' && result !== null) ? result : obj;
}
```

## ES6 class

```javascript
class Person {
  // 静态属性
  static count = 0;

  // 私有字段（ES2022）
  #secret = 'hidden';

  constructor(name, age) {
    this.name = name;
    this.age = age;
    Person.count++;
  }

  // 实例方法（定义在 prototype 上）
  greet() {
    return `Hi, I'm ${this.name}`;
  }

  // Getter / Setter
  get info() {
    return `${this.name} (${this.age})`;
  }

  set nickname(value) {
    this._nickname = value;
  }

  // 静态方法
  static getCount() {
    return Person.count;
  }

  // 私有方法
  #getSecret() {
    return this.#secret;
  }
}
```

::: warning class 不是新的继承模型
`class` 底层仍然是原型继承。`class B extends A` 等价于 `B.prototype.__proto__ = A.prototype`。`typeof Person` 仍然是 `'function'`。
:::

## 继承实现对比

### 原型链继承

```javascript
// 问题：引用类型属性被所有实例共享
function Animal() {
  this.colors = ['brown', 'white'];
}
Animal.prototype.eat = function() { console.log('eat'); };

function Dog() {}
Dog.prototype = new Animal();  // Dog 的原型是 Animal 实例

const d1 = new Dog();
const d2 = new Dog();
d1.colors.push('black');
console.log(d2.colors);  // ['brown', 'white', 'black'] — 被共享了！
```

### 寄生组合继承（最佳实践）

```javascript
function Animal(name) {
  this.name = name;
  this.colors = ['brown'];
}
Animal.prototype.eat = function() { console.log('eat'); };

function Dog(name, breed) {
  Animal.call(this, name);  // 继承实例属性（每个实例独立）
  this.breed = breed;
}

// 关键：Object.create 不会调用 Animal 构造函数
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;  // 修复 constructor 指向

Dog.prototype.bark = function() { console.log('woof'); };
```

### ES6 class 继承

```javascript
class Animal {
  constructor(name) {
    this.name = name;
    this.colors = ['brown'];
  }
  eat() { console.log('eat'); }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // 必须先调用 super
    this.breed = breed;
  }
  bark() { console.log('woof'); }
}
```

### instanceof 与原型

```javascript
const dog = new Dog('Buddy', 'Husky');

dog instanceof Dog;     // true
dog instanceof Animal;  // true（沿原型链查找）
dog instanceof Object;  // true

// instanceof 原理
function myInstanceOf(obj, Constructor) {
  let proto = Object.getPrototypeOf(obj);
  const target = Constructor.prototype;
  while (proto !== null) {
    if (proto === target) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

## Mixin 模式

JavaScript 不支持多继承，但可以通过 Mixin 混入多个功能。

```javascript
const Serializable = {
  serialize() {
    return JSON.stringify(this);
  }
};

const Loggable = {
  log() {
    console.log(`[${this.constructor.name}]`, this);
  }
}

class User {
  constructor(name) { this.name = name; }
}

// 混入
Object.assign(User.prototype, Serializable, Loggable);

const user = new User('Alice');
user.serialize();  // '{"name":"Alice"}'
user.log();        // [User] { name: 'Alice' }
```
