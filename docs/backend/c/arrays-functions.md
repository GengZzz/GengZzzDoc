# 数组与函数

数组让程序能处理一组同类型数据，函数让程序能把重复逻辑封装起来。学到这里，C 程序开始从“单段代码”变成“可组织的代码”。

## 一维数组

```c
int scores[5] = {80, 90, 75, 88, 92};
```

数组下标从 0 开始：

```c
printf("%d\n", scores[0]);
printf("%d\n", scores[4]);
```

`scores[5]` 已经越界。C 语言不会自动帮你检查越界，结果可能不可预期。

## 遍历数组

```c
int sum = 0;
for (int i = 0; i < 5; i++) {
    sum += scores[i];
}
printf("%d\n", sum);
```

数组循环通常写成 `i < length`，不要写成 `i <= length`。

## 函数定义

```c
int max(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}
```

函数包括返回类型、函数名、参数列表和函数体。调用函数时，实参会传给形参。

```c
int result = max(3, 5);
```

## 数组作为函数参数

```c
int sum(int nums[], int length) {
    int total = 0;
    for (int i = 0; i < length; i++) {
        total += nums[i];
    }
    return total;
}
```

数组传给函数时，通常还要额外传长度。函数不知道数组真实有多长。

## 二维数组

```c
int matrix[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};
```

二维数组常用来表示表格、矩阵、棋盘。

```c
for (int row = 0; row < 2; row++) {
    for (int col = 0; col < 3; col++) {
        printf("%d ", matrix[row][col]);
    }
    printf("\n");
}
```

## 练习

1. 输入 5 个整数，输出最大值和平均值。
2. 写一个函数 `isPrime(int n)` 判断素数。
3. 用二维数组保存 3 个学生的 4 门成绩，输出每个学生总分。

## 小结

- 数组保存一组同类型数据，下标从 0 开始。
- 数组越界是 C 语言常见错误。
- 函数把一段逻辑命名并复用。
- 数组传参时要同时传长度。
