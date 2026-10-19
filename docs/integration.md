# 移植指南

本包将 v6 小样的组件与设计规则抽取成独立项目；不携带完整 Agent 业务、对话历史或主页面导航。当前目标是 React 19、TypeScript 与 Vite。消费项目能运行，并不代表它的背景、字体、浏览器和长文本已经视觉验收。

## 包入口与生命周期

实际公开入口为 `@alvenx/liquid-glass`，样式为 `@alvenx/liquid-glass/styles.css`；可选本地字体入口为 `@alvenx/liquid-glass/fonts.css`。根容器使用 `.alvenx-design`，避免全局覆盖宿主页面。当前导出、类型和资源路径已经过独立消费项目的安装、构建及浏览器检查，实际签名可查看随包 `dist/index.d.ts`。

| 导出 | 用途与宿主责任 |
| --- | --- |
| `LiquidControl` | 通用 button／field／circle／thumb 光学外壳；宿主提供 id、clock、children、尺寸与实际业务行为 |
| `GlassSlider` | 连续拖动、B 端部反馈与参数数字输入；提供 value、min、max、step、onChange，不能只绑定展示数字 |
| `GlassSwitch` | checked／onChange 受控开关，中点即时状态、点击／键盘连续切换 |
| `GlassNumber` | 直接数值编辑；使用同一精度、draft、IME、校验与 Reset 规则 |
| `GlassClock` | 共享指针／动画时钟，拥有销毁生命周期；保留 `PreviewClock` 兼容别名 |
| `DEFAULT_SETTINGS`、`PARAMETER_ROWS` | 已确认基线设置及标签、范围、键盘步长、精度，不复制出第二份分叉配置 |
| `SETTINGS_KEY`、`readSettings(storageKey?)` | 默认存储 key 与读取归界；新产品应选自己的 key |
| `useGlassSettings({ storageKey?, optics?, maxFps? })` | 返回 clock、settings、setSettings、updateSettings、reset、reduced、systemReduced，管理设置与时钟生命周期；optics 默认为 auto，计算频率预算默认 60 次/秒 |
| `VolumeStage` | 大母体／膜颈／内容腔展示，接收 clock、settings、children、className、ariaLabel、可选 onPlayingChange／renderBudget；ref 提供 `replay()` |
| `resolveGlassOptics`／`GlassOpticsMode` | auto／svg／native／flat 渲染策略，具体能力和验证边界见兼容文档 |
| `endpointGeometry`、`contourShape`、`shellPath` | 未舍入端部关系与 C2 轮廓的移植入口；几何类型也随包导出 |

优先使用 `useGlassSettings`，不要在 render 里不断 new clock。手动管理 `GlassClock` 时，要在卸载释放 listener、动画订阅和时钟；同一场景不要为每个按钮各起一个独立循环。DOM／WebGL 对象只能在客户端创建，SSR 使用客户端边界或动态导入，不承诺服务端直接执行这些组件。

1.1.0 默认按可见性和活动状态计算。宿主移动布局而没有 resize／scroll 时调用 `clock.invalidateLayout()`；自定义拖动壳可传 `interaction.position` token。`VolumeStage renderBudget={{ maxPixels: 1_000_000, maxDpr: 1.5 }}` 可以限制画布成本，不缩小 DOM 正文。详见 [运行时约定](runtime-quality.md)。`useGlassSettings({ optics: 'native' })` 可显式采用兼容背景模糊；这不是同等折射，见 [兼容渲染](compatibility.md)。

同一 document 中 `GlassSlider`／`GlassNumber` 的 `id` 必须唯一，字段、label、range 和帮助文本依靠它关联；内部 SVG 的 `useId` 并不能替外部字段去重。多个场景使用命名空间 id，例如 `editor:refractionLevel`，并传 `precision={row.precision}`，避免非标准 id 的精度回退到 2 位。`value/min/max` 必须有限，`min < max`，键盘 `step` 必须为有限正数。范围变化会重新计算进度，结束旧拖动事务，并在缩小范围时归正和回调合法值。

`VolumeStage` 自带 `.stage-scroll` 和 `.foreground`，直接把正文 children 传入，不要再外包同名容器。正文在出芽进度超过 `.92` 后揭示；正常出芽为 3000ms 的模拟时间，实际墙钟仍受帧交付影响。`onPlayingChange` 可用于显示 Budding… 与禁用重放按钮。

## 组合示例

下面使用已导出的 API 组合场景；宿主自行提供业务行为。业务文案始终为英文。

```tsx
import { useRef } from 'react';
import {
  GlassSwitch,
  LiquidControl,
  VolumeStage,
  useGlassSettings,
} from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';
import '@alvenx/liquid-glass/fonts.css';

export function MaterialScene() {
  const stage = useRef<{ replay(): void }>(null);
  const { clock, settings, updateSettings, reduced } = useGlassSettings({
    storageKey: 'my-product:material:v1',
  });

  return (
    <main className="alvenx-design">
      <VolumeStage
        ref={stage}
        clock={clock}
        settings={settings}
        ariaLabel="Organic glass material demonstration"
      >
        <p>Start with a clear thought.</p>
      </VolumeStage>
      <GlassSwitch
        id="background-motion"
        label="Background motion"
        checked={settings.ambient}
        clock={clock}
        onChange={(ambient) => updateSettings({ ambient })}
      />
      <LiquidControl id="replay" className="example-replay" clock={clock} onClick={() => stage.current?.replay()}>
        {reduced ? 'Show shape' : 'Replay growth'}
      </LiquidControl>
    </main>
  );
}
```

```css
.alvenx-design .example-replay { width: 196px; height: 48px; }
```

