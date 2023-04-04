# 站街

由 null 老师的 Null 站街 魔改而成

## 机制

- 如果存款大于 2w 则先扣除最近 5 次平均值的 20% 的手续费

- 先随机确定总共最多抽多少人 [0, 30]

- 然后判断最多可以抽多少群友，如果群员数 大于 20，则最多 20 群友，否则为群员数

- 然后获取抽多少群友 [0, 最多可抽取群友数]

- 计算最多抽多少路人 总最多 - 抽取群友数

- 计算抽多少路人 [0, 最多可抽取路人数]

- 计算路人给的钱 人数 * [0, 5] * 50

- 获取抽取群友的列表 存款大于0 排除自己 当日造访他人小于2次

- 抽取 群友给的钱为 [0, 6] * 50

- 计算总和

## Buff

### 杨威

在原有的 cd 基础上增加 6 小时，且不能强制站街

## 更新日志

### 1.0.10 - 2023.4.3

- `站街工资` 迁移至 `PY钱包 (py-wallet)`，原有功能改为 `站街数据`

- 废弃 `站街富豪榜`

### 1.0.9 - 2023.3.27

- 重新构建命令解析器

- 加入对于 *贫富分化严重* 的情况的优化（存款大于 2w 则先扣除最近 5 次收入平均值的 20% 的手续费）

- 加入 `--force` 参数和 `强制站街` （扣除最近 5 次收入平均值的 50%，每使用一次，有 70% 的概率获得 *杨威* buff，每次普通站街可以刷新其状态）