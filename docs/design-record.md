# AlvenX UIUX 设计与复验记录

[交互展示](https://alvenx.com/ui/) · [源码仓库](https://github.com/AlbertXXuu/alvenx-liquid-glass) · [设计规范](design-language.md) · [集成指南](integration.md)

[轮廓算法](../src/geometry.ts) · [透射算法](../src/lensTransmission.ts) · [体积渲染](../src/volume-renderer.js) · [设计变量](../tokens.json) · [复现证据](reviews/2026-11-25/asset-record/README.md)

AlvenX UIUX 把品牌的蓝、靛、紫和有体积的玻璃做成可复用的网页组件。玻璃帮助读者看清可操作区域、理解输入反馈和活动状态。展示页以原生文字、按钮、滑条、开关和一体式珠体验证这些规则。组件源码、视觉样片、浏览器复验和发布回执各自保留版本身份。适用范围是设计套件及其明确接入的界面；每个宿主的实施与验收以该宿主的实际入口和版本记录为准。

**关键词**　AlvenX、Liquid Glass、蓝／靛／紫、三次 Bézier、周期三次 B 样条、原生文字、图像空间折射、双线性采样、渐进模糊、珠光体积、出芽、减少动效。

## 视觉图例与采用范围

| 形体 | 用途与观察点 |
| --- | --- |
| 单片自由透镜 | 《发布检查单》的原生字位于透镜下方。透镜为短而饱满的柔曲形，经过、按下、拖动和放开时维持水平方向。局部有字形位移，外侧保持原版式。比较时将折射设为零。 |
| 小玻璃控件 | 按钮、开关和滑条旋钮沿用饱满柔曲家族。可见边缘、裁切和高光对齐，固定目标接收悬停，拖动映射有稳定的参考范围。宽输入和顶栏保留足够内距，使用带平直段和渐变曲率的转角。 |
| 版面与文字 | 以留白、对齐和必要边界组织内容。英文使用 Instrument Sans，中文使用 MiSans，所测头部盒子和点击目标保持稳定。页头使用正式字标，导航悬停显现玻璃，键盘焦点清晰可见。 |
| 母体、软颈、内容腔 | 一体珠体通过隆起、短颈延伸和右腔展开显示动作结果。珠光、高光和接触阴影体现深度。展示页的「交互预览」按右腔可见投影水平居中，垂直落在上缘向下约 38.2% 处。 |

品牌主色为蓝 `#2563EB`、靛 `#4F46E5`、紫 `#7C3AED`，辅以浅蓝及灰蓝／灰紫的照明层。色值、默认面板和状态规则从套件 `tokens.json`、品牌资产和设计规范读取。英文为展示默认语言，中文由用户切换，布局与材质状态保持。 [形体、颜色与字体](design-language.md) · [导航与页首行为](navigation.md) · [首页珠体接入记录](budding-volume.md)

## 算法与工程决定

**空间曲线。** `src/geometry.ts` 的 `contourShape` 和 `shellPath` 将周期三次 B 样条表示为相邻 SVG `C` 段。自由透镜输出 32 段，接点一、二阶导数连续。单段以端点 `P₀、P₃` 和手柄 `P₁、P₂` 表示，端点切线为 `3(P₁ − P₀)` 与 `3(P₃ − P₂)`。`cubicFramePath` 为宽形体生成平直边和每角两段三次曲线，平直接点处曲率回到零。控件在同一显示几何上裁切采样、轮廓与边光，悬停和拖动另有稳定的输入参考，避免变化中的边缘反复触发进出。滑条、开关在基线 B 中按未舍入的透镜几何与轨道端帽推导端部局部密切圆关系。 [空间曲线与 B 端部规则](design-language.md) · [SVG 2 三次路径规范](https://www.w3.org/TR/SVG2/paths.html#PathDataCubicBezierCommands)

**时间曲线。** 悬停、按下、释放和键盘移动以三次段描述。拖动时以当前指针直接更新空间位置。释放以当前状态为 `P₀`，用限幅速度 `v₀` 和时长 `T` 计算 `P₁ = P₀ + v₀T/3`，末端令 `P₂ = P₃`，终点速度为零。重抓从当前画面继续。减少动效关闭装饰时间变化，同时保留拖动、快捷键和操作结果。「Background motion」与页面可见性控制共享光的相位；珠体首进开场使用约 3000 ms 的实际可见时间，减少动效环境下直接展示完整形体。 [文字透镜的时空曲线](text-lens.md#空间轮廓和时间过渡) · [首进开场设计记录](releases/1.3.2/README.md) · [CSS Easing](https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions)

**配准与透射。** `ControlledScene` 注册环境场或轨道。自由透镜从一个实际输入读取内容、字形位置、字体、字距及滚动位置，配准到同坐标的 Canvas 光场。`src/lensTransmission.ts` 对归一化坐标 `n` 计算深度 `d = max(0, 1 − dot(n, n))`，将向量 `n` 乘上 `d²(3 − 2d)` 和各轴增益得到采样位移。这一处是图像空间的视觉近似。WebGL 用浮点位置和 `LINEAR` 双线性读取相邻纹素，目标密度为 2 倍 DPR，并受设备纹理大小、像素和缓存预算约束。半透明轨道、字形保持 alpha。轮廓内叠加结果，外侧继续由浏览器绘制。编辑聚焦、选区和 IME 组合保留原生呈现与语义。有注册源且能力允许时使用对应路径，图形能力受限时按检测回退到可用材质。 [文字和低密度字边](text-lens.md#文字透射与低密度字边) · [注册源与 B 光学](balanced-optics.md) · [浏览器兼容性](compatibility.md) · [Khronos WebGL 1.0](https://registry.khronos.org/webgl/specs/latest/1.0/)

**模糊与控制。** 同一份 `useGlassSettings` 将 7 个参数、2 个开关连接到展示、滑条、数字输入和原生开关。`Refraction level` 范围 0–3，0 位移为零。`Blur level` 改变整片透射，`Progressive blur` 随归一化半径加强靠边区域的模糊。两项范围均为 0–6 px，高档通过有界缓存与高斯预滤镜扩大采样支持，紧凑标签使用较小的映射保留笔画。底色透明度初始和重置为 0.3。直接输入在提交时归界并规范化；取消恢复最近提交值，保留原生选区和输入法。 [完整参数与键盘合同](design-language.md#七参数与两个开关) · [运行时与预算](runtime-quality.md)

**珠体与反光。** 大形体让母体、短软膜颈与内容腔共用算法覆盖形体。WebGL 使用解析高度、法线、近似环境采样与阴影体现同一体积；小控件使用浏览器提供或注册的局部背景。展示用 `GlassClock` 分发共享灯光方向，珠体、镜片和小控件各自按轮廓和材质调整反光强度。这些是适合交互的实时材质近似。Apple 的公开设计资料提供材质层级参考，Wyman 的研究提供图像空间折射背景，Walter 等人的工作说明界面反射、粗糙度和透射的关系。 [Apple WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) · [Wyman，SIGGRAPH 2005](https://cwyman.org/papers/sig05_approxISRefr.pdf) · [Walter 等，EGSR 2007](https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html) · [来源与授权](attribution.md)

## 设计迭代与固定证据

| 阶段 | 采纳与复验记录 |
| --- | --- |
| 2026-10-16 材质 v6 | 已确认的蓝紫材质、珠光体积、柔曲控件与 B 端部关系。原始源码、证据和 SHA-256 清单固定保存。 [基线说明](baseline/v6/BASELINE-README.md) · [源码清单](baseline/v6/SOURCE-MANIFEST-v6.json) |
| 2026-10-19 响应式审查 | 竖排 R1 被否决。R2 保留横向形体，R3 验证窄屏入口、明确注册场景和原生输入。各阶段按自己的发布与终验状态阅读。 [审查账本](reviews/2026-10-19/README.md) |
| 2026-10-19 至 10-29 首页出芽 | 从 `BuddingLink` 的单一生长玻璃到可独立拖动的 `VolumeBuddingLink`。归档保留原生导航、首帧、键盘、常见视口和线上文件回执。 [1.3.0](releases/1.3.0/README.md) · [1.4.0 发布记录](releases/1.4.0/publication.md) · [1.4.3](releases/1.4.3/README.md) |
| 2026-10-29 展示文案揭示 | 历史版本在出芽末段渐显三行文案；当前示例保留简短交互标题和右腔投影定位。各版证据可按其固定版本对照。 [10 月 29 日呈现留档](reviews/2026-10-29/copy-reveal/README.md) · [当前文字与环境光说明](text-lens.md#环境光与控制) |
| 2026-10-31 B 注册光学 | 选定明确注册 Canvas 的 B 路径，保留真实控件语义、可见性调度及原生／平面回退。历史矩阵包含引擎、参数、故障注入和独立安装。 [稳定性记录](reviews/2026-10-31/b-stability/README.md) · [实测结果](reviews/2026-10-31/b-stability/results.json) |
| 2026-11-25 文字透镜研究 | 有限窄缝研究曾用单缝 `sinc²` 比较光强。零间距双片试样改用同源环境色表达接触高光。用户截图指出接触线与边缘倾斜后，展示改为单片水平曲面并采用双线性文字采样。早期双片测试按历史试样使用。 [单缝公式的物理条件](https://openstax.org/books/university-physics-volume-3/pages/4-2-intensity-in-single-slit-diffraction) · [当前渲染与复验记录](text-lens.md) |

## 重建与复验

从源码仓库选定提交或标签，在设计套件根目录使用项目支持的 Node（最低 20.19）和锁文件。开发入口为 `http://127.0.0.1:5174/`，`#refraction` 是文字透镜。完整路线包含以下命令。

```sh
npm ci
npm run check
npm run build
npm run test:contract
npm run test:runtime
node scripts/test-text-lens-motion.mjs
node scripts/verify-kit.mjs --baseline-only
npm run dev
```

| 复验对象 | 正常入口与通过条件 |
| --- | --- |
| 轮廓、时序与操控 | 在展示页分别走静止、经过、按下、拖动到边缘、松手、回弹途中重抓、键盘焦点和减少动效。透镜保持水平，命中、高光及采样跟随同一曲线。轨道固定，开关和滑条的键盘与原生状态同步。 |
| 光学与文字 | 在桌面和窄屏各查 1×、2×，截图比较同一帧透镜内外的字、折射零档、两种模糊分别调档、光照与回退。实做原生选区、中文 IME 与恢复编辑。浏览器脚本见 `scripts/text-lens-raster-qa.cjs`，使用 Playwright CLI 的 `run-code --filename` 回调。原生和平面兼容路径可通过 `?optics=native`、`?optics=flat` 比较。 |
| 导航与入场 | 尺寸变化后检查无横向溢出，字标 click、Enter、Space 返回页首并保留 URL、历史与界面状态。检查导航焦点、隐藏恢复、首次实际可见时的珠体播放。参考 `scripts/text-lens-header-qa.cjs`、`scripts/entry-autoplay-qa.cjs` 及导航规范。 |
| 包与公开入口 | `npm run pack:kit` 和 `npm run test:install` 复验独立消费。`dist/` 是库产物，`site-dist/` 是展示静态文件；将后者完整挂在 `/ui/`，保留入口斜杠及 `base: './'`。在公开地址复取 HTML 和实际加载的 JS、CSS、字体，校验资源身份，再从主路线复测交互。 |

文字透镜脚本需在隔离的回放目录运行。在同一父目录下建立 `tmp/replay/` 和 `audits/text-lens-raster-20261125/`。以 `tmp/replay/` 为工作目录，用 `playwright-cli -s=alvenx-ui open http://127.0.0.1:5174/` 打开展示，再用 `playwright-cli -s=alvenx-ui run-code --filename=<脚本的绝对路径>` 运行。回调返回浏览器检查结果，并将截图写到上述 `audits/` 子目录。

记录浏览器与版本、视口、DPR、资源标识和实际状态。桌面浏览器模拟只覆盖明确记录的条件；物理 iOS、真实触控设备和系统 IME 的通过结论来自对应实测。公开源码与设计保留版权，Instrument Sans、MiSans 和其他依赖各随其许可。 [交付检查单](baseline-and-checklist.md) · [兼容边界](compatibility.md) · [资产与许可信息](attribution.md)
