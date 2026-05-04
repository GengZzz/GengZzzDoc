# 注解与反射

注解（Annotation）为代码提供元数据，反射（Reflection）允许程序在运行时动态获取类的信息、创建对象和调用方法。两者结合是 Spring、Jackson 等框架的核心基础。

## 内置注解

Java 提供了几个常用的内置注解：

| 注解 | 作用目标 | 说明 |
|------|---------|------|
| `@Override` | 方法 | 编译期检查是否正确重写了父类方法 |
| `@Deprecated` | 类/方法/字段等 | 标记为已过时，使用时编译器发出警告 |
| `@SuppressWarnings` | 类/方法等 | 抑制特定的编译器警告 |
| `@FunctionalInterface` | 接口 | 编译期检查接口是否只有一个抽象方法 |
| `@SafeVarargs` | 方法/构造器 | 抑制可变参数的堆污染警告 |

```java
public class BuiltinAnnotations {

    @Override
    public String toString() {
        return "BuiltinAnnotations{}";
    }

    @Deprecated(since = "1.5", forRemoval = true)
    public void oldMethod() {
        System.out.println("已过时的方法");
    }

    @SuppressWarnings("unchecked")
    public void suppressWarning() {
        java.util.List list = new java.util.ArrayList();
        list.add("test");
    }
}
```

## 元注解

元注解是"注解的注解"，用于定义自定义注解的行为。

| 元注解 | 作用 |
|--------|------|
| `@Target` | 指定注解可以用在哪些位置 |
| `@Retention` | 指定注解保留到哪个阶段 |
| `@Documented` | 将注解包含在 Javadoc 中 |
| `@Inherited` | 子类自动继承父类的注解 |
| `@Repeatable` | 允许同一位置重复使用该注解 |

`@Target` 的常用取值：

| 值 | 可用位置 |
|----|---------|
| `ElementType.TYPE` | 类、接口、枚举 |
| `ElementType.FIELD` | 字段 |
| `ElementType.METHOD` | 方法 |
| `ElementType.PARAMETER` | 方法参数 |
| `ElementType.CONSTRUCTOR` | 构造器 |
| `ElementType.LOCAL_VARIABLE` | 局部变量 |
| `ElementType.ANNOTATION_TYPE` | 注解类型 |

## RetentionPolicy

决定了注解保留到哪个阶段：

| 保留策略 | 可用范围 | 说明 |
|---------|---------|------|
| `SOURCE` | 仅源码 | 编译后丢弃，如 `@Override` |
| `CLASS` | 源码 + 字节码 | 编译期保留，运行时不可读取（默认） |
| `RUNTIME` | 源码 + 字节码 + 运行时 | 反射可读取，框架最常用 |

```text
源码 ──► 编译 ──► 字节码(.class) ──► JVM 加载 ──► 运行
        │              │                  │
    SOURCE          CLASS             RUNTIME
```

::: tip 框架注解一般用 RUNTIME
Spring 的 `@Component`、`@Autowired`，JPA 的 `@Entity` 等都使用 `RUNTIME`，因为框架需要在运行时通过反射读取注解信息。
:::

## 自定义注解

```java
import java.lang.annotation.*;

// 定义一个标注 API 路由的注解
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ApiRoute {
    String path();                          // 必填属性
    String method() default "GET";          // 默认值
    String[] roles() default {};            // 数组属性
}
```

使用自定义注解：

```java
public class UserController {

    @ApiRoute(path = "/users", method = "GET")
    public String listUsers() {
        return "用户列表";
    }

    @ApiRoute(path = "/users/{id}", method = "GET", roles = {"ADMIN", "USER"})
    public String getUser(long id) {
        return "用户 " + id;
    }
}
```

::: tip 注解属性的类型限制
注解属性的类型只能是：基本类型、`String`、`Class`、枚举、其他注解类型，以及这些类型的一维数组。
:::

## 反射 API

反射允许在运行时获取类的完整信息并动态操作。

### 获取 Class 对象

三种方式，获取的是同一个 `Class` 对象：

```java
// 方式一：Class.forName() —— 通过全限定名
Class<?> clazz1 = Class.forName("java.lang.String");

// 方式二：类名.class —— 编译期确定
Class<?> clazz2 = String.class;

// 方式三：对象.getClass() —— 运行时获取
Class<?> clazz3 = "hello".getClass();
```

::: tip Class 对象唯一
同一个类无论通过哪种方式获取 `Class` 对象，始终是同一个实例：`clazz1 == clazz2 == clazz3` 均为 `true`。
:::

### 获取类信息

