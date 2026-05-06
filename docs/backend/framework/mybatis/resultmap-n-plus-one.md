# ResultType 与 ResultMap

`resultType` 适合列名与属性名简单对应的场景：

```xml
<select id="selectById" resultType="UserDO">
  select id, username, status, created_at as createdAt
  from user
  where id = #{id}
</select>
```

`ResultMap` 适合以下情况：

- 数据库列名和 Java 属性名差异较多。
- 需要映射枚举、类型处理器、构造器参数。
- 一对一、一对多嵌套对象。
- 多表 JOIN 后要去重合并成对象图。

```xml
<resultMap id="UserResultMap" type="UserDO">
  <id property="id" column="id"/>
  <result property="username" column="username"/>
  <result property="status" column="status"/>
  <result property="createdAt" column="created_at"/>
</resultMap>
```

`<id>` 很关键。它不只是语义上的主键，MyBatis 在处理嵌套结果映射时会用它识别同一个父对象，避免 JOIN 后重复创建对象。复杂 `ResultMap` 里父子对象都应该尽量声明 `<id>`。

## N+1 与嵌套映射

MyBatis 的嵌套映射有两种写法：嵌套查询和嵌套结果。

嵌套查询：

```xml
<resultMap id="OrderMap" type="OrderDO">
  <id property="id" column="id"/>
  <result property="orderNo" column="order_no"/>
  <collection property="items"
              column="id"
              select="selectItemsByOrderId"/>
</resultMap>
```

它容易读，但会触发 N+1：先查订单列表，再对每个订单查一次明细。订单 100 条时，可能变成 101 次 SQL。一级缓存只能缓解“相同参数重复查询”，不能解决每个父 id 都不同的 N+1。

嵌套结果用 JOIN 一次查出：

```xml
<select id="selectOrdersWithItems" resultMap="OrderWithItemsMap">
  select
    o.id as order_id,
    o.order_no,
    i.id as item_id,
    i.sku,
    i.quantity
  from orders o
  left join order_item i on i.order_id = o.id
  where o.buyer_id = #{buyerId}
</select>

<resultMap id="OrderWithItemsMap" type="OrderDO">
  <id property="id" column="order_id"/>
  <result property="orderNo" column="order_no"/>
  <collection property="items" ofType="OrderItemDO">
    <id property="id" column="item_id"/>
    <result property="sku" column="sku"/>
    <result property="quantity" column="quantity"/>
  </collection>
</resultMap>
```

选择建议：

- 少量详情页、一对一或数据量确定很小：嵌套查询可以接受。
- 列表页展示一对多摘要：优先 JOIN + 嵌套结果，或分两次批量查询后在业务层组装。
- 一对多分页要谨慎。直接 JOIN 后分页可能分页的是展开行，不是父表行。常见做法是先分页查父 id，再按 id 批量查子表。
