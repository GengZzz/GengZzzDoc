# MySQL 读写分离

## 读写分离原理

读写分离的核心思想非常直接：**所有写操作（INSERT、UPDATE、DELETE）走主库，所有读操作（SELECT）走从库**。

在主从复制架构中，主库负责处理数据变更，通过 binlog 将变更异步同步到从库。读写分离正是利用这一特性，将读流量分散到多个从库上，从而：

- 减轻主库压力，主库专注于写入
- 横向扩展读能力，增加从库即可提升读吞吐
- 从库可配置为只读，提升数据安全性

```
                    ┌──────────┐
                    │  应用程序  │
                    └────┬─────┘
                         │
               ┌─────────┼─────────┐
               │         │         │
          ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐
          │ 主库   │ │ 从库1  │ │ 从库2  │
          │ (写)   │ │ (读)   │ │ (读)   │
          └────────┘ └────────┘ └────────┘
               │         ▲         ▲
               └─────────┴─────────┘
                  binlog 复制
```

## 实现方式

### 应用层：多数据源 + AOP 切换

最灵活的方式是在应用层维护多个数据源，通过 AOP 根据方法类型自动切换。

以 Spring Boot 为例，核心思路是：

1. 配置主库和从库两套数据源
2. 使用 `ThreadLocal` 存储当前数据源标识
3. 通过 AOP 拦截方法，在 `@Transactional` 或写方法上切换到主库

```java
// 1. 数据源枚举
public enum DataSourceType {
    MASTER,
    SLAVE
}

// 2. 数据源上下文持有者
public class DataSourceContextHolder {
    private static final ThreadLocal<DataSourceType> CONTEXT = new ThreadLocal<>();

    public static void set(DataSourceType type) {
        CONTEXT.set(type);
    }

    public static DataSourceType get() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}

// 3. 动态数据源路由
public class DynamicDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return DataSourceContextHolder.get();
    }
}

// 4. AOP 切面：根据方法类型自动切换
@Aspect
@Component
public class DataSourceAspect {

    // 写操作切入点
    @Before("@annotation(org.springframework.transaction.annotation.Transactional)")
    public void beforeTransactionalMethod() {
        DataSourceContextHolder.set(DataSourceType.MASTER);
    }

    // 读操作切入点（Service 方法名以 select/get/find/query 开头）
    @Before("execution(* com.example.service.*.select*(..)) || " +
            "execution(* com.example.service.*.get*(..)) || " +
            "execution(* com.example.service.*.find*(..)) || " +
            "execution(* com.example.service.*.query*(..)) || " +
            "execution(* com.example.service.*.list*(..)) || " +
            "execution(* com.example.service.*.count*(..))")
    public void beforeReadMethod() {
        DataSourceContextHolder.set(DataSourceType.SLAVE);
    }
}
```

::: tip 实际开发建议
方法名前缀约定是一种简单但脆弱的方案。更好的做法是自定义注解 `@Master` 和 `@Slave`，在需要明确指定数据源的方法上显式标注。`@Transactional` 默认走主库，因为事务往往涉及写操作。
:::

### 中间件方案

当数据源数量增多或需要更精细的路由策略时，引入中间件是更好的选择。

**MySQL Router**

MySQL 官方提供的轻量级中间件，适合 InnoDB Cluster 架构：

```bash
# 启动 MySQL Router，指向主从集群
mysqlrouter --bootstrap root@localhost:3306 --directory /tmp/myrouter

# 应用连接 Router 的读写端口
# 写端口: 6446 → 主库
# 读端口: 6447 → 从库（自动负载均衡）
```

**ProxySQL**

功能强大的开源代理，支持查询路由、连接池、查询缓存：

