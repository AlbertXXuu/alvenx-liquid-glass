# R3 hybrid candidate — scoped final profiles

**Parent R3: self-reviewed, publication pending. Date: 2026-10-19.** 此阶段收集最终混合策略的串行输入和局部生命周期结果；根代理随后已完成构建、实际安装和最终截图签字，见[最终交付回执](../../final-delivery/receipt.json)。该状态不是网站发布或用户验收。

当前只对受控 scene 路径按输入类型选择：触摸按住及回弹保留同步精确法线图，鼠标／空闲异步编码。默认桌面 SVG 路径不因此改成另一套近似材质。

## Serial input / 串行输入结果

[serial-input-profile.json](serial-input-profile.json)保留每次手势的指标。393／1180px 各三个新上下文、cold／warm，共原生直接触摸12次、Chromium鼠标12次、WindowsWebKit鼠标12次，均改变值、捕获并释放、没有页面错误。直接触摸每次记录15/15进度更新；鼠标每次按下前有80ms hover，不能拿它代表直接首触。

| R3 candidate | Cold pressure DOM | Warm pressure DOM |
| --- | --- | --- |
| Chromium native direct touch | 14.5–21.5ms | 10.5–20.4ms |
| Chromium hybrid mouse | 16.7–33.6ms | 16.5–23.9ms |
| Windows WebKit hybrid mouse | 17–52ms | 19–32ms |

这些是有限样本的 DOM 压力确认，不是实际屏幕延迟、FPS 或百分比性能改善。失败的全异步策略和优化前同步策略保持[各自记录](../after-async/README.md)。

**保留的成本：** 触摸观察窗口仍有40–44次同步 PNG 编码，单次最高23.6ms；没有把总 CPU 成本写成0。主动保留这条同步路径是为了避免已观察到的原生异步回调延后。此轮诊断正确关联实际运行模块、owners为3／5；不能沿用被否决阶段里重复 HMR 模块的0计数。

## Functional and lifecycle / 功能与生命周期

[functional-lifecycle.json](functional-lifecycle.json)记录实际 R3 页面的10项鼠标／键盘／编辑检查、中英消息、数值归正、源更新，以及本地输入报告的10次 move聚合／capture事件。独立报告夹具在clear／destroy后记录为0，销毁后待执行RAF为0。

强制原生编码回调延后450ms的8控件夹具中，隐藏前2个任务在执行、6个排队；隐藏后6个排队任务取消，计算量保持2。已发送任务可自然结束，但不再计算离屏排队图，隐藏期间版本号不变；重新进入后8个scene均ready。显式native／flat覆盖不显示受控透射，最后owners、缓存、工作区及任务清零。这个450ms压力夹具不能当作设备日常延迟。

[最终候选工作区快照](../../source-process/02-final-hybrid-candidate/README.md)在运行时代码冻结后保存，但不是原子提交或最终源身份；后续Git标签才是源码权威。最终构建／安装和截图复核已完成，独立网址仍待发布；真实Safari、iPhone／iPad、ComboTouch和首触体验等待用户在该网址上审查。

## Comparison limits / 比较边界

[同口径阶段对照](comparison.json)保留同步基线、被否决的全异步和当前混合策略。当前触摸cold中位数18.7ms、warm15.6ms，未把有限样本称为总体加速。鼠标cold压力DOM中位数由Chromium17.05变为20.6ms，WebKit19变为26.5ms，存在异步交付取舍，并非每项都更快。

[独立鼠标编码哨兵](mouse-encoder-counts.json)记录实际R3拖动中同步toDataURL调用0次、异步toBlob26次；该次与构建工作重叠，只说明调用数量，不能提供时延结论。异步队列契约最终版本为Chromium／WindowsWebKit各117项，替代先前116项的覆盖记录；实际最终交付清单另行保存。
