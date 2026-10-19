# R3 before asynchronous map encoding / 异步编码优化前

**Phase: before-async. Parent R3: draft. Date: 2026-10-19.** 本目录只记录异步法线图编码改动前的结果，不把之后的测量混入，也不代表最终小样视觉或真机验收。

## Actual integration proof / 实际单根页面证明

[integration-pixel-summary.json](integration-pixel-summary.json)来自实际 `mobile-review.html` 的单个 React 根，使用当前 C2 map／材质，分别将滤镜 scale 设为 0 和原值，再修改真实 Source word／Source line。实际字和轨道都产生折射与源更新响应；透镜外 WebKit 最大通道差为 0，Chromium 个别比较最大为 2/255，全部透镜外 `changedAbove2` 为 0。不能把后者说成逐字节完全一致。

选定原图：

| Engine | Text zero / refracted | Track zero / refracted |
| --- | --- | --- |
| Chromium | [zero](chromium-integration-text-zero.png) · [refracted](chromium-integration-text-refracted.png) | [zero](chromium-integration-track-zero.png) · [refracted](chromium-integration-track-refracted.png) |
| Windows WebKit | [zero](webkit-integration-text-zero.png) · [refracted](webkit-integration-text-refracted.png) | [zero](webkit-integration-track-zero.png) · [refracted](webkit-integration-track-refracted.png) |

[LiquidControl](LiquidControl-before-async.tsx)和[ControlledScene](ControlledScene-before-async.tsx)是根代理明确在此阶段保存的原文件；它们只覆盖两个文件，不宣称构成当时完整、独立可重建的代码树。较早的 working-tree 补丁继续保留为另一个过程节点。

## Serial profile / 串行测量

[serial-input-profile.json](serial-input-profile.json)按每次 cold／warm 手势保留测量口径、DOM 压力延迟、RAF 间隔、捕获与释放、编码计数。Chromium 鼠标、Windows WebKit 鼠标、Chromium 原生直接触摸按顺序运行，393／1180px 各三个新上下文；鼠标仍有 80ms 悬停，直接触摸没有此前悬停。

直接触摸每个观察窗口记录到 39–44 次同步 PNG 编码，单次最大约 21.5ms。窗口包含按压、连续拖动和最初释放段，不是按下瞬间做了 44 次编码。这里找到的是持续形变的实际同步成本，没有稳定复现仅第一次操作才出现的硬件卡顿。不能与能力不同的 R2 native blur 直接计算优化百分比。

## Visual state / 此阶段外观

[Chromium 320px refraction](lab-chromium-320-refraction.png)与[WebKit 320px refraction](lab-webkit-320-refraction.png)、[393px field](lab-webkit-393-field.png)、[768px volume](lab-webkit-768-volume.png)、[1180px refraction](lab-webkit-1180-refraction.png)保留当时的外观。根代理和研究代理已查看这些指定区域；整体 R3 仍未标记最终 self-reviewed。Chromium 这批图可能仍用较早的初始 lens x≈0.51；较新的 WebKit 图使用约 0.32／0.31 的初始位置。它们不能冒充完全相同的输入状态来做像素 A/B。

320px 参数标题行的初始溢出另存 [iteration 01](../../iterations/01-self-rejected/README.md)，后续修正已加入 CSS；最终优化版仍需要重新截屏。此阶段和以后 async 阶段必须分别记录，保留质量与性能复测，不预先宣称优化有效或物理 Safari 兼容。
