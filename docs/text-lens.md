# 单片玻璃与文字折射

设计套件展示页 `/ui/` 的首屏把《发布检查单》的原生标题放在一片透明曲面下方。拖动玻璃可查看它覆盖的字形位移，聚焦玻璃后可用方向键移动或按 Home 回到初始位置。折射开关可直接对照玻璃覆盖前后的文字。**Experience** 可跳到下方的 `VolumeStage` 珠体展示。

## 源码与首帧

- `showcase/mobile-review/main.tsx` 负责首屏顺序、双语标签和共享材质设置。`TextLensStudy.tsx` 负责玻璃曲面、光学与输入，`review.css` 负责舞台尺寸、层级、焦点和窄屏排布。
- 容器测量有效后提交首帧，水平位置取可移动范围的 36%，高度取舞台的 49%。静止宽度为舞台宽度的 52%，最大 238 CSS px，同时受舞台高度约束。静止轮廓宽高约 1.61，按下和拖动只做小范围压缩和展开。尺寸变化沿用舞台内的相对位置。
- `ControlledScene` 绘制蓝紫光场。舞台内可见的原生输入保留选区、即时草稿及 IME 组合，组合结束后限制到 18 个字素。拉丁文字使用 Instrument Sans，中文使用 MiSans。玻璃轮廓外的文字由浏览器按原位置和版式绘制。

## 文字透射与低密度字边

`showcase/mobile-review/TextLensTransmission.tsx` 管理首屏透射。`showcase/text-lens-source.ts` 读取同一个原生输入的当前文字、字体、字距、方向、内容区域和横向滚动位置，将文字、舞台光场及画布底色配准到源 Canvas 上。字体完成加载后重新配准，文字、尺寸、位置和必要的滚动变化也会更新源。拖动只更新采样坐标，复用已有文字和光场纹理。

`showcase/text-lens-sampler.ts` 按当帧轮廓变换和位移强度计算浮点采样坐标，并用 WebGL `LINEAR` 双线性采样。源与透射画布的目标密度是设备像素密度的 2 倍，分别受 600 万、200 万像素及设备纹理尺寸上限约束。透射画布复用现有轮廓裁切和模糊设置。输入聚焦编辑、选区或 IME 组合期间，由原生输入直接呈现。WebGL 建立失败或上下文丢失时，自动采用可用的原生材质或平面材质。`?optics=svg` 可重现原有 SVG 位移路径，`?optics=native` 与 `?optics=flat` 可显式复验兼容材质。 [浏览器兼容性](compatibility.md)

