import { defineConfig } from 'vitepress'

const giteeIcon = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M12 2.4a9.6 9.6 0 1 0 0 19.2 9.6 9.6 0 0 0 0-19.2Zm4.84 7.78h-6.46a.86.86 0 0 0-.86.86v1.16h5.34c.48 0 .86.39.86.86v.72a3.44 3.44 0 0 1-3.44 3.44H8.9a2.58 2.58 0 0 1-2.58-2.58V10.4A3.44 3.44 0 0 1 9.76 6.96h7.08c.48 0 .86.39.86.86v1.5a.86.86 0 0 1-.86.86Zm-7.32 4.42v.42c0 .47.39.86.86.86h1.9c.63 0 1.17-.43 1.31-1.02l.06-.26H9.52Z"/>
</svg>`

export default defineConfig({
  title: 'GengZzzDoc',
  description: '一份持续维护的技术文档',
  lang: 'zh-CN',
  base: '/GengZzzDoc/',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '前端', link: '/frontend/' },
      {
        text: '服务端',
        items: [
          { text: 'C', link: '/backend/c/' },
          { text: 'C++', link: '/backend/cpp/' },
          { text: 'Java', link: '/backend/java/' },
          { text: 'Python', link: '/backend/python/' }
        ]
      },
      { text: '数据库', link: '/database/' },
      { text: 'CICD', link: '/cicd/' },
      { text: '插件', link: '/plugins/' },
      { text: '操作系统', link: '/os/' },
      { text: '工具', link: '/tools/' },
      { text: 'AI', link: '/ai/' },
      { text: '其他', link: '/other/' }
    ],
    sidebar: {
      '/backend/c/': [
        {
          text: 'C 语言',
          items: [
            { text: '概览', link: '/backend/c/' },
            { text: '程序设计与 C 语言', link: '/backend/c/getting-started' },
            { text: '计算、变量与表达式', link: '/backend/c/calculation-variables-expressions' },
            { text: '判断与循环', link: '/backend/c/conditions-loops' },
            { text: '循环控制与枚举', link: '/backend/c/loop-control' },
            { text: '数组与函数', link: '/backend/c/arrays-functions' },
            { text: '数组运算与算法入门', link: '/backend/c/array-algorithms' },
            { text: '指针与字符串', link: '/backend/c/pointers-strings' },
            { text: '工程实践', link: '/backend/c/engineering-practice' }
          ]
        },
        {
          text: '兼容入口',
          collapsed: true,
          items: [
            { text: '语言基础', link: '/backend/c/language-basics' },
            { text: '内存管理', link: '/backend/c/memory-management' },
            { text: '网络编程', link: '/backend/c/network-programming' }
          ]
        }
      ],
      '/backend/java/': [
        {
          text: '入门',
          items: [
            { text: '概览', link: '/backend/java/' },
            { text: 'Java 简介与环境搭建', link: '/backend/java/introduction-setup' },
            { text: '基本输入输出', link: '/backend/java/basic-io' }
          ]
        },
        {
          text: '语言基础',
          collapsed: false,
          items: [
            { text: '数据类型与变量', link: '/backend/java/data-types-variables' },
            { text: '运算符与表达式', link: '/backend/java/operators-expressions' },
            { text: '字符串', link: '/backend/java/strings' },
            { text: '数组', link: '/backend/java/arrays' }
          ]
        },
        {
          text: '流程控制',
          collapsed: false,
          items: [
            { text: '条件语句', link: '/backend/java/conditionals' },
            { text: '循环语句', link: '/backend/java/loops' },
            { text: '跳转与分支', link: '/backend/java/jump-branch' }
          ]
        },
        {
          text: '面向对象',
          collapsed: false,
          items: [
            { text: '类与对象', link: '/backend/java/classes-objects' },
            { text: '方法详解', link: '/backend/java/methods' },
            { text: '封装与访问控制', link: '/backend/java/encapsulation-access' },
            { text: '构造器与初始化', link: '/backend/java/constructors-initialization' },
            { text: '继承', link: '/backend/java/inheritance' },
            { text: '多态', link: '/backend/java/polymorphism' },
            { text: '抽象类与接口', link: '/backend/java/abstraction-interfaces' },
            { text: '内部类与匿名类', link: '/backend/java/inner-anonymous-classes' }
          ]
        },
        {
          text: '集合与泛型',
          collapsed: false,
          items: [
            { text: '集合框架概述', link: '/backend/java/collections-overview' },
            { text: 'List 与 ArrayList / LinkedList', link: '/backend/java/list-arraylist-linkedlist' },
            { text: 'Set 与 Map', link: '/backend/java/set-map' },
            { text: '泛型详解', link: '/backend/java/generics' },
            { text: '迭代器与比较器', link: '/backend/java/iterators-comparators' }
          ]
        },
        {
          text: '异常处理与 I/O',
          collapsed: false,
          items: [
            { text: '异常体系与处理', link: '/backend/java/exceptions' },
            { text: '自定义异常', link: '/backend/java/custom-exceptions' },
            { text: '文件 I/O', link: '/backend/java/file-io' }
          ]
        },
        {
          text: '设计原则与模式',
          collapsed: false,
          items: [
            { text: '代码复用与消除重复', link: '/backend/java/design-reuse' },
            { text: '封装变化与可扩展性', link: '/backend/java/design-extensibility' },
            { text: '控制反转与 MVC', link: '/backend/java/ioc-mvc' },
            { text: '常用设计模式', link: '/backend/java/design-patterns' }
          ]
        },
        {
          text: '现代 Java',
          collapsed: true,
          items: [
            { text: 'Lambda 表达式', link: '/backend/java/lambda' },
            { text: '函数式接口', link: '/backend/java/functional-interfaces' },
            { text: 'Stream API', link: '/backend/java/stream-api' },
            { text: 'Optional 类', link: '/backend/java/optional' },
            { text: '记录类与密封类', link: '/backend/java/records-sealed' }
          ]
        },
        {
          text: '并发编程',
          collapsed: true,
          items: [
            { text: '线程基础', link: '/backend/java/thread-basics' },
            { text: '线程同步', link: '/backend/java/thread-synchronization' },
            { text: '并发工具类', link: '/backend/java/concurrency-utils' }
          ]
        },
        {
          text: 'JVM 与工程实践',
          collapsed: true,
          items: [
            { text: 'JVM 基础', link: '/backend/java/jvm-basics' },
            { text: '注解与反射', link: '/backend/java/annotations-reflection' },
            { text: '工程实践', link: '/backend/java/engineering' }
          ]
        },
        {
          text: '兼容入口',
          collapsed: true,
          items: [
            { text: '语言基础', link: '/backend/java/language-basics' },
            { text: '对象交互与封装', link: '/backend/java/object-interaction-encapsulation' },
            { text: '对象容器与泛型', link: '/backend/java/object-containers-generics' },
            { text: '继承与多态', link: '/backend/java/inheritance-polymorphism' },
            { text: '设计原则', link: '/backend/java/design-principles' },
            { text: '集合与泛型', link: '/backend/java/collections-generics' },
            { text: '并发编程', link: '/backend/java/concurrency' },
            { text: 'JVM', link: '/backend/java/jvm' },
            { text: '异常处理与输入输出', link: '/backend/java/exceptions-io' }
          ]
        }
      ],
      '/backend/python/': [
        {
          text: 'Python',
          items: [
            { text: '概览', link: '/backend/python/' },
            { text: '语言基础', link: '/backend/python/language-basics' },
            { text: 'Web 服务', link: '/backend/python/web-service' },
            { text: '自动化脚本', link: '/backend/python/automation' },
            { text: '工程实践', link: '/backend/python/engineering-practice' }
          ]
        }
      ],
      '/backend/cpp/': [
        {
          text: '入门',
          items: [
            { text: '概览', link: '/backend/cpp/' },
            { text: '起步认识 C++', link: '/backend/cpp/getting-started' },
            { text: '开发环境安装', link: '/backend/cpp/development-environment' },
            { text: '输入与输出', link: '/backend/cpp/input-output' }
          ]
        },
        {
          text: '基础',
          collapsed: false,
          items: [
            { text: '语法与变量', link: '/backend/cpp/syntax-data-expressions' },
            { text: '类型转换', link: '/backend/cpp/type-conversion' },
            { text: '条件与循环', link: '/backend/cpp/control-flow' },
            { text: '函数', link: '/backend/cpp/functions-modular' }
          ]
        },
        {
          text: '数据容器',
          collapsed: false,
          items: [
            { text: '一维数组', link: '/backend/cpp/arrays' },
            { text: '字符串', link: '/backend/cpp/strings' }
          ]
        },
        {
          text: '指针与内存',
          collapsed: false,
          items: [
            { text: '指针与引用', link: '/backend/cpp/pointers-references-resources' },
            { text: '栈与堆', link: '/backend/cpp/stack-heap-memory' }
          ]
        },
        {
          text: '结构与面向对象',
          collapsed: false,
          items: [
            { text: '结构体', link: '/backend/cpp/structs' },
            { text: '类与对象', link: '/backend/cpp/classes-objects' },
            { text: '继承与多态', link: '/backend/cpp/inheritance-polymorphism' }
          ]
        },
        {
          text: '标准库',
          collapsed: false,
          items: [
            { text: 'STL 容器', link: '/backend/cpp/stl-templates' },
            { text: '常用算法', link: '/backend/cpp/common-algorithms' },
            { text: '模板基础', link: '/backend/cpp/templates-generic' }
          ]
        },
        {
          text: '进阶',
          collapsed: true,
          items: [
            { text: '文件与异常', link: '/backend/cpp/io-files-exceptions' },
            { text: '现代 C++', link: '/backend/cpp/modern-cpp' },
            { text: '并发基础', link: '/backend/cpp/concurrency' },
            { text: '工程实践', link: '/backend/cpp/engineering-practice' }
          ]
        }
      ],
      '/backend/': [
        {
          text: '服务端',
          collapsed: false,
          items: [
            { text: '概览', link: '/backend/' },
            { text: 'C', link: '/backend/c/' },
            { text: 'C++', link: '/backend/cpp/' },
            { text: 'Java', link: '/backend/java/' },
            { text: 'Python', link: '/backend/python/' },
            { text: '接口设计', link: '/backend/api-design' }
          ]
        }
      ],
      '/frontend/': [
        {
          text: '前端',
          collapsed: false,
          items: [
            { text: '概览', link: '/frontend/' },
            { text: 'Vue', link: '/frontend/vue' },
            { text: 'TypeScript', link: '/frontend/typescript' },
            { text: 'Vite', link: '/frontend/vite' }
          ]
        }
      ],
      '/database/': [
        {
          text: '数据库',
          collapsed: true,
          items: [
            { text: '概览', link: '/database/' },
            { text: 'MySQL', link: '/database/mysql' },
            { text: 'Redis', link: '/database/redis' },
            { text: 'MongoDB', link: '/database/mongodb' },
            { text: 'PostgreSQL', link: '/database/postgresql' }
          ]
        }
      ],
      '/cicd/': [
        {
          text: 'CICD',
          collapsed: true,
          items: [
            { text: '概览', link: '/cicd/' },
            { text: 'GitHub Actions', link: '/cicd/github-actions' },
            { text: 'Gitee Pages', link: '/cicd/gitee-pages' },
            { text: '部署清单', link: '/cicd/deploy-checklist' }
          ]
        }
      ],
      '/plugins/': [
        {
          text: '插件',
          collapsed: true,
          items: [
            { text: '概览', link: '/plugins/' }
          ]
        }
      ],
      '/os/': [
        {
          text: '操作系统',
          collapsed: true,
          items: [
            { text: '概览', link: '/os/' },
            { text: 'Windows', link: '/os/windows' },
            { text: 'Linux', link: '/os/linux' }
          ]
        }
      ],
      '/tools/': [
        {
          text: '工具',
          collapsed: true,
          items: [
            { text: '概览', link: '/tools/' },
            { text: 'Git', link: '/tools/git' },
            { text: 'Docker', link: '/tools/docker' }
          ]
        }
      ],
      '/ai/': [
        {
          text: 'AI',
          collapsed: true,
          items: [
            { text: '概览', link: '/ai/' },
            { text: '模型基础', link: '/ai/model-basics' },
            { text: 'Prompt', link: '/ai/prompt' },
            { text: 'Agent', link: '/ai/agent' }
          ]
        }
      ],
      '/other/': [
        {
          text: '其他',
          collapsed: true,
          items: [
            { text: '概览', link: '/other/' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/GengZzz' },
      { icon: { svg: giteeIcon }, link: 'https://gitee.com/GengZzz', ariaLabel: 'Gitee' }
    ],
    footer: {
      copyright: 'Copyright © 2026 GengZzz'
    },
    search: {
      provider: 'local'
    },
    lastUpdatedText: '最后更新',
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    outline: {
      level: 'deep',
      label: '本页目录'
    }
  }
})
