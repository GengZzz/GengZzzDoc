# 文件输入输出

Java 提供了丰富的文件 IO API，从早期的 `java.io` 字节/字符流到 Java 7 引入的 `java.nio.file`（NIO.2）。现代 Java 开发优先使用 NIO.2，它更简洁、功能更强。

## File 类

`java.io.File` 是最早用于表示文件系统路径的类。它不读写文件内容，只表示路径和查询文件属性。

```java
import java.io.File;

public class FileDemo {
    public static void main(String[] args) {
        File file = new File("data/input.txt");

        System.out.println("路径: " + file.getPath());
        System.out.println("绝对路径: " + file.getAbsolutePath());
        System.out.println("文件名: " + file.getName());
        System.out.println("父目录: " + file.getParent());

        System.out.println("存在: " + file.exists());
        System.out.println("是文件: " + file.isFile());
        System.out.println("是目录: " + file.isDirectory());
        System.out.println("可读: " + file.canRead());
        System.out.println("文件大小: " + file.length() + " 字节");

        // 创建目录
        File dir = new File("output/subdir");
        dir.mkdirs(); // 创建多级目录

        // 列出目录内容
        File current = new File(".");
        String[] names = current.list();
        if (names != null) {
            for (String name : names) {
                System.out.println(name);
            }
        }
    }
}
```

::: tip File 只表示路径
`new File("not_exist.txt")` 不会创建文件，它只是一个路径对象。无论文件是否存在，File 对象都可以创建。
:::

## 字节流

字节流以 `byte` 为单位读写数据，适合处理二进制文件（图片、音频、压缩包等）。

- `InputStream`：所有字节输入流的抽象基类
- `OutputStream`：所有字节输出流的抽象基类

```java
import java.io.*;

public class ByteStreamDemo {

    // 复制文件 - 使用字节流
    public static void copyFile(File source, File dest) throws IOException {
        try (
            InputStream in = new FileInputStream(source);
            OutputStream out = new FileOutputStream(dest)
        ) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
    }

    // 读取所有字节
    public static byte[] readAllBytes(File file) throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            return in.readAllBytes(); // Java 9+
        }
    }
}
```

## 字符流

字符流以 `char` 为单位读写数据，自动处理字符编码，适合处理文本文件。

- `Reader`：所有字符输入流的抽象基类
- `Writer`：所有字符输出流的抽象基类

```java
import java.io.*;

public class CharStreamDemo {

    // 读取文本文件
    public static String readText(File file) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (Reader reader = new FileReader(file, StandardCharsets.UTF_8)) {
            char[] buffer = new char[4096];
            int charsRead;
            while ((charsRead = reader.read(buffer)) != -1) {
                sb.append(buffer, 0, charsRead);
            }
        }
        return sb.toString();
    }

    // 写入文本文件
    public static void writeText(File file, String content) throws IOException {
        try (Writer writer = new FileWriter(file, StandardCharsets.UTF_8)) {
            writer.write(content);
        }
    }
}
```

## 缓冲流

缓冲流在底层流之上增加了缓冲区，减少实际的 IO 操作次数，显著提高读写效率。

- `BufferedReader`：带缓冲的字符输入流，支持按行读取
- `BufferedWriter`：带缓冲的字符输出流

```java
import java.io.*;

public class BufferedStreamDemo {

    // 按行读取文本文件
    public static List<String> readLines(File file) throws IOException {
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new FileReader(file, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                lines.add(line);
            }
        }
        return lines;
    }

    // 逐行写入文本文件
    public static void writeLines(File file, List<String> lines) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(
                new FileWriter(file, StandardCharsets.UTF_8))) {
            for (String line : lines) {
                writer.write(line);
                writer.newLine();
            }
        }
    }
}
```

`BufferedReader` 还支持 `lines()` 方法返回 `Stream<String>`，方便用流式操作处理：

```java
try (BufferedReader reader = new BufferedReader(
        new FileReader("access.log", StandardCharsets.UTF_8))) {
    long errorCount = reader.lines()
        .filter(line -> line.contains("ERROR"))
        .count();
    System.out.println("错误日志数: " + errorCount);
}
```

## PrintWriter

`PrintWriter` 提供了便捷的格式化文本输出方法，类似 `System.out`。

```java
import java.io.*;

public class PrintWriterDemo {
    public static void writeReport(File file) throws IOException {
        try (PrintWriter pw = new PrintWriter(
                new FileWriter(file, StandardCharsets.UTF_8))) {
            pw.println("=== 报告 ===");
            pw.printf("日期: %tF%n", new Date());
            pw.printf("总计: %d 条记录%n", 42);
            pw.printf("金额: %.2f 元%n", 1234.56);
        }
    }
}
```

`PrintWriter` 的 `printf` 和 `println` 方法与 `System.out` 完全一致，但输出目标是文件。

## NIO.2（Java 7+）

`java.nio.file` 包提供了现代的文件操作 API，核心类：

- `Path`：表示文件系统路径（替代 `File`）
- `Paths`：创建 `Path` 的工具类
- `Files`：文件操作的工具类（静态方法）

### Path 与 Paths

