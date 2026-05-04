# PDO 数据库操作

PDO（PHP Data Objects）是 PHP 的数据库抽象层，提供统一的接口访问 MySQL、PostgreSQL、SQLite 等数据库。其预处理语句是防御 SQL 注入的核心机制。

## PDO 连接管理

```php
<?php
declare(strict_types=1);

// 基本连接
$dsn = 'mysql:host=localhost;dbname=myapp;charset=utf8mb4';
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,        // 异常模式
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,    // 关联数组
    PDO::ATTR_EMULATE_PREPARES => false,                  // 禁用模拟预处理
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
];

try {
    $pdo = new PDO($dsn, 'username', 'password', $options);
} catch (PDOException $e) {
    // 生产环境：记录日志，不要暴露连接信息
    error_log("Database connection failed: " . $e->getMessage());
    throw new RuntimeException("Database unavailable");
}

// DSN 格式示例
// MySQL:      mysql:host=localhost;dbname=test;charset=utf8mb4
// PostgreSQL: pgsql:host=localhost;port=5432;dbname=test
// SQLite:     sqlite:/path/to/database.db
// SQLite内存:  sqlite::memory:
```

::: tip 提示
`PDO::ATTR_EMULATE_PREPARES => false` 是关键安全设置。禁用模拟预处理后，PDO 使用数据库原生的预处理机制，确保参数值永远不会被拼接到 SQL 中。MySQL 默认开启模拟预处理，这是一个安全隐患。
:::

## 预处理语句与防 SQL 注入

预处理语句将 SQL 结构和数据分离：先发送 SQL 模板给数据库编译，再发送参数值。这样即使参数包含恶意 SQL，也不会被执行。

```php
<?php
declare(strict_types=1);

// 错误示范：SQL 拼接（绝对不要这样做）
$userId = $_GET['id'];  // 用户输入
$sql = "SELECT * FROM users WHERE id = $userId";
// 如果 $userId 是 "1 OR 1=1"，将返回所有用户
// 如果 $userId 是 "1; DROP TABLE users;--"，表被删除

// 正确做法：预处理语句 + 参数绑定
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$stmt->execute(['id' => $_GET['id']]);
$user = $stmt->fetch();

// 命名参数（:name 格式）
$stmt = $pdo->prepare("
    SELECT * FROM users
    WHERE email = :email AND status = :status
");
$stmt->execute([
    'email' => $userInput['email'],
    'status' => 'active',
]);
$users = $stmt->fetchAll();

// 位置参数（? 格式）
$stmt = $pdo->prepare("INSERT INTO users (name, email, age) VALUES (?, ?, ?)");
$stmt->execute(['Alice', 'alice@example.com', 25]);
$lastId = $pdo->lastInsertId();

// 批量执行（一次 prepare，多次 execute，高效）
$stmt = $pdo->prepare("INSERT INTO logs (level, message, created_at) VALUES (?, ?, ?)");
$logs = [
    ['error', 'Connection failed', '2024-01-01 10:00:00'],
    ['info', 'Retry succeeded', '2024-01-01 10:00:01'],
    ['warning', 'High latency', '2024-01-01 10:00:02'],
];
foreach ($logs as $log) {
    $stmt->execute($log);
}
// 只编译一次 SQL，执行 3 次，比拼接 3 条 SQL 快得多
```

```php
<?php
// bindValue vs bindParam 区别
// bindValue — 绑定值（立即绑定值）
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
$stmt->bindValue(':id', 42, PDO::PARAM_INT);
$stmt->execute();

// bindParam — 绑定变量引用（执行时才取值，可循环修改）
$stmt = $pdo->prepare("INSERT INTO counter (val) VALUES (:val)");
$stmt->bindParam(':val', $value, PDO::PARAM_INT);
for ($value = 1; $value <= 10; $value++) {
    $stmt->execute();  // 每次执行时取 $value 的当前值
}
```

## 事务处理

```php
<?php
declare(strict_types=1);

// 基本事务
try {
    $pdo->beginTransaction();

    // 扣减余额
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - :amount WHERE id = :id AND balance >= :amount");
    $stmt->execute(['amount' => 100, 'id' => 1]);
    if ($stmt->rowCount() === 0) {
        throw new RuntimeException("Insufficient balance");
    }

    // 增加余额
    $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + :amount WHERE id = :id");
    $stmt->execute(['amount' => 100, 'id' => 2]);

    $pdo->commit();
    echo "Transfer successful";
} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Transfer failed: " . $e->getMessage());
    throw $e;
}

// 设置保存点（嵌套事务）
$pdo->beginTransaction();
try {
    $pdo->exec("UPDATE inventory SET qty = qty - 1 WHERE product_id = 1");

    $pdo->exec("SAVEPOINT sp1");
    try {
        $pdo->exec("UPDATE bonus SET points = points + 10 WHERE user_id = 1");
        $pdo->exec("COMMIT");  // 释放 SAVEPOINT
    } catch (Exception $e) {
        $pdo->exec("ROLLBACK TO SAVEPOINT sp1");
        // bonus 更新失败，但 inventory 已更新，不回滚整个事务
    }

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
}
```

