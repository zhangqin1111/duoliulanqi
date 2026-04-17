# 滤镜 · 多源大模型内容对比与分析系统

同时向 **Kimi · 豆包 · 元宝** 发送同一问题，由 **通义千问 DashScope API** 流式生成结构化对比（相同观点 / 不同观点），支持导出 PDF。

---

## 目录结构

```
duoliulanqi/
├── src/
│   ├── config/
│   │   └── platforms.js          # 嵌入站点配置（Kimi / 豆包 / 元宝）
│   └── electron/
│       ├── main.js               # 主进程
│       ├── preload.js            # 预加载脚本
│       ├── dashscope-qwen.js     # 千问 API（流式 + 普通）
│       └── renderer/
│           ├── index.html
│           ├── app.js
│           └── style.css
├── package.json
└── README.md
```

---

## 开发运行

```powershell
# 安装依赖（首次）
npm install

# 启动开发模式
npm start
```

---

## 打包为 Windows exe

```powershell
# 生成安装包（NSIS installer）+ 便携版 exe，输出到 release/ 目录
npm run dist

# 仅生成未打包目录（快速验证，不生成 exe）
npm run dist:dir
```

打包产物位于 `release/` 目录：

| 文件 | 说明 |
|---|---|
| `滤镜 Setup x.x.x.exe` | NSIS 安装包，可选安装目录 |
| `滤镜-x.x.x-便携版.exe` | 免安装单文件便携版 |

> **注意**：首次打包需要从网络下载 Electron 二进制，请确保网络可用（或配置镜像）。
> 若下载缓慢，可设置环境变量后重试：
> ```powershell
> $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
> npm run dist
> ```

---

## 千问 API 密钥配置

优先级：**环境变量 > 应用内保存文件 > 内置密钥**

| 方式 | 说明 |
|---|---|
| 环境变量 | `DUOLI_DASHSCOPE_API_KEY` 或 `DASHSCOPE_API_KEY` |
| 应用内设置 | 点左侧「API 密钥设置」输入后保存，写入 userData 目录 |
| 内置密钥 | 已内置，无需额外配置即可使用 |

自定义模型：设置环境变量 `DUOLI_QWEN_MODEL`（默认 `qwen-plus`）。

---

## 应用图标

把图标文件放到项目根目录的 `build/` 文件夹下：

```
build/
├── icon.ico    ← Windows（必须，建议含 16/32/48/64/128/256px 多层）
├── icon.png    ← Linux / 通用（256×256 以上）
└── icon.icns   ← macOS（可选）
```

PNG → ICO 在线转换：https://icoconvert.com  
放好后重新执行 `npm run dist` 即可生效。

---

## 常见问题

**某站回复内容与页面不一致**  
该站可能在回答末尾追加了「推荐问题」，应用会自动取最长候选文本，通常能正确提取。

**某站超时/发送失败**  
单站超时上限为 45 秒，超时后自动跳过，千问会用已有站点的内容继续生成对比。

**Kimi / 豆包 / 元宝 需要登录**  
首次启动后在各列页面内完成登录，登录态保存在独立 partition 中，重启后无需重新登录。