```sql
-- ProxySQL 管理界面中配置

-- 添加后端服务器
INSERT INTO mysql_servers (hostgroup_id, hostname, port) VALUES
(10, '10.0.0.1', 3306),  -- 主库，hostgroup 10
(20, '10.0.0.2', 3306),  -- 从库1，hostgroup 20
(20, '10.0.0.3', 3306);  -- 从库2，hostgroup 20

-- 配置读写分离规则
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup) VALUES
(1, 1, '^SELECT.*FOR UPDATE$', 10),    -- SELECT ... FOR UPDATE 走主库
(2, 1, '^SELECT', 20),                  -- 其他 SELECT 走从库
(3, 1, '.*', 10);                       -- 其他语句走主库

-- 创建监控用户
UPDATE global_variables SET variable_value='monitor_user' WHERE variable_name='mysql-monitor_username';
UPDATE global_variables SET variable_value='monitor_pass' WHERE variable_name='mysql-monitor_password';

LOAD MYSQL VARIABLES TO RUNTIME;
SAVE MYSQL VARIABLES TO DISK;

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

**Apache ShardingSphere**

ShardingSphere-Proxy 是一个独立的代理服务，支持读写分离、分库分表、数据加密等功能，通过 YAML 配置即可实现：

```yaml
# config-sharding.yaml
schemaName: my_database

dataSources:
  master:
    url: jdbc:mysql://10.0.0.1:3306/my_database
    username: root
    password: root123
  slave0:
    url: jdbc:mysql://10.0.0.2:3306/my_database
    username: readonly
    password: read123
  slave1:
    url: jdbc:mysql://10.0.0.3:3306/my_database
    username: readonly
    password: read123

rules:
- !READWRITE_SPLITTING
  dataSources:
    myds:
      writeDataSourceName: master
      readDataSourceNames:
        - slave0
        - slave1
      loadBalancerName: roundRobin
  loadBalancers:
    roundRobin:
      type: ROUND_ROBIN
```

### 框架支持：Spring 的 AbstractRoutingDataSource

Spring 提供的 `AbstractRoutingDataSource` 是应用层读写分离的基石。核心配置如下：

```java
@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource.master")
    public DataSource masterDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.slave")
    public DataSource slaveDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @Primary
    public DataSource routingDataSource(
            @Qualifier("masterDataSource") DataSource master,
            @Qualifier("slaveDataSource") DataSource slave) {

        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put(DataSourceType.MASTER, master);
        targetDataSources.put(DataSourceType.SLAVE, slave);

        DynamicDataSource routingDataSource = new DynamicDataSource();
        routingDataSource.setTargetDataSources(targetDataSources);
        routingDataSource.setDefaultTargetDataSource(master);
        return routingDataSource;
    }
}
```

::: danger 注意
`AbstractRoutingDataSource` 在 Spring 事务内不能切换数据源。事务开始时就已确定数据源连接，后续方法调用即使修改了 `ThreadLocal` 也不会生效。因此，读写分离切面必须在事务切面**之前**执行（通过 `@Order` 控制），且同一个事务内不应混合读写操作。
:::

## 主从延迟问题

主从延迟是读写分离架构中**最核心、最棘手**的问题。

### 延迟产生原因

主从复制是异步的（或半同步的），写入主库的数据需要经过以下流程才能在从库上可读：

1. 主库执行写入，写入 binlog
2. 从库的 IO 线程拉取 binlog 并写入 relay log
3. 从库的 SQL 线程回放 relay log

任何一个环节出现瓶颈（网络延迟、从库负载过高、大事务回放慢）都会导致延迟。

### 典型场景：写后立即读

```
用户注册流程：
  1. INSERT INTO users (name, email) VALUES ('张三', 'zhangsan@example.com')  → 主库
  2. SELECT * FROM users WHERE email = 'zhangsan@example.com'                 → 从库（可能查不到！）
```

如果从库延迟了 500ms，第二步查询就可能查不到刚刚插入的数据，导致用户看到"注册失败"或"用户不存在"。

### 解决方案

#### 方案一：强制走主库

最简单、最可靠的方案。关键业务的读操作也强制走主库。

```java
// 自定义注解
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ForceMaster {}

// AOP 处理
@Before("@annotation(forceMaster)")
public void beforeForceMaster(ForceMaster forceMaster) {
    DataSourceContextHolder.set(DataSourceType.MASTER);
}

