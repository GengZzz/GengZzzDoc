# JSONB 操作

PostgreSQL 的 JSONB 类型将 JSON 数据存储为二进制格式，支持索引和高效查询。这让 PostgreSQL 可以在关系型数据上叠加文档数据库的能力，适合半结构化数据、API 响应存储、配置管理等场景。

## JSON vs JSONB

```sql
-- JSON：存储原始文本，保留键的顺序和重复键
-- JSONB：存储为二进制分解格式，键排序、去重，支持索引

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    attrs_json JSON,          -- 原始 JSON
    attrs_jsonb JSONB         -- 二进制 JSON
);

-- JSON 保留原始格式
INSERT INTO products (attrs_json, attrs_jsonb) VALUES
  ('{"b": 2, "a": 1}', '{"b": 2, "a": 1}');

-- JSON 的键顺序被保留，JSONB 的键按排序存储
SELECT attrs_json, attrs_jsonb FROM products;
-- attrs_json:  {"b": 2, "a": 1}    -- 原样保留
-- attrs_jsonb: {"a": 1, "b": 2}    -- 键按字母排序
```

| 特性 | JSON | JSONB |
|------|------|-------|
| 存储格式 | 原始文本 | 二进制分解 |
| 索引支持 | 不支持 | 支持 GIN 索引 |
| 写入速度 | 更快（不需解析） | 稍慢（需解析和排序） |
| 读取速度 | 较慢（每次需解析） | 更快 |
| 键顺序 | 保留 | 不保留 |
| 重复键 | 保留最后一个 | 去重（保留最后一个） |
| 空格 | 保留 | 不保留 |

::: tip 选择建议
绝大多数场景用 JSONB。只在需要精确保留原始 JSON 格式（如日志归档）时才用 JSON。
:::

## JSONB 运算符

```sql
CREATE TABLE api_cache (
    id SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL,
    response JSONB NOT NULL
);

INSERT INTO api_cache (endpoint, response) VALUES
  ('/users/1', '{
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "profile": {
      "age": 28,
      "city": "Shanghai",
      "hobbies": ["reading", "coding", "hiking"]
    },
    "roles": ["admin", "editor"],
    "settings": {
      "theme": "dark",
      "lang": "zh-CN"
    }
  }'),
  ('/users/2', '{
    "id": 2,
    "name": "Bob",
    "profile": {
      "age": 35,
      "city": "Beijing",
      "hobbies": ["gaming", "cooking"]
    },
    "roles": ["viewer"]
  }');
```

### 基本访问运算符

```sql
-- ->  按键取值，返回 JSON
SELECT response -> 'name' AS name FROM api_cache;
-- "Alice", "Bob"

-- ->> 按键取值，返回 TEXT
SELECT response ->> 'name' AS name FROM api_cache;
-- Alice, Bob

-- #>  按路径取值（数组），返回 JSON
SELECT response #> '{profile, city}' FROM api_cache;
-- "Shanghai", "Beijing"

-- #>> 按路径取值（数组），返回 TEXT
SELECT response #>> '{profile, city}' AS city FROM api_cache;
-- Shanghai, Beijing

-- 数组下标访问（从 0 开始）
SELECT response #>> '{profile, hobbies, 0}' AS first_hobby FROM api_cache;
-- reading, gaming

-- 嵌套取值链式运算
SELECT response -> 'profile' -> 'age' AS age FROM api_cache;
-- 28, 35

SELECT response -> 'profile' ->> 'city' AS city FROM api_cache;
-- Shanghai, Beijing
```

### 包含与存在运算符

```sql
-- @> 包含（左值是否包含右值的结构）
SELECT * FROM api_cache WHERE response @> '{"name": "Alice"}';
SELECT * FROM api_cache WHERE response @> '{"profile": {"city": "Shanghai"}}';

-- ? 键是否存在
SELECT * FROM api_cache WHERE response ? 'email';

-- ?| 任一键是否存在
SELECT * FROM api_cache WHERE response ?| array['email', 'phone'];

-- ?& 所有键是否存在
SELECT * FROM api_cache WHERE response ?& array['name', 'profile', 'roles'];

-- @? 路径是否存在（JSONPATH）
SELECT * FROM api_cache WHERE response @? '$.profile.hobbies[*] ? (@ == "coding")';
```

## GIN 索引加速 JSONB 查询

JSONB 上的 GIN 碑引有两种操作类：

```sql
-- 默认的 jsonb_ops：支持 @>, ?, ?|, ?&
CREATE INDEX idx_api_cache_response ON api_cache USING GIN (response);

-- jsonb_path_ops：只支持 @>，但更小更快
CREATE INDEX idx_api_cache_response_path ON api_cache
  USING GIN (response jsonb_path_ops);

-- 当只用 @> 查询时，jsonb_path_ops 的索引体积约为 jsonb_ops 的 1/3
```

::: tip GIN 索引的选择
如果你的查询主要使用 `@>`（包含查询），用 `jsonb_path_ops`。如果还需要 `?`、`?|`、`?&`（键存在性检查），用默认的 `jsonb_ops`。
:::

## jsonb_path_query（SQL/JSON 路径）

