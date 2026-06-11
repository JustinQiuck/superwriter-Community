# 贡献指南

感谢你愿意参与 SuperWriter。这个仓库是 source-available 项目，不是 OSI 意义上的开源项目；默认许可只允许个人非商业使用。

## 分支策略

| 分支 | 用途 | 保护 |
|------|------|------|
| `main` | 稳定发布分支，社区版唯一入口 | 🔒 禁止直接推送，需 PR + 审查 |
| 其他分支 | 不开放，仅维护者使用 | — |

**所有社区贡献请提交 PR 到 `main` 分支。** PR 合并前需通过以下检查：

- [ ] 至少一位维护者 Code Review 通过
- [ ] `pnpm lint` 无报错
- [ ] `pnpm type-check` 无报错
- [ ] `pnpm build` 构建成功
- [ ] 无密钥、隐私数据或商业模型泄露

## 贡献授权

提交 issue、讨论、文档、设计、代码或 pull request 即表示你同意：

- 你有权提交这些内容。
- 你的贡献可以公开发布在本仓库中。
- 你授予项目维护者永久、不可撤销、全球范围、免版税的权利，用于使用、修改、分发、再许可你的贡献，包括用于商业授权版本。

如果你不能接受这条贡献授权，请不要提交贡献。

## 开发流程

### 1. Fork 仓库

点击 GitHub 页面右上角 Fork 按钮，将仓库 Fork 到你的个人账户。

### 2. 创建功能分支

```bash
git clone https://github.com/你的用户名/superwriter-Community.git
cd superwriter-Community
git checkout -b feat/你的功能描述
```

分支命名建议：

- `feat/xxx` — 新功能
- `fix/xxx` — Bug 修复
- `docs/xxx` — 文档修改
- `chore/xxx` — 工具/配置

### 3. 本地验证

```bash
pnpm lint
pnpm type-check
pnpm build
```

如果只改文档，可在 PR 中说明未运行构建。

### 4. 提交 PR

推送分支后在 GitHub 上创建 Pull Request，目标分支选 `main`。PR 标题用中文，描述清楚：

- 做了什么改动
- 为什么需要这个改动
- 验证方式（截图/命令输出）

### 5. Code Review

维护者会审查你的 PR。可能需要几轮修改讨论，请保持耐心。审查通过后由维护者合并。

## 提交前检查

- 不要提交 API key、Supabase service role key、SSH key、数据库备份、真实用户数据或 `.env.local`。
- UI 文案和 AI prompt 默认使用中文。
- 前端视觉改动先阅读 [DESIGN.md](./DESIGN.md)。
- 数据库变更放在 `supabase/migrations/`，命名格式为 `YYYYMMDDHHMMSS_description.sql`。
- 保持改动聚焦，一个 PR 只做一件事，不把无关重构混进同一个 PR。

## 代码风格

项目使用 ESLint + TypeScript strict 模式。提交前 `pnpm lint` 会自动修复大部分格式问题。不需要单独运行格式化工具。

## 安全问题

请不要用公开 issue 或 PR 披露安全漏洞、密钥泄露、RLS 绕过、认证绕过或数据泄露细节。参见 [SECURITY.md](./SECURITY.md)。

## 行为准则

参与本项目即表示你同意遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。
