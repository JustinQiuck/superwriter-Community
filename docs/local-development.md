# 本地启动指南

这份指南面向想在自己电脑上试用 SuperWriter 社区版的用户。你不需要先理解 Supabase 的所有概念，只要把它当作本地数据库和登录系统即可。

## 适合谁

- 想在本地免费体验 SuperWriter。
- 愿意安装基础开发工具。
- 希望自己的作品数据和 AI Key 留在自己的电脑或自己的部署环境里。

如果你完全不熟悉终端、Docker、数据库，也可以先加入交流群，等社区整理更多视频或托管版入口。

## 需要安装

- Node.js 20 或更新版本。
- pnpm 10 或更新版本。
- Docker Desktop 或 OrbStack。
- Supabase CLI。

macOS 用户可以参考：

```bash
corepack enable
corepack prepare pnpm@latest --activate
brew install supabase/tap/supabase
```

Docker Desktop 或 OrbStack 需要单独下载安装，并保持运行。

## 5 分钟启动

```bash
git clone https://github.com/JustinQiuck/superwriter-Community.git
cd superwriter-Community
./start.sh
```

`./start.sh` 会尽量自动完成这些事情：

- 检查 `node`、`pnpm`、`supabase`、`docker` 是否可用。
- 如果没有 `.env.local`，从 `.env.example` 创建一份。
- 为本地环境生成 `AI_CONFIG_SECRET_KEY`，用于加密保存个人 AI Key。
- 启动本地 Supabase。
- 把本地 Supabase URL、匿名 Key、服务端 Key 写入 `.env.local`。
- 执行数据库迁移。
- 启动 Next.js 开发服务。

启动成功后访问：

- 应用：http://localhost:3000
- Supabase Studio：http://127.0.0.1:54323
- 本地邮件收件箱：http://127.0.0.1:54324

## 创建账号

打开 http://localhost:3000 后，使用邮箱和密码注册即可。本地 Supabase 默认不要求邮箱确认；如果你修改过 Supabase Auth 配置，可以在本地邮件收件箱里查看确认邮件。

登录后先进入 `设置 -> AI 设置`，填写你自己的 AI 服务商 Key。社区版不内置官方模型额度。

## 常用命令

```bash
./start.sh              # 智能启动，已有服务会复用
./start.sh --restart    # 清理 Next.js 本地缓存并重启
./stop.sh               # 停止 Next.js 开发服务
supabase status         # 查看本地 Supabase 状态
supabase db push --local --yes
```

如果只是关闭应用，通常运行 `./stop.sh` 即可。Supabase 容器可以继续保留，方便下次快速启动。

## 常见问题

### 提示 Docker 未启动

先打开 Docker Desktop 或 OrbStack，等它完全启动后再运行：

```bash
./start.sh
```

### 提示找不到 Supabase CLI

macOS 可以安装：

```bash
brew install supabase/tap/supabase
```

其他系统请参考 Supabase CLI 官方安装方式。

### 页面提示某个表不存在

说明数据库迁移没有同步成功，运行：

```bash
supabase db push --local --yes
```

然后重启应用。

### AI 功能提示未配置

登录后进入 `设置 -> AI 设置`，填写自己的模型服务商、Base URL、模型名和 API Key。

`.env.local` 里的 `AI_CONFIG_SECRET_KEY` 必须保留稳定。如果你改掉它，之前保存过的 AI Key 可能无法解密，需要重新保存。

### 端口被占用

默认端口：

- 应用：3000
- Supabase API：54321
- 数据库：54322
- Supabase Studio：54323
- 本地邮件：54324

如果 Next.js 端口异常，可以尝试：

```bash
./start.sh --restart
```

## 不建议新手做的事

- 不要把 `.env.local` 发给别人。
- 不要提交真实 API Key。
- 不要对自己的正式云端数据库运行 `supabase db reset`。
- 不要把社区版直接改成公开 SaaS 服务；商业或托管使用需要获得项目维护者许可。
