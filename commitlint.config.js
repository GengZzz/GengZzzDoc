/**
 * Conventional Commits 规范校验。
 * 允许的 type 与项目文档协作约定保持一致。
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新增内容/功能（如新文档、新组件）
        'fix', // 修复（错别字、失效链接、构建问题）
        'docs', // 文档内容更新（最常用）
        'style', // 格式调整，不影响内容含义
        'refactor', // 结构重构（如拆分配置）
        'perf', // 性能优化（构建、加载）
        'chore', // 工程化/依赖/脚手架
        'ci', // CI 配置
        'build', // 构建系统
        'revert', // 回滚
      ],
    ],
    // 中文标题常超过 72，放宽到 100
    'header-max-length': [2, 'always', 100],
    // 允许标题大小写自由（中文场景无意义）
    'subject-case': [0],
  },
};
