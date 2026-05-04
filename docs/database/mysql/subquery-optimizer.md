# 子查询优化

## 子查询类型

按返回结果的维度，子查询可分为以下几类。

### 标量子查询

返回**单行单列**的子查询，可以用在 `=`、`>`、`<` 等比较运算符的右侧。

```sql
-- 查找工资高于平均工资的员工
SELECT emp_no, salary
FROM salaries
WHERE salary > (SELECT AVG(salary) FROM salaries);

-- 标量子查询也可用于 SELECT 列表
SELECT
    e.emp_no,
    e.first_name,
    (SELECT salary FROM salaries s
     WHERE s.emp_no = e.emp_no ORDER BY s.to_date DESC LIMIT 1) AS current_salary
FROM employees e
LIMIT 10;
```

### 行子查询

返回**单行多列**的子查询，可与行构造符 `(col1, col2)` 做比较。

```sql
-- 查找与员工 10001 同部门同职级的员工
SELECT emp_no, first_name, last_name
FROM employees
WHERE (dept_no, title) = (
    SELECT dept_no, title
    FROM dept_emp de
    JOIN titles t USING(emp_no)
    WHERE de.emp_no = 10001
    LIMIT 1
);
```

### 列子查询

返回**多行单列**的子查询，通常与 `IN`、`ANY`、`ALL` 搭配使用。

```sql
-- IN + 列子查询
SELECT emp_no, first_name
FROM employees
WHERE emp_no IN (
    SELECT emp_no FROM dept_emp WHERE dept_no = 'd005'
);

-- NOT IN 需要注意 NULL 问题
-- 如果子查询结果包含 NULL，NOT IN 永远返回空
SELECT * FROM employees
WHERE emp_no NOT IN (SELECT emp_no FROM dept_emp WHERE dept_no IS NOT NULL);

-- ANY / SOME: 满足任一条件即可
SELECT emp_no, salary
FROM salaries
WHERE salary > ANY (
    SELECT salary FROM salaries WHERE emp_no IN (10001, 10002)
);

-- ALL: 必须满足所有条件
SELECT emp_no, salary
FROM salaries
WHERE salary > ALL (
    SELECT salary FROM salaries WHERE emp_no IN (10001, 10002)
);
```

### 表子查询

返回**多行多列**的子查询，通常用在 `FROM` 子句中作为派生表。

```sql
-- 派生表：各部门平均工资
SELECT dept_no, avg_sal
FROM (
    SELECT de.dept_no, AVG(s.salary) AS avg_sal
    FROM dept_emp de
    JOIN salaries s USING(emp_no)
    GROUP BY de.dept_no
) AS dept_avg
WHERE avg_sal > 60000;
```

### EXISTS 子查询

不关心子查询返回什么数据，只关心**是否有结果集**。

```sql
-- 查找有经理的部门
SELECT d.dept_no, d.dept_name
FROM departments d
WHERE EXISTS (
    SELECT 1 FROM dept_manager dm
    WHERE dm.dept_no = d.dept_no
);

-- NOT EXISTS: 查找没有员工的部门
SELECT d.dept_no, d.dept_name
FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM dept_emp de
    WHERE de.dept_no = d.dept_no
);
```

## 子查询优化策略

MySQL 优化器对子查询的处理并非简单地逐行执行，而是会尝试将其转换为更高效的执行方式。

### 标量子查询优化

在 MySQL 8.0.24 之前，SELECT 列表中的标量子查询在每一行外查询都会执行一次。8.0.24 引入了**物化子查询缓存**，对标量子查询结果进行缓存。

```sql
-- 优化器可能将相关标量子查询转为 JOIN
-- 原始写法
SELECT e.emp_no,
       (SELECT MAX(salary) FROM salaries s WHERE s.emp_no = e.emp_no) AS max_sal
FROM employees e;

-- 优化器可能等价改写为
SELECT e.emp_no, agg.max_sal
FROM employees e
JOIN (
    SELECT emp_no, MAX(salary) AS max_sal
    FROM salaries
    GROUP BY emp_no
) agg ON agg.emp_no = e.emp_no;
```

