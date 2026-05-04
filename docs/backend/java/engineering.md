# 工程实践

编写 Java 程序不仅需要语言知识，还需要构建工具、项目结构、测试框架和日志系统的支持。本篇覆盖这些工程基础。

## Maven 基础

Maven 是 Java 生态中最主流的构建工具，通过 `pom.xml` 管理项目配置、依赖和构建流程。

### 项目坐标

每个 Maven 项目由三个坐标唯一标识：

```xml
<project>
    <groupId>com.example</groupId>       <!-- 组织/公司标识 -->
    <artifactId>my-app</artifactId>      <!-- 项目标识 -->
    <version>1.0.0</version>             <!-- 版本号 -->
</project>
```

### 依赖管理

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
        <version>3.2.0</version>
        <scope>compile</scope> <!-- 默认，编译+测试+运行时都可用 -->
    </dependency>

    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.1</version>
        <scope>test</scope> <!-- 仅测试时可用 -->
    </dependency>

    <dependency>
        <groupId>javax.servlet</groupId>
        <artifactId>javax.servlet-api</artifactId>
        <version>4.0.1</version>
        <scope>provided</scope> <!-- 编译和测试可用，运行时由容器提供 -->
    </dependency>
</dependencies>
```

各 scope 的含义：

| scope | 编译 | 测试 | 运行时 | 打包 | 典型用途 |
|-------|------|------|--------|------|---------|
| `compile` | yes | yes | yes | yes | 默认，项目核心依赖 |
| `test` | no | yes | no | no | 测试框架（JUnit、Mockito） |
| `provided` | yes | yes | no | no | Servlet API（容器提供） |
| `runtime` | no | yes | yes | yes | JDBC 驱动 |
| `system` | yes | yes | no | no | 本地 jar（不推荐） |

### 生命周期

Maven 的构建过程由生命周期（Lifecycle）和阶段（Phase）组成。执行某个阶段时，它之前的所有阶段也会依次执行。

```text
clean 生命周期:
  pre-clean → clean → post-clean

default 生命周期（常用阶段）:
  validate → compile → test → package → verify → install → deploy
```

常用命令：

```bash
mvn clean compile    # 清理并编译
mvn clean test       # 清理、编译、运行测试
mvn clean package    # 清理、编译、测试、打包（生成 jar/war）
mvn clean install    # 清理、编译、测试、打包、安装到本地仓库
mvn dependency:tree  # 查看依赖树
```

### 仓库

Maven 从仓库中下载依赖：

| 仓库 | 说明 |
|------|------|
| 本地仓库 | `~/.m2/repository`，已下载的 jar 缓存 |
| 中央仓库 | `repo.maven.apache.org`，Maven 官方仓库 |
| 私服 | 公司内部搭建（Nexus、Artifactory），代理中央仓库并托管内部构件 |

::: tip 配置国内镜像
编辑 `~/.m2/settings.xml`，添加阿里云镜像可以大幅加速依赖下载：

```xml
<mirrors>
    <mirror>
        <id>aliyun</id>
        <mirrorOf>central</mirrorOf>
        <name>阿里云 Maven 镜像</name>
        <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
</mirrors>
```
:::

## 标准项目结构

Maven 约定了一套统一的目录结构：

```
my-app/
├── src/
│   ├── main/
│   │   ├── java/                源代码
│   │   │   └── com/example/
│   │   │       └── App.java
│   │   └── resources/           资源文件（配置文件、模板等）
│   │       └── application.properties
│   └── test/
│       ├── java/                测试代码
│       │   └── com/example/
│       │       └── AppTest.java
│       └── resources/           测试资源
│           └── test-data.json
├── pom.xml                      项目配置
└── target/                      构建输出（不提交到 Git）
```

::: tip 遵循约定
Maven 的理念是"约定优于配置"。遵循标准目录结构，不需要额外配置就能正确编译和测试。`target/` 目录应加入 `.gitignore`。
:::

## Gradle 简介

Gradle 是另一个流行的构建工具，使用 Groovy 或 Kotlin DSL 编写构建脚本，比 Maven XML 更简洁灵活。

```groovy
// build.gradle (Groovy DSL)
plugins {
    id 'java'
    id 'application'
}

group = 'com.example'
version = '1.0.0'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web:3.2.0'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.1'
}

test {
    useJUnitPlatform()
}
```

Maven 与 Gradle 的对比：

| 特性 | Maven | Gradle |
|------|-------|--------|
| 配置格式 | XML | Groovy/Kotlin DSL |
| 构建速度 | 较慢（顺序执行） | 较快（增量构建、构建缓存） |
| 依赖管理 | 成熟稳定 | 灵活，支持动态版本 |
| 学习曲线 | 较低（XML 结构化） | 中等（DSL 需要学习） |
| 生态 | 插件丰富，社区成熟 | 增长迅速，Android 首选 |

::: tip 选择建议
大部分 Java 后端项目使用 Maven，配置清晰、文档丰富。Android 开发和需要高度自定义构建逻辑的项目倾向使用 Gradle。两者掌握其一即可。
:::

## JUnit 5

JUnit 5 是 Java 最主流的单元测试框架。它由三个子项目组成：JUnit Platform（底层运行基础设施）、JUnit Jupiter（编程模型和扩展模型）、JUnit Vintage（兼容 JUnit 3/4）。

### 基本注解

```java
import org.junit.jupiter.api.*;

