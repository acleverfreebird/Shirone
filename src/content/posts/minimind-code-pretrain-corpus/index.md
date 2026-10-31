---
title: 从零到 80 万条：给自己的模型收集代码预训练语料
author: ''
published: 2026-10-31
publishedAt: 2026-10-31T19:11:54+08:00
description: '给自己的模型收集一份代码预训练语料，最后做到 191 个仓库、803,008 条样本、约 6.2 亿 token。值得写的主要是中间那些当时看着没毛病、规模一大就露馅的地方：配额被大仓库吃光、许可证把侧车撑到 4.7 倍、打包文件名差点让训练数据翻倍。'
image: ''
tags: ['MiniMind', '大语言模型', '预训练数据', '数据工程', '代码语料', 'GitHub']
category: 'AI技术'
draft: false
lang: 'zh-CN'
---

起因有点拿不出手：我自己的模型，预训练数据里中文文本一大堆，代码少得可怜，写起代码来磕磕绊绊。2026 年 10 月，我决定给它补一份代码语料。这事最后长成了 803,008 条样本、191 个 GitHub 仓库、约 6.2 亿 token，11 种编程语言，外加基础编程学习资料和一批 Markdown 文档——比起点那份 8,705 条翻了九十多倍。

数字本身没什么好看的。好看的是中间那些当时觉得没问题、规模一上来就露馅的决定，有几个我还踩了不止一次。

## 起点只有 8,705 条