### IN 子查询的半连接优化

半连接（Semi-Join）是 MySQL 5.6+ 针对 `IN (SELECT ...)` 子查询的核心优化手段。

```sql
-- 原始子查询
SELECT * FROM employees e
WHERE e.emp_no IN (
    SELECT emp_no FROM dept_emp WHERE dept_no = 'd005'
);
```

优化器会将上述查询转换为半连接，具体策略包括：

| 策略 | 说明 |
|------|------|
| **Table Pullout** | 子查询表拉到外层，变成 JOIN |
| **Duplicate Weedout** | JOIN 后用临时表去重 |
| **LooseScan** | 利用索引扫描子查询表，取每组第一条匹配 |
| **Materialization** | 将子查询结果物化为临时表，再做 JOIN |
| **FirstMatch** | 找到第一条匹配即返回 |

```sql
-- 查看优化器选择了哪种半连接策略
EXPLAIN SELECT * FROM employees e
WHERE e.emp_no IN (
    SELECT emp_no FROM dept_emp WHERE dept_no = 'd005'
);
-- Extra 列可能显示 Start temporary / End temporary (Duplicate Weedout)
-- 或 FirstMatch(e) 等信息
```

::: tip 物化子查询
对于非相关子查询，MySQL 会将结果写入内部临时表（Memory 引擎或 InnoDB 临时表），并自动建立唯一索引去重。这种方式称为**物化（Materialization）**，与半连接不同——物化适用于不能做半连接的场景（如 NOT IN、FROM 子句中的子查询）。
:::

### EXISTS 的执行逻辑

```sql
-- 相关子查询：对外层每一行，执行一次子查询
SELECT * FROM departments d
WHERE EXISTS (
    SELECT 1 FROM dept_manager dm WHERE dm.dept_no = d.dept_no
);
```

对于 `EXISTS`，优化器通常也会尝试转换为半连接或 JOIN。对于 `NOT EXISTS`，由于语义上是反半连接（Anti-Join），优化空间有限，但 MySQL 8.0 仍然会尝试优化。

```sql
-- NOT EXISTS vs NOT IN
-- NOT EXISTS 不受 NULL 影响
SELECT * FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM dept_emp de WHERE de.dept_no = d.dept_no
);
-- 比 NOT IN 更安全，且优化器处理更高效
```

::: warning NOT IN 陷阱
`NOT IN (subquery)` 如果子查询结果含 NULL，整个表达式返回 NULL（等同于 false），导致查不到任何数据。始终优先使用 `NOT EXISTS`。
:::

## 优化器成本模型

MySQL 优化器是**基于成本（Cost-Based Optimizer, CBO）**的，它会估算每个可能的执行计划的成本，选择成本最低的方案。

### 统计信息

优化器依赖以下统计信息做出决策：

```sql
-- 查看表的统计信息
SELECT * FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'employees' AND TABLE_NAME = 'salaries';

-- 关键字段：
-- TABLE_ROWS: 表行数估算
-- AVG_ROW_LENGTH: 平均行长度
-- DATA_LENGTH: 数据大小
-- INDEX_LENGTH: 索引大小
```

```sql
-- 查看索引统计信息
SELECT * FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'employees' AND TABLE_NAME = 'salaries';

-- 关键字段：
-- INDEX_NAME: 索引名
-- SEQ_IN_INDEX: 索引列顺序
-- CARDINALITY: 索引列的基数（不同值的数量）
-- SUB_PART: 前缀索引长度（NULL 表示全列索引）
```

### ANALYZE TABLE

手动更新统计信息，让优化器做出更准确的判断：

