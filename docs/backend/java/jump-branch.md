# 跳转与分支

## break：跳出当前循环

`break` 立即终止当前所在的循环，继续执行循环之后的代码。

```java
public class BreakDemo {
    public static void main(String[] args) {
        // 在数组中查找第一个负数
        int[] nums = {3, 7, 2, -1, 5, 8};
        int foundIndex = -1;

        for (int i = 0; i < nums.length; i++) {
            if (nums[i] < 0) {
                foundIndex = i;
                break;  // 找到后立即退出循环
            }
        }

        System.out.println("第一个负数在索引: " + foundIndex);  // 3
    }
}
```

`break` 只跳出最内层循环，不影响外层。

```java
public class BreakInnerOnlyDemo {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 5; j++) {
                if (j == 2) {
                    break;  // 只跳出内层 for，外层 i 循环继续
                }
                System.out.println("i=" + i + " j=" + j);
            }
        }
    }
}
```

输出：
```
i=0 j=0
i=0 j=1
i=1 j=0
i=1 j=1
i=2 j=0
i=2 j=1
```

## continue：跳过本次迭代

`continue` 跳过当前循环的剩余部分，直接进入下一次迭代。

```java
public class ContinueDemo {
    public static void main(String[] args) {
        // 只打印奇数
        for (int i = 1; i <= 10; i++) {
            if (i % 2 == 0) {
                continue;  // 偶数跳过
            }
            System.out.print(i + " ");
        }
        System.out.println();  // 1 3 5 7 9
    }
}
```

`continue` 在 `for` 循环中会先执行迭代更新（`i++`），再判断条件；在 `while` 循环中直接跳回条件判断。

```java
public class ContinueWhileDemo {
    public static void main(String[] args) {
        // 统计输入中正数的个数（遇到 0 结束）
        int[] inputs = {5, -2, 8, 0, 3};
        int positiveCount = 0;
        int idx = 0;

        while (idx < inputs.length) {
            int val = inputs[idx];
            idx++;
            if (val <= 0) {
                continue;  // 非正数跳过，回到 while 条件判断
            }
            positiveCount++;
        }

        System.out.println("正数个数: " + positiveCount);  // 2
    }
}
```

## return：从方法返回

`return` 直接结束当前方法的执行。如果方法有返回值，`return` 后面需要跟一个值。

```java
public class ReturnDemo {

    /** 判断数组中是否包含目标值，找到立即返回 */
    static boolean contains(int[] arr, int target) {
        for (int x : arr) {
            if (x == target) {
                return true;   // 找到了，立即返回
            }
        }
        return false;  // 遍历完都没找到
    }

    /** 根据分数返回等级，每个分支直接 return，不需要 else */
    static String grade(int score) {
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 60) return "C";
        return "D";
    }

    public static void main(String[] args) {
        int[] data = {10, 20, 30, 40};
        System.out.println(contains(data, 30));  // true
        System.out.println(contains(data, 99));  // false
        System.out.println(grade(85));            // B
    }
}
```

::: tip
提前 `return`（guard clause）能减少嵌套层级，使代码更易读。相比把所有逻辑放在 `if-else` 中，优先使用提前返回。
:::

## 标签循环

当 `break` 或 `continue` 需要作用于外层循环时，使用 **标签（label）** 给循环命名。

语法是 `标签名:` 放在循环前面，然后用 `break 标签名` 或 `continue 标签名` 跳转。

```java
public class LabeledBreakDemo {
    public static void main(String[] args) {
        // 在二维数组中查找目标值，找到后同时跳出两层循环
        int[][] matrix = {
            {1, 2, 3},
            {4, 5, 6},
            {7, 8, 9}
        };
        int target = 5;
        boolean found = false;

        outer:
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[i].length; j++) {
                if (matrix[i][j] == target) {
                    System.out.println("找到 " + target + " 在 [" + i + "][" + j + "]");
                    found = true;
                    break outer;  // 直接跳出外层循环
                }
            }
        }

        System.out.println("是否找到: " + found);  // true
    }
}
```

### 标签 continue

```java
public class LabeledContinueDemo {
    public static void main(String[] args) {
        // 跳过对角线元素
        System.out.println("非对角线元素:");
        outer:
        for (int i = 0; i < 4; i++) {
            for (int j = 0; j < 4; j++) {
                if (i == j) {
                    continue outer;  // 跳过对角线，直接进入下一行
                }
                System.out.print("[" + i + "," + j + "] ");
            }
        }
        System.out.println();
    }
}
```

输出：
```
非对角线元素:
[1,0] [2,0] [2,1] [3,0] [3,1] [3,2]
```

当 `i == j` 时，`continue outer` 跳过当前行的剩余列，直接进入下一行的迭代。

::: warning
标签循环会降低代码可读性。大多数情况下，将内层循环提取为独立方法并使用 `return` 是更好的选择。标签循环仅在性能敏感且无法重构的场景下使用。
:::

### 重构示例：用方法替代标签

```java
public class RefactorLabelDemo {

    /** 查找目标值在二维数组中的位置，找不到返回 null */
    static int[] findPosition(int[][] matrix, int target) {
        for (int i = 0; i < matrix.length; i++) {
            for (int j = 0; j < matrix[i].length; j++) {
                if (matrix[i][j] == target) {
                    return new int[]{i, j};  // return 替代 break label
                }
            }
        }
        return null;
    }

    public static void main(String[] args) {
        int[][] matrix = {{1, 2}, {3, 4}, {5, 6}};
        int[] pos = findPosition(matrix, 4);

        if (pos != null) {
            System.out.println("位置: [" + pos[0] + "][" + pos[1] + "]");  // [1][1]
        } else {
            System.out.println("未找到");
        }
    }
}
```
