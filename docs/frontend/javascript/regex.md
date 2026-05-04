# 正则表达式

JavaScript 中用正则表达式处理文本匹配、替换、提取等操作。正则在表单验证、数据清洗、日志分析中无处不在。

## 基础语法

### 创建正则

```javascript
// 字面量（推荐）
const re1 = /pattern/flags;

// 构造函数（需要动态拼接时）
const re2 = new RegExp('pattern', 'flags');
const name = 'alice';
const re3 = new RegExp(`^${name}`, 'i'); // 动态构建
```

### 常用标志

| 标志 | 含义 |
|------|------|
| `g` | 全局匹配（找到所有匹配） |
| `i` | 忽略大小写 |
| `m` | 多行模式（`^` `$` 匹配每行） |
| `s` | dotAll 模式（`.` 匹配换行符） |
| `u` | Unicode 模式 |
| `y` | 粘连模式（从 `lastIndex` 开始匹配） |

### 元字符

```javascript
// 字符类
/\d/      // 数字 [0-9]
/\D/      // 非数字
/\w/      // 单词字符 [a-zA-Z0-9_]
/\W/      // 非单词字符
/\s/      // 空白字符（空格、制表符、换行）
/\S/      // 非空白字符
/./       // 任意字符（除换行符，加 s 标志可匹配换行）

// 边界
/^/       // 字符串开头（m 模式下是行首）
/$/       // 字符串结尾（m 模式下是行尾）
/\b/      // 单词边界

// 量词
/a*/      // 0 或多次
/a+/      // 1 或多次
/a?/      // 0 或 1 次
/a{3}/    // 恰好 3 次
/a{2,5}/  // 2 到 5 次
/a{2,}/   // 2 次以上

// 量词默认贪婪（匹配尽可能多）
// 加 ? 变为懒惰（匹配尽可能少）
/<.*>/   // 匹配 '<div>hello</div>' 整个字符串
/<.*?>/  // 匹配 '<div>'（第一个标签）
```

### 分组与引用

```javascript
// 捕获组
const re = /(\d{4})-(\d{2})-(\d{2})/;
const match = '2024-01-15'.match(re);
// match[0]: '2024-01-15'
// match[1]: '2024', match[2]: '01', match[3]: '15'

// 命名捕获组（ES2018）
const re2 = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const result = '2024-01-15'.match(re2);
result.groups.year;  // '2024'
result.groups.month; // '01'

// 非捕获组 (?:...)
const re3 = /(?:abc)+/; // 匹配 abcabcabc 但不捕获
'abcabc'.match(re3); // ['abcabc']

// 反向引用
const re4 = /(\w+) \1/; // 匹配重复的单词
'hello hello'.match(re4); // ['hello hello', 'hello']
```

## 常用方法

### RegExp 方法

```javascript
const re = /hello/i;

re.test('Hello World');  // true
re.exec('Hello World');  // ['Hello', index: 0, input: 'Hello World', groups: undefined]

// exec 配合 g 标志可以逐个匹配
const re2 = /\d+/g;
const str = 'a1 b22 c333';
let match;
while ((match = re2.exec(str)) !== null) {
  console.log(match[0], match.index);
}
// '1' 1
// '22' 4
// '333' 8
```

### String 方法

```javascript
// search — 返回首次匹配的索引
'Hello World'.search(/world/i); // 6

// match — 返回所有匹配
'cat bat sat'.match(/[a-z]at/g); // ['cat', 'bat', 'sat']

// matchAll — 返回迭代器（ES2020）
const str = 'a1b22c333';
const matches = [...str.matchAll(/(\d+)/g)];
// matches[0]: ['1', '1']
// matches[1]: ['22', '22']
// matches[2]: ['333', '333']

// replace — 替换匹配
'hello world'.replace(/world/, 'JS'); // 'hello JS'

// 带回调的替换
'price: 100'.replace(/\d+/, (match) => `$${match}`);
// 'price: $100'

// 命名组引用
'2024-01-15'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<month>/$<day>/$<year>'
);
// '01/15/2024'

// split — 按正则分割
'a,,b, c'.split(/\s*,\s*/); // ['a', '', 'b', 'c']
'a,,b, c'.split(/\s*,\s*/).filter(Boolean); // ['a', 'b', 'c']
```

## 前瞻与后顾断言

断言不消耗字符，只检查位置条件。

```javascript
// 正向前瞻 (?=...)：后面跟着...
/Windows(?=10|11)/    // 匹配 'Windows' 后面是 10 或 11

// 负向前瞻 (?!...)：后面不跟着...
/\d+(?!px)/           // 匹配数字后面不是 px 的

// 正向后顾 (?<=...)：前面是...
/(?<=\$)\d+/          // 匹配 $ 后面的数字
'$100 ¥200'.match(/(?<=\$)\d+/g); // ['100']

// 负向后顾 (?<!...)：前面不是...
/(?<!\$)\d+/          // 匹配前面不是 $ 的数字
'$100 ¥200'.match(/(?<!\$)\d+/g); // ['200']

// 实际应用：千分位格式化
function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
formatNumber(1234567); // '1,234,567'

// 提取不包含注释的代码行
const code = `
const x = 1; // comment
const y = 2;
// pure comment
const z = 3; // another
`;
const lines = code.match(/^(?!\/\/).+$/gm);
// ['const x = 1; // comment', 'const y = 2', 'const z = 3; // another']
```

## 实际应用

### 表单验证

```javascript
const validators = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^1[3-9]\d{9}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  idCard: /^\d{17}[\dXx]$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/
};

// 使用
validators.email.test('user@example.com'); // true
validators.phone.test('13800138000');       // true
validators.password.test('Abc123!@');       // true
```

### 模板字符串解析

```javascript
function compileTemplate(template) {
  // 提取所有 {{expression}}
  const re = /\{\{\s*([^}]+)\s*\}\}/g;

  return function (data) {
    return template.replace(re, (match, expr) => {
      // 支持点号属性访问
      const value = expr.trim().split('.').reduce((obj, key) => obj?.[key], data);
      return value ?? '';
    });
  };
}

const render = compileTemplate('Hello, {{ user.name }}! Age: {{ user.age }}');
render({ user: { name: 'Alice', age: 25 } });
// 'Hello, Alice! Age: 25'
```

### Markdown 标题提取

```javascript
function extractHeadings(markdown) {
  const re = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];

  for (const match of markdown.matchAll(re)) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      id: match[2].trim().toLowerCase().replace(/\s+/g, '-')
    });
  }

  return headings;
}

const md = `
# Title
## Section 1
### Subsection
## Section 2
`;

extractHeadings(md);
// [
//   { level: 1, text: 'Title', id: 'title' },
//   { level: 2, text: 'Section 1', id: 'section-1' },
//   { level: 3, text: 'Subsection', id: 'subsection' },
//   { level: 2, text: 'Section 2', id: 'section-2' },
// ]
```

::: tip 性能注意事项
- 避免在循环中反复创建正则对象，提取为常量
- 警惕回溯爆炸：嵌套量词如 `(a+)+b` 匹配长字符串可能超时
- 简单字符串操作（`includes`、`startsWith`、`indexOf`）比正则更快
- 对纯字符串搜索，优先用 `String.prototype.replace(str, ...)` 而非正则
:::
