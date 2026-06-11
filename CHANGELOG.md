# Changelog

## v0.1.0 — 社区版首次发布

### 🚀 核心功能

- **蓝图写作工作流**：故事契约 → 大纲 → 看板节拍 → 场景卡
- **12 种故事实体**：角色、地点、组织、道具、章节、场景、事件、文化、魔法体系、派系、关系、时间线
- **Tiptap 长文编辑器**：Markdown 支持、字数统计、专注模式
- **AI 写作副驾驶**：续写、润色、冲突补强、伏笔检查、语气延续
- **关系图谱**：@xyflow/react 动态可视化角色/地点/道具关联
- **时间线视图**：按故事内时间排序事件
- **故事健康仪表盘**：情绪曲线、节拍覆盖、伏笔回收状态
- **导入导出**：TXT/Markdown 导入分析、EPUB 导出编译
- **自带 AI Key**：支持 OpenAI 兼容、Anthropic、DeepSeek
- **本地一键启动**：`./start.sh` 自动检测环境、启动 Supabase、应用迁移

### 🛠️ 技术栈

- Next.js 15 App Router + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui + Radix UI
- Supabase Auth + PostgreSQL + RLS
- Vercel AI SDK (Anthropic / OpenAI 兼容)
- Zustand + TanStack Query
- pnpm workspaces + Turborepo
