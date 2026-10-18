# 已确认基线与交付检查单

用户于 **2026-10-16 明确“我确认效果”**，确认对象为 v6 材质与交互小样。最新路线已进一步明确：从独立库获取组件重新开发产品，不接已有主页。库的调度、法线成本、画布预算与兼容渲染是本轮授权范围；用户于 2026-10-18 授权公开 GitHub 与 alvenx.com 独立展示页。以下 1.0.0 交付记录保留为历史证据，不自动代表 1.1.0 代码。

## 基线身份

| 项目 | 记录 |
| --- | --- |
| 基线 | material-direction-preview v6 |
| manifest SHA-256 | `8eb6bf9395ec63b2020211bb8b21815060d7399e27f9dbdd1f2128275760cb8d` |
| 原始 manifest | `SOURCE-MANIFEST-v6.json` |
| 归档位置 | `docs/baseline/v6/SOURCE-MANIFEST-v6.json`；对应媒体与 QA 位于同目录 `evidence/` |
| 已确认主要设置 | strength 2.5；高光 opacity 1、saturation 2；refraction 2；blur／progressive 各 2px；glass opacity 0.3 |
| 原速录像 | `numeric-editing-v6-original-speed.webm`，17.12 秒，1364×1350 |

manifest 与 QA 在用户确认前生成，其原文可能仍写 `visual approval pending`。保留原件，不改写历史哈希；用户后续确认以本记录承接。复制后的独立包不是同一个源文件快照，必须另外验证，不能直接沿用 v6 manifest 宣称整个新包逐字节相同。

## 可以复用的事实与边界

- v6 限定 TypeScript、Vite 小样入口构建通过；390px 输入规则 27 例通过、0 页面错误、无横向溢出。旧保存值、小数规范化、Reset 编辑竞态有定向证据。
- 数字字段原生键盘、输入与焦点已检查；IME composition 和 paste 守卫使用合成事件。没有操作系统输入法或真实剪贴板端到端兼容认证。
- B 几何的端部、连续拖动、两端越界、回弹重抓及 strength 4 有独立检查；strength 0 不产生互动形变。
- 大形体高范围的实际 WebGL uniform／像素变化与小控件的 SVG 光学参数均有定向检查。它们不代表所有参数组合，也不证明稳定 60fps。
- 未据此通过：Safari、物理触屏、辅助技术、高 DPR、125%／200% 缩放、所有长文本和所有参数组合。

## 1.0.0 交付检查（历史记录）

只按真实结果更新下列状态；完成某个旧小样检查，不自动勾选新包的同名项目。

- [x] 记录用户确认日期、范围、基线 manifest 身份及后续审批门槛。
- [x] 按 v6 源码核对七参数范围、默认值、精度、键盘步长和旧值优先规则。
- [x] 整理形体／材质分工、B 局部曲率关系、状态语言与文本安全区说明。
- [x] 提供项目内 SKILL 和来源／授权边界说明，不全局安装。
- [x] 核对原始 manifest、41 个基线源码／证据／共享依赖按原 hash 保存；原始相对路径的解释见冻结目录 BASELINE-README。
- [x] 核对独立包导出、类型、CSS 作用域、字体和品牌资源路径。
- [x] 独立目录执行 check、test:contract、库／类型／showcase build。
- [x] 生成本地 tgz／zip，并在原仓库外的独立 React 消费项目中实际安装、检查类型、构建及浏览器运行。
- [x] 展示平台验证选择组件、参数调整、数字编辑、恢复默认和减少动效；1364px／390px 检查通过，无页面错误与横向溢出。
- [x] 核查 239 个字体／品牌资产与原件 hash 相同，229 个字体 URL 可解析，CDP 确认 Instrument Sans／MiSans 实际字形来源；各自许可随包保留。
- [x] 校验 README 示例、SKILL、当前 Markdown 本地链接与归档 hash；归档恢复 dry run 223 个旧文件、4 份设定快照均通过，0 覆盖、0 实际恢复。

## 1.0.0 包的验证证据（历史记录）

以下路径属于完整源码 ZIP 内的 `docs/validation/`，不把历史媒体全部塞入 npm 运行包。`KIT-MANIFEST.json` 校验交付文件；发布文件自身的 SHA-256 位于 ZIP 旁的 `releases/SHA256SUMS.txt`。

| 证据 | 实际覆盖 |
| --- | --- |
| `contract.json` | 28 项参数／导出／几何契约，15 组原始轮廓同值 |
| `extraction.json` | 336 组轮廓同值；shader 与原基线相同；冻结源码 hash |
| `runtime.json` | StrictMode 挂载／卸载／重新挂载，监听与 RAF 清理、存储 key 切换、系统减少动效、动态 range、真实 WebGL 丢失／恢复 |
| `showcase.json` | 数字归正、Reset、正文、出芽中间态、真实拖动透镜、开关键盘、−10.16px 越界后归零、实际字体、390px 布局 |
| `install.json`／`consumer-browser.json` | 外部新消费项目安装、类型／构建，以及已安装生产包的控件、资源、MiSans 字形和宿主 CSS 隔离 |
| `showcase-clean.png`／`showcase-experience.png` | 当前默认与完整体验区截图 |

