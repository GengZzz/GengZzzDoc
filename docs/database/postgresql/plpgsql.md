# PL/pgSQL

PL/pgSQL 是 PostgreSQL 内置的过程化语言，支持变量、控制流、异常处理、游标等。存储过程和函数可以将业务逻辑封装在数据库层，减少应用与数据库之间的往返次数。

## 函数与存储过程

### 基本函数

```sql
-- 简单函数：返回标量值
CREATE OR REPLACE FUNCTION get_user_order_count(p_user_id INT)
RETURNS BIGINT AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM orders WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- 调用
SELECT get_user_order_count(42);

-- 返回 SETOF（多行结果）
CREATE OR REPLACE FUNCTION get_top_users(p_limit INT DEFAULT 10)
RETURNS TABLE(user_id INT, total_amount NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT o.user_id, SUM(o.amount) AS total_amount
    FROM orders o
    GROUP BY o.user_id
    ORDER BY total_amount DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 使用
SELECT * FROM get_top_users(5);
```

### 存储过程（PostgreSQL 11+）

```sql
-- 存储过程可以包含事务控制（COMMIT/ROLLBACK）
-- 函数不行
CREATE OR REPLACE PROCEDURE transfer_funds(
    p_from_account INT,
    p_to_account INT,
    p_amount NUMERIC
) AS $$
BEGIN
    UPDATE accounts SET balance = balance - p_amount
    WHERE id = p_from_account;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account % not found', p_from_account;
    END IF;

    UPDATE accounts SET balance = balance + p_amount
    WHERE id = p_to_account;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account % not found', p_to_account;
    END IF;

    INSERT INTO transfers (from_id, to_id, amount, created_at)
    VALUES (p_from_account, p_to_account, p_amount, NOW());

    COMMIT;  -- 存储过程中可以 COMMIT
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- 调用
CALL transfer_funds(1, 2, 100.00);
```

::: tip 函数 vs 存储过程
函数用 `CREATE FUNCTION`，通过 `SELECT` 调用，可以返回值，不能有事务控制。存储过程用 `CREATE PROCEDURE`，通过 `CALL` 调用，不能返回值（但可以通过 OUT 参数），可以有 `COMMIT`/`ROLLBACK`。
:::

## 变量与类型

```sql
CREATE OR REPLACE FUNCTION demo_variables()
RETURNS TEXT AS $$
DECLARE
    -- 基本变量
    v_count INT := 0;
    v_name TEXT DEFAULT 'unknown';
    v_price NUMERIC(10, 2);

    -- 使用 %TYPE 引用列类型
    v_user_name users.name%TYPE;

    -- 使用 %ROWTYPE 引用整行类型
    v_user users%ROWTYPE;

    -- 自定义 RECORD
    v_rec RECORD;
BEGIN
    -- 赋值
    v_count := 10;
    SELECT name INTO v_user_name FROM users WHERE id = 1;

    -- 查询整行
    SELECT * INTO v_user FROM users WHERE id = 1;
    RAISE NOTICE 'User: %, Email: %', v_user.name, v_user.email;

    -- RECORD 用于循环
    FOR v_rec IN SELECT id, name FROM users LIMIT 5 LOOP
        RAISE NOTICE 'ID: %, Name: %', v_rec.id, v_rec.name;
    END LOOP;

    RETURN v_name;
END;
$$ LANGUAGE plpgsql;
```

## 控制流

```sql
CREATE OR REPLACE FUNCTION classify_order(p_amount NUMERIC)
RETURNS TEXT AS $$
BEGIN
    -- IF / ELSIF / ELSE
    IF p_amount < 0 THEN
        RAISE EXCEPTION 'Amount must be non-negative';
    ELSIF p_amount < 100 THEN
        RETURN 'small';
    ELSIF p_amount < 1000 THEN
        RETURN 'medium';
    ELSE
        RETURN 'large';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- CASE 语句
CREATE OR REPLACE FUNCTION order_status_label(p_status TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE p_status
        WHEN 'pending' THEN '待处理'
        WHEN 'confirmed' THEN '已确认'
        WHEN 'shipped' THEN '已发货'
        WHEN 'completed' THEN '已完成'
        WHEN 'cancelled' THEN '已取消'
        ELSE '未知状态'
    END;
END;
$$ LANGUAGE plpgsql;
```

### 循环