PostgreSQL 12+ 支持 SQL/JSON 标准路径语法，功能比 `->`/`->>` 运算符更强大：

```sql
-- jsonb_path_query 返回匹配的值
SELECT jsonb_path_query(response, '$.profile.hobbies[*]')
FROM api_cache WHERE id = 1;
-- 返回三行: "reading", "coding", "hiking"

-- 带筛选条件的路径
SELECT jsonb_path_query(response, '$.profile.hobbies[*] ? (@ starts with "c")')
FROM api_cache WHERE id = 1;
-- "coding"

-- 比较运算
SELECT jsonb_path_query(response, '$.profile ? (@.age > 30)')
FROM api_cache;
-- 返回 Bob 的 profile

-- jsonb_path_query_first 只返回第一个匹配
SELECT jsonb_path_query_first(response, '$.profile.hobbies[0]') FROM api_cache;

-- jsonb_path_exists 返回布尔值
SELECT * FROM api_cache
WHERE jsonb_path_exists(response, '$.roles[*] ? (@ == "admin")');

-- 使用变量
SELECT jsonb_path_query(
    response,
    '$.profile.hobbies[*] ? (@ == $hobby)',
    '{"hobby": "coding"}'::jsonb
) FROM api_cache;
```

### JSONPATH 语法速查

```
$              根元素
.key           访问键
[*]            数组所有元素
[n]            数组第 n 个元素（从 0 开始）
[start to end] 数组切片
..key          递归搜索键
? (cond)       筛选条件

条件表达式：
@ == "value"        等于
@.key > 10          比较运算
@ starts with "pre" 字符串前缀
@ like_regex "pat"  正则匹配
exists(@.key)       键是否存在
```

## JSONB 修改操作

```sql
-- || 合并（浅合并，同名键被覆盖）
SELECT response || '{"name": "Alice Updated", "phone": "13800000000"}'::jsonb
FROM api_cache WHERE id = 1;

-- UPDATE 中使用
UPDATE api_cache
SET response = response || '{"status": "active"}'::jsonb
WHERE id = 1;

-- - 删除键
SELECT response - 'email' FROM api_cache WHERE id = 1;

-- #- 删除路径
SELECT response #- '{profile, hobbies, 0}' FROM api_cache WHERE id = 1;

-- jsonb_set 修改指定路径的值
SELECT jsonb_set(response, '{profile, city}', '"Guangzhou"') FROM api_cache WHERE id = 1;

-- jsonb_set 创建路径（第三个参数为 true）
SELECT jsonb_set(response, '{profile, country}', '"CN"', true) FROM api_cache WHERE id = 1;

-- jsonb_insert 插入到数组
SELECT jsonb_insert(response, '{profile, hobbies, 0}', '"swimming"')
FROM api_cache WHERE id = 1;
-- 在 hobbies 数组的第一个位置插入
```

## 聚合与转换

```sql
-- jsonb_agg：将多行聚合成 JSON 数组
SELECT jsonb_agg(jsonb_build_object('id', id, 'endpoint', endpoint))
FROM api_cache;

-- jsonb_object_agg：将两列聚合成 JSON 对象
SELECT jsonb_object_agg(key, value)
FROM (VALUES ('a', 1), ('b', 2)) AS t(key, value);

-- jsonb_build_object / jsonb_build_array：构造 JSON
SELECT jsonb_build_object(
    'user', response ->> 'name',
    'age', response #>> '{profile, age}',
    'city', response #>> '{profile, city}'
) FROM api_cache WHERE id = 1;

-- 将 JSONB 展开为行
SELECT id, key, value
FROM api_cache, jsonb_each(response)
WHERE id = 1;
-- 展开所有顶层键值对

-- jsonb_to_record：将 JSONB 转为关系行
SELECT * FROM jsonb_to_record('{"id": 1, "name": "Alice", "age": 28}')
AS x(id INT, name TEXT, age INT);
```

## 实际应用场景

### 动态属性存储

电商系统的商品属性，不同品类有不同属性：

```sql
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    attributes JSONB DEFAULT '{}'
);

INSERT INTO products (category, name, price, attributes) VALUES
  ('phone', 'iPhone 15', 6999.00, '{"brand": "Apple", "storage": "256GB", "color": "black", "screen": "6.1寸"}'),
  ('book', 'PostgreSQL 指南', 89.00, '{"author": "张三", "pages": 450, "isbn": "978-7-xxx-xxx-x"}'),
  ('phone', 'Pixel 8', 4999.00, '{"brand": "Google", "storage": "128GB", "color": "white"}');

-- 查找所有 256GB 存储的手机
SELECT * FROM products
WHERE category = 'phone'
  AND attributes @> '{"storage": "256GB"}';

-- 为 attributes 中的特定路径创建索引
CREATE INDEX idx_products_brand ON products ((attributes ->> 'brand'));
SELECT * FROM products WHERE attributes ->> 'brand' = 'Apple';
```

### API 响应缓存

```sql
-- 从 attributes 中提取数值用于范围查询
SELECT * FROM products
WHERE (attributes ->> 'pages')::INT > 400;

-- 为数值属性创建表达式索引
CREATE INDEX idx_products_pages ON products (((attributes ->> 'pages')::INT))
WHERE attributes ? 'pages';
```