2026-11-25 的同页对照中，关闭 SVG 位移时字边恢复，位移图从 96² 增至 768² 后仍可见台阶。Skia 的 SVG 位移颜色输入在当前对照实现中采用最近邻。WebGL 路径让分数像素位移读取相邻颜色纹素，配合高密度源和输出保留形变细节。 [Skia 位移滤镜实现](https://skia.googlesource.com/skia.git/+/d3ff0fc4ed435f672bd7492f7b6e3063bac2dab2/src/effects/imagefilters/SkDisplacementMapImageFilter.cpp) [Khronos WebGL 1.0 规范](https://registry.khronos.org/webgl/specs/latest/1.0/)

自由透镜、原生控件的单行文字和滑条／开关旋钮共用 `src/lensTransmission.ts` 的位移和模糊取样。按钮悬停时按原生字行像素位置绘制透明文字，透射结果呈现在曲面高光下；输入失焦后可轻微折射，聚焦时原生渲染提供光标、选区和输入法。旋钮使用同样的浮点位移读取真实轨道填色，轨道像素以当前曲线裁切。纹理支持透明边缘，以及设备像素密度两倍的采样和有界输出。缺少此路径时，保留原生可见文字、输入和兼容材质。按钮和旋钮悬停沿固定命中参考，变形保持中心，拖动输入映射用静止范围。[Apple 材质指南](https://developer.apple.com/design/human-interface-guidelines/materials) · [Apple WWDC26 平台概述](https://developer.apple.com/videos/play/wwdc2026/102/)

## 空间轮廓和时间过渡

`showcase/text-lens-shape.ts` 每帧通过 `contourShape(width − 4, height − 4, 2.65)` 和 `shellPath` 计算局部盒子中心处的完整闭合面。外缘有 32 段周期三次 Bézier，接点的一阶与二阶导数连续。端点切线分别为 `3(P₁−P₀)` 和 `3(P₃−P₂)`。透射、曲面光、边缘高光、键盘焦点和命中复用当帧外轮廓。平移及变形沿水平坐标系进行。

`showcase/text-lens-motion.ts` 用中心 `x/y`、宽、高和位移强度描述每帧。悬停、按下、松手及键盘移动分别沿 170、135、325、175 ms 的三次时间段。拖动直接映射指针位移。松手以当前姿态为 `P₀`，以实测并限幅的速度计算 `P₁ = P₀ + v₀T/3`，速度单位为 CSS px/ms。`P₂ = P₃` 为目标形态，终点速度为零。减少动效时等效路径使用同一个静止形状，保留拖动和键盘即时定位。[曲线与原生交互标准](design-language.md#三次曲线与原生交互)

## 环境光与控制

`showcase/text-lens-environment.ts` 用品牌白底与蓝、紫、靛环境色生成一份 RGBA 光场，提供给 `ControlledScene` 和透射场景。表面反光和外缘光用完整曲面内的缓变渐层近似。材质面板的交互强度、高光透明度和饱和度、折射、两项模糊与底色透明度驱动现有组件的共享材质。两项模糊在文字透射中使用独立权重。实体玻璃的多次反射、界面粗糙度和折射率有各自的建模范围。[Walter 等，粗糙界面的反射与透射，2007，2026-11-25 查阅](https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html)

首屏控制下方的 **Surface parameters** 使用一份持续存储的设置。**Refraction level** 滑动和数值输入共用 0–3 范围；0 对应零位移。**Blur level** 改变整体透射，**Progressive blur** 主要影响轮廓内侧，两种模糊在零位移时也可使用。0–6 范围内的高档使用缓存的高斯预滤镜，文字控件将可用模糊映射到更小的半径以保留字形。宽输入背景按玻璃厚度计算位移，边缘光上下渐变，左右使用同一亮度轮廓。自由透镜开关用于暂停该示例的光学变形，以便与原生字形对照。页头导航悬停沿用同一文字透射，高光与底色也由本地示例的同一面板驱动。

展示页以大玻璃既有的 48 秒灯光轨迹为方向来源。`StudioLight.tsx` 在共享 `GlassClock` 的 prepare 阶段更新同一方向和 SVG 渐层坐标。大玻璃、小珠、文字透镜、按钮、发送键、输入框、滑块、开关及菜单读取这份方向，保留各自的亮度和有效轮廓。高光强度为零时方向反光撤去；关闭 **Background motion**、启用减少动态或页面不可见时暂停相位。交互、命中、字形和透射继续沿各自的现有路径。 [Apple《Meet Liquid Glass》，WWDC25，2026-11-25 查阅](https://developer.apple.com/videos/play/wwdc2025/219/) · [CSS Images Level 4，2026-11-25 查阅](https://www.w3.org/TR/css-images-4/)

`VolumeStage` 在展示页选择右舱定位。标题按右舱当前投影的水平中心、从上缘向下 38.2% 排布，空间随舱体和视口重算。响应式导航外壳用三次贝塞尔轮廓，选项可点击区域使用原有网格布局，亮边范围按短标签的盒子计算。

多行编辑器和只读区域用原生滚动视口的透明度渐隐收住边缘字形。可继续滚动的一侧在 16 CSS px 内过渡到完整正文。完全展开时，阅读区外侧约 3 px 透明，编辑区约 7 px 透明以收住前一行的残笔。渐隐范围随剩余滚动距离缩短，到端点时为零。滚动条所在区域保持完整可见，编辑框聚焦时恢复完整字形、光标和选区，阅读区的键盘焦点环在遮罩之外绘制。

## 重建与复验

在设计套件根目录运行以下命令。开发入口为 `http://127.0.0.1:5174/`，`#refraction` 锚点可直达首屏玻璃。

~~~sh
npm ci
npm run check
node scripts/test-text-lens-motion.mjs
npm run dev
~~~

`npm run build` 生成 `dist/` 库和 `site-dist/` 展示页。以 `/ui/` 为根挂载整个 `site-dist/`，保留 Vite 的 `base: './'` 和路径末尾的斜杠，使页面脚本、样式、字体及文档相对同一入口解析。

`scripts/text-lens-showcase-qa.cjs` 保存早期双片 SVG 候选的复验。当前 `/ui/` 的采样、文字编辑和兼容复验见 `scripts/text-lens-raster-qa.cjs`，品牌页头可用 `scripts/text-lens-header-qa.cjs` 复核。原生字形、右舱、菜单和共用高光的浏览器记录可从 [设计档案](design-record.md) 和 [公开复验](reviews/2026-11-25/asset-record/README.md) 查阅。公网身份以 `/ui/` 实际取得的资源和部署平台的生效记录为准。

## 分阶段采用

1. 在设计套件完成首屏玻璃、文字、键盘和减少动效的验收。在官网工作线按 `/ui/` 的现有静态资源入口交付，并核对实际资源和线上路由。官网首页的 `VolumeBuddingLink` 单独验收。
2. 由 Agent Desktop 工作线在其正常桌面入口评估接入。以宿主的会话草稿、焦点、键盘操作、状态保持、减少动效和回退路径作为验收条件。
3. 盘点设计套件所有在用演示。分别审查 `VolumeStage` 的出芽和释放、小珠 `ShowcaseBudding` 与首页 `VolumeBuddingLink`，然后检查参数滑块、开关和数值输入、原生消息框、`GlassPanel` 编辑与阅读、兼容模式及在用辅助演示。各演示沿用其原生语义与状态约定。
4. 各演示达到验收条件后，按品牌注册表逐项检查其它 AlvenX 项目的在用界面，由各项目核对其正常入口、例外和回退。固定候选及归档继续使用各自入口与已存证据。