```java
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

public class ReflectionInfo {
    public static void main(String[] args) throws Exception {
        Class<?> clazz = Class.forName("java.lang.String");

        // 类信息
        System.out.println("类名: " + clazz.getName());
        System.out.println("简单名: " + clazz.getSimpleName());
        System.out.println("父类: " + clazz.getSuperclass().getSimpleName());
        System.out.println("接口: ");
        for (Class<?> iface : clazz.getInterfaces()) {
            System.out.println("  " + iface.getName());
        }

        // 公共方法（含继承的）
        System.out.println("\n公共方法（前5个）:");
        Method[] methods = clazz.getMethods();
        for (int i = 0; i < 5 && i < methods.length; i++) {
            System.out.println("  " + methods[i]);
        }

        // 声明的方法（不含继承的，但含私有的）
        Method[] declaredMethods = clazz.getDeclaredMethods();
        System.out.println("\n声明方法数量: " + declaredMethods.length);

        // 公共字段
        Field[] fields = clazz.getFields();
        System.out.println("\n公共字段数量: " + fields.length);

        // 构造器
        Constructor<?>[] constructors = clazz.getConstructors();
        System.out.println("公共构造器数量: " + constructors.length);
    }
}
```

获取方法/字段的两组 API：

| 方法 | 含义 |
|------|------|
| `getXxx()` | 获取公共的（含继承的） |
| `getDeclaredXxx()` | 获取声明的（不含继承的，含私有的） |

### 动态创建对象

```java
public class ReflectionCreate {
    public static void main(String[] args) throws Exception {
        Class<?> clazz = Person.class;

        // 方式一：无参构造器
        Person p1 = (Person) clazz.newInstance(); // 已过时，Java 9+

        // 方式二：通过构造器（推荐）
        Constructor<?> constructor = clazz.getConstructor(String.class, int.class);
        Person p2 = (Person) constructor.newInstance("张三", 25);
        System.out.println(p2); // Person{name='张三', age=25}
    }
}

class Person {
    private String name;
    private int age;

    public Person() {}
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    @Override
    public String toString() {
        return "Person{name='" + name + "', age=" + age + "}";
    }
}
```

### 动态调用方法

```java
import java.lang.reflect.Method;

public class ReflectionInvoke {
    public static void main(String[] args) throws Exception {
        Person person = new Person("李四", 30);
        Class<?> clazz = person.getClass();

        // 获取公共方法
        Method toStringMethod = clazz.getMethod("toString");
        String result = (String) toStringMethod.invoke(person);
        System.out.println(result); // Person{name='李四', age=30}

        // 获取私有方法并调用
        // Method privateMethod = clazz.getDeclaredMethod("secretMethod");
        // privateMethod.setAccessible(true);
        // privateMethod.invoke(person);
    }
}
```

### 访问私有成员

```java
import java.lang.reflect.Field;

public class ReflectionPrivate {
    public static void main(String[] args) throws Exception {
        Person person = new Person("王五", 35);
        Class<?> clazz = person.getClass();

        // 获取私有字段
        Field nameField = clazz.getDeclaredField("name");
        nameField.setAccessible(true); // 突破 private 限制

        System.out.println("修改前: " + nameField.get(person)); // 王五
        nameField.set(person, "赵六");
        System.out.println("修改后: " + person); // Person{name='赵六', age=35}
    }
}
```

## 反射的用途

反射是很多框架的基石：

| 框架/场景 | 反射用途 |
|----------|---------|
| Spring IoC | 扫描 `@Component`，通过反射创建 Bean 并注入依赖 |
| Jackson/Gson | 遍历字段，将 JSON 映射到对象属性 |
| JUnit | 查找 `@Test` 方法并动态执行 |
| MyBatis | 将数据库结果集映射到实体类 |
| 注解处理器 | 在编译期或运行期处理自定义注解 |

```java
// 模拟一个简单的注解处理器
import java.lang.reflect.Method;

public class SimpleAnnotationProcessor {
    public static void main(String[] args) throws Exception {
        UserController controller = new UserController();

        for (Method method : controller.getClass().getDeclaredMethods()) {
            ApiRoute route = method.getAnnotation(ApiRoute.class);
            if (route != null) {
                System.out.println("注册路由: " + route.method() + " " + route.path());
                if (route.roles().length > 0) {
                    System.out.println("  需要角色: " + String.join(", ", route.roles()));
                }
            }
        }
    }
}

// 输出:
// 注册路由: GET /users
// 注册路由: GET /users/{id}
//   需要角色: ADMIN, USER
```

## 反射的代价

反射虽然强大，但有明确的缺点：

| 问题 | 说明 |
|------|------|
| **性能开销** | 反射调用比直接调用慢几十倍甚至上百倍（JIT 难以优化） |
| **破坏封装** | `setAccessible(true)` 可以访问私有成员，绕过编译期保护 |
| **编译期检查缺失** | 字符串形式的方法名/字段名不会被编译器检查，拼写错误到运行时才暴露 |
| **安全限制** | 模块化系统（Java 9+）对反射访问施加了更严格的限制 |

::: tip 能不用反射就不用
在能直接调用的场景下不要用反射。反射主要用于框架通用代码，业务代码应尽量避免。如果必须使用反射，可以通过缓存 `Method`/`Field` 对象来减少性能损耗。
:::
