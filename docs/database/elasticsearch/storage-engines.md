# 存储引擎

ES 底层使用 Apache Lucene 作为存储和索引引擎。理解 Lucene 的存储结构，有助于深入理解 ES 的性能特征和优化方向。

## Lucene 存储结构

一个 ES Shard 对应一个 Lucene Index。Lucene Index 内部由多个 Segment 组成，每个 Segment 是一个独立的倒排索引。

```
Lucene Index（= ES Shard）
  ├── Segment_0
  │     ├── .tim    — Term Dictionary（Term 索引）
  │     ├── .tip    — Term Index（FST 压缩）
  │     ├── .doc    — Posting List（文档列表）
  │     ├── .pos    — Positions（词位置）
  │     ├── .pay    — Payloads（附加数据）
  │     ├── .dvd    — Doc Values（列式存储）
  │     ├── .fdx    — Stored Fields 索引
  │     ├── .fdt    — Stored Fields 数据
  │     └── .si     — Segment 信息
  ├── Segment_1
  ├── ...
  └── segments_N     — Segment 清单（Commit Point）
```

## 倒排索引实现细节

### Term Dictionary（词典）

Term Dictionary 存储了所有 Term，按字典序排列。查找一个 Term 时，ES 不会逐个遍历，而是使用 FST（Finite State Transducer）进行高效定位。

#### FST（有限状态转换器）

FST 是一种压缩的字典数据结构，兼具两个特性：

1. **前缀共享**：相同前缀的 Term 共享存储空间。`"search"`、`"searching"`、`"search engine"` 共享 `"search"` 前缀。
2. **后缀共享**：后缀也可以复用。

一个包含百万 Term 的词典，FST 可以压缩到几十 MB，并且查询时间复杂度为 O(length)，与 Term 数量无关。

```
Term Dictionary（示例）
  "apple"    → block_ptr_1
  "apply"    → block_ptr_1   (与 "apple" 共享前缀 "app")
  "banana"   → block_ptr_2
  "band"     → block_ptr_2   (与 "banana" 共享前缀 "ban")
```

FST 同时也是一个映射结构：输入一个 Term，输出其在磁盘文件中的偏移量。

### Posting List（倒排表）

Posting List 记录了每个 Term 对应的文档列表。每个 Posting 包含：

```
Posting = {
  doc_id: 42,           // 文档 ID
  term_freq: 3,         // 该 Term 在文档中出现的次数
  positions: [5, 12, 28], // 出现位置（用于短语查询）
  offsets: [(5,8), (12,15), (28,31)]  // 字符偏移（用于高亮）
}
```

#### 跳表（Skip List）加速

Posting List 中的 doc_id 是有序的。当需要合并两个 Posting List（如查询 `"search AND engine"`）时，需要遍历两个列表。跳表在 Posting List 上添加多层跳跃指针：

```
Level 2:  [1] --------→ [10] --------→ [25] --------→ [40]
Level 1:  [1] ---→ [5] ---→ [10] ---→ [15] ---→ [25] ---→ [35] ---→ [40]
Level 0:  [1][3][5][7][8][10][12][15][18][20][25][30][35][38][40]
```

假设需要查找 doc_id = 18：
- Level 2: 18 > 1, 18 < 10 → 跳到 Level 1
- Level 1: 18 > 10, 18 < 25 → 跳到 Level 0
- Level 0: 从 10 开始顺序查找 → 找到 18

跳表将查找复杂度从 O(n) 降低到 O(√n)。

#### Roaring Bitmaps

对于高基数 Term（如性别字段的 `"male"`，命中大量文档），ES 使用 Roaring Bitmap 存储 Posting List。Roaring Bitmap 将 doc_id 空间分桶，小桶用 short 数组存储，大桶用 bitmap 存储，兼顾空间和计算效率。

两个 Posting List 的交集操作（AND 查询）可以利用 bitmap 的位运算高效完成。

## Doc Values（列式存储）

倒排索引解决了"哪些文档包含某个 Term"的问题。但聚合和排序需要的是"某个文档的某个字段值"，这正好是倒排索引的逆过程。

Doc Values 是一种列式存储，按字段组织数据：

```
倒排索引：Term → [Doc1, Doc3, Doc5]   （用于搜索）
Doc Values：Doc → FieldValue           （用于排序和聚合）
```

```
Doc ID | price (Doc Values)
-------|-------------------
  1    | 29.99
  2    | 15.50
  3    | 99.00
  ...
```

### Doc Values 的特点

- **列式存储**：同一字段的所有值连续存储，磁盘顺序读取效率高。
- **不需要堆内存**：数据通过 mmap 映射到内存，由操作系统管理换入换出。不消耗 JVM 堆内存。
- **开启/关闭**：数值、日期、keyword 类型默认开启。text 类型不支持 Doc Values（分词后无法做列式存储）。

```json
{
  "mappings": {
    "properties": {
      "status": {
        "type": "keyword",
        "doc_values": true    // 默认就是 true
      }
    }
  }
}
```

::: tip 什么时候可以关闭 Doc Values
如果确定某个字段永远不需要排序、聚合或脚本访问，可以关闭 Doc Values 节省存储空间。比如日志中的 `message` 字段（text 类型本身就不支持 Doc Values）。
:::

## Stored Fields

`_source` 字段存储了文档的完整原始 JSON。它是一种行式存储（Stored Fields），与倒排索引和 Doc Values 独立存储。

### `_source` 的用途

- **Get API**：返回原始文档。
- **Update API**：取出旧文档，修改后重新索引。
- **Reindex**：从 `_source` 重建索引。
- **Highlight**：高亮时需要原文。

### 禁用 `_source`

```json
{
  "mappings": {
    "_source": {
      "enabled": false
    }
  }
}
```

::: warning 谨慎禁用 `_source`
禁用 `_source` 后无法使用 Update API、Reindex、高亮等功能。除非存储空间极其紧张，否则不要禁用。可以使用 `includes`/`excludes` 过滤不需要存储的字段来节省空间：
```json
{
  "_source": {
    "includes": ["title", "author", "created_at"],
    "excludes": ["large_content"]
  }
}
```
:::

## Term Vector

Term Vector 记录了每个 Term 在单个文档中的详细信息：词频、位置、偏移量。默认不开启，需要显式请求。

```json
{
  "mappings": {
    "properties": {
      "content": {
        "type": "text",
        "term_vector": "with_positions_offsets"
      }
    }
  }
}
```

Term Vector 的用途：

- **高亮（Highlight）**：Fast Vector Highlighter 使用 Term Vector 定位高亮位置，比默认的 Plain Highlighter 更高效。
- **文本分析**：统计文档中各 Term 的分布。
- **MLT（More Like This）**：基于 Term Vector 计算相似文档。

::: tip 存储权衡
开启 Term Vector 会显著增加存储空间（约增加 1 倍）。只在确实需要高亮性能优化或文本分析时开启。普通高亮使用默认的 Unified Highlighter 即可，它基于倒排索引实现。
:::
