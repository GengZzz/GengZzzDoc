---
title: "Wrapper 条件构造器"
description: "Wrapper 是 MyBatis-Plus 最常用的增强能力之一，用 Java API 构造 where、order、select 等 SQL 片段。它适合动态条件查询，但如果链式调用太长。"
---

# Wrapper 条件构造器

Wrapper 是 MyBatis-Plus 最常用的增强能力之一，用 Java API 构造 where、order、select 等 SQL 片段。它适合动态条件查询，但如果链式调用太长，会让 SQL 意图变得不直观。

## QueryWrapper 与 LambdaQueryWrapper

普通 Wrapper：

```java
QueryWrapper<UserDO> wrapper = new QueryWrapper<>();
wrapper.eq("status", 1).like("nickname", keyword);
```

Lambda Wrapper：

```java
LambdaQueryWrapper<UserDO> wrapper = Wrappers.lambdaQuery(UserDO.class)
    .eq(UserDO::getStatus, UserStatus.ENABLED)
    .like(StringUtils.hasText(keyword), UserDO::getNickname, keyword)
    .orderByDesc(UserDO::getCreatedAt);
```

日常优先使用 Lambda Wrapper，字段重构时更安全，不容易写错列名。

## 条件开关

Wrapper 很适合动态条件：

```java
wrapper
    .eq(req.getStatus() != null, UserDO::getStatus, req.getStatus())
    .ge(req.getStartTime() != null, UserDO::getCreatedAt, req.getStartTime())
    .le(req.getEndTime() != null, UserDO::getCreatedAt, req.getEndTime())
    .like(StringUtils.hasText(req.getKeyword()), UserDO::getNickname, req.getKeyword());
```

第一个 boolean 参数决定条件是否拼接。这样比一堆 if 更紧凑，但要控制长度。超过十几个条件时，建议抽出 QueryBuilder 方法或改用 XML。

## 嵌套条件

复杂 or 条件：

```java
wrapper.and(w -> w
    .eq(UserDO::getStatus, UserStatus.ENABLED)
    .or()
    .eq(UserDO::getStatus, UserStatus.LOCKED)
);
```

嵌套条件要小心括号。线上很多查询 bug 来自 `or()` 放错位置，导致租户条件、逻辑删除条件被绕开。复杂条件最好打开 SQL 日志，确认生成 SQL 和预期一致。

## select 字段

列表页不要默认查询所有字段：

```java
wrapper.select(UserDO::getId, UserDO::getNickname, UserDO::getStatus, UserDO::getCreatedAt);
```

尤其是用户头像、JSON 大字段、正文内容、扩展配置这类字段，列表页不需要就不要查。字段越多，网络传输、对象映射和内存压力越大。

## 常见坑

| 坑 | 表现 | 建议 |
| --- | --- | --- |
| 使用字符串列名 | 字段重命名后运行时报错 | 优先 Lambda Wrapper |
| `or()` 范围不清 | SQL 条件被放大 | 用 `and(w -> ...)` 明确括号 |
| Wrapper 复用 | 条件互相污染 | 每次查询新建 Wrapper |
| Controller 拼 Wrapper | HTTP 层理解数据库细节 | 放到 Service 或 QueryService |
| `last()` 拼接外部输入 | SQL 注入风险 | 禁止拼接用户输入 |
