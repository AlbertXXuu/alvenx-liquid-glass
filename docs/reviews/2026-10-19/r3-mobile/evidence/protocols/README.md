# R3 portable verification callbacks / 可重跑验证回调

这些是原始工程回调的便携副本。[manifest.json](manifest.json)记录原始 SHA-256、归档 SHA-256 和所有路径改动；[SHA256SUMS.txt](SHA256SUMS.txt)核对便携副本。只改了日志、截图或分析输入／输出目录，测量逻辑与本地 Vite URL 未改。归档过程中没有额外执行这些副本，不能把它们当作又一次新测试。

## Run location / 执行位置

使用项目已有的 Node、Python 与 Playwright CLI。启动服务器的终端位于 kit 根目录，执行 `npm run dev`；回调终端位于**包含 kit 的父目录**。当前工作区 kit 文件夹名是 `alvenx-design-kit`，独立克隆时将下面变量换成实际文件夹名。所有新输出写入独立 replay 目录，不覆盖历史证据。

```powershell
# In the directory containing the kit checkout
$r3KitFolder = 'alvenx-design-kit'
$r3Protocols = Join-Path $r3KitFolder 'docs/reviews/2026-10-19/r3-mobile/evidence/protocols'
New-Item -ItemType Directory -Force 'output/playwright/r3-protocol-replay' | Out-Null
playwright-cli --session r3-replay-chrome open 'http://127.0.0.1:5174/mobile-review.html' --browser chrome
playwright-cli --session r3-replay-chrome run-code --filename (Join-Path $r3Protocols 'lab-screens.cjs')
```

| Callback | Engine and scope |
| --- | --- |
| [lab-screens.cjs](lab-screens.cjs) | Chromium／WebKit，四宽度整页与各区域截图 |
| [integration-pixel.cjs](integration-pixel.cjs) | Chromium／WebKit，真实页面文字／轨道 scale-zero 与折射、源更新截图 |
| [normal-extraction.cjs](normal-extraction.cjs) | Chromium／WebKit，解码法线图并与 Git 提取的修改前源比较；需要仓库已有 `work/r3-controlled-proof/backdropOptics-pre-async.ts` 夹具 |
| [async-scene-functional.cjs](async-scene-functional.cjs) | Chromium／WebKit，自由透镜源注册与轨道两端检查 |
| [shape-integration-r3.cjs](shape-integration-r3.cjs) | **Chromium CDP only**，实际形体内／外起点与越界手势 |
| [r3-cold-hybrid-input.cjs](r3-cold-hybrid-input.cjs) | Chromium／WebKit，有 80ms 悬停的鼠标 cold／warm；不是直接首触 |
| [r3-cold-touch.cjs](r3-cold-touch.cjs) | **Chromium CDP only**，原直接触摸与同步编码观察协议 |
| [r3-async-touch.cjs](r3-async-touch.cjs) | **Chromium CDP only**，同一 R3 场景的直接触摸、异步提交与文件读取观察 |

以下最终候选回调另外保留，不覆盖被否决的全异步协议：

| Callback | Scope |
| --- | --- |
| [r3-hybrid-final-touch.cjs](r3-hybrid-final-touch.cjs) | Chromium CDP 直接触摸，混合策略的有效模块计数与15步输入 |
| [r3-functional-inputs.cjs](r3-functional-inputs.cjs) | 实际R3页面10项鼠标／键盘／数值／场景源检查 |
| [r3-diagnostics-cleanup.cjs](r3-diagnostics-cleanup.cjs) | 本地输入报告clear／destroy与待执行帧 |
| [async-io-focused.cjs](async-io-focused.cjs) | 8控件、450ms编码压力下离屏队列取消及显式光学模式覆盖 |
| [r3-mouse-encoder-sentinel.cjs](r3-mouse-encoder-sentinel.cjs) | 鼠标编码调用数量哨兵；只统计次数，不提供性能时间 |
| [delivery-qa.cjs](delivery-qa.cjs) | 当前页URL，393／768px生产构建排版、字体、透明原生range与默认值 |
| [installed-r3-consumer-smoke.cjs](installed-r3-consumer-smoke.cjs) | 需要先建立并启动无关的已安装tarball消费项目（5184端口）；此回调不创建该消费项目 |

多浏览器测量须串行执行，并记录所测源码标签、画面状态、设备模拟设置与日志。不要把并行采集或不同渲染能力的版本直接算成性能优化百分比。示例比较截图：

```powershell
playwright-cli --session r3-replay-chrome run-code --filename (Join-Path $r3Protocols 'integration-pixel.cjs') | Out-File -Encoding utf8 'output/playwright/r3-protocol-replay/chromium-integration-result.txt'
playwright-cli --session r3-replay-webkit open 'http://127.0.0.1:5174/mobile-review.html' --browser webkit
playwright-cli --session r3-replay-webkit run-code --filename (Join-Path $r3Protocols 'integration-pixel.cjs') | Out-File -Encoding utf8 'output/playwright/r3-protocol-replay/webkit-integration-result.txt'
python (Join-Path $r3Protocols 'integration-compare.py')
playwright-cli --session r3-replay-chrome close
playwright-cli --session r3-replay-webkit close
```

Python 像素分析使用已有 Pillow。[integration-compare.py](integration-compare.py)读取新输出和 lens bounds；[compare-before-after.py](compare-before-after.py)要求先把同状态的 `before-async/` 与 `after-async/` 截图放入 replay 输出目录，再比较四组固定态图片。没有自动创建虚构的基线。

异步队列契约与夹具的当前版本另见仓库已有 [scripts/async-optics-qa.cjs](../../../../../../scripts/async-optics-qa.cjs) 和 [controlled proof](../../../../../../work/r3-controlled-proof/README.md)。Windows WebKit 与 CDP 触摸均不等于物理 Safari／Combo Touch；真实设备首触、实际显示延迟和温度／功耗不在这些回调的认证范围内。