移植过程中修复了动态范围变化不同步与 WebGL 恢复后错误遮层未清除的问题；仅新包代码改变，v6 原件保持不变。新 renderer 在 context 恢复时丢弃旧 GPU 句柄以消除失效对象删除警告；其 shader 与原始基线相同，不再宣称整个新 renderer 文件字节相同。

## 当前公开范围（2026-10-18 更新）

本节承接用户最新授权；冻结 v6 与历史验证记录保持原件。

- v6 效果已确认；独立库当前按 public design preview 展示，1.1.2 主要更新公开展示与交付。
- 公开 GitHub 独立项目与 alvenx.com 展示页：**authorized 2026-10-18**。
- 接入已有 AlvenX 主页面：**removed from route by owner**；后续从库中取组件重新开发。
- 复用许可证尚未选择，维持 UNLICENSED／保留版权；npm registry 发布仍需独立指示。

## 1.1.0 运行时质量验证

- [x] 新时钟 15 组检查：60–240Hz 合成时间戳、默认 60Hz 相位预算、隐藏恢复、失焦、布局失效与订阅释放。
- [x] 180 组画布预算边界与非法输入；实际 DPR2 不超 200 万像素。
- [x] 47 项法线／精确缓存检查，冻结 RGB 像素及 R/G/alpha 对比、跨实例缓存与最后 owner 释放。
- [x] 可视区进出、暂停／继续出芽、系统减少动效、WebGL 丢失／恢复和无 WebGL 输入操作。
- [x] Chrome／Firefox／Windows WebKit 三引擎控件、输入、回弹、fallback 和 390px 检查；合成 iPhone context 点击开关／滑条。
- [x] 正式构建六场景短时复测；保留持续 hover 主线程开销较高、原生 blur 在本地 Firefox／WebKit 探针未见像素变化的限制。
- [x] 本版实际 tgz 在仓库外新消费项目安装、类型检查、生产构建及浏览器操作；宿主 CSS 隔离、字体字形与资源请求正常。

本版证据以 `clock-contract.json`、`optics-1.1.0.json`、`showcase-1.1.0.json`、`volume-budget-1.1.0.json`、`volume-lifecycle-1.1.0.json`、`performance-1.1.0.json`、`compatibility-1.1.0/`、`consumer-1.1.0/` 为准；首次提取证据和 1.0.0 报告不替代新版结果。显示器刷新率／DPR／触控模拟不等于物理屏幕／设备验证。新版安装与发布文件完整性由生成的 manifest 和消费项目记录核对。

## 1.1.1 持续悬停验证（2026-10-17）

- [x] 52 组 RGB／RG 正常像素与尺寸对照，含释放共 209 项；1,000 组 Float32 精确数组对照。
- [x] 同一正式构建环境各三次固定 180 点轨迹，交替顺序、中位数与原始样本保留；整页占用小幅改善与局部计算收益分别描述。
- [x] 最终候选的静止／悬停／按住三个固定状态裁剪像素完全一致；不声称覆盖全部过渡帧。
- [x] 连续输入、slider／switch 越界保持、释放／重抓、中点状态、键盘、reduced motion、390px；0 页面错误。
- [x] 原生 PNG 编码保留；较大无压缩 PNG 已从运行时删除，只在 QA 脚本中保留可复现实验。

本轮证据在 `hover-1.1.1/`；具体口径见 [运行时说明](runtime-quality.md) 与 [实际对比页](hover-comparison.html)。冻结 v6 和 1.1.0 发布文件作为历史对照保留。

## 1.1.2 公开展示版（2026-10-18）

本版保留 1.1.1 运行时材质与交互。变更范围是公开展示、官网入口集成、完整许可交付、公开文档和 CI；1.1.1 的性能数字仍明确标识原版本，不冒充本版新测量。

- [x] 当前文档承接用户公开 GitHub 与 alvenx.com 展示页授权；保留版权／UNLICENSED，未擅自选择开源复用许可或发布 npm registry。
- [x] 公开 Git 排除机器相关 `docs/validation/` 原始记录；本地保留原始证据。公开对比页自包含测量与截图。
- [x] 字体协议、OFL 与展示页打包的 React／ReactDOM／scheduler MIT 通知随站点构建交付。
- [x] 类型、库构建、展示构建、28 项几何／参数契约、15 项时钟、180 项预算、1,000＋4,800 项 Float32 精确对照通过。
- [x] v6 冻结 41 文件与 228 字体 URL 校验通过；换行规则保留基线原始字节。
- [x] 展示页 320／390／720／768／1024／1440 宽度无横向页面溢出；移动菜单、舞台横向导航、输入、页首返回 click／Enter／Space、状态／URL 保留和减少动效有浏览器证据。
- [x] 官网入口安装实际 1.1.2 tarball，在现有 React 19.2.8 宿主中构建；原生链接保留导航语义，玻璃焦点跟随当前轮廓。
- [x] 静态 `/ui/` 本地 Worker 响应包含 CSP 与安全头，五项许可证地址均 200；玻璃图像就绪，资源无失败响应。

公开源码包含复现检查脚本；本机浏览器原始证据位于父工程 `output/playwright/public-showcase-2026-10-18/` 与 `public-release-2026-10-18/`，不作为公开 Git 依赖。线上提交与部署身份由 GitHub release 和官网 `ui/showcase-manifest.json` 记录。
