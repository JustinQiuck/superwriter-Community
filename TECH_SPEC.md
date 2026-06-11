# SuperWriter - AI 驱动的在线小说创作平台

> 技术规格文档 v1.0  
> 创建日期：2026-04-29  
> 状态：设计阶段  
> 基于：StoryTellerSuite (Obsidian Plugin v1.7.6) 架构分析与市场调研

---

## 目录

1. [项目愿景与目标](#1-项目愿景与目标)
2. [市场分析与竞品调研](#2-市场分析与竞品调研)
3. [技术路线选择与论证](#3-技术路线选择与论证)
4. [系统架构设计](#4-系统架构设计)
5. [数据模型设计](#5-数据模型设计)
6. [编辑器选型与集成](#6-编辑器选型与集成)
7. [AI 集成架构](#7-ai-集成架构)
8. [前端页面结构](#8-前端页面结构)
9. [API 设计](#9-api-设计)
10. [开发路线图](#10-开发路线图)
11. [项目结构](#11-项目结构)
12. [参考项目与资源](#12-参考项目与资源)

---

## 1. 项目愿景与目标

### 1.1 核心愿景

**SuperWriter** 是一个 AI 原生的在线小说创作平台，将 StoryTellerSuite 的结构化世界观管理体系与 AI 深度融合，让长篇小说创作从"混沌的灵感"变成"有组织的创造"。

### 1.2 核心差异化

市场上已有 Scrivener（桌面）、Dabble（Web 写作）、Sudowrite（AI 写作）、World Anvil（世界观管理），但没有一个产品同时做到：

| 能力 | Scrivener | Dabble | Sudowrite | World Anvil | **SuperWriter** |
|------|-----------|--------|-----------|-------------|-----------------|
| 结构化世界观管理 | ✅ 弱 | ❌ | ❌ | ✅ 强 | ✅ **强（12种实体）** |
| AI 写作辅助 | ❌ | ❌ | ✅ 强 | ❌ | ✅ **强（上下文感知）** |
| 关系图谱可视化 | ❌ | ❌ | ❌ | ✅ | ✅ **动态交互** |
| 时间线管理 | ❌ | ❌ | ❌ | ✅ 付费 | ✅ **免费核心** |
| 在线跨设备 | ❌ 桌面 | ✅ Web | ✅ Web | ✅ Web | ✅ **Web + PWA** |
| 感官/符号系统 | ❌ | ❌ | ❌ | ❌ | ✅ **独创** |
| 信息流追踪 | ❌ | ❌ | ❌ | ❌ | ✅ **独创** |

**SuperWriter 的三大独创能力：**
1. **感官符号系统** — 管理角色的视觉/听觉/嗅觉/触觉/味觉符号，AI 在写作时自动保持一致
2. **信息博弈追踪** — 追踪每个角色知道什么、不知道什么、谁从谁那里获得信息
3. **AI 上下文感知** — AI 写作时自动感知角色设定、关系网络、时间线状态，确保一致性

### 1.3 目标用户

- **主要用户**：长篇小说作者（网文作者、类型小说作者、独立作者）
- **次要用户**：剧本创作者、TRPG 主持人、世界观爱好者
- **用户痛点**：
  - 写到第20章忘记第3章的角色设定细节
  - 角色之间的信息不对称关系难以追踪
  - AI 写作助手不了解角色的完整背景
  - 多设备写作无法同步（Scrivener 的最大痛点）

### 1.4 开发目标

#### MVP 目标（Phase 1，4-6周）
- [x] 完成技术规格文档
- [ ] 项目初始化（Next.js + Supabase + Tiptap）
- [ ] 用户认证（邮箱注册/登录）
- [ ] 故事项目管理（CRUD）
- [ ] 核心实体管理（角色、地点、事件、章节）
- [ ] Markdown/富文本编辑器（Tiptap）
- [ ] AI 角色生成（第一个 AI 功能）

#### 完整版目标（Phase 2-3，10-14周）
- [ ] 全部 12 种实体类型
- [ ] 关系图谱可视化
- [ ] 时间线视图
- [ ] AI 写作助手（对话生成、风格匹配、一致性检查）
- [ ] 编译导出（EPUB/PDF）
- [ ] 写作统计仪表盘

---

## 2. 市场分析与竞品调研

### 2.1 竞品技术栈汇总

| 产品 | 平台 | 前端 | 编辑器 | 后端 | AI |
|------|------|------|--------|------|-----|
| **Sudowrite** | Web | 未公开（推测 React） | 自研 | 自研 | 多模型路由（Claude/GPT/自研 Muse） |
| **NovelAI** | Web | 未公开 | 自研 | 自研 | Clio/Kayra（自研小说模型） |
| **Dabble** | Web + 桌面 | 未公开 | 自研 | 云端 | 无 AI |
| **Atticus** | Web | 未公开 | 自研 | 云端 | 无 AI |
| **Novela** | Web + 原生 | 未公开 | 自研 | 云端 | AI 写作建议 |
| **Hearth** | Web | 未公开 | 自研 | 云端 | AI Tab 补全 |
| **OpenWrite** | Web | React + TanStack Router | 未公开 | Hono + SQLite | 多 AI Provider |
| **Writers Factory** | 桌面 | SvelteKit + Tauri | 自研 | Python FastAPI | 多模型 + Ollama 本地 |

### 2.2 关键市场洞察

1. **Web-first 是唯一正确方向**：2024-2026 年所有新的写作工具都是 Web 优先。Scrivener 的桌面锁定 + Dropbox 同步是用户最大的抱怨。
2. **AI 是核心差异化**：没有 AI 的写作工具（Dabble、Atticus）在功能上无法与有 AI 的（Sudowrite、Novela）竞争。
3. **世界观管理被严重忽视**：除了 World Anvil（专注于 TRPG/Campaign，不适合小说创作），没有一个 AI 写作工具提供结构化的世界观管理。
4. **开源竞争者初现**：OpenWrite 是最接近的开源项目，但缺少结构化世界观管理、时间线、地图等核心能力。

---

## 3. 技术路线选择与论证

### 3.1 Web vs 原生

#### 决策：**Web-first，可选 Tauri 桌面包**

| 考量维度 | 分析 |
|----------|------|
| **市场趋势** | 2026 年所有新写作工具（Dabble/Atticus/Novela/Hearth/Squibler）均为 Web。Scrivener 用户流失主因：无法跨设备。 |
| **用户需求** | 作家在电脑、手机、平板、图书馆电脑之间切换，Web 是唯一统一方案。 |
| **AI 集成** | AI API 调用需要联网。原生离线优势对此项目无意义。 |
| **分发成本** | Web = URL 即用。原生 = 下载安装 + 应用商店审核 + 多平台测试。 |
| **开发效率** | 一套代码全平台。原生需要额外打包、签名、自动更新。 |
| **离线写作** | PWA + Service Worker + IndexedDB 可实现核心离线写作。 |
| **桌面体验** | 未来可选 Tauri v2 包一层（包体 8MB，内存占用比 Electron 少 90%）。 |

#### 桌面包方案预留

如果未来需要桌面版本：
- **Tauri v2**（推荐）：Rust 核心 + 系统 WebView，包体 8MB，内存 30-40MB
- **Electron**（备选）：完整 Chromium，包体 250MB，内存 200-300MB
- 预留方式：前端代码保持纯 Web，不依赖任何 Node.js API，通过抽象层隔离文件系统访问

### 3.2 前端框架

#### 决策：**Next.js 15 (App Router) + TypeScript**

| 候选 | 评分 | 理由 |
|------|------|------|
| **Next.js 15** | ⭐⭐⭐⭐⭐ | SSR/SSG 灵活、API Routes 内置、Vercel AI SDK 原生支持、最大 React 生态、Novel.sh 参考实现 |
| React + Vite | ⭐⭐⭐⭐ | 轻量快速，但缺少 SSR、需要独立后端 |
| SvelteKit | ⭐⭐⭐ | 性能好，但生态小、AI 集成示例少 |
| Nuxt (Vue) | ⭐⭐⭐ | 生态不够，Tiptap Vue 支持不如 React |

选择 Next.js 的核心理由：
1. **Novel.sh**（16.1K ⭐ GitHub）是 Tiptap + AI 编辑器的最佳参考实现，基于 Next.js
2. **Vercel AI SDK** 是 AI 流式输出的最成熟方案，原生支持 Next.js
3. **shadcn/ui** 是 2026 年最流行的 React UI 库，与 Next.js 深度集成
4. **Supabase** 官方提供 Next.js Auth Helper，集成最简单

### 3.3 编辑器

#### 决策：**Tiptap (ProseMirror) + Novel.sh AI 集成模式**

详见 [第6章：编辑器选型与集成](#6-编辑器选型与集成)。

### 3.4 后端/数据库

#### 决策：**Supabase (PostgreSQL + Auth + Realtime + Storage)**

| 候选 | 评分 | 理由 |
|------|------|------|
| **Supabase** | ⭐⭐⭐⭐⭐ | PostgreSQL 关系型、RLS 安全、实时订阅、自部署可选、可预测定价 |
| Firebase | ⭐⭐⭐ | 实时成熟，但 NoSQL 不适合实体关系、Google 锁定 |
| 自建 (Prisma + PostgreSQL) | ⭐⭐⭐ | 灵活但开发成本高，需要自建 Auth/Storage/Realtime |

选择 Supabase 的核心理由：
1. **关系型数据是核心**：角色-关系-事件-时间线-章节，天然是 SQL 结构
2. **RLS 行级安全**：故事级别权限控制，用户只能访问自己的故事
3. **实时协作预留**：PostgreSQL 逻辑复制，未来可支持多人协作
4. **自部署选项**：AGPL 开源，未来可迁移到自有服务器
5. **TypeScript 类型生成**：数据库 Schema 自动生成 TypeScript 类型

### 3.5 AI 集成

#### 决策：**Vercel AI SDK（多模型支持）**

| 候选 | 评分 | 理由 |
|------|------|------|
| **Vercel AI SDK** | ⭐⭐⭐⭐⭐ | 流式输出、多模型统一接口、Next.js 原生、UI 组件内置 |
| LangChain.js | ⭐⭐⭐ | 功能丰富但过度复杂、链式调用不适合实时写作 |
| 直接 API 调用 | ⭐⭐⭐ | 灵活但需要自建流式处理、多模型切换 |

支持的 AI 模型（按优先级）：
1. **Claude 3.5/4**（Anthropic）— 长文本理解、角色分析、情节一致性检查
2. **GPT-4o**（OpenAI）— 对话生成、感官细节扩展
3. **DeepSeek V3** — 成本优化、日常补全
4. **本地模型（预留）** — Ollama 接入，隐私敏感用户

### 3.6 技术栈总览

```
┌──────────────────────────────────────────────────────────────────┐
│                    SuperWriter 技术栈                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  前端框架     Next.js 15 (App Router) + TypeScript 5             │
│  UI 组件      shadcn/ui + Tailwind CSS 4                         │
│  编辑器       Tiptap 2 (ProseMirror)                             │
│  状态管理     Zustand (客户端) + TanStack Query (服务端缓存)      │
│  图谱可视化   @xyflow/react (关系网络)                            │
│  时间线       vis-timeline 或自建 Canvas                          │
│  地图         react-leaflet                                      │
│  图标         Lucide React                                       │
│                                                                  │
│  后端         Next.js API Routes + Supabase                      │
│  数据库       PostgreSQL (via Supabase)                           │
│  认证         Supabase Auth (邮箱 + OAuth)                       │
│  存储         Supabase Storage (图片/附件)                        │
│  实时         Supabase Realtime (预留)                            │
│                                                                  │
│  AI           Vercel AI SDK                                      │
│  模型         Claude 3.5/4 + GPT-4o + DeepSeek V3               │
│  流式         Server-Sent Events (SSE)                           │
│                                                                  │
│  导出         JSZip (EPUB) + @react-pdf/renderer (PDF)           │
│  包管理       pnpm                                               │
│  构建         Turborepo (monorepo)                               │
│  部署         Vercel (前端) + Supabase Cloud (后端)               │
│  桌面(未来)   Tauri v2                                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. 系统架构设计

### 4.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                        用户浏览器                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ 编辑器    │  │ 世界观    │  │ 图谱     │  │ 时间线       │ │
│  │ (Tiptap) │  │ Dashboard │  │ (xyflow) │  │ (timeline)   │ │
│  └─────┬────┘  └─────┬────┘  └────┬─────┘  └──────┬───────┘ │
│        └──────────────┼───────────┼────────────────┘         │
│                       ▼           ▼                           │
│              ┌─────────────────────────┐                     │
│              │   Next.js App Router     │                     │
│              │   (React Server Comp.)   │                     │
│              └──────────┬──────────────┘                     │
│                         │                                     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
   │ Supabase     │ │ AI       │ │ Next.js      │
   │ PostgreSQL   │ │ Service  │ │ API Routes   │
   │ Auth/Storage │ │ (Vercel  │ │ (业务逻辑)   │
   │ Realtime     │ │  AI SDK) │ │              │
   └──────────────┘ └──────────┘ └──────────────┘
```

### 4.2 核心架构原则

1. **Server Components 优先**：列表页、仪表盘等用 RSC，减少客户端 JS
2. **Client Components 仅用于交互**：编辑器、图谱、时间线等需要客户端状态
3. **Optimistic Updates**：实体创建/编辑时乐观更新，不阻塞写作流
4. **AI 流式响应**：所有 AI 生成使用 SSE 流式，用户实时看到输出
5. **数据所有权**：用户可以导出全部数据为 Markdown + JSON，不锁定

### 4.3 前端分层

```
app/                          # Next.js App Router
├── (auth)/                   # 认证相关页面（登录/注册）
├── (dashboard)/              # 仪表盘布局
│   ├── stories/              # 故事列表
│   └── settings/             # 用户设置
├── stories/[storyId]/        # 故事工作区（核心）
│   ├── editor/               # 章节编辑器
│   ├── entities/             # 实体管理
│   │   ├── characters/       # 角色
│   │   ├── locations/        # 地点
│   │   ├── events/           # 事件
│   │   └── ...               # 其他实体类型
│   ├── graph/                # 关系图谱
│   ├── timeline/             # 时间线
│   ├── map/                  # 地图
│   └── compile/              # 编译导出
└── api/                      # API Routes
    ├── stories/              # 故事 CRUD
    ├── entities/             # 实体 CRUD
    ├── ai/                   # AI 接口
    │   ├── generate/         # AI 生成
    │   ├── chat/             # AI 对话
    │   └── analyze/          # AI 分析
    └── compile/              # 编译导出
```

---

## 5. 数据模型设计

### 5.1 实体关系图 (ER Diagram)

```
User 1───N Story 1───N Entity 1───N Relationship
                      │
                      ├── Character
                      ├── Location
                      ├── Event
                      ├── Chapter
                      ├── Scene
                      ├── Item
                      ├── Culture
                      ├── Book
                      ├── Reference
                      ├── Economy
                      ├── Faction
                      └── MagicSystem

Story 1───N TimelineEvent
Story 1───N WritingSession
Story 1───N CompileWorkflow
```

### 5.2 核心表结构

#### users (Supabase Auth 内置)

使用 Supabase Auth 的 `auth.users` 表，通过 `profiles` 表扩展：

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_language TEXT DEFAULT 'zh',
  ai_provider_preference TEXT DEFAULT 'anthropic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### stories

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  era TEXT,                    -- 故事时代背景（如 "1950s美国"）
  status TEXT DEFAULT 'draft', -- draft | active | completed | archived
  language TEXT DEFAULT 'zh',
  cover_image_url TEXT,
  settings JSONB DEFAULT '{}', -- 故事级设置（自定义字段、主题等）
  word_count_goal INTEGER DEFAULT 50000,
  daily_word_goal INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_user_id ON stories(user_id);
```

#### entities (统一实体表 + JSONB 扩展)

```sql
-- 实体类型枚举
CREATE TYPE entity_type AS ENUM (
  'character',
  'location',
  'event',
  'chapter',
  'scene',
  'item',
  'culture',
  'book',
  'reference',
  'economy',
  'faction',
  'magic_system'
);

CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  type entity_type NOT NULL,
  name TEXT NOT NULL,
  
  -- 核心结构化字段（高频查询、排序、过滤）
  status TEXT,                 -- draft | wip | revised | final（适用于 scene/chapter）
  sort_order INTEGER,          -- 排序（章节序号等）
  timeline_date DATE,          -- 时间线关联日期
  
  -- 扩展数据（不同实体类型的特有字段）
  data JSONB NOT NULL DEFAULT '{}',
  
  -- 内容（章节正文、事件描述等富文本）
  content TEXT,                -- Markdown 或 HTML
  
  -- 元数据
  tags TEXT[] DEFAULT '{}',
  color TEXT,                  -- 实体颜色标识
  cover_image_url TEXT,
  
  -- AI 相关
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_context TEXT,             -- AI 可读的上下文摘要
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entities_story_id ON entities(story_id);
CREATE INDEX idx_entities_story_type ON entities(story_id, type);
CREATE INDEX idx_entities_timeline_date ON entities(story_id, timeline_date) WHERE timeline_date IS NOT NULL;

-- JSONB 索引（支持 data 字段内的查询）
CREATE INDEX idx_entities_data ON entities USING gin(data);
```

#### data JSONB 各实体类型的 Schema 约定

```typescript
// ==================== 角色数据 ====================
interface CharacterData {
  // 基本信息
  aliases: string[];           // 别名列表
  age: string;                 // 年龄（字符串，支持 "未知"）
  gender: string;
  occupation: string;
  status: 'active' | 'deceased' | 'missing' | 'unknown';
  
  // 外貌
  appearance: {
    hair?: string;
    eyes?: string;
    build?: string;
    distinctive_features?: string;
    typical_clothing?: string;
  };
  
  // 心理
  personality_traits: string[];
  motivations: string[];
  fears: string[];
  secrets: string[];
  
  // 故事功能
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  arc: {
    starting_state: string;
    ending_state: string;
    turning_points: string[];
  };
  
  // 感官符号系统（独创）
  sensory_symbols: {
    visual?: string;           // 视觉符号（如 "金色波浪卷发"）
    auditory?: string;         // 听觉符号（如 "高跟鞋叩击声"）
    olfactory?: string;        // 嗅觉符号（如 "香奈儿五号仿制品"）
    tactile?: string;          // 触觉符号
    gustatory?: string;        // 味觉符号
  };
  
  // 信息追踪（独创）
  information_state: {
    knows: string[];           // 这个角色知道什么
    doesnt_know: string[];     // 这个角色不知道什么（但读者知道）
    information_sources: {     // 信息来源
      from_entity_id: string;
      what: string;
      chapter_number?: number;
    }[];
  };
  
  // 自定义字段
  custom_fields: Record<string, string>;
}

// ==================== 地点数据 ====================
interface LocationData {
  category: 'residence' | 'public' | 'nature' | 'building' | 'region' | 'other';
  parent_location_id?: string; // 层级关系（如：城市 > 街区 > 建筑 > 房间）
  era?: string;
  coordinates?: { lat: number; lng: number }; // 地图坐标
  
  atmosphere: string;          // 氛围描述
  sensory_details: {
    visual?: string;
    auditory?: string;
    olfactory?: string;
  };
  
  spatial_layout?: {           // 空间布局
    rooms: { name: string; description: string }[];
  };
}

// ==================== 事件数据 ====================
interface EventData {
  category: 'turning_point' | 'climax' | 'setup' | 'resolution' | 'background' | 'info_node';
  date?: string;               // 故事内日期
  time?: string;               // 故事内时间
  weather?: string;
  
  cause_event_ids: string[];   // 因果链：什么导致了这个事件
  effect_event_ids: string[];  // 因果链：这个事件导致了什么
  
  participant_entity_ids: string[]; // 参与的实体（角色等）
  location_entity_id?: string;      // 发生地点
  
  // 信息博弈（独创）
  information_revealed: {      // 这个事件揭示了什么信息
    entity_id: string;         // 谁获得了信息
    about_entity_id: string;   // 关于谁的信息
    what: string;              // 具体信息
  }[];
}

// ==================== 章节数据 ====================
interface ChapterData {
  chapter_number: number;
  word_count: number;
  target_word_count?: number;
  
  date_range?: {
    start: string;             // 故事内日期
    end: string;
  };
  weather?: string;
  location_entity_ids: string[];
  pov_character_id?: string;   // 视角角色
  
  scene_ids: string[];         // 包含的场景 ID
  
  // AI 可读的章节摘要
  summary?: string;
  
  // 状态
  writing_status: 'outline' | 'draft' | 'revision' | 'final';
}

// ==================== 场景数据 ====================
interface SceneData {
  chapter_id: string;
  scene_number: number;
  word_count: number;
  
  location_entity_id?: string;
  participant_entity_ids: string[];
  pov_character_id?: string;
  
  goal?: string;               // 场景目标
  conflict?: string;           // 场景冲突
  outcome?: string;            // 场景结果
  
  status: 'outline' | 'draft' | 'wip' | 'revised' | 'final';
}

// ==================== 物品数据 ====================
interface ItemData {
  category: string;
  era?: string;
  owner_entity_id?: string;    // 持有者
  location_entity_id?: string; // 所在地点
  
  symbolism?: string;           // 象征意义
  sensory_details?: {
    visual?: string;
    tactile?: string;
  };
}

// ==================== 文化数据 ====================
interface CultureData {
  era?: string;
  region?: string;
  category: string;
  
  social_norms?: string[];
  gender_roles?: string[];
  taboos?: string[];
  technology_level?: string;
}
```

#### relationships (实体间关系)

```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL,           -- 关系类型（见下方枚举）
  description TEXT,             -- 关系描述
  bidirectional BOOLEAN DEFAULT FALSE,
  
  -- 关系演变追踪
  evolution: {                  -- JSONB
    stages: {
      chapter_number: number;
      state: string;
      description: string;
    }[];
  },
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_entity_id, to_entity_id, type)
);

CREATE INDEX idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX idx_relationships_to ON relationships(to_entity_id);
CREATE INDEX idx_relationships_story ON relationships(story_id);
```

关系类型约定：
```typescript
type RelationshipType =
  // 角色之间
  | 'family'        // 家庭关系（母子、父子）
  | 'romantic'      // 恋爱关系
  | 'friendship'    // 友谊
  | 'rivalry'       // 对立/竞争
  | 'mentor'        // 导师关系
  | 'colleague'     // 同事
  | 'student'       // 师生
  | 'threatens'     // 威胁
  | 'protects'      // 保护
  | 'manipulates'   // 操控
  | 'informs'       // 信息传递
  | 'knows_secret'  // 知道秘密
  // 角色与地点
  | 'lives_in'      // 居住
  | 'visits'        // 访问
  | 'works_at'      // 工作
  // 角色与事件
  | 'participates'  // 参与
  | 'causes'        // 导致
  | 'affected_by'   // 受影响
  // 角色与物品
  | 'owns'          // 拥有
  | 'uses'          // 使用
  // 地点与事件
  | 'occurs_at'     // 发生于
  // 通用
  | 'references'    // 引用
  | 'custom';       // 自定义
```

#### timeline_events (时间线条目)

```sql
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  
  -- 时间定位
  start_date DATE,
  end_date DATE,
  start_time TEXT,             -- 如 "深夜11点"
  
  -- 关联
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  
  -- 显示信息
  title TEXT NOT NULL,
  description TEXT,
  color TEXT,
  track TEXT DEFAULT 'main',   -- 时间线轨道（main/character_x/location_y 等）
  
  -- 信息博弈标记（独创）
  information_node BOOLEAN DEFAULT FALSE,
  info_details: JSONB,         -- 信息流动详情
  
  sort_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_story ON timeline_events(story_id);
CREATE INDEX idx_timeline_date ON timeline_events(story_id, start_date);
```

#### writing_sessions (写作会话追踪)

```sql
CREATE TABLE writing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  
  words_written INTEGER DEFAULT 0,
  words_deleted INTEGER DEFAULT 0,
  
  entity_ids_edited UUID[],    -- 编辑了哪些实体
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writing_sessions_user ON writing_sessions(user_id, story_id);
```

#### ai_generations (AI 生成记录)

```sql
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 请求
  mode TEXT NOT NULL,           -- 'generate' | 'chat' | 'analyze' | 'complete'
  prompt TEXT NOT NULL,
  context_entity_ids UUID[],
  model TEXT NOT NULL,          -- 'claude-3.5-sonnet' | 'gpt-4o' | 'deepseek-v3'
  
  -- 响应
  result TEXT,
  tokens_used INTEGER,
  
  -- 用户反馈
  accepted BOOLEAN,
  rating SMALLINT,              -- 1-5
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Row Level Security (RLS) 策略

```sql
-- 用户只能访问自己的故事
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stories"
  ON stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- 实体通过故事关联验证权限
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view entities in their stories"
  ON entities FOR SELECT
  USING (
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create entities in their stories"
  ON entities FOR INSERT
  WITH CHECK (
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update entities in their stories"
  ON entities FOR UPDATE
  USING (
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete entities in their stories"
  ON entities FOR DELETE
  USING (
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
  );

-- relationships、timeline_events 等同理，通过 story_id 级联验证
```

---

## 6. 编辑器选型与集成

### 6.1 选型对比

| 编辑器 | 类型 | 适合场景 | 包大小 | AI 集成 | 协作 | 长文性能 |
|--------|------|----------|--------|---------|------|----------|
| **Tiptap 2** | Headless (ProseMirror) | 自定义写作 UI | ~100KB+ | ✅ 成熟 | ✅ Hocuspocus | ✅ 优秀 |
| Lexical | Headless | 高性能 React | ~22KB | ⚠️ 需自建 | ⚠️ 计划中 | ✅ 优秀 |
| Slate | Headless (React) | 极度定制 | ~80KB | ⚠️ 需自建 | ❌ | ⚠️ 一般 |
| CKEditor 5 | 全功能 WYSIWYG | 企业协作 | 大 | ✅ 内置 | ✅ 成熟 | ✅ 优秀 |
| ProseMirror | 底层工具包 | 编辑器框架 | 不定 | ❌ | ❌ | ✅ 优秀 |

### 6.2 选择 Tiptap 的理由

1. **Novel.sh 是最佳参考**：16.1K ⭐ 的开源项目，提供了 Tiptap + AI 补全的完整实现
2. **Headless 架构**：UI 完全可控，可以打造独特的写作界面
3. **ProseMirror 底层**：处理长文档的边界情况（selection、undo、paste）比自建可靠得多
4. **丰富的扩展生态**：表格、代码块、Markdown 序列化、图片上传等都有现成扩展
5. **协作预留**：Hocuspocus 服务端可在未来提供实时协作

### 6.3 编辑器核心功能

```
编辑器功能矩阵：
├── 基础格式
│   ├── 标题 (H1-H4)
│   ├── 粗体/斜体/删除线
│   ├── 有序/无序列表
│   ├── 引用块
│   └── 分割线
├── 写作增强
│   ├── Markdown 快捷输入（# 标题、** 粗体等）
│   ├── 字数统计（实时显示）
│   ├── 专注模式（隐藏其他 UI）
│   ├── 打字机模式（光标始终居中）
│   └── 暗色主题
├── 实体引用（独创）
│   ├── @角色名 → 插入角色卡片引用
│   ├── #地点名 → 插入地点引用
│   └── 引用自动链接到实体页面
├── AI 功能
│   ├── AI 续写（Tab 补全，灰色预览文字）
│   ├── AI 改写（选中文字 → 右键菜单）
│   ├── AI 扩展描写（选中文字 → 添加感官细节）
│   ├── AI 对话生成（基于角色设定）
│   └── AI 一致性检查（自动检测矛盾）
└── 导入导出
    ├── Markdown 导入/导出
    ├── HTML 导出
    └── 与实体 frontmatter 同步
```

### 6.4 Tiptap 集成架构

```typescript
// 编辑器初始化配置（伪代码）
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Markdown from 'tiptap-markdown';

// 自定义扩展
import { EntityMention } from '@/extensions/entity-mention';    // @角色 引用
import { AICompletion } from '@/extensions/ai-completion';      // AI 补全
import { WordCount } from '@/extensions/word-count';            // 字数统计
import { SensoryHighlight } from '@/extensions/sensory-highlight'; // 感官符号高亮

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({ placeholder: '开始写作...' }),
    Markdown,
    EntityMention.configure({ storyId }),
    AICompletion.configure({ 
      generateFn: streamAICompletion,
      triggerKey: 'Tab',
    }),
    WordCount,
    SensoryHighlight,
  ],
  content: initialContent,
  onUpdate: ({ editor }) => {
    // 防抖自动保存
    debouncedSave(editor.getHTML());
  },
});
```

### 6.5 AI 补全实现模式（参考 Novel.sh）

```
用户输入 → 触发 AI 补全（500ms 防抖）
              │
              ▼
        构建上下文：
        ├── 当前章节内容（最近 2000 字）
        ├── 当前角色设定摘要
        ├── 关系网络摘要
        ├── 时间线当前位置
        ├── 感官符号提示
        └── 写作风格分析
              │
              ▼
        AI 模型调用（SSE 流式）
              │
              ▼
        显示灰色预览文字（用户 Tab 接受，Esc 拒绝）
```

---

## 7. AI 集成架构

### 7.1 AI 功能分层

```
┌─────────────────────────────────────────────┐
│           第三层：AI 结构分析                  │
│  一致性检查 / 情节漏洞 / 节奏分析 / 角色弧线  │
├─────────────────────────────────────────────┤
│           第二层：AI 写作助手                  │
│  续写 / 改写 / 对话生成 / 感官扩展 / 风格匹配  │
├─────────────────────────────────────────────┤
│           第一层：AI 世界观助手                 │
│  角色生成 / 地点生成 / 事件建议 / 关系建议      │
│  大纲生成 / 时间线填充 / 文化背景研究           │
└─────────────────────────────────────────────┘
```

### 7.2 AI 上下文构建（核心创新）

AI 写作的关键是**上下文质量**。SuperWriter 的上下文构建器：

```typescript
interface AIContext {
  // 必选：当前写作内容
  currentContent: string;           // 当前章节的最近 N 字
  
  // 必选：当前场景信息
  currentChapter: {
    number: number;
    summary: string;
    povCharacterId: string;
    locationIds: string[];
    participantIds: string[];
  };
  
  // 可选：角色摘要（按相关性排序）
  relevantCharacters: {
    id: string;
    name: string;
    briefDescription: string;
    currentState: string;           // 当前章节时的角色状态
    sensorySymbols: SensorySymbols; // 感官符号
    knownInformation: string[];     // 角色当前知道什么
    relationships: { name: string; type: string }[];
  }[];
  
  // 可选：相关地点
  relevantLocations: {
    id: string;
    name: string;
    atmosphere: string;
    sensoryDetails: SensoryDetails;
  }[];
  
  // 可选：时间线上下文
  timelineContext: {
    previousEvents: string[];       // 之前发生了什么
    upcomingEvents: string[];       // 之后要发生什么
    currentDate: string;            // 故事当前日期
  };
  
  // 可选：写作风格
  styleProfile: {
    tone: string;                   // 整体基调
    pov: string;                    // 视角（第一人称/第三人称）
    tense: string;                  // 时态
    sampleParagraph: string;        // 风格参考段落
  };
}
```

### 7.3 AI API 设计

```typescript
// API Routes 结构
// POST /api/ai/generate
// Body: { mode, storyId, entityId?, context?, prompt? }
// Response: SSE stream

type AIMode = 
  | 'character_generate'     // 从简述生成完整角色卡
  | 'character_dialogue'     // 基于角色设定生成对话
  | 'location_generate'     // 从简述生成完整地点卡
  | 'event_suggest'          // 基于现有事件建议后续事件
  | 'outline_generate'       // 从角色+事件生成大纲
  | 'chapter_continue'       // 续写当前章节
  | 'chapter_rewrite'        // 改写选中段落
  | 'sensory_expand'         // 添加感官细节
  | 'consistency_check'      // 一致性检查
  | 'timeline_fill'          // 填充时间线细节
  | 'relationship_suggest'   // 建议角色关系
  | 'information_track'      // 追踪信息流
  | 'free_chat';             // 自由对话
```

### 7.4 AI Prompt 模板系统

每种 AI 模式对应一个精心设计的 Prompt 模板。模板从数据库加载，支持用户自定义。

```typescript
// 示例：角色生成 Prompt 模板
const CHARACTER_GENERATE_PROMPT = `
你是一位专业的小说创作顾问。根据以下简短描述，生成一份完整的角色档案。

## 输入描述
{{user_input}}

## 故事背景
- 类型：{{story_genre}}
- 时代：{{story_era}}
- 已有角色：{{existing_characters_summary}}

## 请生成以下内容（JSON 格式）：
{
  "name": "角色全名",
  "aliases": ["别名1", "别名2"],
  "age": "年龄",
  "gender": "性别",
  "occupation": "职业",
  "appearance": {
    "hair": "发型描述",
    "eyes": "眼睛描述",
    "build": "体型描述",
    "distinctive_features": "显著特征",
    "typical_clothing": "标志性穿着"
  },
  "personality_traits": ["特质1", "特质2", "特质3"],
  "motivations": ["动机1", "动机2"],
  "fears": ["恐惧1", "恐惧2"],
  "sensory_symbols": {
    "visual": "视觉符号（如标志性穿着/物品）",
    "auditory": "听觉符号（如特定声音）",
    "olfactory": "嗅觉符号（如特定气味）",
    "tactile": "触觉符号",
    "gustatory": "味觉符号"
  },
  "arc": {
    "starting_state": "初始状态",
    "ending_state": "最终状态",
    "turning_points": ["转折点1", "转折点2"]
  },
  "opening_monologue": "一段角色内心独白（第一人称），展示其性格和核心冲突",
  "brief_description": "一段50字的简短描述，用于AI上下文"
}

注意：
1. 感官符号应该与时代背景匹配
2. 角色性格要有内在矛盾（使角色更立体）
3. 避免陈词滥调
4. 输出纯 JSON，不要其他文字
`;
```

---

## 8. 前端页面结构

### 8.1 页面路由设计

```
/                              → 首页/Landing（营销页）
/login                         → 登录
/register                      → 注册
/forgot-password               → 忘记密码

/dashboard                     → 用户仪表盘
/dashboard/stories             → 故事列表
/dashboard/stories/new         → 创建新故事
/dashboard/settings            → 用户设置
/dashboard/writing-stats       → 写作统计

/stories/[storyId]             → 故事工作区（核心）
/stories/[storyId]/overview    → 故事概览（README）
/stories/[storyId]/editor      → 章节列表 + 编辑器
/stories/[storyId]/editor/[chapterId] → 章节编辑器

/stories/[storyId]/entities    → 实体总览
/stories/[storyId]/entities/characters     → 角色列表
/stories/[storyId]/entities/characters/[id] → 角色详情/编辑
/stories/[storyId]/entities/locations      → 地点列表
/stories/[storyId]/entities/locations/[id]  → 地点详情/编辑
/stories/[storyId]/entities/events         → 事件列表
/stories/[storyId]/entities/events/[id]    → 事件详情/编辑
/stories/[storyId]/entities/items          → 物品列表
/stories/[storyId]/entities/cultures       → 文化列表
/stories/[storyId]/entities/chapters       → 章节管理
/stories/[storyId]/entities/scenes         → 场景管理

/stories/[storyId]/graph       → 关系图谱
/stories/[storyId]/timeline    → 时间线视图
/stories/[storyId]/map         → 地图视图（Phase 2）
/stories/[storyId]/compile     → 编译导出
/stories/[storyId]/ai          → AI 助手面板

/stories/[storyId]/settings    → 故事设置
```

### 8.2 故事工作区布局

```
┌────────────────────────────────────────────────────────────────┐
│ [Logo]  SuperWriter   │ 故事名: Elle's Shadow  │ [AI] [设置]  │
├─────────┬──────────────────────────────────────────────────────┤
│         │                                                      │
│ 侧边栏  │              主内容区                                 │
│         │                                                      │
│ 📖 章节  │  ┌─────────────────────────────────────────────┐    │
│  Ch 1   │  │                                             │    │
│  Ch 2   │  │          Tiptap 编辑器                       │    │
│  Ch 3   │  │                                             │    │
│  ...    │  │    "雨点敲打着窗户，像无数细小的              │    │
│         │  │     手指在叩击玻璃。Ellie站在厨房             │    │
│ 👤 角色  │  │     门口..."                                │    │
│  Ellie  │  │                                             │    │
│  Bobby  │  │                              [AI 补全预览]   │    │
│  Ed     │  │                                             │    │
│         │  └─────────────────────────────────────────────┘    │
│ 📍 地点  │                                                      │
│ 📅 事件  │  ┌──────────────┬───────────────┬──────────────┐   │
│ 🗺 地图  │  │  AI 助手面板  │  实体引用面板   │  大纲面板    │   │
│ 🔗 图谱  │  │              │               │              │   │
│ ⏰ 时间线│  │  续写/改写    │  @角色 引用    │  章节大纲    │   │
│ ⚙ 设置  │  │  对话生成     │  #地点 引用    │  场景列表    │   │
│         │  │  一致性检查   │  相关事件      │  写作笔记    │   │
│         │  └──────────────┴───────────────┴──────────────┘   │
│         │                                                      │
├─────────┴──────────────────────────────────────────────────────┤
│ 第3章：校园暗流 │ 字数: 1,234 / 目标: 2,000 │ 自动保存于 3秒前 │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 组件层级

```
<StoryWorkspace>                    // 故事工作区布局
├── <Sidebar>                       // 侧边栏导航
│   ├── <StoryNav>                  // 故事导航树
│   │   ├── <ChapterList>           // 章节列表（拖拽排序）
│   │   └── <EntityList>            // 实体列表（按类型分组）
│   └── <StoryQuickActions>         // 快捷操作
├── <MainContent>                   // 主内容区（路由切换）
│   ├── <EditorView>                // 编辑器视图
│   │   ├── <TiptapEditor>          // Tiptap 编辑器
│   │   ├── <EditorToolbar>         // 格式工具栏
│   │   └── <EditorStatusBar>       // 状态栏（字数/保存状态）
│   ├── <EntityView>                // 实体详情视图
│   │   ├── <CharacterSheet>        // 角色卡
│   │   ├── <LocationSheet>         // 地点卡
│   │   └── <EventSheet>            // 事件卡
│   ├── <GraphView>                 // 关系图谱
│   ├── <TimelineView>              // 时间线
│   └── <CompileView>               // 编译导出
└── <Panel>                         // 底部/右侧面板（可折叠）
    ├── <AIAssistant>               // AI 助手
    ├── <EntityReferences>          // 实体引用面板
    └── <OutlinePanel>              // 大纲面板
```

---

## 9. API 设计

### 9.1 RESTful API 路由

```
# 故事管理
GET    /api/stories                    → 列出用户的所有故事
POST   /api/stories                    → 创建新故事
GET    /api/stories/[id]               → 获取故事详情
PATCH  /api/stories/[id]               → 更新故事
DELETE /api/stories/[id]               → 删除故事

# 实体管理
GET    /api/stories/[storyId]/entities              → 列出故事的所有实体
GET    /api/stories/[storyId]/entities?type=character → 按类型过滤
POST   /api/stories/[storyId]/entities              → 创建实体
GET    /api/stories/[storyId]/entities/[id]         → 获取实体详情
PATCH  /api/stories/[storyId]/entities/[id]         → 更新实体
DELETE /api/stories/[storyId]/entities/[id]         → 删除实体
POST   /api/stories/[storyId]/entities/reorder      → 重排序实体

# 关系管理
GET    /api/stories/[storyId]/relationships         → 列出关系
POST   /api/stories/[storyId]/relationships         → 创建关系
PATCH  /api/stories/[storyId]/relationships/[id]    → 更新关系
DELETE /api/stories/[storyId]/relationships/[id]    → 删除关系

# 时间线
GET    /api/stories/[storyId]/timeline              → 获取时间线数据
POST   /api/stories/[storyId]/timeline              → 创建时间线事件
PATCH  /api/stories/[storyId]/timeline/[id]         → 更新时间线事件
DELETE /api/stories/[storyId]/timeline/[id]         → 删除时间线事件

# AI 接口（全部 SSE 流式响应）
POST   /api/ai/generate               → AI 生成（角色/地点/大纲等）
POST   /api/ai/continue               → AI 续写
POST   /api/ai/rewrite                → AI 改写
POST   /api/ai/expand                 → AI 扩展描写
POST   /api/ai/dialogue               → AI 对话生成
POST   /api/ai/analyze                → AI 分析（一致性/情节漏洞）
POST   /api/ai/chat                   → AI 自由对话

# 编译导出
POST   /api/stories/[storyId]/compile  → 编译故事
GET    /api/stories/[storyId]/export/[format] → 下载导出文件

# 写作统计
GET    /api/stories/[storyId]/stats    → 获取写作统计
POST   /api/stories/[storyId]/sessions → 记录写作会话

# 导入
POST   /api/stories/[storyId]/import/markdown   → 导入 Markdown 文件
POST   /api/stories/[storyId]/import/obsidian   → 导入 Obsidian StoryTellerSuite 数据
```

### 9.2 API 响应格式

```typescript
// 标准响应格式
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

// 错误响应格式
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// 实体列表响应示例
// GET /api/stories/[storyId]/entities?type=character
{
  "data": [
    {
      "id": "uuid-1",
      "type": "character",
      "name": "Ellie Hayes",
      "status": "active",
      "data": {
        "aliases": ["Ellie", "Mrs. Hayes"],
        "age": "38",
        "gender": "女",
        "occupation": "小镇中学英语/历史老师",
        "sensory_symbols": {
          "visual": "金色波浪卷发",
          "auditory": "高跟鞋叩击声",
          "olfactory": "香奈儿五号仿制品"
        }
      },
      "tags": ["主角", "母亲"],
      "updated_at": "2026-04-28T12:00:00Z"
    }
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "per_page": 20
  }
}
```

---

## 10. 开发路线图

### Phase 0: 项目初始化（第 1 周）

```
任务清单：
├── 初始化 Next.js 15 项目（App Router + TypeScript）
├── 配置 Tailwind CSS 4 + shadcn/ui
├── 配置 Supabase（本地开发环境 + Cloud 项目）
├── 配置数据库 Schema（migrations）
├── 配置 Supabase Auth（邮箱登录）
├── 配置 pnpm + Turborepo（monorepo 结构）
├── 配置 ESLint + Prettier
├── 配置环境变量 (.env.local)
└── 编写 README.md（开发指南）
```

### Phase 1: MVP（第 2-6 周）

#### Sprint 1（第 2 周）：认证 + 故事管理

```
├── 用户注册/登录页面（邮箱 + 密码）
├── 故事 CRUD（创建/列表/编辑/删除）
├── 故事仪表盘页面
├── 故事设置页面
└── 基础布局框架（侧边栏 + 主内容区）
```

#### Sprint 2（第 3 周）：核心实体 CRUD

```
├── 实体 CRUD API（统一接口，按 type 区分）
├── 角色管理页面（列表 + 详情/编辑 Modal）
├── 地点管理页面
├── 事件管理页面
├── 章节管理页面（列表 + 拖拽排序）
└── 基础实体列表组件（搜索 + 过滤 + 分页）
```

#### Sprint 3（第 4 周）：编辑器集成

```
├── Tiptap 编辑器初始化 + 基础配置
├── Markdown 输入/输出支持
├── 字数统计
├── 自动保存（防抖 + 乐观更新）
├── 章节编辑器页面（侧边栏章节列表 + 编辑器）
├── 专注模式
└── 暗色主题
```

#### Sprint 4（第 5-6 周）：AI 集成（第一个 AI 功能）

```
├── Vercel AI SDK 配置（Claude + GPT-4o）
├── AI 角色生成功能
│   ├── 输入：简短描述 + 故事背景
│   ├── 输出：完整角色卡（JSON 格式）
│   └── 结果导入为实体
├── AI 续写功能（Tiptap 集成）
│   ├── Tab 触发补全
│   ├── 灰色预览文字
│   └── Tab 接受 / Esc 拒绝
├── AI 对话面板（自由对话）
└── AI 上下文构建器（v1：当前章节 + 角色摘要）
```

### Phase 2: 世界观工具（第 7-12 周）

```
Sprint 5（第 7-8 周）：关系系统
├── 关系 CRUD（角色之间、角色与地点等）
├── 关系类型选择器
├── 关系演变追踪
└── 实体详情页的关联标签页

Sprint 6（第 9-10 周）：可视化
├── 关系图谱视图（@xyflow/react）
│   ├── 节点 = 实体，边 = 关系
│   ├── 按类型着色
│   ├── 点击节点跳转详情
│   └── 过滤（按实体类型、关系类型）
├── 时间线视图
│   ├── 甘特图式时间线
│   ├── 按轨道分组（主线/角色线/地点线）
│   ├── 拖拽调整时间
│   └── 信息博弈节点标记（独创）
└── 实体总览仪表盘

Sprint 7（第 11-12 周）：高级 AI + 编译
├── AI 高级功能
│   ├── 一致性检查（跨章节检测矛盾）
│   ├── 对话生成（基于角色设定）
│   ├── 感官细节扩展
│   └── 信息博弈追踪建议
├── 编译导出系统
│   ├── Markdown 导出
│   ├── EPUB 导出（JSZip）
│   ├── PDF 导出（可选）
│   └── 可配置编译工作流
└── 写作统计仪表盘
    ├── 每日字数
    ├── 写作时间
    ├── 目标进度
    └── AI 使用统计
```

### Phase 3: 高级功能（第 13-20 周）

```
Sprint 8-9：地图 + 协作准备
├── 地图视图（Leaflet + 自定义底图）
├── 实体在地图上标记
├── 地点层级导航

Sprint 10-11：完整 AI 上下文 + 高级功能
├── 感官符号系统 UI
├── 信息博弈追踪 UI
├── AI 写作风格学习
├── 角色卡模板系统
├── Obsidian StoryTellerSuite 数据导入

Sprint 12+：优化 + 发布准备
├── PWA 离线支持
├── 性能优化
├── 移动端适配
├── 付费订阅集成（Stripe）
└── 国际化（中/英）
```

---

## 11. 项目结构

### 11.1 Monorepo 结构

```
superwriter/
├── apps/
│   └── web/                          # Next.js 主应用
│       ├── app/                      # App Router
│       │   ├── (auth)/               # 认证页面组
│       │   │   ├── login/page.tsx
│       │   │   ├── register/page.tsx
│       │   │   └── forgot-password/page.tsx
│       │   ├── (dashboard)/          # 仪表盘页面组
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx          # 仪表盘首页
│       │   │   ├── stories/
│       │   │   └── settings/
│       │   ├── stories/              # 故事工作区
│       │   │   └── [storyId]/
│       │   │       ├── layout.tsx    # 故事工作区布局
│       │   │       ├── page.tsx      # 故事概览
│       │   │       ├── editor/
│       │   │       ├── entities/
│       │   │       ├── graph/
│       │   │       ├── timeline/
│       │   │       └── compile/
│       │   └── api/                  # API Routes
│       │       ├── stories/
│       │       ├── entities/
│       │       ├── ai/
│       │       └── compile/
│       ├── components/               # React 组件
│       │   ├── ui/                   # shadcn/ui 组件
│       │   ├── editor/               # 编辑器相关组件
│       │   │   ├── tiptap-editor.tsx
│       │   │   ├── editor-toolbar.tsx
│       │   │   ├── editor-status-bar.tsx
│       │   │   └── ai-completion-display.tsx
│       │   ├── entities/             # 实体相关组件
│       │   │   ├── entity-list.tsx
│       │   │   ├── entity-card.tsx
│       │   │   ├── character-sheet.tsx
│       │   │   ├── location-sheet.tsx
│       │   │   ├── event-sheet.tsx
│       │   │   └── entity-form.tsx
│       │   ├── graph/                # 图谱组件
│       │   ├── timeline/             # 时间线组件
│       │   ├── ai/                   # AI 组件
│       │   │   ├── ai-assistant-panel.tsx
│       │   │   ├── ai-generate-dialog.tsx
│       │   │   └── ai-context-builder.tsx
│       │   └── layout/               # 布局组件
│       ├── lib/                      # 工具库
│       │   ├── supabase/             # Supabase 客户端
│       │   │   ├── client.ts         # 浏览器客户端
│       │   │   ├── server.ts         # 服务端客户端
│       │   │   └── middleware.ts      # Auth 中间件
│       │   ├── ai/                   # AI 工具
│       │   │   ├── context-builder.ts    # AI 上下文构建器
│       │   │   ├── prompts/              # Prompt 模板
│       │   │   │   ├── character-generate.ts
│       │   │   │   ├── chapter-continue.ts
│       │   │   │   ├── dialogue-generate.ts
│       │   │   │   ├── consistency-check.ts
│       │   │   │   └── sensory-expand.ts
│       │   │   └── providers/            # AI 模型提供商
│       │   │       ├── anthropic.ts
│       │   │       ├── openai.ts
│       │   │       └── deepseek.ts
│       │   ├── db/                   # 数据库工具
│       │   │   ├── types.ts          # 自动生成的数据库类型
│       │   │   └── queries/          # 数据库查询函数
│       │   │       ├── stories.ts
│       │   │       ├── entities.ts
│       │   │       ├── relationships.ts
│       │   │       └── timeline.ts
│       │   └── utils/                # 通用工具
│       │       ├── markdown.ts       # Markdown 处理
│       │       ├── export.ts         # 导出工具
│       │       └── word-count.ts     # 字数统计
│       ├── hooks/                    # React Hooks
│       │   ├── use-story.ts
│       │   ├── use-entities.ts
│       │   ├── use-editor.ts
│       │   └── use-ai.ts
│       ├── stores/                   # Zustand 状态
│       │   ├── story-store.ts
│       │   ├── editor-store.ts
│       │   └── ui-store.ts
│       ├── extensions/               # Tiptap 自定义扩展
│       │   ├── entity-mention.ts     # @角色 引用
│       │   ├── ai-completion.ts      # AI 补全
│       │   ├── word-count.ts         # 字数统计
│       │   └── sensory-highlight.ts  # 感官符号高亮
│       └── types/                    # TypeScript 类型定义
│           ├── entity.ts             # 实体类型
│           ├── ai.ts                 # AI 类型
│           └── api.ts                # API 类型
├── packages/
│   └── shared/                       # 共享包（类型、常量等）
├── supabase/
│   ├── migrations/                   # 数据库迁移文件
│   ├── seed.sql                      # 种子数据
│   └── config.toml                   # Supabase 本地配置
├── turbo.json                        # Turborepo 配置
├── pnpm-workspace.yaml               # pnpm workspace 配置
├── .env.local                        # 环境变量
├── .env.example                      # 环境变量示例
├── next.config.ts                    # Next.js 配置
├── tailwind.config.ts                # Tailwind 配置
├── tsconfig.json                     # TypeScript 配置
└── package.json
```

### 11.2 环境变量

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI - Anthropic
ANTHROPIC_API_KEY=your-anthropic-key

# AI - OpenAI
OPENAI_API_KEY=your-openai-key

# AI - DeepSeek
DEEPSEEK_API_KEY=your-deepseek-key

# AI - OpenRouter (可选，统一多模型)
OPENROUTER_API_KEY=your-openrouter-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=SuperWriter
```

---

## 12. 参考项目与资源

### 12.1 核心参考项目

| 项目 | 用途 | 链接 |
|------|------|------|
| **Novel.sh** | Tiptap + AI 编辑器的最佳参考实现 | github.com/steven-tey/novel |
| **OpenWrite** | 最接近的开源写作平台，参考架构 | github.com/ilrein/openwrite |
| **StoryTellerSuite** | 数据模型和 UI 模式的原始来源 | Obsidian Plugin (本地) |
| **do-novelist-ai** | 轻量 AI 写作应用参考 | github.com/d-oit/do-novelist-ai |

### 12.2 技术文档链接

| 技术 | 文档 |
|------|------|
| Next.js 15 | nextjs.org/docs |
| Tiptap 2 | tiptap.dev/docs |
| Supabase | supabase.com/docs |
| Vercel AI SDK | sdk.vercel.ai/docs |
| shadcn/ui | ui.shadcn.com |
| @xyflow/react | reactflow.dev/docs |
| Zustand | github.com/pmndrs/zustand |
| TanStack Query | tanstack.com/query |

### 12.3 竞品体验

建议注册以下产品进行体验（免费层级）：
- **Sudowrite** (sudowrite.com) — AI 写作体验标杆
- **World Anvil** (worldanvil.com) — 世界观管理功能参考
- **Dabble** (dabblewriter.com) — Web 写作 UI 参考
- **Novela** (novela.so) — 现代 Web 写作工具参考

### 12.4 StoryTellerSuite 数据迁移

已有的 Obsidian 数据可以直接导入 SuperWriter：

```typescript
// 导入逻辑：Markdown + YAML Frontmatter → Supabase
// 1. 解析 Markdown 文件的 YAML frontmatter
// 2. 映射 type 字段到 entity_type 枚举
// 3. 提取结构化字段到 data JSONB
// 4. 正文内容到 content TEXT
// 5. 解析 [[双链]] 到 relationships 表

// 映射关系：
// StoryTellerSuite type → SuperWriter entity_type
// character    → 'character'
// location     → 'location'
// event        → 'event'
// chapter      → 'chapter'
// scene        → 'scene'
// item         → 'item'
// culture      → 'culture'
// book         → 'book'
// reference    → 'reference'
// economy      → 'economy'
// faction      → 'faction'
// magicSystem  → 'magic_system'
```

---

## 附录 A：StoryTellerSuite 实体分析

以下是从用户现有的 Obsidian StoryTellerSuite 数据中提取的实体类型和字段结构：

### A.1 角色实体（Character）

```
Frontmatter 字段：
  type: character
  name: 角色全名
  aliases: [别名列表]
  age: 年龄
  gender: 性别
  occupation: 职业
  status: 状态
  location: 所在地

正文结构：
  # 角色名
  ## 基本信息
  ## 外在特征与时代风格
  ## 内在冲突与心理核心
  ## 故事功能与弧线贡献
  ## 与其他角色关系
  ## 关键场景
  ## 感官细节
  ## 背景故事
  ## 内心独白（自我介绍）
  ## 开场白
  ## 主题象征
```

### A.2 地点实体（Location）

```
Frontmatter 字段：
  type: location
  name: 地点名
  category: residence | public | nature | building
  location: 父级位置
  era: 时代

正文结构：
  # 地点名
  ## 基本信息
  ## 外观描述（外部/内部空间布局）
  ## 时代物件清单
  ## 关键场景时间线
  ## 空间象征系统
  ## 时代氛围营造
```

### A.3 事件实体（Event）

```
Frontmatter 字段：
  type: event
  name: 事件名
  category: turning_point | climax | setup | resolution
  time: 故事内时间
  date: 故事内日期
  location: 发生地点
  weather: 天气

正文结构：
  # 事件名
  ## 场景设定
  ## 前情提要
  ## 场景展开（多阶段）
  ## 心理描写
  ## 后续处理
  ## 场景功能
  ## 象征系统
  ## 后果影响
```

### A.4 章节实体（Chapter）

```
Frontmatter 字段：
  type: chapter
  chapter_number: 章节号
  title: 标题
  word_count: 字数
  date: 故事内日期
  time: 故事内时间
  location: 地点
  weather: 天气

正文结构：自由格式小说正文 + 尾部元数据注释
```

---

## 附录 B：关键依赖版本

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "@tiptap/react": "^2.10.0",
    "@tiptap/starter-kit": "^2.10.0",
    "@tiptap/extension-placeholder": "^2.10.0",
    "@tiptap/pm": "^2.10.0",
    "@xyflow/react": "^12.0.0",
    "ai": "^4.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.60.0",
    "lucide-react": "^0.460.0",
    "jszip": "^3.10.0",
    "tiptap-markdown": "^0.8.0",
    "react-leaflet": "^4.2.0",
    "vis-timeline": "^7.7.0",
    "zod": "^3.23.0",
    "date-fns": "^4.0.0",
    "nanoid": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "prettier": "^3.4.0",
    "supabase": "^1.200.0",
    "turbo": "^2.3.0"
  }
}
```

---

> **文档结束**  
> 本文档是 SuperWriter 项目的完整技术规格，旨在为 AI Agent 提供足够的上下文以开始开发。  
> 如有疑问或需要调整，请更新本文档对应章节。
