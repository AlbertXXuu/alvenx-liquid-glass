# R3 after async map encoding / 异步编码实现后

**Phase: first async encoder — self-rejected-latency. Parent R3: draft. Date: 2026-10-19.** 像素与功能检查仍通过，但后续直接触摸测量出现明显压力反馈延迟；根代理已否决这个性能取舍。这不是用户又否决一版，也不是最终优化结果。

## Rejected latency tradeoff / 被否决的延迟取舍

[latency-self-rejection.json](latency-self-rejection.json)单独保存串行冷／热数据。同一 R3 scene 路径、没有按下前悬停的 Chromium 原生直接触摸，六次 cold 的首次非零压力 DOM 延迟由同步阶段 **16.9–40.2ms** 变为本策略 **111.4–170.7ms**；warm 由 **15.7–47.9ms** 变为 **107.9–158.2ms**。鼠标测试仍正常，手势功能和像素证明也仍通过，但不能以这些通过项抵消触摸反馈退步。

目前只确认延迟退步，原生 toBlob 的空闲完成调度与视觉帧队列谁是主要原因仍在隔离。取消同步 PNG 调用不代表总 CPU 成本为零；此候选不能写成性能优化已验收。之后的新编码策略必须另立阶段、重新按同口径测量。

保存的两份[LiquidControl](source/LiquidControl.tsx)／[backdropOptics](source/backdropOptics.ts)源文件来自根代理在 `after-async/` 留存的局部快照，处于后续离屏取消处理之前。它们不是完整 Git 树，也不冒充正在修改的最终源码。

## Quality checks / 质量检查

[implementation-checks.json](implementation-checks.json)分别保留 Chromium 和 Windows WebKit 的独立 Git 基线核对：每引擎 8 组输入，将同步和异步 PNG 解码为 RGBA，与修改前 `review-20261019-r2-published:src/backdropOptics.ts` 比较，记录的 `differingChannels` 和 `maxDelta` 均为 0。它证明这些指定法线场没有改变，不是所有可能参数的保证。

[before-after-visual.json](before-after-visual.json)比较实际集成页中，固定源、减少动效的文字／轨道四组前后图；每组 214,148 像素，最大通道差为 0。这与法线图 RGBA 证明是两种独立检查，不能当作连续动画每帧或性能数据。

[integration-pixel-summary.json](integration-pixel-summary.json)再次验证 Source word／Source line 改动后，真实透镜的输出改变，外侧保持原口径：WebKit 0，Chromium 个别值不超过 2/255。选定结果：[Chromium text](chromium-integration-text-refracted.png) · [Chromium track](chromium-integration-track-refracted.png) · [WebKit text](webkit-integration-text-refracted.png) · [WebKit track](webkit-integration-track-refracted.png)。

自由透镜连续输入测试只出现 scene 模式，源注册误差为 0，并核对两端源平移与进度。最初异步队列／缓存契约记录在同一摘要中；最终离屏取消和 opt-out 调整仍需要另一次结果，不能沿用早期检查代替。

## Actual page input / 实际页面手势

[shape-integration.json](shape-integration.json)来自实际 R3 页面 Chromium 原生触摸注入，覆盖 320／393／768／1180px。母体、连接、内容腔纵拉不滚页；768／1180px 额外覆盖标题字形。由形体内开始并移出仍持续拖动；由外部开始并移入仍保持滚页。手机概览下方正文可以正常滚页。未记录页面错误，也没有据此宣称实体 Safari 或 Combo Touch 已验收。

## Viewed appearance / 已查看外观

[visual-checks.json](visual-checks.json)记录四宽度的单根 WebKit 页面，均无横向溢出／页面错误。根代理与研究代理已查看指定区域；父 R3 的完整自检状态仍等待其余检查。

| View | Screenshot |
| --- | --- |
| 320px refraction / corrected parameters | [refraction](lab-webkit-320-refraction.png) · [parameters](lab-webkit-320-parameters.png) |
| 393px field | [field](lab-webkit-393-field.png) |
| 768px volume | [volume](lab-webkit-768-volume.png) |
| 1180px refraction / volume | [refraction](lab-webkit-1180-refraction.png) · [volume](lab-webkit-1180-volume.png) |

[优化前阶段](../before-async/README.md)原件保持不变。性能收益仍待同一 R3 scene 路径的串行复测；没有用 R2 native blur 与 R3 scene 计算百分比。最终源码补丁／标签等完成最后测试后再保存，本目录不提前拿仍在修改的代码冒充最终快照。
