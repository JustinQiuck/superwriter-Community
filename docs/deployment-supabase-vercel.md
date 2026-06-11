# Supabase + Vercel 云端部署指南

这份指南适合有一定技术基础、希望把 SuperWriter 社区版部署到自己云端环境的个人用户。社区版允许个人非商业使用；商业、团队、托管、SaaS、付费交付或再分发需要先获得书面许可。

## 部署结构

```text
浏览器
  -> Vercel 上的 Next.js 应用
  -> Supabase Cloud: Auth + PostgreSQL + RLS
  -> 用户自己配置的 AI 服务商
```

SuperWriter 默认使用 Supabase。它负责登录、用户隔离、故事数据、章节数据、记忆数据和权限策略。

## 准备账号

- GitHub：用于托管代码。
- Supabase Cloud：用于数据库和登录系统。
- Vercel：用于部署 Next.js 应用。
- AI 服务商账号：例如 OpenAI-compatible、Anthropic、DeepSeek 或你自己的中转服务。

## 1. 创建 Supabase 项目

1. 登录 Supabase Cloud。
2. 创建新项目。
3. 进入 `Project Settings -> API`。
4. 记录这三个值：
   - Project URL
   - anon public key
   - service_role key

`service_role key` 权限很高，只能放在 Vercel 环境变量里，不能写进前端代码、README、Issue 或截图。

## 2. 配置 Auth 回调地址

在 Supabase 项目里进入 `Authentication -> URL Configuration`。

本地调试可以保留：

```text
http://localhost:3000/auth/callback
```

部署到 Vercel 后，把你的正式域名也加入 Redirect URLs：

```text
https://your-domain.com/auth/callback
https://your-vercel-project.vercel.app/auth/callback
```

Site URL 建议设置为正式访问地址，例如：

```text
https://your-domain.com
```

## 3. 同步数据库结构

推荐使用 Supabase CLI，因为仓库里的 `supabase/migrations/` 已经包含表结构、RLS 策略和初始化数据。

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push --linked
```

如果你还没有完全确认环境，请先运行：

```bash
supabase db push --linked --dry-run
```

确认将要执行的迁移无误后，再执行正式 push。

不要对云端正式数据库运行 `supabase db reset`。它会重置数据库，可能导致数据丢失。

## 4. 导入 Vercel 项目

1. 在 Vercel 新建项目。
2. 选择你的 GitHub 仓库。
3. Framework Preset 选择 Next.js。
4. 如果 Vercel 识别 monorepo，Root Directory 选择 `apps/web`。
5. 如果构建无法找到 workspace 依赖，改为仓库根目录部署，并设置 Build Command 为：

```bash
pnpm --filter @superwriter/web build
```

安装命令建议保持：

```bash
pnpm install --frozen-lockfile
```

## 5. 配置 Vercel 环境变量

必填：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=SuperWriter
NEXT_PUBLIC_SUPERWRITER_EDITION=community
SUPERWRITER_ENABLE_ADMIN=false
AI_CONFIG_SECRET_KEY=your-long-random-secret
```

生成 `AI_CONFIG_SECRET_KEY`：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

社区版推荐用户登录后在 `设置 -> AI 设置` 填写自己的 AI Key。环境变量里的 AI Key 只适合作为个人部署的兜底配置，不建议在公共社区部署里共享。

可选：

```dotenv
NEXT_PUBLIC_COMMUNITY_URL=https://your-community-link
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=
EMBEDDING_BASE_URL=
```

## 6. 部署并验证

部署完成后检查：

- 首页可以打开。
- 注册和登录可以完成。
- `设置 -> AI 设置` 可以保存和测试个人 Key。
- 可以创建故事。
- 可以生成大纲、素材需求、章节规划。
- 可以进入正文写作。

如果出现 `Could not find the table ... in the schema cache`，通常是数据库迁移没有执行或 Supabase API schema cache 尚未刷新。先确认迁移已成功，再等待片刻或重新部署应用。

## 7. 面向非技术用户的建议

如果用户不会 Supabase、Vercel、终端和环境变量，不建议直接让他们走自部署路径。更合适的引导是：

- 加入交流群。
- 先看本地启动指南。
- 等官方托管版或维护者提供的演示环境。

社区版的目标是让有基本技术能力的个人用户可以自助运行，而不是把完整托管服务的运维复杂度转嫁给开源仓库。
