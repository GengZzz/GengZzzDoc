# 设计模式

JavaScript 中常用的设计模式，结合实际开发场景讲解。

## 单例模式

保证一个类只有一个实例。

```javascript
// 闭包实现
const Singleton = (function () {
  let instance;

  function createInstance() {
    return {
      name: 'AppConfig',
      debug: true,
      apiUrl: 'https://api.example.com'
    };
  }

  return {
    getInstance() {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    }
  };
})();

const a = Singleton.getInstance();
const b = Singleton.getInstance();
console.log(a === b); // true

// ES6 class 实现
class Database {
  static #instance;

  constructor(url) {
    if (Database.#instance) {
      return Database.#instance;
    }
    this.url = url;
    this.connected = false;
    Database.#instance = this;
  }

  connect() {
    this.connected = true;
    console.log(`Connected to ${this.url}`);
  }
}

const db1 = new Database('mongodb://localhost');
const db2 = new Database('mongodb://other');
console.log(db1 === db2); // true
```

::: tip 应用场景
- 全局状态管理（如 Redux Store）
- 数据库连接池
- 日志记录器
- 浏览器中的 `window` 对象
:::

## 工厂模式

不直接使用 `new`，通过工厂函数创建对象。

```javascript
// 简单工厂
function createElement(type, props) {
  switch (type) {
    case 'button':
      return new Button(props);
    case 'input':
      return new Input(props);
    case 'select':
      return new Select(props);
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

// 使用
const btn = createElement('button', { text: 'Submit', variant: 'primary' });

// 工厂函数（更 JavaScript 的方式）
function createApiClient(baseURL) {
  return {
    get(path) {
      return fetch(`${baseURL}${path}`).then(r => r.json());
    },
    post(path, body) {
      return fetch(`${baseURL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(r => r.json());
    }
  };
}

const api = createApiClient('https://api.example.com');
api.get('/users');
```

## 观察者模式

一对多的依赖关系，状态变化时自动通知所有观察者。

```javascript
class EventEmitter {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(fn);
    return () => this.off(event, fn); // 返回取消订阅函数
  }

  off(event, fn) {
    this.#listeners.get(event)?.delete(fn);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(fn => fn(...args));
  }

  once(event, fn) {
    const wrapper = (...args) => {
      fn(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}

// 使用
const bus = new EventEmitter();

const unsub = bus.on('login', (user) => {
  console.log(`${user.name} logged in`);
});

bus.emit('login', { name: 'Alice' }); // Alice logged in
unsub(); // 取消订阅
```

::: tip 与发布-订阅的区别
- 观察者模式：Subject 直接通知 Observer，耦合度较高
- 发布-订阅模式：通过事件中心（Event Channel）解耦，发布者不知道订阅者的存在
- DOM 事件、Node.js EventEmitter 都是发布-订阅的变体
:::

## 策略模式

定义一系列算法，封装每个算法，使它们可以互换。

```javascript
// 表单验证策略
const validators = {
  required: (value) => value !== '' && value != null,
  minLength: (value, min) => value.length >= min,
  maxLength: (value, max) => value.length <= max,
  pattern: (value, regex) => regex.test(value),
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
};

function validate(data, rules) {
  const errors = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const [name, ...args] = rule.split(':');
      const validator = validators[name];
      const params = args.length ? args[0].split(',') : [];

      if (!validator(data[field], ...params)) {
        errors[field] = errors[field] || [];
        errors[field].push(`${field} ${rule} validation failed`);
      }
    }
  }

  return Object.keys(errors).length ? errors : null;
}

// 使用
const errors = validate(
  { email: 'test@example', password: '123' },
  {
    email: ['required', 'email'],
    password: ['required', 'minLength:8']
  }
);
// { password: ['password minLength:8 validation failed'] }
```

## 装饰器模式

在不修改原对象的情况下，动态添加功能。

```javascript
// 函数装饰器
function withLogging(fn) {
  return function (...args) {
    console.log(`Calling ${fn.name} with`, args);
    const result = fn.apply(this, args);
    console.log(`${fn.name} returned`, result);
    return result;
  };
}

