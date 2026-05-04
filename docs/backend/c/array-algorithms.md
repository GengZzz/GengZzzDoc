# 数组运算与算法入门

数组运算是算法训练的入口。搜索、统计、排序这些任务看似简单，却能训练你把问题拆成步骤的能力。

## 求最大值

```c
int max = nums[0];
for (int i = 1; i < length; i++) {
    if (nums[i] > max) {
        max = nums[i];
    }
}
```

关键是先用第一个元素作为初始答案，再从第二个元素开始比较。

## 线性搜索

```c
int find(int nums[], int length, int target) {
    for (int i = 0; i < length; i++) {
        if (nums[i] == target) {
            return i;
        }
    }
    return -1;
}
```

找到了返回下标，找不到返回 `-1`。这是很多搜索函数常见的约定。

## 计数

```c
int count = 0;
for (int i = 0; i < length; i++) {
    if (nums[i] >= 60) {
        count++;
    }
}
```

计数变量通常从 0 开始，每满足一次条件就加 1。

## 冒泡排序

```c
for (int i = 0; i < length - 1; i++) {
    for (int j = 0; j < length - 1 - i; j++) {
        if (nums[j] > nums[j + 1]) {
            int temp = nums[j];
            nums[j] = nums[j + 1];
            nums[j + 1] = temp;
        }
    }
}
```

冒泡排序适合入门理解“比较和交换”。实际工程中很少手写这种排序，但它能帮助你理解循环边界。

## 选择排序

```c
for (int i = 0; i < length - 1; i++) {
    int minIndex = i;
    for (int j = i + 1; j < length; j++) {
        if (nums[j] < nums[minIndex]) {
            minIndex = j;
        }
    }
    int temp = nums[i];
    nums[i] = nums[minIndex];
    nums[minIndex] = temp;
}
```

每一轮找出剩余元素中最小的一个，放到当前位置。

## 练习

1. 输入一组成绩，统计及格人数。
2. 写一个函数查找目标数第一次出现的位置。
3. 对 10 个整数从小到大排序。

## 小结

- 数组算法要特别注意下标范围。
- 搜索通常从头到尾逐个比较。
- 排序入门先理解比较、交换和循环边界。
- 算法正确性比代码短更重要。
