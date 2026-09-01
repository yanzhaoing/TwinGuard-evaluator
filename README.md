# TwinGuard 在线体验

本目录是可部署到 GitHub Pages 的静态体验页面，供评委免安装查看作品结构、三级门控、三端交互和脱敏证据。页面不连接实时推理后台，不发送真实通知，也不把演示交互计入算法测试结果。

## 本地预览

```powershell
npm ci
npm run dev
```

## 导出 GitHub Pages 文件

仓库部署在 `https://<用户名>.github.io/<仓库名>/` 时，执行：

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/<仓库名>"
npm run build:github
```

导出结果位于 `out`。仓库内的 `.github/workflows/deploy-pages.yml` 会在推送到 `main` 后自动构建并发布 Pages。

如需验证真实模型加载、实时画面和统一后台状态，请返回源码包根目录运行 `run_demo.bat`；两种入口的用途和证据口径不得混用。