// 使用
@ForceMaster
public User getUserAfterRegistration(String email) {
    return userMapper.selectByEmail(email);
}
```

适合场景：注册后登录、支付后查询余额、下单后查询订单状态。

#### 方案二：判断主从延迟

通过监控从库延迟程度，将读请求分流到延迟最低的从库或回退到主库。

```sql
-- 在从库上执行
SHOW SLAVE STATUS\G

-- 关注以下字段：
-- Slave_IO_Running: Yes
-- Slave_SQL_Running: Yes
-- Seconds_Behind_Master: 2     ← 关键指标，表示从库落后主库的秒数
```

在应用层实现延迟感知路由：

```java
public class DelayAwareDataSourceRouter {

    private static final int MAX_ALLOWED_DELAY_SECONDS = 1;

    public DataSource determineDataSource() {
        int delay = getSlaveDelaySeconds();

        if (delay > MAX_ALLOWED_DELAY_SECONDS || delay == -1) {
            // 延迟过大或无法获取延迟信息，回退到主库
            log.warn("从库延迟 {}秒，回退到主库", delay);
            return masterDataSource;
        }

        return selectSlaveDataSource(); // 选择延迟最低的从库
    }

    private int getSlaveDelaySeconds() {
        // 通过监控系统或直连从库查询 Seconds_Behind_Master
        // 可以缓存结果，定时刷新（如每秒刷新一次）
        return slaveDelayCache.get();
    }
}
```

::: warning 读写分离不是银弹
主从延迟是读写分离的核心难题。对于写后立即读的场景（如注册后登录），必须走主库。Seconds_Behind_Master 在某些情况下不可靠（如从库 IO 线程正常但 SQL 线程卡住），建议结合 GTID 或心跳表做更准确的判断。
:::

#### 方案三：等待 GTID 同步

如果使用 GTID 复制模式，可以让从库等待特定事务回放完毕后再执行查询。

```sql
-- 写入主库后，获取 GTID
-- 应用层记录写入时的 GTID

-- 在从库上等待该 GTID 回放完成
SELECT WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS('master_uuid:1-1000', 10);
-- 参数1: GTID 集合
-- 参数2: 超时秒数
-- 返回 0 表示成功，1 表示超时
```

应用层实现：

```java
public void writeAndWaitForSlave(Runnable writeOperation) {
    // 1. 在主库执行写操作
    String gtid = executeOnMaster(writeOperation);

    // 2. 在从库等待 GTID 同步完成
    boolean synced = waitForGtidOnSlave(gtid, TimeUnit.SECONDS.toMillis(1));

    if (!synced) {
        log.warn("GTID 同步超时，后续读操作将走主库");
        DataSourceContextHolder.set(DataSourceType.MASTER);
    }
}

private boolean waitForGtidOnSlave(String gtid, long timeoutMs) {
    String sql = "SELECT WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS(?, ?)";
    // 在从库连接上执行
    // timeout 秒 = timeoutMs / 1000
    // 返回 0 表示成功
    return jdbcTemplateSlave.queryForObject(sql, Integer.class, gtid, timeoutMs / 1000) == 0;
}
```

#### 方案四：Sleep 方案（不推荐）

写入后 `Thread.sleep(100)` 再读取。简单粗暴，但不可靠——延迟时间不可预测，且浪费线程资源。

```java
// 不推荐，仅作了解
userMapper.insert(user);
Thread.sleep(100); // 等待从库同步
User result = userMapper.selectById(user.getId()); // 仍然可能读不到
```

::: danger 不推荐使用 Sleep 方案
Sleep 时间难以准确估计：设短了可能无效，设长了浪费性能。在高并发场景下，大量线程 sleep 会消耗宝贵的线程池资源。应优先使用强制走主库或 GTID 等待方案。
:::

#### 方案五：判断从库位点

对于非 GTID 模式的复制，可以通过比较 binlog 位点来判断从库是否已经追上。

```sql
-- 主库：记录写入时的位点
SHOW MASTER STATUS;
-- File: mysql-bin.000003, Position: 15472

