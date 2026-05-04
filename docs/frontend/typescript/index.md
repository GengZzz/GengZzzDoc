# TypeScript

TypeScript 是 JavaScript 的超集，由微软开发和维护。它在 JavaScript 的基础上添加了静态类型系统、接口、泛型等特性，使开发者在编码阶段就能发现类型错误，显著提升大型项目的可维护性和开发体验。TypeScript 代码最终会被编译为纯 JavaScript 运行。

<TsTypeSystemDemo />

## 学习路径

| 章节 | 内容 |
| --- | --- |
| [简介与环境搭建](./introduction-setup) | TypeScript 是什么、安装配置、tsconfig.json 核心配置、编译流程 |
| [基础类型](./basic-types) | string/number/boolean/null/undefined/void/never/any/unknown、字面量类型、联合类型 |
| [类型断言](./type-assertion) | as 语法、非空断言、const 断言、双重断言 |
| [接口](./interfaces) | 定义对象形状、可选/只读属性、扩展接口、函数类型接口、索引签名 |
| [类型别名](./type-aliases) | type vs interface、交叉类型、类型守卫 |
| [枚举与元组](./enum-tuples) | 数字/字符串/常量枚举、元组类型、命名元组、只读元组 |
| [函数](./functions) | 参数类型、返回值类型、可选/默认/剩余参数、this 绑定、函数重载 |
| [泛型](./generics) | 泛型函数、泛型约束、keyof、默认类型参数、条件类型 |
| [工具类型](./utility-types) | Partial/Required/Readonly/Pick/Omit/Record/Exclude/Extract/ReturnType/Parameters |
| [类](./classes) | 属性类型、访问修饰符、构造函数参数属性、abstract 类、implements |
| [装饰器](./decorators) | 类/方法/属性/参数装饰器、装饰器工厂、执行顺序 |
| [模块与命名空间](./modules-namespaces) | import/export、类型导入、动态导入、命名空间 |
| [声明文件](./declaration-files) | .d.ts 格式、declare module/namespace/global、@types 包 |
| [tsconfig 完整指南](./tsconfig) | compilerOptions 常用配置、include/exclude、项目引用 |
| [高级类型](./advanced-types) | 条件类型、infer、映射类型、模板字面量类型、递归类型 |
| [类型守卫与收窄](./type-guard-narrowing) | typeof/instanceof/in/自定义守卫/判别联合/穷尽检查 |
| [最佳实践](./best-practices) | any vs unknown、类型体操边界、Vue/React 中的 TS 写法 |

<TsGenericsDemo />

## 适合谁读

- 有 JavaScript 基础，想系统学习 TypeScript 的开发者
- 正在使用 Vue 3 / React / Node.js 并希望提升类型安全的工程师
- 需要理解 TypeScript 类型系统底层机制的架构师

## 前置知识

- JavaScript ES6+ 语法（箭头函数、解构、模块等）
- 基本的命令行操作
- Node.js 基础（用于运行 tsc）

<TsTypeInferenceDemo />
