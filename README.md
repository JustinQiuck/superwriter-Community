# SuperWriter

<p align="center">
  <img src="./docs/assets/logo.png" width="80" alt="SuperWriter" />
</p>

# SuperWriter

**把长篇小说，写成一项可控工程。**

SuperWriter 是一个 AI 驱动的在线长篇小说创作平台。它将章节蓝图、人物关系、伏笔线索、世界观资料和 AI 辅助写入同一个工作台，让灵感不再散落，让故事持续推进。

> [superwriter.cc](https://superwriter.cc) — 在线体验产品完整功能。

[![License: Personal Non-Commercial](https://img.shields.io/badge/license-personal%20non--commercial-2c5f5d)](./LICENSE.md)
[![Source Available](https://img.shields.io/badge/source-available-7b4d3f)](./LICENSE.md)
[![Next.js](https://img.shields.io/badge/Next.js-15-111111)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)](https://supabase.com/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-f69220)](https://pnpm.io/)

---

## 目录

- [产品预览](#产品预览)
- [为什么选择 SuperWriter](#为什么选择-superwriter)
- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [配置 AI](#配置-ai)
- [社区](#社区)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [常用命令](#常用命令)
- [文档](#文档)
- [许可](#许可)
- [贡献](#贡献)
- [安全](#安全)
- [商业授权](#商业授权)

## 产品预览

SuperWriter 的工作台围绕「写作者」而非「文档」设计——左侧故事导航、中间编辑器、右侧 AI 副驾驶，三区联动。

| 蓝图规划 | 正文写作 | AI 副驾驶 |
|:---:|:---:|:---:|
| 章节节奏、场景目标、冲突与转折先连成骨架 | 暖纸质感的长文编辑器，当前场景与节拍持续可见 | 选中文字即可补强冲突、检查伏笔、延续语气 |

> 💡 完整交互预览请访问 [superwriter.cc](https://superwriter.cc)

## 为什么选择 SuperWriter

市面上有 Scrivener、Dabble、Sudowrite、World Anvil 等写作工具，但没有一个同时做到结构化世界观管理、AI 上下文感知和在线跨设备写作：

| 能力 | Scrivener | Dabble | Sudowrite | World Anvil | **SuperWriter** |
|------|-----------|--------|-----------|-------------|-----------------|
| 结构化世界观 | ✅ 弱 | ❌ | ❌ | ✅ 强 | ✅ **12 种实体** |
| AI 写作辅助 | ❌ | ❌ | ✅ 强 | ❌ | ✅ **上下文感知** |
| 关系图谱可视化 | ❌ | ❌ | ❌ | ✅ | ✅ **动态交互** |
| 时间线管理 | ❌ | ❌ | ❌ | ✅ 付费 | ✅ **免费核心** |
| 在线跨设备 | ❌ 桌面 | ✅ Web | ✅ Web | ✅ Web | ✅ **Web** |
| 感官符号系统 | ❌ | ❌ | ❌ | ❌ | ✅ **独创** |
| 信息流追踪 | ❌ | ❌ | ❌ | ❌ | ✅ **独创** |

### 三大独创能力

1. **感官符号系统** — 管理角色的视觉、听觉、嗅觉、触觉、味觉符号，AI 写作时自动保持一致。
2. **信息博弈追踪** — 追踪每个角色知道什么、不知道什么、谁从谁那获得信息。
3. **AI 上下文感知** — AI 写作时自动感知角色设定、关系网络、时间线状态，确保长篇一致性。

## 核心功能

- **📋 蓝图工作流** — 故事契约 → 大纲 → 看板节拍 → 场景卡，结构先行再动笔。
- **👥 12 种故事实体** — 角色、地点、组织、道具、章节、场景、事件、文化、魔法体系、派系、关系、时间线。
- **✍️ Tiptap 长文编辑器** — 基于 ProseMirror，支持 Markdown、字数统计、专注模式。
- **🤖 AI 写作副驾驶** — 选中文字即可续写、润色、补冲突、查伏笔、延续语气。
- **🗺️ 关系图谱** — 动态可视化角色、地点、道具之间的关联网络。
- **📅 时间线视图** — 按故事内时间排序事件，避免时间线矛盾。
- **📊 故事健康仪表盘** — 情绪曲线、节拍覆盖、伏笔回收状态一目了然。
- **📦 导入导出** — 支持 TXT/Markdown 导入分析、EPUB 导出编译。
- **🔑 自带 AI Key** — 社区版支持配置自己的 OpenAI / Anthropic / DeepSeek API 密钥。

## 快速开始

### 方式一：一键本地启动

前置条件：Node.js 20+、pnpm 10+、Supabase CLI、Docker Desktop 或 OrbStack。

```bash
git clone https://github.com/JustinQiuck/superwriter-Community.git
cd superwriter-Community
./start.sh
```

脚本会自动检查环境、创建 `.env.local`、启动本地 Supabase、同步密钥、应用迁移、启动 Next.js。

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可使用。详见 [本地开发指南](./docs/local-development.md)。

### 方式二：云端自部署

创建自己的 Supabase Cloud 项目，将 Next.js 部署到 Vercel，自行配置环境变量。详见 [Supabase + Vercel 部署指南](./docs/deployment-supabase-vercel.md)。

## 配置 AI

社区版不提供托管模型额度。本地启动后，打开 `设置 → AI 设置`，配置你自己的 AI 服务商密钥：

- **OpenAI 兼容** — 支持 OpenAI API 及兼容中转（如 DeepSeek、硅基流动等）
- **Anthropic** — 直接调用 Claude 系列模型
- **DeepSeek** — 使用 DeepSeek 官方 API

保存密钥前，先生成加密密钥写入 `.env.local`：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```dotenv
AI_CONFIG_SECRET_KEY=your-generated-secret
```

## 社区

SuperWriter 正在寻找真正的长篇小说创作者。欢迎加入社区：

| 渠道 | 适合 | 入口 |
|------|------|------|
| 💬 **GitHub Discussions** | 部署求助、Bug 报告、功能建议 | [前往讨论区](https://github.com/JustinQiuck/superwriter-Community/discussions) |

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 15 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI, lucide-react |
| 编辑器 | Tiptap 2, ProseMirror |
| 数据 | Supabase Auth, PostgreSQL, RLS, Supabase JS |
| AI | Vercel AI SDK, Anthropic, OpenAI 兼容接口 |
| 状态 | Zustand, TanStack Query |
| 可视化 | @xyflow/react（关系图谱）, Recharts（统计图表） |
| 工具链 | pnpm workspaces, Turborepo, Vitest, ESLint |

## 项目结构

```text
superwriter/
├── apps/web/              # Next.js 应用
│   ├── app/               # App Router 页面与 API 路由
│   ├── components/        # React 组件
│   ├── hooks/             # React hooks
│   ├── lib/               # Supabase / AI / DB / 写作 / 蓝图工具库
│   ├── stores/            # Zustand 状态管理
│   └── types/             # TypeScript 类型定义
├── packages/shared/       # 共享枚举与标签
├── supabase/              # 本地配置与数据库迁移
├── docs/                  # 部署指南与设计文档
├── DESIGN.md              # 产品设计规范（视觉源）
└── TECH_SPEC.md           # 技术架构规格文档
```

## 常用命令

```bash
pnpm dev          # 启动开发服务器
pnpm lint         # 代码检查
pnpm type-check   # 类型检查
pnpm test         # 运行测试
pnpm build        # 生产构建
```

从 `apps/web/` 目录重新生成数据库类型：

```bash
supabase gen types typescript --linked > lib/db/types.ts
```

## 文档

- [本地开发指南](./docs/local-development.md)
- [Supabase + Vercel 部署](./docs/deployment-supabase-vercel.md)
- [技术规格文档](./TECH_SPEC.md)
- [设计规范](./DESIGN.md)
- [支持政策](./SUPPORT.md)
- [安全政策](./SECURITY.md)
- [贡献指南](./CONTRIBUTING.md)

## 许可

SuperWriter 是 source-available 项目，不是 OSI 开源软件。

- **个人免费使用**：学习、研究、评估、本地非商业写作。
- **商业使用需授权**：公司、团队、机构、SaaS 托管、付费分发、二次产品化等均需提前获得书面许可。

详见 [LICENSE.md](./LICENSE.md) 和 [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md)。

## 贡献

欢迎以 [CONTRIBUTING.md](./CONTRIBUTING.md) 约定的方式参与贡献。提交 issue、讨论、文档、代码或 PR 即表示你同意贡献授权条款。

请勿提交 API 密钥、Supabase service role key、SSH 密钥、数据库备份、真实用户数据或 `.env.local`。

## 安全

请勿在公开 issue 或 PR 中披露安全漏洞。遵循 [SECURITY.md](./SECURITY.md) 的私下报告指引。

## 商业授权

商业使用不在默认许可范围内。使用 SuperWriter 从事任何商业、组织、托管、付费分发或产品化场景前，请联系项目维护者获取书面授权。
