# 全文搜索

PostgreSQL 内建全文搜索（Full Text Search, FTS）引擎，使用 `tsvector`（文档向量）和 `tsquery`（查询向量）实现文本检索。对于中小型应用的搜索需求，它可以替代 Elasticsearch 这类外部搜索引擎。

## tsvector 与 tsquery

### tsvector

tsvector 是一个已分词、排序、去重的词素（lexeme）列表：

```sql
-- to_tsvector 将文本转为词素向量
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2

-- 注意：停用词（the, over）被移除，词进行了词干提取（jumps→jump, lazy→lazi）

-- 中文默认分词不可用（后面讲解 zhparser）
SELECT to_tsvector('english', 'PostgreSQL is a powerful database');
-- 'databas':6 'postgresql':1 'power':5

-- 带位置信息，用于短语查询和排名
SELECT to_tsvector('english', 'cat sat on a mat cat');
-- 'cat':1,6 'mat':5 'sat':2

-- 手动构造 tsvector
SELECT 'cat:1,6 mat:5 sat:2'::tsvector;
```

### tsquery

tsquery 表示搜索条件，支持布尔运算：

```sql
-- to_tsquery：将文本转为查询
SELECT to_tsquery('english', 'jumping & dog');
-- 'jump' & 'dog'

-- plainto_tsquery：自动用 & 连接词素
SELECT plainto_tsquery('english', 'quick fox jumping');
-- 'quick' & 'fox' & 'jump'

-- phraseto_tsquery：短语查询（词素间要求相邻）
SELECT phraseto_tsquery('english', 'quick brown fox');
-- 'quick' <2> 'brown' <1> 'fox'  （<n> 表示间距）

-- websearch_to_tsquery：支持 Google 风格语法
SELECT websearch_to_tsquery('english', '"quick fox" OR dog -cat');
-- 'quick' <-> 'fox' | 'dog' & !'cat'
```

### 匹配运算符

```sql
-- @@ 匹配运算符
SELECT * FROM articles
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'postgresql & performance');

-- 实际使用：预存 tsvector 列
ALTER TABLE articles ADD COLUMN search_vector tsvector;
UPDATE articles SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''));

-- 创建触发器自动更新
CREATE OR REPLACE FUNCTION articles_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON articles FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();
```

## 搜索索引

### GIN 索引

全文搜索推荐使用 GIN 索引，查询速度比 GiST 快，但构建和更新较慢：

```sql
-- 在 tsvector 列上创建 GIN 索引
CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

-- 配合 @@ 运算符，走 Index Scan
EXPLAIN ANALYZE
SELECT id, title FROM articles
WHERE search_vector @@ to_tsquery('english', 'postgresql & optimization');
```

### GiST 索引

GiST 索引构建更快但查询稍慢，适合数据频繁更新的场景：

```sql
CREATE INDEX idx_articles_search_gist ON articles USING GiST (search_vector);
```

| 特性 | GIN | GiST |
|------|-----|------|
| 查询速度 | 更快 | 稍慢 |
| 构建速度 | 较慢 | 更快 |
| 索引体积 | 较大 | 较小 |
| 更新成本 | 较高 | 较低 |
| 支持压缩 | 是 | 否 |

::: tip 选择建议
只读或低频更新的数据用 GIN。频繁更新的日志类数据用 GiST。如果不确定，默认用 GIN。
:::

## 排名与相关性

### ts_rank

```sql
-- ts_rank：基于词素频率的排名
SELECT id, title,
       ts_rank(search_vector, query) AS rank
FROM articles,
     to_tsquery('english', 'postgresql & performance') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- 带权重的排名
-- A=1.0, B=0.4, C=0.2, D=0.1
UPDATE articles SET search_vector =
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B');

-- 使用加权排名
SELECT id, title,
       ts_rank(search_vector, query, 1 | 2 | 4) AS rank
FROM articles,
     to_tsquery('english', 'postgresql') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;
-- 标题中出现的匹配项权重更高
```

### ts_rank_cd

