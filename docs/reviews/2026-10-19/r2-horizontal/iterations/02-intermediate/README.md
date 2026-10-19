# R2 local iteration 02 / 中间效果记录

**Status: draft, intermediate visual record. Date: 2026-10-19.**

初次截图中控件空白来自 IntersectionObserver 唤醒的截图时序：只把局部 stage 滚入视野时，后移内容还未唤醒；改为把完整 wrapper 滚入视野并等待后修正。这不是代码失败结论，也不把截图时序问题当作用户否决。

仅保留两张已有截图和当时的浏览器布局数据。[320px stage](iteration02-320-stage.png) · [768px stage](iteration02-768-stage.png) · [sanitized summary](summary.json) · [SHA-256](SHA256SUMS.txt)。这些是 Windows 浏览器模拟截图，不是实体设备验收。

**没有保存此刻的精确源码快照，不能据此重建完全相同的运行版本。** 本记录只证明这些中间视觉曾被保存；不提出源码可复现声明，也不以现行代码冒充当时版本。R1 的已冻结源码和 iteration 01 的补丁有各自独立来源。

最终候选及审查网址的状态见 [R2 主记录](../../README.md)。旧 R1 审查入口与新的 R2 计划入口分开记录，网址变化不改写这些历史截图。