```sql
-- 更新表的统计信息
ANALYZE TABLE employees.salaries;

-- ANALYZE TABLE 会：
-- 1. 重新计算索引的 CARDINALITY
-- 2. 更新 information_schema.STATISTICS
-- 3. 不锁表（MySQL 5.6+）
```

::: tip 自动更新
InnoDB 会在后台自动更新统计信息（当表中约 1/16 的数据发生变化时触发）。但在大批量导入数据后，建议手动执行 `ANALYZE TABLE`。
:::

### Index Dive vs Index Statistics

MySQL 估算 `WHERE col BETWEEN x AND y` 或 `WHERE col = value` 这类范围查询的行数时，有两种方式：

**Index Statistics（索引统计）**：直接使用 `CARDINALITY` 等统计信息，速度快但不精确。

**Index Dive（索引潜水）**：真正走到 B+ 树的叶子节点，精确计算范围内有多少条记录。

```sql
-- index dive 的触发阈值由参数控制
SHOW VARIABLES LIKE 'eq_range_index_dive_limit';
-- 默认值 200
-- 当 IN 列表中的值不超过 200 个时，使用 index dive
-- 超过 200 个时，退化为使用 index statistics
```

::: warning eq_range_index_dive_limit 调优
如果你的查询经常使用 `IN (1, 2, 3, ..., 500)` 这种大列表，可以把 `eq_range_index_dive_limit` 调大，让优化器进行更精确的估算，但会增加优化阶段的开销。

```sql
SET SESSION eq_range_index_dive_limit = 500;
```
:::

## 直方图 (Histogram) — MySQL 8.0+

直方图让优化器了解列值的**分布情况**，对于非索引列的查询优化尤为重要。

```sql
-- 创建直方图
ANALYZE TABLE employees.salaries
  UPDATE HISTOGRAM ON salary;

-- 创建直方图（指定桶数量，默认 100）
ANALYZE TABLE employees.salaries
  UPDATE HISTOGRAM ON salary WITH 200 BUCKETS;

-- 查看直方图信息
SELECT * FROM information_schema.COLUMN_STATISTICS
WHERE TABLE_SCHEMA = 'employees' AND TABLE_NAME = 'salaries';

-- 删除直方图
ANALYZE TABLE employees.salaries
  DROP HISTOGRAM ON salary;
```

直方图有两类：
- **Singleton**：每个值一个桶，适合离散值较少的列（如枚举）
- **Equi-height**（等高直方图）：每个桶包含大致相同数量的行，适合连续值（如金额、时间戳）

```sql
-- 实际场景：查询优化器利用直方图判断选择率
-- 假设 salary 列有直方图
SELECT * FROM salaries
WHERE salary BETWEEN 50000 AND 60000;
-- 优化器通过直方图估算该范围的行数比例
-- 比仅依赖 index dive 更准确
```

::: tip 直方图适用场景
- 列没有索引但经常出现在 WHERE 条件中
- 列值分布不均匀（如 90% 的数据集中在某几个值）
- 不适合高频更新的列（需要频繁重建直方图）
:::

## 优化器开关 (optimizer_switch)

`optimizer_switch` 是一个系统变量，包含多个子开关，控制优化器的各种行为。

```sql
-- 查看当前优化器开关
SELECT @@optimizer_switch\G

-- 典型输出（部分）：
-- index_merge=on,
-- index_merge_union=on,
-- index_merge_sort_union=on,
-- index_merge_intersection=on,
-- engine_condition_pushdown=on,
-- index_condition_pushdown=on,
-- mrr=on,
-- mrr_cost_based=on,
-- block_nested_loop=on,
-- batched_key_access=off,
-- materialization=on,
-- semijoin=on,
-- loosescan=on,
-- firstmatch=on,
-- duplicateweedout=on,
-- subquery_materialization_cost_based=on,
-- use_index_extensions=on,
-- condition_fanout_filter=on,
-- derived_merge=on,
-- use_invisible_indexes=off,
-- skip_scan=on,
-- hash_join=on,
-- subquery_to_derived=off,
-- prefer_ordering_index=on,
-- hypergraph_optimizer=off,
-- derived_condition_pushdown=on
```

