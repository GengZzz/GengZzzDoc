---
title: "参数绑定"
description: "MyBatis 参数绑定围绕两个符号：#{} 和 ${}。"
---

# 参数绑定

MyBatis 参数绑定围绕两个符号：`#{}` 和 `${}`。

`#{}` 会生成 JDBC `?` 占位符，由 `PreparedStatement` 设置参数，能避免 SQL 注入，是日常默认选择：

```xml
where id = #{id}
```

`${}` 是字符串拼接，直接把内容拼进 SQL，只能用于无法参数化的位置，例如列名、排序方向、表名后缀。它必须配合白名单：

```java
String sortColumn = switch (request.sortBy()) {
    case "createdAt" -> "created_at";
    case "username" -> "username";
    default -> "id";
};
```

```xml
order by ${sortColumn} desc
```

多参数方法要注意命名。没有 `@Param` 时，MyBatis 可能以 `param1`、`param2` 或编译参数名识别参数，长期维护不稳定。推荐显式写：

```java
List<UserDO> listByStatus(
    @Param("status") Integer status,
    @Param("limit") int limit
);
```

```xml
where status = #{status}
limit #{limit}
```

常见参数形态：

| 方法参数 | XML 访问方式 | 说明 |
| --- | --- | --- |
| 单个简单类型 | `#{value}` 或 `#{id}` | 推荐仍使用 `@Param("id")` 保持清楚 |
| JavaBean / DTO | `#{username}`、`#{query.status}` | 通过 getter 取值 |
| `Map` | `#{key}` | 适合临时参数，不适合核心接口长期使用 |
| 多参数 | `#{param1}` 或 `@Param` 名 | 推荐 `@Param` |
| 集合 | `collection="list"` 或 `@Param("ids")` | 常配合 `<foreach>` |

## 动态 SQL

动态 SQL 解决的是“条件可选但 SQL 仍要合法”。日常最常用的标签是 `where`、`set`、`if`、`choose`、`foreach`、`trim`。

条件查询：

```xml
<select id="searchUsers" resultType="UserDO">
  select id, username, status, created_at
  from user
  <where>
    <if test="status != null">
      and status = #{status}
    </if>
    <if test="keyword != null and keyword != ''">
      and username like concat('%', #{keyword}, '%')
    </if>
    <if test="createdFrom != null">
      and created_at &gt;= #{createdFrom}
    </if>
  </where>
  order by id desc
</select>
```

`<where>` 会在内部有条件时自动补 `where`，并处理开头多余的 `and` / `or`。更新语句优先用 `<set>`：

```xml
<update id="updateSelective">
  update user
  <set>
    <if test="username != null">username = #{username},</if>
    <if test="status != null">status = #{status},</if>
    <if test="updatedAt != null">updated_at = #{updatedAt},</if>
  </set>
  where id = #{id}
</update>
```

`<foreach>` 常用于 `in` 和批量插入：

```xml
<select id="selectByIds" resultType="UserDO">
  select id, username, status
  from user
  where id in
  <foreach collection="ids" item="id" open="(" separator="," close=")">
    #{id}
  </foreach>
</select>
```

注意空集合。`where id in ()` 在多数数据库中是非法 SQL。业务层可以直接返回空列表，或者在 SQL 中显式兜底：

```xml
<choose>
  <when test="ids != null and ids.size() > 0">
    id in
    <foreach collection="ids" item="id" open="(" separator="," close=")">
      #{id}
    </foreach>
  </when>
  <otherwise>
    1 = 0
  </otherwise>
</choose>
```