function withRetry(fn, maxRetries = 3) {
  return async function (...args) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn.apply(this, args);
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        console.log(`Retry ${i + 1}/${maxRetries}`);
      }
    }
  };
}

// 组合使用
const fetchUser = withRetry(
  withLogging(async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  }),
  3
);
```

## 发布-订阅模式（事件总线）

跨组件通信的经典方案。

```javascript
// 通用事件总线
class EventBus {
  #channels = new Map();

  subscribe(channel, callback) {
    if (!this.#channels.has(channel)) {
      this.#channels.set(channel, []);
    }
    const subscribers = this.#channels.get(channel);
    subscribers.push(callback);

    // 返回取消订阅函数
    return () => {
      const index = subscribers.indexOf(callback);
      if (index > -1) subscribers.splice(index, 1);
    };
  }

  publish(channel, data) {
    const subscribers = this.#channels.get(channel);
    if (subscribers) {
      subscribers.forEach(cb => cb(data));
    }
  }
}

// 实际应用：微前端通信
const eventBus = new EventBus();

// 子应用 A
eventBus.subscribe('user:login', (user) => {
  console.log('A 收到登录事件:', user);
});

// 子应用 B
eventBus.subscribe('user:login', (user) => {
  console.log('B 收到登录事件:', user);
});

// 主应用
eventBus.publish('user:login', { id: 1, name: 'Alice' });
```

## 命令模式

将请求封装成对象，支持撤销、重做、排队。

```javascript
class CommandManager {
  #history = [];
  #redoStack = [];

  execute(command) {
    command.execute();
    this.#history.push(command);
    this.#redoStack = []; // 新命令清空 redo 栈
  }

  undo() {
    const command = this.#history.pop();
    if (command) {
      command.undo();
      this.#redoStack.push(command);
    }
  }

  redo() {
    const command = this.#redoStack.pop();
    if (command) {
      command.execute();
      this.#history.push(command);
    }
  }
}

// 文本编辑器命令
class InsertTextCommand {
  constructor(editor, position, text) {
    this.editor = editor;
    this.position = position;
    this.text = text;
  }

  execute() {
    this.editor.content =
      this.editor.content.slice(0, this.position) +
      this.text +
      this.editor.content.slice(this.position);
  }

  undo() {
    this.editor.content =
      this.editor.content.slice(0, this.position) +
      this.editor.content.slice(this.position + this.text.length);
  }
}

// 使用
const manager = new CommandManager();
const editor = { content: 'Hello World' };

manager.execute(new InsertTextCommand(editor, 5, ' Beautiful'));
console.log(editor.content); // 'Hello Beautiful World'
manager.undo();
console.log(editor.content); // 'Hello World'
manager.redo();
console.log(editor.content); // 'Hello Beautiful World'
```

## 适配器模式

将一个接口转换为调用者期望的另一个接口。

```javascript
// 适配不同数据源的接口
class LegacyAPI {
  getUserData() {
    return { usr_name: 'Alice', usr_email: 'alice@example.com' };
  }
}

class ModernAPI {
  async getUser(id) {
    const res = await fetch(`/api/users/${id}`);
    return res.json(); // { name: 'Alice', email: 'alice@example.com' }
  }
}

// 适配器：统一接口
class UserDataAdapter {
  constructor(source) {
    this.source = source;
  }

  async getUser() {
    if (this.source instanceof LegacyAPI) {
      const data = this.source.getUserData();
      return { name: data.usr_name, email: data.usr_email };
    }
    return this.source.getUser(1);
  }
}

// 使用
const adapter = new UserDataAdapter(new LegacyAPI());
const user = await adapter.getUser(); // { name: 'Alice', email: '...' }
```