常用开关操作：

```sql
-- 关闭半连接优化（用于对比测试）
SET optimizer_switch = 'semijoin=off';

-- 关闭物化优化
SET optimizer_switch = 'materialization=off';

-- 关闭所有子查询优化（极端调试场景）
SET optimizer_switch = 'semijoin=off,materialization=off,subquery_materialization_cost_based=off';

-- 恢复默认值
SET optimizer_switch = DEFAULT;
```

::: danger 线上谨慎修改
修改 `optimizer_switch` 仅影响当前会话（若用 `SET SESSION`）或新连接（若用 `SET GLOBAL`）。在线上环境关闭优化开关可能导致查询性能急剧下降，务必在测试环境充分验证。
:::

## 子查询 vs JOIN 的选择

### 性能对比原则

```sql
-- 子查询写法
SELECT * FROM employees e
WHERE e.emp_no IN (
    SELECT emp_no FROM dept_emp WHERE dept_no = 'd005'
);

-- JOIN 写法（等价语义，但可能返回重复行）
SELECT DISTINCT e.*
FROM employees e
JOIN dept_emp de ON e.emp_no = de.emp_no
WHERE de.dept_no = 'd005';
```

| 场景 | 推荐方式 | 原因 |
|------|----------|------|
| IN + 非相关子查询 | 子查询或 JOIN 均可 | 优化器通常能转为半连接，性能接近 |
| NOT IN | 改为 NOT EXISTS 或 LEFT JOIN + IS NULL | NOT IN 有 NULL 陷阱，且优化空间有限 |
| EXISTS / NOT EXISTS | EXISTS | 语义清晰，优化器能有效处理 |
| 需要聚合子查询结果 | JOIN + GROUP BY | 子查询中做聚合后 JOIN 回主表 |
| 子查询在 FROM 子句 | 保持派生表写法 | 优化器会自动物化或合并 |

### 具体优化建议

```sql
-- 反模式：在 SELECT 列表中放相关子查询（每行执行一次）
SELECT e.emp_no,
       (SELECT dept_name FROM departments d
        JOIN dept_emp de ON d.dept_no = de.dept_no
        WHERE de.emp_no = e.emp_no LIMIT 1) AS dept_name,
       (SELECT title FROM titles t
        WHERE t.emp_no = e.emp_no LIMIT 1) AS title
FROM employees e;
-- 每行执行 2 次子查询，N 行 = 2N 次查询

-- 优化：改为 JOIN
SELECT e.emp_no, d.dept_name, t.title
FROM employees e
LEFT JOIN dept_emp de ON e.emp_no = de.emp_no
LEFT JOIN departments d ON de.dept_no = d.dept_no
LEFT JOIN titles t ON e.emp_no = t.emp_no;
```

```sql
-- 反模式：嵌套多层子查询
SELECT * FROM employees
WHERE emp_no IN (
    SELECT emp_no FROM salaries
    WHERE salary > (
        SELECT AVG(salary) FROM salaries
    )
);

-- 优化：JOIN + 派生表
SELECT e.*
FROM employees e
JOIN salaries s ON e.emp_no = s.emp_no
WHERE s.salary > (SELECT AVG(salary) FROM salaries);
```

::: tip EXPLAIN 验证
无论选择子查询还是 JOIN，都必须通过 `EXPLAIN`（或 `EXPLAIN ANALYZE`，MySQL 8.0.18+）确认实际执行计划。优化器的改写结果取决于数据分布、索引结构和统计信息，不能仅凭经验判断。

```sql
EXPLAIN FORMAT=JSON
SELECT * FROM employees WHERE emp_no IN (SELECT emp_no FROM dept_emp WHERE dept_no = 'd005');
```
:::