```sql
-- ts_rank_cd：基于覆盖密度的排名（考虑词素间距）
SELECT id, title,
       ts_rank_cd(search_vector, query) AS rank
FROM articles,
     phraseto_tsquery('english', 'query performance') AS query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

## 中文全文搜索

PostgreSQL 默认不支持中文分词，需要通过扩展实现。

### zhparser

zhparser 是基于 SCWS（Simple Chinese Word Segmentation）的中文分词插件：

```sql
-- 安装 zhparser（需要先安装 scws 和 zhparser 扩展）
CREATE EXTENSION zhparser;

-- 创建中文搜索配置
CREATE TEXT SEARCH CONFIGURATION zhcn (PARSER = zhparser);
ALTER TEXT SEARCH CONFIGURATION zhcn
    ADD MAPPING FOR n,v,a,i,e,l WITH simple;

-- 测试分词
SELECT ts_debug('zhcn', 'PostgreSQL中文全文搜索性能测试');
-- 可以看到中文被正确分词

-- 使用中文搜索配置
SELECT to_tsvector('zhcn', 'PostgreSQL是一个强大的开源数据库')
    @@ to_tsquery('zhcn', '开源 & 数据库');
-- true

-- 创建中文搜索索引
ALTER TABLE articles ADD COLUMN search_zh tsvector;
UPDATE articles SET search_zh = to_tsvector('zhcn', coalesce(title, '') || ' ' || coalesce(content, ''));

CREATE INDEX idx_articles_zh ON articles USING GIN (search_zh);
```

::: tip 中文分词配置
zhparser 的分词精度依赖 SCWS 词典。可以导入自定义词典提升分词效果：在 scws 的 etc 目录下添加 `dict.utf8.xdb` 自定义词典。
:::

### pg_jieba

pg_jieba 是基于结巴分词的 PostgreSQL 扩展，分词质量通常优于 zhparser：

```sql
CREATE EXTENSION pg_jieba;

-- 使用 jieba 分词
SELECT jieba_tokenizer('PostgreSQL中文全文搜索');
```

## 相似度搜索

### pg_trgm 扩展

pg_trgm 基于 trigram（三字符组）实现模糊匹配和相似度排序：

```sql
CREATE EXTENSION pg_trgm;

-- 计算相似度（0 到 1）
SELECT similarity('postgresql', 'postgre'),  -- 0.625
       similarity('postgresql', 'mysql'),    -- 0.0
       similarity('数据库', '数据存储');      -- 取决于字符切分

-- 相似度排序
SELECT name, similarity(name, 'postgrs') AS sim
FROM products
WHERE similarity(name, 'postgrs') > 0.3
ORDER BY sim DESC;

-- % 相似运算符
SELECT * FROM products WHERE name % 'postgrs';

-- GIN 索引支持 % 运算符
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- LIKE/ILIKE 也能走 trigram 索引
SELECT * FROM products WHERE name ILIKE '%postgres%';
-- 即使是前缀通配符，trigram GIN 索引也能加速
```

::: tip pg_trgm 的实际价值
模糊搜索（typo tolerance）、`LIKE '%keyword%'` 优化、自动补全。它是用 PostgreSQL 替代简单搜索需求的利器，配合 `gin_trgm_ops` 索引，`ILIKE '%xxx%'` 可以走索引扫描而不是全表扫描。
:::

## 实际搜索架构

```sql
-- 综合示例：产品搜索表
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC(10, 2),
    search_en tsvector,       -- 英文搜索向量
    search_zh tsvector,       -- 中文搜索向量
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自动更新触发器
CREATE OR REPLACE FUNCTION product_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_en := setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A')
                  || setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
    NEW.search_zh := setweight(to_tsvector('zhcn', coalesce(NEW.name, '')), 'A')
                  || setweight(to_tsvector('zhcn', coalesce(NEW.description, '')), 'B');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_search_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION product_search_update();

-- 英文搜索
CREATE INDEX idx_products_en ON products USING GIN (search_en);
CREATE INDEX idx_products_zh ON products USING GIN (search_zh);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- 综合搜索查询
SELECT id, name, price,
       ts_rank(search_en, query_en) AS rank_en,
       similarity(name, 'postgrs') AS fuzzy_score
FROM products,
     websearch_to_tsquery('english', 'postgresql database') AS query_en
WHERE search_en @@ query_en
   OR name % 'postgrs'
ORDER BY GREATEST(ts_rank(search_en, query_en), similarity(name, 'postgrs')) DESC
LIMIT 20;
```