宿主需要给外壳明确尺寸并安排 DOM 内容安全区；组件不会替任意长文计算完整阅读布局。真实 backdrop 要有可采样背景；全白背景下折射差异较弱不能直接归为功能失效，也不能靠加白边冒充折射。

## 调整颜色与文字

`tokens.json` 是当前设计值与契约校验的记录，不会自动驱动运行时。局部外观通过 `styles/glass.css` 中的 CSS 变量调整；在样式导入之后，使用更具体的宿主 class：

```css
.my-product.alvenx-design {
  --ax-text: #293451;
  --ax-background: #F0F2FB;
  --ax-progress-start: #809FE6;
  --ax-progress-end: #A092D8;
  --ax-glass-fill: #F0F2FF;
}
```

| CSS 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `--ax-font-family` | `"Instrument Sans", MiSans, sans-serif` | DOM 字体栈 |
| `--ax-text`／`--ax-content` | `#293451`／`#34405E` | 外层文字／内容腔文字 |
| `--ax-label`／`--ax-value` | `#6E7A9A`／`#53648F` | 标签／数字 |
| `--ax-background`／`--ax-stage-background` | `#F0F2FB`／`#E6E9FA` | 宿主底色／舞台底色 |
| `--ax-track-start`／`--ax-track-end` | `#CBD6ED`／`#D3CFE8` | 未完成轨道渐变 |
| `--ax-progress-start`／`--ax-progress-end` | `#809FE6`／`#A092D8` | 进度与开关渐变 |
| `--ax-focus`／`--ax-selection` | `#6F82BB`／`#929BCD` | 同轮廓焦点／选择边缘 |
| `--ax-glass-fill` | `#F0F2FF` | 小控件玻璃底色 |
| `--ax-edge-dark`／`--ax-shadow` | `#7184B0`／`#59699C` | 小控件暗边／接触阴影 |

七项共享材质参数由 `useGlassSettings` 实时驱动大小形体。CSS 变量不自动重写大体积的过程环境调色，也不替换镜面色的计算公式；如需更换这部分，修改 `src/volume-renderer.js` 的环境／光照颜色常量及 `LiquidControl.tsx` 的 mirror tint 计算，并重新核对材质、文字和对比。改变字体、控件尺寸或 fullness 后要重新检查文字安全区与 B 端部曲率关系。

## 品牌与资产替换

AlvenX 模式复用正式 wordmark／AX 资产和 Instrument Sans／MiSans，不重绘标志。新品牌接入时应明确替换字标、图标、字体配置、正文色和环境调色 token，并验证字宽、行高与光学对比；不能仅换 logo 就假定阅读和形体仍适配。此交付默认仍为蓝紫、无绿色。

字体复制以 `assets/fonts/` 的完整交付为准，保留 Instrument Sans OFL 与 MiSans 的独立许可／NOTICE／manifest。MiSans 的 CSS、unicode-range 和字体二进制需匹配；可按部署路径改 URL，不自行重做子集或转换文件。`fonts.css` 为可选项，已有宿主字体加载时避免重复请求。不要预加载整套中文字体。

自定义存储 key，避免跨产品偏好互相污染；若确有迁移，显式读取旧 key、校验已保存有限值，不通过新默认覆盖旧偏好。存储受限时保持控件可用，并由宿主选择是否告知用户保存状态。

## 没有 React 的项目

可以将当前轮廓、端部曲率推导、法线／位移图和状态转换作为移植参考；这不等于 Vue、原生 iOS、macOS 或其他 GUI 中即插即用。需要另写事件／焦点／生命周期适配，以及对应平台的 backdrop、裁剪和文本层实现。

优先移植一个 slider／switch 对和一个内容腔，验证局部密切圆关系、连续拖动、release／regrab、键盘与文本，再扩大。不要先重写整套框架，也不要声称 shader 与某平台原生材质等效。

## 消费项目验证

2026-10-19 R2 未验收预览增加 `VolumeStage` 的可选 `responsive` 与 `studioMotion`，两者默认 `false`。此前将形体旋转为纵向的 R1 已被所有者否决，记录保存在 [审查目录](reviews/2026-10-19/README.md)。R2 的形体在所有宽度均使用原始 1000×560 横向几何与统一缩放，不旋转母体、连接或内容腔。

`responsive` 按实际舞台容器宽度暴露 `data-layout`：小于 600 CSS px 为 `overview`，600–899 为 `compact-integrated`，900 及以上为 `wide-integrated`。同一份 `.foreground` DOM 始终位于 `.stage` 后，作为 `.stage-scroll` 的直接子元素。两种集成布局将它定位到内容腔；概览布局在完整横向形体下方用正常字号展示内容。宿主可以沿用或覆盖 `styles.css` 中的布局规则，但不应通过重新挂载输入框切换布局。当前 showcase 的卡片、输入及文本安全边距属于展示组合，不能自动适配任意长文。宿主应测试断点、字体、实际文案、草稿和焦点保留。

`studioMotion` 使用同一共享时钟缓慢旋转蓝紫环境与光源，遵守背景动效和减少动态设置，不旋转 DOM 文字。关闭它保留已接受的固定光照角度。这两个选项属于独立审查小样，不改变 v6 接受基线，也不表示 Safari 已获得任意 DOM 背景折射。正式采用前需完成所有者视觉和实机验收。

在消费项目里检查 CSS 作用域、资源路径、实际字体、background/filter 支持、resize、scroll、卸载和多个实例。用短文及中英长文检验安全区，至少覆盖默认、最大强度、减少动效、数值非法输入、Reset 竞态和保存值恢复。

既有桌面 Chromium 证据可作为回归参照，不能替代新宿主的运行结果。尚未验证的平台需记录限制；未确认支持时保留清晰 DOM 与可操作状态，不把功能不可用静默伪装成同等材质。
