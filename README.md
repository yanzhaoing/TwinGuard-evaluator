# TwinGuard 在线体验

本目录是可部署到 GitHub Pages 的静态产品体验，供评委免安装查看双案例真实推理结果回放、姿态骨架、风险因子、四级门控与三端交互。回放数据由冻结的 TwinGuard v9.7 运行时离线生成，并与公开案例视频按时间戳同步。

页面不连接实时推理后台，不发送真实通知，也不把网页操作计入算法测试结果。页面中的结论只对应所展示案例，不外推为长期误报率。

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

如需验证模型加载、摄像头接入和实时推理，请返回源码包根目录运行 `run_demo.bat`。GitHub Pages 展示的是已冻结的真实推理结果回放，本地系统提供实时推理；两种入口的用途和证据口径不得混用。
