---
title: "一级缓存、二级缓存与 CacheKey"
description: "缓存是 MyBatis 面试常问、线上也常踩坑的部分。先用动画看边界。"
---

<script setup>
import MyBatisExecutorFlowDemo from '../../../.vitepress/theme/components/MyBatisExecutorFlowDemo.vue'
import MyBatisCacheKeyDemo from '../../../.vitepress/theme/components/MyBatisCacheKeyDemo.vue'
</script>

# 一级缓存、二级缓存与 CacheKey

缓存是 MyBatis 面试常问、线上也常踩坑的部分。先用动画看边界。

<MyBatisCacheKeyDemo />

一级缓存默认开启，作用域是 `SqlSession`。同一个 `SqlSession` 中，相同 `MappedStatement`、分页信息、最终 SQL、参数和环境生成的 `CacheKey` 一致时，第二次查询会直接命中本地缓存。

`CacheKey` 通常由这些信息参与计算：

- `MappedStatement` id，例如 `UserMapper.selectById`。
- `RowBounds` 的 offset 和 limit。
- 最终 SQL 文本，动态 SQL 条件不同则不同。
- 参数值，`id=1` 和 `id=2` 是不同 key。
- 环境 id，区分不同数据源环境。

一级缓存失效或清空的典型时机：

- 同一个 `SqlSession` 执行 `insert`、`update`、`delete`，默认会清空本地缓存。
- 手动调用 `clearCache()`。
- 会话关闭。
- `localCacheScope=STATEMENT` 时，每条语句后缓存即失效。

二级缓存是 namespace 级别缓存，需要显式开启并在 Mapper XML 中声明：

```xml
<mapper namespace="com.example.user.UserMapper">
  <cache eviction="LRU" flushInterval="60000" size="512" readOnly="false"/>
</mapper>
```

二级缓存不是“业务缓存”的替代品。它的边界是 Mapper namespace，失效粒度也偏粗：同 namespace 下写操作通常会刷新该 namespace 的缓存。跨 Mapper、跨表 JOIN、权限相关数据、强一致读，一般不建议依赖二级缓存。生产项目里更常见的是关闭二级缓存，用 Redis / Caffeine 等业务缓存承接明确的缓存需求。

## Executor 类型

`Executor` 决定语句如何被执行，常见三种类型：

| 类型 | 行为 | 适用场景 | 注意点 |
| --- | --- | --- | --- |
| `SIMPLE` | 每次执行都创建新的 Statement | 默认、最通用 | 简单可靠 |
| `REUSE` | 复用相同 SQL 的 Statement | 同会话内重复执行相同 SQL | 注意连接和 Statement 生命周期 |
| `BATCH` | 批量缓存写操作，统一 flush | 大量 insert/update | 需要处理返回值、异常定位和事务提交 |

Spring Boot 中可配置：

```yaml
mybatis:
  executor-type: batch
```

但不建议全局轻易切到 `BATCH`。批处理语义会影响所有 Mapper 写操作，更常见的做法是在专门的批量导入服务中使用批量会话或框架提供的批量能力。
