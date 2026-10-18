# 来源、资产与授权边界

本设计包来自 AlvenX 项目的自有小样实现与用户反馈。用户于 2026-10-18 授权公开 GitHub 与 alvenx.com 展示页。代码公开可见并保留版权／UNLICENSED，尚未选择开源复用许可；字体与品牌保留各自条款。公开授权与代码复用许可分开记录。

## 视觉与实现参考

- [Kube 的 CSS／SVG 液态玻璃研究](https://kube.io/blog/liquid-glass-css-svg/)及其 magnifying glass、slider、switch 演示是公开原理和交互参考。双位移、边缘折射、放大、阴影和缩放启发本项目的验证；本包使用项目自有实现，不复制 Kube 文章源码，不将其研究称为自有论文，也不声称获得作者完整算法库。
- [Apple Liquid Glass 设计视频](https://developer.apple.com/videos/play/wwdc2025/219/)为光照、层次和动态的设计参照。[Apple 设计介绍](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)不构成本包采用 Apple 渲染引擎或达到其跨平台表现的证明。
- AlvenX 正式字标、AX 图标、颜色与 Instrument Sans／MiSans 组合来自相邻品牌基础规范，当前基线结合用户后续明确要求调整形体、材质和交互；不把旧网站 blur token 等同于 v6 参数。

## 数字输入依据

[HTML number state](<https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number)>)中的 min／max／step 约束用于校验，不能依赖其自动归界；maxlength／pattern 不适用于 number。[WAI-ARIA APG spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)提供交互指导。[Adobe NumberField](https://react-spectrum.adobe.com/NumberField)有 snap 与 validate 的不同策略，[decimals 文档](https://react-spectrum.adobe.com/v3/NumberField.html#decimals)不规定所有产品统一的小数位。

本包采用 text＋spinbutton 语义，并选择提交时归界／舍入、2／3／1 位精度、32 字符草稿及提示。它们是本界面工程选择，不标为行业强制要求。实现与验证仍由本包承担。

## 字体与品牌资产

| 资产 | 已读取的本地权利信息 | 随包要求 |
| --- | --- | --- |
| Instrument Sans | `InstrumentSans-OFL.txt`：Instrument Sans Project Authors，SIL Open Font License 1.1 | 保留原字体与 OFL 通知；不把字体单独改授为本项目代码许可 |
| MiSans | `MiSans-License-Agreement.pdf`、`NOTICE.txt` 与字体 manifest；独立 MiSans 协议，并非 OFL | 完整保留原协议、版权／使用通知、CSS 和相应字体文件；标识 MiSans 使用 |
| AlvenX wordmark／AX | 用户品牌规范的正式资产 | 保留原轮廓；第三方品牌使用或替换应由权利人决定，不由本包隐含授权 |

上述记录说明目前已有的许可文件，不替代权利人对具体发布方式的决定。独立包归档时检查这些原件实际存在、路径可用、哈希相符；在完成检查前不能把“文档已说明”当成“资产交付已核验”。

公开源码、tgz 与展示页保留以上通知；网站构建同时输出 `licenses/` 中的许可文件。npm registry 发布仍是独立决定。当前范围与检查见[交付检查单](baseline-and-checklist.md)。
