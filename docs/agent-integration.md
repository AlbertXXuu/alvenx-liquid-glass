# AlvenX Agent 液态玻璃接入

`@alvenx/liquid-glass@1.5.0-agent.1` 是给 Agent 后续使用的本地安装包。包内包含此前验收的 B 折射和零模糊边缘，以及 Agent 自适应工作区的出芽、悬停、点击回弹和拉动。两块玻璃分离后分别处理自己的形变，SVG 回退和命中轮廓与同一套几何同步。

在 Agent 的隔离集成分支，把 `alvenx-liquid-glass-1.5.0-agent.1.tgz` 复制到 `vendor/`，再执行以下命令。Node 版本按 Agent 自身要求使用 22.19 或更新版本，React 和 React DOM 使用 19。

```powershell
npm install ./vendor/alvenx-liquid-glass-1.5.0-agent.1.tgz
npm run check
npm run build
```

Agent 当前依赖 `1.4.3-alvenx-agent.2`，其中 `owner-pearl.tsx` 从包根导入 `createReferenceVolume`。新包保留这一入口，也保留该私有包导出的 `refinementGeometry`、`emptyMotion`、`lobeTransform` 和 `springStep`。切换依赖时保留旧 tarball 和原 lockfile 版本作为回退点。包保留 `private: true` 与 `UNLICENSED`，随包字体各自适用原许可证。参见 [权利及字体通知](../LICENSE-NOTICE.md)。

| 需求 | 接入入口 |
| --- | --- |
| 官网小珠和自然分离 | `VolumeBuddingLink`、`budding-volume.css`。母球随视窗采用 54 或 44 CSS px，右舱对应短链接，实际宽度参与宿主布局。参见 [小珠接入契约](budding-volume.md)。 |
| 官网大形体和背景动效 | `VolumeStage`、共享 `clock` 与 `settings`。官网展示传 `responsive studioMotion autoPlay`，DOM 内容作为 children。它有响应式呈现模式，舱体几何仍由展示自身驱动。源码和部署证据见仓库的 `docs/reviews/2026-10-29/copy-reveal/README.md`。 |
| Agent 全屏母球和工作舱 | `WorkspaceVolume`、`workspace-volume.css`。舱体根据原生内容尺寸适配，出芽后小球和舱体独立响应。首次进入时，Agent 的桌面布局把舱宽设为球直径的 1.618 倍，窄屏改为上下排列。 |
| 工作面板、编辑区 | `GlassPanel`。由 Agent 布局给出宽高，原生内容置于光学层上。默认高 360 px，CSS 最小高 140 px，建议至少 160×140 px。文本区自己滚动时传 `scrollable={false}`。 |
| 按钮、菜单、开关和参数 | `LiquidControl`、`MenuToggle`、`GlassSwitch`、`GlassSlider`、`GlassNumber`。菜单保留原生披露语义。滑块和开关默认注册 B 轨道，按钮若需要 B 折射应放在具有 Canvas 源的 `ControlledScene` 内。参见 [控件接入](integration.md) 和 [B 光学契约](balanced-optics.md)。 |
| 已有 Agent 自定义大舱 | `createReferenceVolume(canvas, width, height, diameter)`。该入口提供官网小珠的体积渲染。Agent 自己测量内容和视窗、管理合体到分离的几何、同路径裁切／阴影／命中和原生焦点。新的接入可用上面的 `WorkspaceVolume` 复用 Agent 工作舱实现。 |

Agent 当前页面已有 `OwnerGlass` 所用的受控参数和原生内容时，可将其组件入口换成如下适配。Vite 直接打包库导出。

```ts
import '@alvenx/liquid-glass/workspace-volume.css';
export { WorkspaceVolume as OwnerGlass } from '@alvenx/liquid-glass';
```

组件消费共享的 `clock` 与 `settings`，由宿主提供 `opened`、`onEnter` 和 `onReveal`。原生表单和工作区内容作为 `children`，舱体完成出芽后解除 inert。玻璃表面支持鼠标悬停、按住拖动和释放回弹。触摸使用相同的按压和回弹，原生内容保留点击和键盘操作。减少动效模式直接呈现最终形体。全屏布局应用于 Agent 的 `.approved-workspace > .workspace`，其他宿主可按自己的布局使用通用舞台。

以下组合可作为空白 React 19 页面上的最小接入。使用独立设置键，每个界面共享一个时钟；示例只包含可交互的原生控件和内容。

```tsx
import { useState } from 'react';
import { WorkspaceVolume, useGlassSettings } from '@alvenx/liquid-glass';
import '@alvenx/liquid-glass/styles.css';
import '@alvenx/liquid-glass/workspace-volume.css';
import '@alvenx/liquid-glass/fonts.css';

export function AgentGlassExample() {
  const { clock, settings, updateSettings, systemReduced } = useGlassSettings({
    storageKey: 'alvenx-agent:glass-example:v1',
  });
  const [opened, setOpened] = useState(false);
  return (
    <section className="alvenx-design" aria-label="Agent glass example">
      <WorkspaceVolume
        clock={clock}
        settings={settings}
        systemReduced={systemReduced}
        opened={opened}
        language="en"
        onEnter={() => setOpened(true)}
        onReveal={() => {}}
        onSettings={updateSettings}
      >
        <textarea aria-label="Draft" placeholder="Write a draft…" />
      </WorkspaceVolume>
    </section>
  );
}
```

现有 Agent 适配层在客户端创建低层渲染器，传入与轮廓同一坐标系的 CSS 像素尺寸。准备期间调用 `poll(elapsed)`，`ready` 后用 `draw(path, growth, clock.material, transform, ambientTime, lighting)`。轮廓使用绝对 `M/C/Z` 命令，三次曲线回到起点后闭合。每个采样列只存储一组上下边界，因此要保留同路径裁切，特别是两块形体在同一列有多段截面时。渲染器按传入宽高分配 1.5× 栅格，宿主负责尺寸预算。重建或卸载时取消订阅并调用 `destroy()`，准备失败或上下文丢失时保留同路径的原生回退。接触阴影与当前轮廓同步，连续铺在玻璃下方。

依赖接入后的视觉验收在 Agent 自己的页面上进行。核对背景动效开关、减少动效、母球与舱体分离、窄窗与长内容、拖动与键盘焦点，以及两个模糊与玻璃填充都为零时深色字穿过镜片的效果。独立安装和浏览器检查用于验证包本身。