::: warning 警告
事务中不要执行耗时操作（如 HTTP 请求、邮件发送）。长时间持有数据库事务会导致锁等待，影响其他请求。如果需要执行外部操作，先完成数据库操作并提交事务，再处理外部调用。
:::

## 错误模式

```php
<?php
// PDO::ERRMODE_SILENT — 静默模式（默认）
// 不抛出异常，需手动检查错误
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
$stmt = $pdo->query("SELECT * FROM nonexistent");
if ($stmt === false) {
    echo $pdo->errorCode();    // SQLSTATE 错误码
    print_r($pdo->errorInfo()); // 详细错误信息
}

// PDO::ERRMODE_WARNING — 警告模式
// 触发 PHP Warning，但不中断执行

// PDO::ERRMODE_EXCEPTION — 异常模式（推荐）
// 抛出 PDOException，可被 try-catch 捕获
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $pdo->exec("INVALID SQL");
} catch (PDOException $e) {
    echo "SQL Error: " . $e->getMessage();
    echo "SQLSTATE: " . $e->getCode();
}
```

## 连接池概念

PHP-FPM 是多进程模型，每个进程有自己的数据库连接。没有真正的连接池，但可以通过以下方式优化：

```php
<?php
// 方案 1：持久连接（PDO::ATTR_PERSISTENT）
// 连接在脚本结束后不关闭，复用给同一进程的后续请求
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_PERSISTENT => true,  // 持久连接
]);

// 注意事项：
// - 持久连接不会复用事务状态（新请求开始时自动回滚未提交事务）
// - 不会复用 prepared statements
// - 需要调整 MySQL 的 max_connections 以匹配 PHP-FPM 进程数

// 方案 2：MySQL 持久连接池（PHP 8.1+）
// php.ini 配置：
// pdo_mysql.connection_pooling = 1

// 方案 3：使用 ProxySQL 或 MySQL Router 做连接池代理
// PHP 连接 ProxySQL（6033 端口），ProxySQL 管理到 MySQL 的连接池
```

## 读写分离封装

```php
<?php
declare(strict_types=1);

class DatabaseManager
{
    private ?PDO $writeConnection = null;
    private ?PDO $readConnection = null;
    private array $readReplicas;
    private string $dsn;
    private string $user;
    private string $pass;
    private array $options;

    public function __construct(
        string $writeHost,
        array $readReplicas,
        string $dbname,
        string $user,
        string $pass,
        array $options = []
    ) {
        $this->dsn = "mysql:host=$writeHost;dbname=$dbname;charset=utf8mb4";
        $this->readReplicas = $readReplicas;
        $this->user = $user;
        $this->pass = $pass;
        $this->options = array_merge([
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ], $options);
    }

    // 写连接（主库）
    public function write(): PDO
    {
        if ($this->writeConnection === null) {
            $this->writeConnection = new PDO($this->dsn, $this->user, $this->pass, $this->options);
        }
        return $this->writeConnection;
    }

    // 读连接（随机选一个从库）
    public function read(): PDO
    {
        if ($this->readConnection === null) {
            $replica = $this->readReplicas[array_rand($this->readReplicas)];
            $dsn = str_replace(explode(';', $this->dsn)[0], "host=$replica", $this->dsn);
            $this->readConnection = new PDO($dsn, $this->user, $this->pass, $this->options);
        }
        return $this->readConnection;
    }

    // 事务中自动使用主库
    public function transaction(callable $callback): mixed
    {
        $this->write()->beginTransaction();
        try {
            $result = $callback($this->write());
            $this->write()->commit();
            return $result;
        } catch (Exception $e) {
            $this->write()->rollBack();
            throw $e;
        }
    }
}

// 使用
$db = new DatabaseManager(
    writeHost: 'master.db.local',
    readReplicas: ['slave1.db.local', 'slave2.db.local'],
    dbname: 'myapp',
    user: 'app',
    pass: 'secret'
);

// 查询走从库
$users = $db->read()->query("SELECT * FROM users LIMIT 10")->fetchAll();

// 写入走主库
$db->transaction(function(PDO $pdo) {
    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");
});
```

## 批量插入优化

```php
<?php
declare(strict_types=1);

// 单条插入（慢）— N 次网络往返
foreach ($records as $record) {
    $stmt->execute($record);
}

// 批量插入（快）— 一次 SQL
function batchInsert(PDO $pdo, string $table, array $columns, array $records, int $batchSize = 1000): void
{
    $placeholders = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
    $columnList = implode(', ', $columns);

    foreach (array_chunk($records, $batchSize) as $batch) {
        $allPlaceholders = implode(', ', array_fill(0, count($batch), $placeholders));
        $sql = "INSERT INTO $table ($columnList) VALUES $allPlaceholders";

        $params = [];
        foreach ($batch as $record) {
            foreach ($columns as $col) {
                $params[] = $record[$col] ?? null;
            }
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
}

// 使用
$records = [
    ['name' => 'Alice', 'email' => 'alice@example.com'],
    ['name' => 'Bob', 'email' => 'bob@example.com'],
    // ... 10000 条记录
];
batchInsert($pdo, 'users', ['name', 'email'], $records, 1000);
```
