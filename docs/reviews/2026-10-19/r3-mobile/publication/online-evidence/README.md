# Published R3 UI evidence / 已部署R3界面检查

**Scope: UI bytes verified; final site deployment receipt pending. Date: 2026-10-19.** 本目录记录首次部署R3静态包上的界面验证；网站Tailwind扫描范围修正和最终Worker身份另待最终回执，不能用这里的界面通过代替首页CSS隔离结果。R3源码标签固定为`review-20261019-r3`、提交`566012cacf4225627008d2f407b5782647443180`，本阶段未移动。

[Chromium排版](layout-chromium.json)与[WindowsWebKit排版](layout-webkit.json)均覆盖393／768px：HTTP200、字体加载、透明原生range、.3默认值、消息提交，无横向溢出或页面／光学错误。[Chromium原生触摸形体检查](shape-checks.json)覆盖母体、连接、内容腔，768px另有标题字形；从内部开始越界仍形变、从外部移入仍滚页。物理Safari／ComboTouch未测试。

[线上真实源折射及CSP证明](optics-csp.json)覆盖Chromium155和WindowsWebKit26.5。零位移与原位移比较中，文字／轨道透镜内改变，透镜外每组最大差均为0；通过实际`Source word`与`Source line`编辑后折射仍更新。两引擎CSP违规、请求失败和页面错误均为0。研究代理实际查看WebKit文字／轨道折射及Chromium更新文字。它是明确SVG源折射，不是任意DOM截图或物理iOS性能基准。

选定画面：[Chromium393形体](online-chromium-393-volume.png) · [Chromium768折射](online-chromium-768-refraction.png) · [WebKit393折射](online-webkit-393-refraction.png) · [WebKit768参数](online-webkit-768-parameters.png)。保留两引擎文字／轨道zero与refracted原图，以及Chromium实际更新文字。验证回调见[protocols](protocols/README.md)，原始哈希和仅路径变化分开记录。

这些检查是已执行结果。最终状态、网站源／Worker、首页与既有页面身份隔离将写入独立发布回执；用户真机接受状态仍为false。

## Final site identity / 最终网站隔离结果

最终Worker及网站源已确认，当前为**published-awaiting-owner**；完整[发布回执](../../publication-receipt.json)另存于冻结标签之后的新提交。[最终网站身份](site-identity.json)确认原`/ui/`、原清单及R2 HTML字节相同；首页CSS恢复原有两个哈希文件名。首页原始HTML不同，只归一生成JS文件名哈希和Vinext部署UUID后完全相同。不能扩大成整个首页原始字节未变。

[CSS隔离过程](site-isolation-history.json)及[隔离前身份失败](site-identity-before-isolation.json)保留中间问题和修正依据；R3静态包的[线上清单身份](delivery-manifest-identity.json)在两次Worker间字节相同，因此上述R3界面／折射检查仍适用于最终包。手机／iPad／ComboTouch的用户验收仍未完成。
