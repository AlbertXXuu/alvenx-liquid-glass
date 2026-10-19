# R3 final delivery evidence / 最终交付证据

**Status: self-reviewed; source／website publication pending. Date: 2026-10-19.** 根代理已明确完成最终技术自检签字，包括实际消费项目10项及包哈希核对。 这是最终候选的生产构建和无关tarball消费项目检查，不是用户验收或网站发布。

[生产构建检查](production-checks.json)覆盖393／768px：无横向溢出／页面错误／光学错误，Instrument Sans与MiSans实际加载，原生range的paint为none／透明，Glass background opacity为0.3。根代理实际查看393形体、768折射和320参数；发现`roomto`后保留[失败记录](../iterations/02-self-rejected/README.md)，修正空格、重建再查。此目录图片来自修复后的重跑，早期阶段图像仍保持历史身份。

当前图像：[393 volume](delivery-chromium-393-volume.png) · [393 refraction](delivery-chromium-393-refraction.png) · [393 parameters](delivery-chromium-393-parameters.png) · [768 volume](delivery-chromium-768-volume.png) · [768 refraction](delivery-chromium-768-refraction.png) · [768 parameters](delivery-chromium-768-parameters.png)。

[实际外部安装消费](installed-consumer.json)检查10项，包括宿主CSS不被污染、中英原生文字、原始滑条／开关、显式scene折射、reset、包／字体请求和形体命中辅助。无页面错误；[实际消费项目截图](installed-r3-consumer.png)保留。TypeScript和build也通过；tarball SHA及其他根代理执行结果见[简化回执](receipt.json)。无本机消费项目路径、令牌或原始授权日志。

[SHA256SUMS.txt](SHA256SUMS.txt)对应复制后的原始PNG与清理后的JSON。这里的工程检查不等于物理Safari／ComboTouch、热状态、功耗或实际屏幕首触延迟验证。