```java
import java.nio.file.*;

public class PathDemo {
    public static void main(String[] args) {
        // 创建 Path
        Path p1 = Path.of("data", "input.txt");           // data/input.txt
        Path p2 = Path.of("/home/user", "documents");     // /home/user/documents
        Path p3 = Paths.get("C:", "Users", "test");       // C:\Users\test

        // 路径操作
        System.out.println(p1.getFileName());    // input.txt
        System.out.println(p1.getParent());      // data
        System.out.println(p1.toAbsolutePath()); // 完整绝对路径

        // 路径解析 - 拼接子路径
        Path base = Path.of("project");
        Path full = base.resolve("src/Main.java"); // project/src/Main.java

        // 路径标准化 - 解析 . 和 ..
        Path messy = Path.of("src/../data/./file.txt");
        System.out.println(messy.normalize()); // data/file.txt
    }
}
```

### Files 工具类

`Files` 类提供了大量静态方法，是 NIO.2 的核心。

#### 读写文本

```java
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class FilesTextDemo {
    public static void main(String[] args) throws IOException {
        Path path = Path.of("example.txt");

        // 写入字符串
        Files.writeString(path, "Hello, 世界\n第二行",
            StandardCharsets.UTF_8);

        // 读取为字符串
        String content = Files.readString(path, StandardCharsets.UTF_8);
        System.out.println(content);

        // 写入多行
        List<String> lines = List.of("第一行", "第二行", "第三行");
        Files.write(path, lines, StandardCharsets.UTF_8);

        // 读取为行列表
        List<String> readLines = Files.readAllLines(path, StandardCharsets.UTF_8);
        readLines.forEach(System.out::println);
    }
}
```

::: tip 编码默认值
`Files.readString()` 和 `Files.writeString()` 如果不指定字符集，默认使用 UTF-8。但在团队项目中建议始终显式指定 `StandardCharsets.UTF_8`，避免歧义。
:::

#### 复制、移动、删除

```java
import java.nio.file.*;

public class FilesOperationsDemo {
    public static void main(String[] args) throws IOException {
        Path source = Path.of("data.txt");
        Path copy = Path.of("data_backup.txt");
        Path target = Path.of("archive/data.txt");

        // 复制文件
        Files.copy(source, copy, StandardCopyOption.REPLACE_EXISTING);

        // 移动文件（重命名）
        Files.createDirectories(target.getParent());
        Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);

        // 删除文件
        Files.delete(target);
        // deleteIfExists 不会在文件不存在时抛异常
        boolean deleted = Files.deleteIfExists(copy);
    }
}
```

#### 遍历目录

```java
import java.nio.file.*;
import java.io.IOException;

public class FilesListingDemo {
    public static void main(String[] args) throws IOException {
        Path dir = Path.of("src");

        // list: 列出直接子项（不递归）
        try (Stream<Path> entries = Files.list(dir)) {
            entries.forEach(p -> System.out.println("  " + p.getFileName()));
        }

        // walk: 递归遍历所有子目录
        System.out.println("=== 递归遍历 ===");
        try (Stream<Path> tree = Files.walk(dir)) {
            tree.filter(Files::isRegularFile)
                .filter(p -> p.toString().endsWith(".java"))
                .forEach(System.out::println);
        }

        // find: 按条件搜索
        try (Stream<Path> found = Files.find(dir, 10,
                (path, attrs) -> attrs.isRegularFile() && attrs.size() > 1024)) {
            found.forEach(p -> System.out.println("大文件: " + p));
        }
    }
}
```

## try-with-resources 管理文件资源

所有文件流都实现了 `AutoCloseable`，应始终使用 `try-with-resources` 确保资源释放。

```java
public class ResourceManagementDemo {

    // 正确：自动关闭
    public static void goodExample(Path path) throws IOException {
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String firstLine = reader.readLine();
            System.out.println("首行: " + firstLine);
        }
    }

    // 多个资源
    public static void copyWithBuffer(Path source, Path target) throws IOException {
        try (
            BufferedReader in = Files.newBufferedReader(source, StandardCharsets.UTF_8);
            BufferedWriter out = Files.newBufferedWriter(target, StandardCharsets.UTF_8)
        ) {
            String line;
            while ((line = in.readLine()) != null) {
                out.write(line);
                out.newLine();
            }
        }
    }
}
```

## 字符编码

字符编码决定了字节与字符之间的映射关系。Java 中使用 `Charset` 类表示编码。

```java
import java.nio.charset.StandardCharsets;

public class CharsetDemo {
    public static void main(String[] args) throws IOException {
        Path path = Path.of("chinese.txt");

        // 显式指定 UTF-8 编码写入
        Files.writeString(path, "中文内容", StandardCharsets.UTF_8);

        // 显式指定 UTF-8 编码读取
        String text = Files.readString(path, StandardCharsets.UTF_8);

        // 常用编码常量
        Charset utf8 = StandardCharsets.UTF_8;
        Charset gbk = StandardCharsets.ISO_8859_1; // Java 没有 GBK 常量

        // 转换编码
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        String decoded = new String(bytes, StandardCharsets.UTF_8);
    }
}
```

::: warning 编码不一致的后果
用错误的编码读取文件会导致乱码。UTF-8 编码的中文文件如果用 GBK 读取，会显示乱码。在不确定编码时，优先假设 UTF-8——它是现代项目的事实标准。
:::