-- 从库：检查当前回放位点
SHOW SLAVE STATUS\G
-- Master_Log_File: mysql-bin.000003
-- Read_Master_Log_Pos: 15472
-- Exec_Master_Log_Pos: 15472  ← 如果等于主库位点，说明已同步
```

## 读负载均衡

当有多个从库时，需要一种策略来分配读请求。

### 常见策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| 轮询 (Round Robin) | 依次分配到每个从库 | 从库性能相近 |
| 加权轮询 (Weighted Round Robin) | 按权重分配 | 从库性能有差异 |
| 最少连接 (Least Connections) | 分配到当前连接数最少的从库 | 长连接场景 |
| 随机 (Random) | 随机选择 | 简单场景 |
| IP Hash | 根据客户端 IP 哈希 | 需要会话一致性 |

```java
// 简单的加权轮询实现
public class WeightedRoundRobinSlaveSelector {

    private final List<DataSource> slaves;
    private final int[] weights;
    private final AtomicInteger currentIndex = new AtomicInteger(0);
    private final int totalWeight;

    public WeightedRoundRobinSlaveSelector(List<DataSource> slaves, int[] weights) {
        this.slaves = slaves;
        this.weights = weights;
        this.totalWeight = Arrays.stream(weights).sum();
    }

    public DataSource select() {
        int index = currentIndex.getAndIncrement() % totalWeight;
        int cumulative = 0;
        for (int i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (index < cumulative) {
                return slaves.get(i);
            }
        }
        return slaves.get(0); // fallback
    }
}
```

ProxySQL 内置了多种负载均衡算法，配置时直接指定：

```sql
-- ProxySQL 中为从库组设置负载均衡策略
UPDATE mysql_hostgroups SET max_connections=200, algorithm=1 WHERE hostgroup_id=20;
-- algorithm: 0=轮询, 1=最少连接, 2=权重最低延迟, 3=权重最短时间
```

## 连接池配置

读写分离架构下，主库和从库应该使用**独立的连接池**，分别配置不同的参数。

### 主库连接池 vs 从库连接池

```yaml
spring:
  datasource:
    master:
      driver-class-name: com.mysql.cj.jdbc.Driver
      url: jdbc:mysql://10.0.0.1:3306/mydb?useSSL=false
      username: root
      password: master_pass
      hikari:
        minimum-idle: 10          # 最小空闲连接，主库保持较多连接
        maximum-pool-size: 50     # 最大连接数
        connection-timeout: 3000  # 连接超时，主库应更短
        idle-timeout: 300000      # 空闲连接超时 5 分钟
        max-lifetime: 1800000     # 连接最大存活时间 30 分钟

    slave:
      driver-class-name: com.mysql.cj.jdbc.Driver
      url: jdbc:mysql://10.0.0.2:3306/mydb?useSSL=false&readOnly=true
      username: readonly
      password: slave_pass
      hikari:
        minimum-idle: 5           # 从库可以少一些
        maximum-pool-size: 100    # 但读流量大，最大连接数要更多
        connection-timeout: 5000  # 从库超时可以稍长
        idle-timeout: 600000      # 空闲超时 10 分钟
        max-lifetime: 1800000
```

::: tip 连接池大小计算
经典的连接池大小公式：`连接数 = CPU核心数 * 2 + 磁盘数`。但对于读写分离场景，主库连接池可以更小（写操作并发通常不高），从库连接池需要更大（承担所有读流量）。实际容量需要根据压测结果调整。
:::

### 连接池监控

生产环境必须监控连接池状态，重点关注以下指标：

```java
// HikariCP 可通过 JMX 暴露连接池指标
// 关键指标：
// - ActiveConnections: 活跃连接数
// - IdleConnections: 空闲连接数
// - TotalConnections: 总连接数
// - ThreadsAwaitingConnection: 等待连接的线程数（这个值持续大于 0 说明连接池不够用）
// - ConnectionTimeoutRate: 连接获取超时率
```

```sql
-- MySQL 端也可以监控连接使用情况
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Max_used_connections';

-- 当前连接的来源分布
SELECT SUBSTRING_INDEX(host, ':', 1) AS ip, COUNT(*) AS conn_count
FROM information_schema.processlist
GROUP BY ip
ORDER BY conn_count DESC;
```
