# Online verification callbacks

这些便携副本只调整截图／输出路径；[manifest](manifest.json)记录原始及归档哈希，归档过程未额外执行。CJS使用已安装Playwright CLI的`run-code --filename`；执行位置是包含kit的父目录，先建立`output/publication/r3-protocol-replay/online-optics/`目录。`online-qa.cjs`使用当前浏览器页URL，应先打开确切R3公开地址；其他光学／形体回调内已有该地址。形体连续原生触摸回调只适用于Chromium CDP，不是物理Safari或ComboTouch。Python像素分析需要Pillow及replay目录的真实回调输出，不创建基线。将各引擎`online-integration-pixel.cjs`的CLI输出分别保存到该online-optics目录的`chromium-integration-result.txt`／`webkit-integration-result.txt`，再从kit父目录执行Python副本。

公开页面以后可能变化，重跑时同时核对源码标签和delivery manifest；原历史输出证明的始终是当时R3字节。
