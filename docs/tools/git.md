---
sidebar: false
title: "Git"
description: "Git 是目前最流行的分布式版本控制系统，由 Linus Torvalds 于 2005 年创建，用于追踪文件变化、协作开发和管理项目历史。"
---

# Git

Git 是目前最流行的分布式版本控制系统，由 Linus Torvalds 于 2005 年创建，用于追踪文件变化、协作开发和管理项目历史。

## 安装与配置

::: code-group

```bash [Windows]
# 下载安装包
https://git-scm.com/download/win
```

```bash [macOS]
brew install git
```

```bash [Linux]
sudo apt install git      # Debian/Ubuntu
sudo yum install git      # CentOS/RHEL
```

:::

### 初始配置

```bash
# 设置用户信息（提交时显示）
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# 设置默认编辑器
git config --global core.editor "code --wait"    # VS Code

# 设置默认分支名
git config --global init.defaultBranch main

# 查看配置
git config --list
```

## 仓库操作

### 初始化与克隆

```bash
# 初始化新仓库
git init

# 克隆远程仓库
git clone https://github.com/user/repo.git
git clone https://github.com/user/repo.git my-folder  # 指定目录名

# 克隆指定分支
git clone -b develop https://github.com/user/repo.git
```

### 三个区域

```text
工作区 (Working Directory)    暂存区 (Stage/Index)    本地仓库 (Repository)
        │                          │                        │
   编辑文件                    git add                   git commit
        │                          │                        │
  已修改未暂存               已暂存未提交              已提交到本地历史
```

## 文件操作

### 添加与提交

```bash
# 添加文件到暂存区
git add file.txt          # 添加单个文件
git add src/              # 添加整个目录
git add .                 # 添加所有变更
git add -p                # 交互式选择要添加的变更块

# 提交
git commit -m "描述变更内容"

# 添加并提交（仅对已跟踪的文件有效）
git commit -am "快速提交"

# 修改最近一次提交（未 push 时可使用）
git commit --amend -m "修正提交信息"
```

### 查看状态

```bash
git status               # 查看工作区状态
git status -s            # 简洁格式
git diff                 # 工作区 vs 暂存区
git diff --staged        # 暂存区 vs 最近一次提交
git diff HEAD~3          # 与前 3 个提交对比
git log                  # 查看提交历史
git log --oneline        # 简洁格式
git log --oneline -10    # 最近 10 条
git log --graph --oneline --all  # 图形化显示所有分支
```

### 撤销操作

```bash
# 撤销工作区修改（危险！未暂存的修改将丢失）
git restore file.txt
git checkout -- file.txt   # 旧语法

# 取消暂存（保留工作区修改）
git restore --staged file.txt
git reset HEAD file.txt    # 旧语法

# 回退到指定提交
git reset --soft HEAD~1    # 回退提交，保留暂存区和工作区
git reset --mixed HEAD~1   # 回退提交和暂存区，保留工作区（默认）
git reset --hard HEAD~1    # 全部回退（危险！）

# 创建新提交来撤销某个提交（安全）
git revert <commit-hash>
```

## 分支管理

### 基本操作

```bash
# 查看分支
git branch           # 本地分支
git branch -a        # 包含远程分支
git branch -v        # 显示最新提交

# 创建分支
git branch feature   # 创建分支（不切换）
git checkout -b feature   # 创建并切换（旧语法）
git switch -c feature     # 创建并切换（新语法）

# 切换分支
git checkout main
git switch main

# 重命名分支
git branch -m old-name new-name

# 删除分支
git branch -d feature     # 已合并时才删除
git branch -D feature     # 强制删除
```

### 合并

```bash
# 将 feature 合并到当前分支
git checkout main
git merge feature

# 合并但不快进（保留分支历史）
git merge --no-ff feature
```

### 变基

```bash
# 将当前分支的提交移到 main 之上
git checkout feature
git rebase main

# 交互式变基（修改提交历史）
git rebase -i HEAD~3     # 修改最近 3 个提交
```