训练走的是 [MiniMind](https://github.com/jingyaogong/minimind) 那套代码，这也是后面格式和 tokenizer 都得迁就它的原因。本来以为得从头建目录、写脚本，翻开 `training_data/` 才发现里面已经有个采集脚本 `collect_training_data.py`，还有份来自单个仓库的早期数据 `gpt_load_code.jsonl`，8,705 条。所以真正要做的，是把这个能跑通的小脚本扩成一条撑得住大规模采集的管道。

动手前给自己划了几条线。仓库代码一行都不执行——采集器只读 Git 对象，不 checkout、不装依赖、不跑构建脚本，我可不想在自己机器上跑一百多个陌生仓库的 `setup.py`。依赖能少就少，Python 标准库加 Git 就够，爬虫框架和 GitHub API 都不要，省得操心限流和 token。另外两条更硬：每条样本都要能倒查到仓库、commit、文件路径和分块编号，缺一个不算合格；输出直接是 MiniMind `PretrainDataset` 要的 `{"text": "..."}`，不做二次转换。

这后两条基本把产物定死了：一份训练文件，一份溯源侧车。

## 80 万条是怎么堆出来的

数据按语言拆开存，哪门语言不对劲可以单独查、单独补、单独调采样比例。训练用的是跨数据集去重后的单文件版本。

| 数据集 | 语言 / 类别 | 记录数 | 仓库数 | 数据大小 |
| --- | --- | ---: | ---: | ---: |
| `java_code` | Java | 133,569 | 15 | 245.5 MB |
| `c_cpp_code` | C / C++ | 113,187 | 16 | 225.1 MB |
| `ts_code` | TypeScript | 106,702 | 16 | 172.6 MB |
| `github_code` | Python | 77,301 | 29 | 146.6 MB |
| `go_code` | Go | 74,664 | 16 | 149.9 MB |
| `js_code` | JavaScript | 55,940 | 16 | 80.7 MB |
| `rust_code` | Rust | 50,028 | 15 | 97.5 MB |
| `php_code` | PHP | 42,140 | 8 | 74.1 MB |
| `cs_code` | C# | 38,610 | 8 | 71.8 MB |
| `ruby_code` | Ruby | 30,088 | 8 | 53.2 MB |
| `kt_code` | Kotlin | 27,125 | 8 | 41.3 MB |
| `swift_code` | Swift | 17,129 | 8 | 32.6 MB |
| `learning_code` | 基础编程学习资料 | 15,664 | 15 | 24.4 MB |
| `markdown_code` | Markdown 文档 | 12,156 | 12 | 17.4 MB |
| `gpt_load_code` | 早期 gpt-load 数据 | 8,705 | 1 | 17.3 MB |
| **合计** |  | **803,008** | **191** | **1,449.9 MB** |

打包后的训练入口：

| 项目 | 值 |
| --- | --- |
| 单文件 | `coding/data/code_pretrain.jsonl` |
| 记录数 | 802,952（跨数据集去重后） |
| 大小 | 1,449.9 MB |
| 估算 token | 约 6.2 亿 |
| 溯源清单 | `coding/meta/code_pretrain.manifest.json` |

上表加起来是 803,008，这里却只有 802,952。差的 56 条不是算错，是合并阶段抓出来的跨文件重复，后面细说。

## 采集器只读 Git 对象

主干逻辑不复杂：

```text
浅拉取指定 commit（git fetch --depth=1）
  → git ls-tree 列出所有 blob
  → 按扩展名、目录与生成文件规则过滤
  → git cat-file --batch 批量读取内容
  → UTF-8 解码（拒绝二进制）
  → 按行边界切为不超过 2048 字符的块
  → 基于内容 SHA-256 去重
  → 写入 {"text": ...} 与溯源侧车
```

复杂的地方在三个细节。

一是用 `git cat-file --batch`，别逐文件 `git show`。一个仓库几千个候选文件，每个起一次 `git show`，进程创建和 Git 初始化的开销很快压过真正的读取。我第一次拿大仓库试的时候，进度条几乎不动、CPU 却也不忙，盯着看了一会儿才反应过来时间花在哪了。`--batch` 是批量协议：往同一个 Git 进程里连续写 blob 标识、连续读回内容，整个仓库压缩成一个子进程。

二是分块尽量切在行边界。每块上限 2,048 字符，按字符位置硬截最省事，但会把语句、字符串字面量、注释拦腰切断。代码的可读性全靠换行，所以优先在行边界切。函数中间被切开是免不了的，至少行内结构还在，样本看起来还像段真实的代码。

三是按内容哈希去重，路径不算身份。示例、vendor、模板、拷贝出来的代码，同一份东西出现在不同路径下太常见了。每个分块算一遍 SHA-256 当去重键，路径、仓库、commit 留在侧车里当来源信息。

## 七个坑

按踩到的顺序写。

### --max-samples 是全局限额

第一次敲 `--max-samples 5000`，我心里的读法是"每个仓库最多 5,000 条"。它实际是整条命令总共 5,000 条，照着 `--repo` 的顺序一个个消耗。比如一条命令里依次写了 `psf/requests`、`pallets/flask`、`psf/black`、`pandas-dev/pandas`，前三个把额度吃掉大半，pandas 明明有大量素材也只剩点残渣。更夸张的一次，`django/django` 一个仓库就吃满 8,000 条，同批的 scikit-learn、NumPy 一条没采到。

后来就改成每仓库单独跑一次，再用 `--append` 汇总。慢，但不会有仓库莫名其妙饿死。

### 许可证把 meta 撑到 4.7 倍

侧车最初每条记录都带一份仓库根目录的许可证全文，当时的考虑是每个样本都该知道自己受什么约束。样本数一上去，一个藏起来的重复被放大了：同一份 LICENSE 被复制进同一仓库的每一行 meta。

Python 数据集最明显：77,301 条来自 29 个仓库，训练数据 146.6 MB，meta 却有 648.4 MB。拆开看，95.9% 是重复的许可证文本，真正有用的来源字段——哈希、repo、commit、path、chunk index——加起来才约 26.7 MB。

解决办法是抽取加剥离：按仓库把许可证去重后写进 `xxx.licenses.json`，删掉每条 meta 里的 `licenses` 字段，再回头确认 `--append` 只依赖 `sha256` 和 `code_sha256`、不依赖许可证正文。648.4 MB 变成 25.6 MB，一个数据集省下 642 MB。

更难受的是这事后来又回来过三次。每轮扩容我都以为收拾干净了，直到最后一轮才彻底了断，meta 总量从 3,908.2 MB 压到 278.7 MB。

### 许可证为空未必是 bug

redis、libgit2、matplotlib 三个仓库的许可证记录是空的。第一反应当然是解析 bug，我把 Git 树翻出来对了一遍，才发现它们各自卡在不同的边界上：

| 仓库 | 现象 | 根因 |
| --- | --- | --- |
| `redis/redis` | `LICENSE.txt` 未被读取 | 72,266 字节，超过许可证读取上限 64 KiB |
| `libgit2/libgit2` | `COPYING` 未被读取 | 67,021 字节，同样超过上限 |
| `matplotlib/matplotlib` | 根目录没有许可证记录 | 许可证位于 `LICENSE/` 子目录，采集器只扫根目录 |

都不是崩溃，也不是丢数据，是我自己设的上限和扫描范围。但这些情况还是得写进文档：能说清这儿为什么是空的，也算可追溯的一部分。

### phpunit/phpunit 不存在

采 PHP 时 `phpunit/phpunit` 连着三次回 `Repository not found`。连着失败三次，人容易往网络、认证、Git 抽风上想。真实原因朴素得多：项目搬家了，现在的坐标是 `sebastianbergmann/phpunit`。换成对的，一次就采到 5,136 条。

批量采集里"偶尔失败"的仓库，值得先确认坐标还对不对。改名、迁组织在 GitHub 上是常态。

### Markdown 默认不采

需求里写着"加点 Markdown"，看着加个 `--extensions .md` 就完事。麻烦在前面：之前所有采集都走代码扩展名白名单。

```python
DEFAULT_EXTENSIONS = {
    '.py', '.js', '.ts', '.java', '.c', '.cpp', '.go', '.rs',
    # 没有 .md
}
```

也就是说，仓库里躺着多少好 README、教程、设计文档都进不来。最后显式传 `--extensions .md`，从 free-programming-books、developer-roadmap、system-design-primer、coding-interview-university 等 12 个仓库采到 12,156 条。

遇到"为什么没有数据"，读源码通常比反复改命令快。

### 打包文件名差点让数据翻倍

合并 15 份数据集听起来只是拼 JSONL，但训练命令用的是 glob：

```powershell
python train_pretrain.py `
  --data_path "../../training_data/coding/data/*_code.jsonl"
```

打包文件要是叫 `code_pretrain_code.jsonl`，它自己也匹配 `*_code.jsonl`，训练时打包文件和它的全部来源文件一起加载，数据当场翻倍，一句报错都没有。所以最终文件名定成：

```text
code_pretrain.jsonl
```

落在 `_pretrain.jsonl` 上，匹配不到 `*_code.jsonl`。派生文件和源文件住同一个目录时，文件名就是接口，别图顺手。

### meta 挪了目录，--append 就傻了

为了目录清爽，我把训练数据、侧车、许可证分别放进 `data/`、`meta/`、`licenses/`。收拾完发现没法继续追加采集了。原因很土，采集器把 meta 路径硬编码成和数据同目录：

```python
def metadata_path(output):
    return output.with_suffix('.meta.jsonl')
```

`--append` 全靠这函数找旧侧车。数据在 `data/`、meta 在 `meta/`，它还去 `data/` 里找一个不存在的文件。

修法不是把目录退回去，而是加一个可选的 `--meta-dir`，老行为继续成立：

```python
def metadata_path(output, meta_dir=None):
    if meta_dir is None:
        return output.with_suffix('.meta.jsonl')
    return Path(meta_dir) / f'{output.stem}.meta.jsonl'
```

配了三条回归测试：传了 `--meta-dir` 侧车落在正确位置；传了能继续追加；侧车已经分家、却没传 `--meta-dir` 时，追加必须明确失败。第三条是故意留的，只测成功路径的话，"悄悄写到错地方"这种事永远拦不住。到这一步采集器 34 个测试全过。

## 写完不等于写对

采集器打印"成功写入 5,000 条"，只证明它写了文件。JSON 合不合法、哈希对不对、文本重没重复、末行截没截断、来源字段全不全，一概不知。

所以每轮采完我单独跑一个校验脚本，而且刻意不复用采集器的内部逻辑——同一个 bug 既当生产者又当质检员，出事太容易了。

| 检查项 | 独立校验方法 |
| --- | --- |
| 行数一致 | 训练 JSONL 与 meta JSONL 逐行配对计数 |
| JSON 合法 | 每行执行 `json.loads`，并要求键集合恰好为 `{"text"}` |
| 哈希正确 | 对 `text` 重新计算 SHA-256，再与 meta 对比 |
| 无重复 | 用全局 SHA-256 集合检查重复内容 |
| 溯源完整 | 每条 meta 均包含 repo、commit、path、chunk_index |
| 文件完整 | 验证文件以换行结尾，避免最后一条记录截断 |
| 追加可用 | 直接调用采集器的 `existing_hashes` 逻辑进行验证 |

15 份数据集都过了。然后在打包阶段再做一次跨数据集全局去重，JavaScript、Java、C/C++、C#、Go、Rust、PHP、Kotlin、Swift 和学习资料之间一共撞了 56 条。56 条，占 0.007%，小得可以假装没看见。但文件内去重和数据集级去重是两回事——直接 `cat` 拼起来，它们就一声不响地进了训练集。

## 2048 是怎么量出来的

采集器管的是字符数（`--max-chars 2048`），训练管的是 token 数（`--max_seq_len`）。两者之间没有固定汇率，语言之间差别还很大。

我用 MiniMind 的 ByteLevel BPE tokenizer（词表 6,400）把每份数据集的分布量了一遍。为了不额外装依赖，编码流程用纯 Python 写，15 份数据集各随机抽 700 条做 encode → decode 往返，结果是 0 处不一致。

| 数据集 | 字符 / token | token 中位数 | 768 截断率 | 1024 截断率 | 2048 截断率 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Java | 2.38 | 794 | 56.6% | 4.6% | 0.0% |
| C / C++ | 1.94 | 976 | 87.7% | 41.6% | 0.0% |
| TypeScript | 2.33 | 786 | 52.4% | 4.0% | 0.0% |
| Python | 2.46 | 780 | 54.1% | 3.9% | 0.0% |
| Go | 1.87 | 1,051 | 84.7% | 55.6% | 0.0% |
| JavaScript | 2.08 | 755 | 48.9% | 17.0% | 0.0% |
| Rust | 2.31 | 846 | 69.3% | 6.6% | 0.0% |
| PHP | 2.23 | 809 | 58.6% | 15.0% | 0.0% |
| C# | 2.66 | 728 | 35.1% | 0.4% | 0.0% |
| Ruby | 2.27 | 825 | 63.4% | 6.0% | 0.0% |
| Kotlin | 2.43 | 720 | 37.7% | 3.3% | 0.0% |
| Swift | 2.46 | 783 | 56.3% | 3.9% | 0.0% |
| 学习资料 | 2.37 | 692 | 39.4% | 2.3% | 0.0% |
| Markdown | 1.81 | 448 | 39.1% | 25.6% | 4.1% |

数字摊开，想装没看见都难。C# 密度最高，2.66 个字符换 1 个 token；Go 最低，只有 1.87——同样 2,048 个字符，C# 里约 770 token，Go 里要 1,095。768 那列最惨，代码数据集的截断率全落在 35% 到 88% 之间，照抄通用文本示例里的长度，等于亲手扔掉大段上下文。2048 那列全是 0.0%，只有 Markdown 是 4.1%，散文密度低、篇幅长，倒也符合直觉。

所以合适的最大长度没法从示例参数里继承，只能拿 tokenizer 和真实数据一起量。

## 目录、训练、复现

训练数据、侧车、许可证按职责分开：

```text
training_data/
├── coding/
│   ├── data/          # 15 份分语言数据 + 1 份全量打包文件
│   ├── meta/          # 15 份溯源侧车 + 1 份打包清单
│   └── licenses/      # 按仓库去重后的许可证全文
├── chat_data/         # CodeX / ZCode 导出的对话 SFT 数据
├── officals/          # 官方示例预训练数据
└── scripts/           # 采集器、导出器与测试
```

推荐用单文件训练，这样跨数据集去重才是有效的：

```powershell
python train_pretrain.py `
  --data_path "../../training_data/coding/data/code_pretrain.jsonl" `
  --max_seq_len 2048
```

也可以按语言分开加载：

```powershell
python train_pretrain.py `
  --data_path "../../training_data/coding/data/*_code.jsonl" `
  --max_seq_len 2048
```

提醒一句：首次加载时 HuggingFace `datasets` 会在缓存目录生成 Arrow 缓存，大概要额外留 1.5–2 GB 磁盘。

想自己跑一遍的话，采 TypeScript 仓库、侧车写进独立目录：

```powershell
python training_data/scripts/collect_training_data.py `
  --repo vuejs/core --repo nestjs/nest `
  --extensions .ts,.tsx --max-samples 10000 `
  --output training_data/coding/data/ts_code.jsonl `
  --meta-dir training_data/coding/meta --append
```

测试：

```powershell
cd training_data
python -m unittest discover -s scripts/tests -v
```

全部参数 `python scripts/collect_training_data.py --help`。仓库清单、每份数据集的统计、许可证为空的说明，都在 `training_data/scripts/README.md` 里。

## 一些零碎

跑完这轮，有几件事确实记住了，随手记下。

最费人的从来不是采集，是解释异常：meta 为什么 648 MB、许可证为什么空着、数据看着完整却追加不了、某门语言为什么老被截断。没有独立验证的采集，本质上是产出了一个还没被信任的文件。

默认参数也最会装没事。`--max-samples` 的全局语义、扩展名白名单里没有 `.md`、示例里的 `max_seq_len 768`，三个默认值捅了三类篓子。管道这东西，读实现和读测试，比读使用文档靠谱。

许可证那课我交了三次学费：一个字段是每样本属性还是每仓库属性，动手前先想想它的基数。8,705 条时多几 MB 无所谓，到 803,008 条就是几个 GB。

还有一条有点反直觉：`--meta-dir` 的修复里，"漏传会明确失败"和"传对能跑通"一样要测。数据工程里最危险的 bug 很少崩，它们只是安静地写出错的东西。

从 8,705 条到 803,008 条，翻了九十二倍。至于那七个坑——它们的价值大概是让我下次别再踩。也可能只是换个姿势再踩一次。