```sql
-- LOOP + EXIT
CREATE OR REPLACE FUNCTION fibonacci(n INT)
RETURNS INT AS $$
DECLARE
    a INT := 0;
    b INT := 1;
    i INT := 0;
BEGIN
    IF n <= 0 THEN RETURN 0; END IF;

    LOOP
        EXIT WHEN i >= n;
        a := a + b;
        b := a - b;
        i := i + 1;
    END LOOP;

    RETURN a;
END;
$$ LANGUAGE plpgsql;

-- FOR 循环
CREATE OR REPLACE FUNCTION factorial(n INT)
RETURNS BIGINT AS $$
DECLARE
    result BIGINT := 1;
BEGIN
    FOR i IN 1..n LOOP
        result := result * i;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- FOR 循环（倒序）
FOR i IN REVERSE 10..1 LOOP
    RAISE NOTICE '%', i;
END LOOP;

-- FOREACH（遍历数组）
CREATE OR REPLACE FUNCTION sum_array(arr INT[])
RETURNS INT AS $$
DECLARE
    total INT := 0;
    val INT;
BEGIN
    FOREACH val IN ARRAY arr LOOP
        total := total + val;
    END LOOP;
    RETURN total;
END;
$$ LANGUAGE plpgsql;
```

## 触发器

触发器在数据变更时自动执行，是实现审计日志、数据校验、级联操作的标准方式。

### 行级触发器

```sql
-- 审计表
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT DEFAULT current_user,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 为表创建触发器
CREATE TRIGGER trg_orders_audit
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- BEFORE 触发器：数据校验
CREATE OR REPLACE FUNCTION validate_order()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Order amount must be positive: %', NEW.amount;
    END IF;

    IF NEW.status NOT IN ('pending', 'confirmed', 'shipped', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;

    -- 自动设置 updated_at
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_validate
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION validate_order();
```

::: tip 触发器变量
PL/pgSQL 触发器函数中有特殊变量：`TG_OP`（INSERT/UPDATE/DELETE）、`TG_TABLE_NAME`、`NEW`（新数据）、`OLD`（旧数据）、`TG_WHEN`（BEFORE/AFTER）、`TG_LEVEL`（ROW/STATEMENT）。
:::

## 异常处理

```sql
CREATE OR REPLACE FUNCTION safe_insert_order(
    p_user_id INT,
    p_amount NUMERIC
) RETURNS INT AS $$
DECLARE
    v_order_id INT;
BEGIN
    INSERT INTO orders (user_id, amount, status)
    VALUES (p_user_id, p_amount, 'pending')
    RETURNING id INTO v_order_id;

    RETURN v_order_id;

EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Duplicate order detected for user %', p_user_id;
        RETURN NULL;

    WHEN foreign_key_violation THEN
        RAISE WARNING 'User % does not exist', p_user_id;
        RETURN NULL;

    WHEN check_violation THEN
        RAISE WARNING 'Check constraint violation for amount %', p_amount;
        RETURN NULL;

    WHEN OTHERS THEN
        -- 捕获所有其他异常
        RAISE WARNING 'Unexpected error: % %', SQLSTATE, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### 错误代码速查

```sql
-- 常用 SQLSTATE 错误代码
-- 23505: unique_violation
-- 23503: foreign_key_violation
-- 23514: check_violation
-- 23502: not_null_violation
-- 40001: serialization_failure (可重试)
-- 40P01: deadlock_detected (可重试)

-- 事务失败重试模式
CREATE OR REPLACE FUNCTION safe_transfer(
    p_from INT, p_to INT, p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_retries INT := 0;
    v_max_retries INT := 3;
BEGIN
    LOOP
        BEGIN
            UPDATE accounts SET balance = balance - p_amount WHERE id = p_from;
            UPDATE accounts SET balance = balance + p_amount WHERE id = p_to;
            RETURN TRUE;
        EXCEPTION
            WHEN serialization_failure OR deadlock_detected THEN
                v_retries := v_retries + 1;
                IF v_retries >= v_max_retries THEN
                    RAISE EXCEPTION 'Transaction failed after % retries', v_max_retries;
                END IF;
                PERFORM pg_sleep(0.1 * v_retries);  -- 指数退避
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## RETURN QUERY

RETURN QUERY 可以在函数中分批返回结果集：

```sql
CREATE OR REPLACE FUNCTION get_user_orders(
    p_user_id INT,
    p_status TEXT DEFAULT NULL
) RETURNS TABLE(
    order_id INT,
    amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- 可以多次 RETURN QUERY，结果会合并
    IF p_status IS NULL THEN
        RETURN QUERY
        SELECT o.id, o.amount, o.status, o.created_at
        FROM orders o
        WHERE o.user_id = p_user_id
        ORDER BY o.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT o.id, o.amount, o.status, o.created_at
        FROM orders o
        WHERE o.user_id = p_user_id AND o.status = p_status
        ORDER BY o.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## RAISE 日志

```sql
-- 日志级别：DEBUG / LOG / NOTICE / WARNING / EXCEPTION
RAISE DEBUG 'Processing user_id=%', p_user_id;
RAISE LOG 'Slow query detected: %', v_query_text;
RAISE NOTICE 'Order % created', v_order_id;
RAISE WARNING 'Deprecated function called';
RAISE EXCEPTION 'Critical error: %', v_error_msg;

-- 带上下文信息
RAISE NOTICE 'Processing order % for user %', v_order_id, p_user_id
    USING HINT = 'Check if the user is active',
          ERRCODE = 'P0001';  -- 自定义错误码（以 P 开头）
```
