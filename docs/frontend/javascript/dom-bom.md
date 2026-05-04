# DOM 与 BOM

## DOM 节点操作

### 查询

```javascript
// 单个元素
document.getElementById('app');
document.querySelector('.card');
document.querySelector('[data-id="123"]');

// 多个元素（返回 NodeList 或 HTMLCollection）
document.querySelectorAll('.item');       // NodeList（静态）
document.getElementsByClassName('item');  // HTMLCollection（实时）
document.getElementsByTagName('div');     // HTMLCollection（实时）
```

### 创建与修改

```javascript
// 创建
const div = document.createElement('div');
div.className = 'card';
div.id = 'card-1';
div.textContent = 'Hello';
div.setAttribute('data-id', '123');

// 插入
parent.appendChild(div);
parent.insertBefore(newNode, referenceNode);
parent.append(node1, node2, '文本');     // 多个参数
parent.prepend(node);                     // 插入到开头
node.before(sibling);                     // 插入到前面
node.after(sibling);                      // 插入到后面

// 替换与删除
oldNode.replaceWith(newNode);
node.remove();

// 模板
const template = document.getElementById('card-template');
const clone = template.content.cloneNode(true);
```

## 事件系统

### 事件流

事件传播三个阶段：捕获 → 目标 → 冒泡。

```
捕获阶段：document → html → body → parent → target
冒泡阶段：target → parent → body → html → document
```

```javascript
// addEventListener 第三个参数：true 捕获，false 冒泡（默认）
element.addEventListener('click', handler, { capture: true });  // 捕获
element.addEventListener('click', handler);                      // 冒泡

// 阻止传播
event.stopPropagation();   // 阻止后续传播
event.stopImmediatePropagation();  // 阻止同元素同事件的其他处理器

// 阻止默认行为
event.preventDefault();  // 阻止链接跳转、表单提交等
```

### 事件委托

将事件处理器绑定在父元素上，利用冒泡处理子元素事件。

```javascript
// 不好：每个按钮绑定一个处理器
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', handleClick);
});

// 好：事件委托（性能更好，支持动态添加的元素）
document.querySelector('.container').addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');  // 向上查找最近的 .btn
  if (!btn) return;
  const action = btn.dataset.action;
  handleAction(action);
});
```

::: tip 事件委托优势
- 减少事件处理器数量（内存优化）
- 自动支持动态添加的元素
- 避免频繁绑定/解绑
:::

### 自定义事件

```javascript
// 创建
const event = new CustomEvent('dataLoaded', {
  detail: { records: 100 },
  bubbles: true,
  cancelable: true
});

// 派发
element.dispatchEvent(event);

// 监听
element.addEventListener('dataLoaded', (e) => {
  console.log(e.detail.records);
});
```

## BOM

### History API（SPA 路由基础）

```javascript
// 推入新状态（不刷新页面）
history.pushState({ page: 1 }, 'Title', '/page/1');

// 替换当前状态
history.replaceState({ page: 1 }, 'Title', '/page/1');

// 监听前进/后退
window.addEventListener('popstate', (e) => {
  console.log('导航到:', location.pathname, e.state);
});

// 监听路由变化
window.addEventListener('hashchange', () => {
  console.log('Hash:', location.hash);
});
```

### Storage

```javascript
// localStorage（持久化）
localStorage.setItem('theme', 'dark');
localStorage.getItem('theme');    // 'dark'
localStorage.removeItem('theme');
localStorage.clear();

// sessionStorage（会话级别，标签页关闭清除）
sessionStorage.setItem('token', 'abc123');

// 存储对象
localStorage.setItem('user', JSON.stringify({ name: 'Alice' }));
const user = JSON.parse(localStorage.getItem('user'));

// 监听存储变化（跨标签页同步）
window.addEventListener('storage', (e) => {
  console.log(`${e.key}: ${e.oldValue} → ${e.newValue}`);
});
```

::: warning Storage 限制
- 同源策略限制
- 大小限制约 5MB
- 只能存字符串（需 JSON 序列化）
- 同步 API，大量数据会阻塞主线程
- 敏感信息不要存（XSS 可读取）
:::

### Intersection Observer

```javascript
// 懒加载图片
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;  // 进入视口时加载真实 URL
      observer.unobserve(img);    // 加载后取消观察
    }
  });
}, {
  rootMargin: '200px'  // 提前 200px 触发
});

document.querySelectorAll('img[data-src]').forEach(img => {
  observer.observe(img);
});
```
