# Review record — 2026-10-19 / 审查记录

本目录保存本轮 UI 小样、验证边界和用户决定。技术测试通过、公开可访问与用户验收是三个不同事实；所有中间文件和最终保留的效果、代码、版本都应能通过明确的修订记录追溯。只有用户审查公开小样后明确确认，才能标记 accepted。

| Revision / 修订 | Status / 状态 | Scope and decision / 范围与结论 |
| --- | --- | --- |
| [R1](r1-rejected-vertical/README.md) | **rejected** | 横向形体直接改成竖向及文字排版被用户明确否决。保留截图和工程检查；输入修复仍可用于后续修订，不能自动视为已验收。 |
| [R2](r2-horizontal/README.md) | **published-awaiting-owner** | Decision B 保留原横向几何；已记录截图自检、跨引擎／构建与 tarball 消费验证，固定源码标签及独立审查页已发布。线上 23 项控件回归通过；真机用户验收未完成，时序验证修正单独记录。 |
| [R3](r3-mobile/README.md) | **published-awaiting-owner** | 固定源码标签与独立R3页已发布；线上两引擎排版／明确场景折射／源编辑／CSP、Chromium触摸形体手势通过，首页CSS扫描隔离与原页面身份已核对。全异步延迟失败及视觉过程留档；真机首触／Combo Touch仍待用户验收，详见[发布回执](r3-mobile/publication-receipt.json)。 |

[原 R1 公开审查入口](https://alvenx.com/ui/review-20261019/)是历史来源；页面内容可能以后变化。以对应目录的截图、哈希、来源记录和 Git 代码快照核对当时版本。当前没有在本目录登记任何已获用户接受的新修订。R2 已发布[独立审查页](https://alvenx.com/ui/review-20261019-r2/)，当前等待用户在实际手机、iPad 和 Combo Touch 上确认；最新交付事实见[发布回执](r2-horizontal/publication-receipt.json)。

本轮仅使用以下有限状态，避免把进度写成验收：

| Status | Meaning / 含义 |
| --- | --- |
| `draft` | 正在制作，本地版本，尚未完成自检。 |
| `self-reviewed` | 已完成相应代码、交互和截图自检；不是用户验收。 |
| `published-awaiting-owner` | 独立审查网址已发布，等待用户手机／iPad 等实际体验。 |
| `accepted` | 用户明确确认该修订及其范围。 |
| `rejected` | 用户否决该修订或明确的局部范围；原件仍保留。 |

记录只针对真实存在的修订，不预先创建尚未实现的版本。后续修订需注明沿用哪些工程修复、改动哪些视觉和输入行为、执行了哪些检查、还有哪些设备未验证。公开代码依旧保留版权，不因此授予开源复用许可。

**Unchanged baseline / 未改写的基线：** 2026-10-16 用户确认的 v6 继续有效，原件见 [v6 基线目录](../../baseline/v6/BASELINE-README.md)；其 manifest SHA-256 为 `8eb6bf9395ec63b2020211bb8b21815060d7399e27f9dbdd1f2128275760cb8d`。R1 的发布或否决都不构成对 v6 的覆盖。

## Archive byte integrity / 归档字节一致性

原 R1 标签 `review-20261019-r1-rejected` 保留其发布时由 Git 自动转换为 LF 的文本记录，不移动标签，也不改写历史。R2 归档新增 `docs/reviews/** -text -whitespace` 规则，保存本地记录、JSON 与源码补丁的原始字节，避免提交时的换行转换导致文件内容与 SHA-256 清单不一致。这项修复不改变历史截图或运行时源码；核对某次发布时，应使用对应标签中的文件与其清单，不能混用旧标签文本和新归档字节。