::: tip merge vs rebase

- `merge`：保留分支历史，产生合并提交
- `rebase`：线性历史，更整洁，但改变了提交时间线
- **规则**：只对本地分支 rebase，已经 push 到远程的分支不要 rebase
:::

### 解决冲突

```bash
# 合并/变基时出现冲突
git merge feature
# Auto-merging file.txt
# CONFLICT (content): Merge conflict in file.txt

# 1. 编辑冲突文件，选择保留的内容
#    <<<<<<< HEAD
#    当前分支的内容
#    =======
#    合并分支的内容
#    >>>>>>> feature

# 2. 标记为已解决
git add file.txt

# 3. 完成合并
git commit
```

## 远程操作

### 远程仓库

```bash
# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add origin https://github.com/user/repo.git

# 修改远程地址
git remote set-url origin git@github.com:user/repo.git

# 删除远程仓库
git remote remove origin
```

### 推送与拉取

```bash
# 推送
git push origin main          # 推送到远程 main 分支
git push -u origin feature    # 推送并设置上游分支
git push                      # 推送到上游分支（设置过 -u 后）

# 拉取
git pull                      # = fetch + merge
git pull --rebase             # = fetch + rebase（推荐）

# 仅获取远程更新（不合并）
git fetch
git fetch --all
```

::: tip pull vs fetch

- `git pull` = `git fetch` + `git merge`
- `git fetch` 只下载远程更新到本地远程跟踪分支，不会自动合并
- 推荐先 `git fetch`，再 `git log origin/main` 查看变化，手动合并
:::

## 标签

```bash
# 创建轻量标签
git tag v1.0.0

# 创建附注标签（推荐）
git tag -a v1.0.0 -m "第一个正式版本"

# 给指定提交打标签
git tag -a v0.9.0 <commit-hash> -m "历史版本"

# 查看标签
git tag
git show v1.0.0

# 推送标签
git push origin v1.0.0     # 推送单个
git push origin --tags     # 推送所有

# 删除标签
git tag -d v1.0.0
git push origin --delete v1.0.0
```

## 暂存工作区

```bash
# 暂存当前修改
git stash
git stash push -m "临时保存"

# 查看暂存列表
git stash list

# 恢复最近的暂存
git stash pop             # 恢复并删除暂存
git stash apply           # 恢复但保留暂存

# 恢复指定暂存
git stash apply stash@{2}

# 删除暂存
git stash drop stash@{0}
git stash clear           # 清除所有
```

## 子模块

```bash
# 添加子模块
git submodule add https://github.com/user/lib.git libs/lib

# 克隆含子模块的仓库
git clone --recurse-submodules https://github.com/user/repo.git

# 初始化已有仓库的子模块
git submodule update --init --recursive

# 更新子模块
git submodule update --remote
```

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `git init` | 初始化仓库 |
| `git clone <url>` | 克隆仓库 |
| `git add .` | 添加所有变更 |
| `git commit -m "msg"` | 提交 |
| `git push` | 推送到远程 |
| `git pull --rebase` | 拉取并变基 |
| `git log --oneline -10` | 查看最近提交 |
| `git diff` | 查看差异 |
| `git branch -a` | 查看所有分支 |
| `git checkout -b <name>` | 创建并切换分支 |
| `git merge <branch>` | 合并分支 |
| `git stash` | 暂存工作区 |
| `git stash pop` | 恢复暂存 |
| `git tag -a v1.0 -m "msg"` | 创建标签 |
| `git reset --hard HEAD~1` | 回退到上一提交 |
| `git revert <hash>` | 安全撤销提交 |

## .gitignore

```gitignore
# 依赖目录
node_modules/
vendor/
__pycache__/

# 构建产物
dist/
build/
*.o
*.pyc

# 环境变量
.env
.env.local

# IDE 配置
.idea/
.vscode/
*.swp

# 系统文件
.DS_Store
Thumbs.db

# 日志
*.log
```
