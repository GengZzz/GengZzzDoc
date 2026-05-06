# 实体映射、自动填充与逻辑删除

MyBatis-Plus 实体注解决定了表名、主键、字段策略、自动填充和逻辑删除行为。这些配置看起来简单，但会影响所有通用 CRUD 的 SQL 生成。

## 表名与主键

```java
@TableName("sys_user")
public class UserDO {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String nickname;
}
```

主键策略要全项目统一：

- 自增主键适合单库单表，迁移和分库分表时限制较多。
- 雪花 ID 适合分布式生成，但前端 JavaScript 处理 Long 需要注意精度。
- UUID 可读性和索引局部性较差，通常不作为首选主键。

## 字段策略

字段可以控制插入和更新策略：

```java
@TableField(updateStrategy = FieldStrategy.NOT_NULL)
private String nickname;
```

这决定字段为 null 时是否参与 SQL。更新接口要区分“用户想清空字段”和“用户没有传字段”。如果直接把 DTO copy 到 Entity 后 `updateById`，可能出现 null 覆盖或无法清空的问题。

## 自动填充

常见审计字段：

```java
@TableField(fill = FieldFill.INSERT)
private LocalDateTime createdAt;

@TableField(fill = FieldFill.INSERT_UPDATE)
private LocalDateTime updatedAt;
```

配合 `MetaObjectHandler`：

```java
@Component
public class AuditMetaObjectHandler implements MetaObjectHandler {
    public void insertFill(MetaObject metaObject) {
        strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
        strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }

    public void updateFill(MetaObject metaObject) {
        strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
```

自动填充适合创建时间、更新时间、创建人、更新人。不要把业务状态变化隐藏在自动填充里，否则排查困难。

## 逻辑删除

```java
@TableLogic
private Integer deleted;
```

启用后，通用删除会变成 update，通用查询会自动追加未删除条件。注意：

- 唯一索引要考虑逻辑删除。例如手机号唯一时，删除后是否允许重新注册。
- 自定义 SQL 不一定自动处理逻辑删除，需要自己确认。
- 统计、导出、后台回收站可能需要显式查询已删除数据。
- 逻辑删除不是审计系统，重要业务还需要操作日志。

## 实体边界

Entity 是数据库映射对象，不等于 API 响应对象。不要直接把 Entity 返回给前端。推荐使用：

- Request DTO：接收输入。
- Entity / DO：数据库映射。
- VO / Resource：返回前端。
- Convert / MapStruct：做对象转换。
