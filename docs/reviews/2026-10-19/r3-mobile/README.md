# R3 — mobile input and explicit-scene refraction / 移动输入与明确场景折射

**Status: self-reviewed; publication pending. Date: 2026-10-19.** 根代理已明确完成最终技术自检：保留失败和前后证据，最终混合输入策略、生产构建、实际外部包安装及截图检查通过。源码标签与独立网址尚待发布；没有用户验收声明。

## Owner requirement / 当前要求

- 在手机和 iPad 上验证真实可见的折射；调查第一次点击卡顿、Combo Touch 的焦点与拖动问题。
- 手指从**当时实际形体内**开始，可以向任意方向持续拖动形变；从形体外或背景开始，则保持页面平移／滚动。原生正文、输入和小控件保留自身语义。
- 母体、连接、内容腔保持原横向几何。先完成自己的截图检查和测试，再发布独立网址，让用户在真实设备上审查。
- 中间效果、失败、检查、来源代码和版本继续同时在本地与 GitHub 留档。

## Source and route / 来源与入口

| Item | Record |
| --- | --- |
| Base | [review-20261019-r2-published](https://github.com/AlbertXXuu/alvenx-liquid-glass/tree/review-20261019-r2-published)，`3f62f90debbb79e8318e6ce44c5070febe750068` |
| Working branch | [codex/mobile-optics-review-r3](https://github.com/AlbertXXuu/alvenx-liquid-glass/tree/codex/mobile-optics-review-r3)，最终候选已技术自检，提交／固定标签待完成 |
| Planned frozen tag | `review-20261019-r3`，尚未在本记录确认推送 |
| Planned device-review URL | [R3 independent review](https://alvenx.com/ui/review-20261019-r3/)，只是计划目标，尚未在本记录确认发布 |

R2 与原 `/ui/` 继续各自保留。最终发布回执另存，不回写冻结标签；[主摘要](summary.json)明确区分计划、局部证明和最终验收。

## Rendering and input boundary / 实现边界

`ControlledScene`／`ControlledSource` 为背景和透镜提供**同一个明确 SVG 场景**，通过普通 SVG `feDisplacementMap` 改变这份源图像。它可以包含注册的轨道、色块和场景文字；这不是任意 HTML DOM 截图，也不等于 Safari 已支持 SVG URL 的 backdrop-filter。透镜外的原生正文仍保持 DOM，原生输入和焦点不移入光学滤镜。

当前候选改为混合编码：触摸按住及释放回弹期间同步生成相同的精确法线图，鼠标／空闲时异步编码；结合 pointer type、epoch 保护与离屏任务取消。这样选择是为了避免已观察到的原生异步回调延后；最终同口径性能和功能已按范围记录，真机首触仍待用户验证。

滑条／开关通过显式 opt-in 使用这份 SVG 轨道，保留原 DOM 轨道测量、B 端点几何、连续拖动和数值规则。大形体用匹配当前相机与覆盖场的 CSS 裁剪 HTML 命中面，在触摸开始前就区分形体内与背景，避免启动手势后再临时争抢滚动。

新页面的本地输入报告用于核对 pointer/capture 事件和后续帧调度；没有自动上传设备报告的代码。访客可以主动复制报告。报告时间不是物理屏幕显示延迟，也不能单凭事件报告认定硬件性能原因。

## Scoped engineering evidence / 已有局部工程证据

- [受控 SVG 像素证明](evidence/controlled-pixel-proof.json)：Windows Chromium／WebKit 中，保持 blur 为 0，比较位移 scale 0 与 28。轨道及文字区域出现变化；两种场景的透镜外区域均为 0 像素变化。更新共享源后折射结果继续变化，证明不是预先画死的透镜填充。
- [连续源与焦点生命周期](evidence/controlled-lifecycle.json)：WebKit 中连续更新 62 个 revision 后仍 ready，SVG id 唯一；resize 到 320px 后保持原生输入焦点与中英内容。这是独立工程夹具，不是最终展示页的全覆盖验收。
- [受控轨道检查](evidence/controlled-rail-checks.json)：Chromium 和 Windows WebKit 各 20 项；393／1180px 的实测 SVG／DOM 轨道一致，保留静止 B 端点、越界与中点切换、连续源 ready，未记录页面错误。
- [形体手势检查](evidence/shape-checks.json)：Chromium 原生触摸注入中，393／768／1180px 的形体内纵拉滚页量均为 0，形体外纵拉可滚页；WebKit 鼠标检查覆盖实际裁剪命中、斜拉和释放。轮廓采样桌面微基准不等于手机 CPU 性能。
- [R2 基线混合输入调查](evidence/baseline-input-probes.json)：两引擎合计 24 次冷／热鼠标拖动可用，但每次按下前都有 80ms 悬停，不能当作冷直接触摸测试；批次部分重叠，不能当作优化前后性能比较。没有稳定复现用户硬件上的首次点击卡顿，因此没有据此新增猜测性的鼠标事件兜底。

选定图像：[WebKit track zero](evidence/webkit-track-zero.png) · [WebKit track refracted](evidence/webkit-track-refracted.png) · [WebKit text refracted](evidence/webkit-text-refracted.png) · [393px shape held](evidence/shape-393-vertical-held.png) · [768px WebKit diagonal held](evidence/webkit-shape-768-diagonal-held.png) · [393px controlled rail](evidence/controlled-rail-webkit-393.png)。[SHA-256 清单](evidence/SHA256SUMS.txt)只对应此处已复制的证据。

## Failures and process / 失败与过程记录

[Iteration 01](iterations/01-self-rejected/README.md) 保留 320px 参数标题行右侧 Reset defaults 被裁切的失败截图，标记为代理自检否决，尚未作为正式小样发布，也不是用户又否决一版。

[早期源码过程快照](source-process/01-before-final-qa/README.md)保留从 R2 发布记录到本轮工作区的 tracked 补丁及新增源文件。它不是原子 Git 提交，没有宣称独立构建通过；它也不是更早那张失败截图的精确源码。

受控轨道测试曾错误挂载第二份 ReactDOM 并产生重复 filter id，黑色边缘属于测试夹具问题；修正测试挂载后才采用当前结果。只用透明 SVG 路径处理大形体手势的方案也因原生滚动仲裁失败被放弃，当前使用真实 HTML 裁剪命中面。两者分别是验证协议问题和已排除实现，不能混写为最终运行时缺陷。

## Before async optimization / 异步优化前阶段

[before-async 阶段](phases/before-async/README.md)另存实际单根页面的跨 SVG 源像素验证、串行 mouse／direct-touch 测量、明确在此阶段保存的两个源文件，以及指定外观截图。真实 Source word／Source line 的更新可改变折射；透镜外 WebKit 差异为 0，Chromium 最大 2/255，不能混写为所有像素完全相同。

串行直接触摸观察发现每次手势持续段约 39–44 次同步 PNG 编码，单次最高约 21.5ms。曾尝试全异步编码和完整 visual-frame 一起提交以减少这项成本，但后续直接触摸反馈退步被否决。当前混合策略已另行复测，默认桌面 SVG 路径与精确法线图有独立检查。此处没有宣称已解决真机第一次点击卡顿。

## After async implementation / 异步实现后阶段

[after-async 阶段](phases/after-async/README.md)保留另一份独立证据：每引擎 8 组法线图与修改前 Git 源的解码 RGBA 差异为 0；四组实际固定态集成截图前后最大差为 0；自由透镜连续输入只出现 scene 模式、源注册误差为 0；实际 R3 形体手势覆盖标题、内外起点和跨越边界。根代理与研究代理已查看指定四宽度区域，初始 320px 参数标题行溢出已修正。

随后同口径直接触摸显示首个原生异步编码策略明显增加压力 DOM 反馈延迟：[性能取舍已由根代理自检否决](phases/after-async/latency-self-rejection.json)。该阶段的像素／功能通过仍保留，不能抹去延迟退步。该阶段之后的根因隔离、混合策略及最终性能／生命周期／构建／安装分别记录；物理设备验收仍未完成。优化前、被否决的异步策略及更早 R2 基线分开记录，不互相覆盖。

## Failure isolation and current hybrid / 延迟定位与当前混合策略

[focused failure isolation](phases/async-failure-isolation/README.md)确认首个异步策略中，HTML toBlob 与同线程 OffscreenCanvas 的回调都约112.9ms 才到达，FileReader 的后续操作也可能被延后；它不是仅仅 React 的压力属性慢。简单替换为 OffscreenCanvas 在此本地路径未消除问题。当前候选因此使用触摸／回弹同步、鼠标／空闲异步，最终混合策略已按范围通过，物理设备验证仍 pending。

另一个测量边界必须保留：早先 after-async touch JSON 的缓存计数来自 HMR 下另一个模块实例，不能据其中的 0 推断法线成本为 0；原生编码调用与压力 DOM 延迟本身仍有效。被否决阶段的原件不改写，解释更正记录在新增的定位阶段中。

## Hybrid candidate results / 混合候选结果

[最终混合候选的局部结果](phases/final-hybrid-candidate/README.md)已记录36次串行输入：原生直接触摸12次、Chromium鼠标12次、WindowsWebKit鼠标12次。直接触摸cold压力DOM14.5–21.5ms、warm10.5–20.4ms，每次15/15进度更新；不过触摸仍有40–44次同步PNG编码、单次最高23.6ms，不能宣称CPU消失或真机首次卡顿已修好。实际输入10项、本地报告清理和8控件离屏队列／覆盖检查也有独立结果。

[候选快照02](source-process/02-final-hybrid-candidate/README.md)与[最终交付快照03](source-process/03-final-delivery/README.md)分别保留工作区过程；二者都是非原子记录，后续Git提交／标签才是准确源码身份。根代理已完成最终构建、安装和截图复核，R3为self-reviewed，尚未发布或接受。

## Acceptance still pending / 尚未完成的验收

[最终生产构建及实际安装回执](final-delivery/README.md)已经记录：TypeScript／build、28项契约、15项几何、16项时钟、180项预算、5800项kernel、两引擎各117项异步队列契约，以及无关消费项目安装／TypeScript／build和10项浏览器检查通过。当前生产截图中发现的标题空格问题已保存为[Iteration02自检否决](iterations/02-self-rejected/README.md)，修复后重新构建并查看。

Windows WebKit 或 Chromium 结果不代表实体 Safari、Combo Touch、热状态、电池或真实首触体验；只有独立 R3 网址发布后，用户真机测试才可确认这些问题。当前仅为技术self-reviewed，published和accepted仍未发生。

v6 冻结基线、R2 标签和原独立展示页不因这些过程记录改写。源码公开仍保留版权，不授予开源复用许可。

## Physical device protocol / 真机审查步骤

待独立小样发布后，打开**确切的 R3 地址** [https://alvenx.com/ui/review-20261019-r3/](https://alvenx.com/ui/review-20261019-r3/)，不要用旧 R2 或 `/ui/` 代替。本步骤当前全部是待执行项目：已知设备报告包括 iPhone 15 Pro、iPad Air M4 与 Combo Touch，具体系统和浏览器版本尚未确认，尚无通过记录。

1. 重新加载，页面加载后第一次接触就用手指直接拖动玻璃控件，不先移动触控板指针或悬停；连续做第二次，比较第一次与第二次是否卡顿、丢按下或跳值。
2. 先用手指操作，再用 Combo Touch 触控板按住拖动同一控件；检查焦点、释放、越界回弹，以及回弹途中重新抓取是否连续。此测试不预先认定需要浏览器事件兜底。
3. 从真实母体、连接、内容腔内分别向上下左右／斜向拉动，并拉出边界；从背景或形体外开始滚动，再移入形体。前者保持形体拖动，后者保持页面滚动。
4. 分别检查竖屏、横屏及适用的分屏；聚焦中英消息与数字输入，打开软键盘后检查排版、焦点、文字清晰和数值归正。
5. **仅在出现问题时**使用页面的 `Show input report`，再按 `Copy input report` 保留该次事件序列；同时记下设备、系统、浏览器和刚刚的动作。报告保留本地／用户主动复制，不自动上传；其中帧调度时间不是物理显示延迟。

这些步骤是验收协议，不是已经完成的结果。即使法线图和固定态像素差为 0，也不能据此宣称真机问题已解决，或把异步编码的总 CPU 成本写成 0。

[可重跑工程回调](evidence/protocols/README.md)另外保存了原始哈希和仅输出路径调整后的便携副本；它们与真机协议的适用范围分开记录。

## Technical references / 技术来源

- [WebKit issue 245510](https://bugs.webkit.org/show_bug.cgi?id=245510)：SVG URL 背景滤镜与普通受控 SVG 源滤镜是不同实现路径。
- [Pointer Events direct-manipulation rules](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property)：触摸仲裁依据触点及祖先链开始时的 touch-action。