class CalculatorTest {

    private Calculator calc;

    @BeforeEach      // 每个测试方法前执行
    void setUp() {
        calc = new Calculator();
    }

    @AfterEach       // 每个测试方法后执行
    void tearDown() {
        calc = null;
    }

    @BeforeAll       // 所有测试前执行一次（必须 static）
    static void initAll() {
        System.out.println("测试开始");
    }

    @AfterAll        // 所有测试后执行一次（必须 static）
    static void endAll() {
        System.out.println("测试结束");
    }

    @Test
    void testAdd() {
        assertEquals(5, calc.add(2, 3));
    }

    @Test
    void testDivide() {
        assertEquals(2.5, calc.divide(5, 2), 0.001);
    }
}
```

### 断言

```java
import static org.junit.jupiter.api.Assertions.*;

class AssertionExamples {

    @Test
    void testAssertions() {
        // 相等判断
        assertEquals(42, 6 * 7);
        assertNotEquals(0, 1 + 1);

        // 布尔判断
        assertTrue(3 > 2);
        assertFalse("".isEmpty() == false);

        // 空判断
        assertNull(null);
        assertNotNull("hello");

        // 同一对象
        String s = "test";
        assertSame(s, s);
    }

    @Test
    void testException() {
        // 验证是否抛出指定异常
        ArithmeticException ex = assertThrows(
            ArithmeticException.class,
            () -> { int x = 1 / 0; }
        );
        assertEquals("/ by zero", ex.getMessage());
    }

    @Test
    void testTimeout() {
        // 验证执行时间不超过指定值
        assertTimeout(
            java.time.Duration.ofSeconds(1),
            () -> Thread.sleep(100)
        );
    }
}
```

### 参数化测试

参数化测试允许用不同参数多次运行同一个测试方法。

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

import static org.junit.jupiter.api.Assertions.*;

class ParameterizedExamples {

    @ParameterizedTest
    @ValueSource(ints = {1, 3, 5, 7, 9})
    void testOdd(int number) {
        assertEquals(1, number % 2);
    }

    @ParameterizedTest
    @CsvSource({
        "hello, 5",
        "Java, 4",
        "'', 0"
    })
    void testStringLength(String input, int expectedLength) {
        assertEquals(expectedLength, input.length());
    }

    @ParameterizedTest
    @MethodSource("provideStringsForTesting")
    void testNotBlank(String input) {
        assertFalse(input.isBlank());
    }

    static java.util.stream.Stream<String> provideStringsForTesting() {
        return java.util.stream.Stream.of("apple", "banana", "cherry");
    }
}
```

::: tip 测试命名风格
JUnit 5 支持 `@DisplayName` 注解为测试类和方法设置更易读的名称：

```java
@DisplayName("计算器测试")
class CalculatorTest {

    @DisplayName("加法: 正数相加应返回正确结果")
    @Test
    void testAdd() { /* ... */ }
}
```
:::

## 日志：SLF4J + Logback

日志是排查问题的关键工具。Java 日志体系中，推荐使用 **SLF4J** 作为门面（接口），**Logback** 作为实现。

### 核心概念

```text
业务代码 → SLF4J API（门面）→ Logback（实现）→ 控制台 / 文件
```

- **SLF4J**（Simple Logging Facade for Java）：统一的日志接口，不依赖具体实现
- **Logback**：SLF4J 的原生实现，性能好、功能丰富，是 Log4j 的继任者

### 引入依赖

```xml
<dependencies>
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-api</artifactId>
        <version>2.0.9</version>
    </dependency>
    <dependency>
        <groupId>ch.qos.logback</groupId>
        <artifactId>logback-classic</artifactId>
        <version>1.4.14</version>
    </dependency>
</dependencies>
```

### 使用日志

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    // 推荐方式：每个类一个 Logger 实例
    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    public void createUser(String name) {
        log.info("创建用户: {}", name); // {} 是占位符，避免字符串拼接

        if (name == null || name.isBlank()) {
            log.warn("用户名为空");
            return;
        }

        try {
            // 业务逻辑
            log.debug("用户创建成功: {}", name);
        } catch (Exception e) {
            log.error("创建用户失败: {}", name, e); // 异常对象放最后
        }
    }
}
```

### Logback 配置

在 `src/main/resources/` 下创建 `logback.xml`：

```xml
<configuration>
    <!-- 控制台输出 -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- 文件输出 -->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/app.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/app.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- 日志级别: TRACE < DEBUG < INFO < WARN < ERROR -->
    <logger name="com.example" level="DEBUG"/>
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>
</configuration>
```

日志级别从低到高：

| 级别 | 用途 |
|------|------|
| `TRACE` | 最详细的追踪信息 |
| `DEBUG` | 调试信息（开发环境开启） |
| `INFO` | 关键业务节点（生产环境推荐） |
| `WARN` | 潜在问题，不影响运行 |
| `ERROR` | 错误，需要关注 |

::: tip 生产环境配置建议
生产环境将 root 级别设为 `INFO`，只在需要排查问题时临时调低到 `DEBUG`。使用 `RollingFileAppender` 按日期和大小切割日志文件，避免磁盘写满。不要在日志中输出密码、令牌等敏感信息。
:::
