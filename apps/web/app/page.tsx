import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Layers3,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { HomepageMotion } from "@/components/home/homepage-motion";
import { Button } from "@/components/ui/button";

const problemPoints = [
  {
    label: "人物动机",
    text: "人物动机越写越散。",
    accent: "bg-module-character",
  },
  {
    label: "伏笔回收",
    text: "伏笔埋下后忘记回收。",
    accent: "bg-module-timeline",
  },
  {
    label: "章节推进",
    text: "章节推进断裂，越改越乱。",
    accent: "bg-module-editor",
  },
];

const systemPillars = [
  {
    title: "蓝图规划",
    text: "章节节奏、场景目标、冲突、转折和结果先连成骨架。",
    icon: GitBranch,
    accent: "text-module-blueprint",
  },
  {
    title: "故事资料",
    text: "角色、地点、时间线和世界观资料留在写作面旁边。",
    icon: UserRound,
    accent: "text-module-character",
  },
  {
    title: "正文上下文",
    text: "当前场景与活跃节拍持续可见，写作不会脱离结构。",
    icon: BookOpenText,
    accent: "text-module-location",
  },
];

const aiCommands = ["补强冲突", "检查伏笔", "延续语气", "生成下一场景"];

export default function HomePage() {
  return (
    <HomepageMotion>
      <HeroSection />
      <ProblemSection />
      <SystemSection />
      <AICoPilotSection />
      <FinalCTASection />
      <SiteFooter />
    </HomepageMotion>
  );
}

function HeroSection() {
  return (
    <section className="homepage-hero homepage-screen relative px-5 pb-16 pt-5 sm:px-8 lg:px-10 lg:pb-20">
      <div className="homepage-nav mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BrandLogo size="lg" />
          SuperWriter
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link
            href="https://github.com/JustinQiuck/superwriter-Community"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            开源社区版
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href="https://x.com/Justinqiuu"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            作者X
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href="https://github.com/JustinQiuck/superwriter-Community#readme"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            使用文档
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            登录
          </Link>
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/register">开始创作</Link>
          </Button>
        </nav>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 py-12 lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:py-10">
        <div className="homepage-motion-item homepage-hero-copy max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-workspace-border bg-workspace-paper/80 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-module-location" />
            为中文长篇小说设计
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            把长篇小说，写成一项可控工程。
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            SuperWriter 把章节蓝图、人物关系、伏笔线索和 AI
            辅助放在同一个写作工作台里，让灵感不再散落，让故事持续推进。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-6">
              <Link href="/register">
                开始创作
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-workspace-border bg-workspace-paper/70 px-6"
            >
              <Link href="#system">查看工作台</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <span>蓝图规划</span>
            <span className="text-workspace-border">·</span>
            <span>角色资料</span>
            <span className="text-workspace-border">·</span>
            <span>AI 上下文记忆</span>
          </div>
        </div>

        <div className="homepage-motion-item homepage-motion-late homepage-hero-preview">
          <WorkspacePreview />
        </div>
      </div>
    </section>
  );
}

function WorkspacePreview() {
  return (
    <div
      aria-label="SuperWriter 工作台预览"
      className="homepage-preview-shell relative mx-auto max-w-3xl"
    >
      <div className="studio-paper relative grid min-h-[520px] gap-3 rounded-3xl p-3 md:grid-cols-[9rem_minmax(0,1fr)_11rem]">
        <aside className="studio-rail rounded-2xl p-4">
          <div className="mb-5 flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-module-blueprint" />
            <span className="text-sm font-semibold">故事蓝图</span>
          </div>
          <div className="space-y-2">
            {["第 10 章", "第 11 章", "第 12 章"].map((chapter, index) => (
              <div
                className={`homepage-preview-row rounded-xl border px-3 py-2 text-xs ${
                  index === 2
                    ? "border-workspace-accent/30 bg-workspace-accent/10 text-foreground"
                    : "border-workspace-border bg-workspace-paper/70 text-muted-foreground"
                }`}
                key={chapter}
              >
                <div className="font-medium">{chapter}</div>
                <div className="mt-1 text-[11px]">场景 {index + 3} · 推进中</div>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3 text-xs">
            <PreviewSignal color="bg-module-location" label="世界观" />
            <PreviewSignal color="bg-module-character" label="人物线" />
            <PreviewSignal color="bg-module-timeline" label="伏笔" />
          </div>
        </aside>

        <article className="studio-manuscript rounded-2xl border border-workspace-border p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>正文编辑器</span>
            <span>1,842 字 · 已保存</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">
            第 12 章：雨夜回城
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-8 text-muted-foreground">
            <p>
              雨从城门的铜钉上滑下来，像一串断开的旧约。林澈停在灯下，终于认出信封上的火漆。
            </p>
            <p>
              那不是父亲的字迹，却用了第 3 章里只出现过一次的暗号：回城之后，不要先去见任何人。
            </p>
          </div>
          <div className="homepage-preview-scene mt-7 rounded-2xl border border-module-timeline/30 bg-module-timeline/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">当前场景</p>
            <p className="mt-1 leading-6">
              主角发现旧信。需要回收第 3 章伏笔，并保持与第 9 章时间线一致。
            </p>
          </div>
        </article>

        <aside className="studio-ai-tray rounded-2xl p-4">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="homepage-ai-spark h-4 w-4 text-workspace-ai" />
            <span className="text-sm font-semibold">AI 副驾驶</span>
          </div>
          <div className="rounded-2xl border border-workspace-ai/25 bg-workspace-ai/10 p-3 text-xs leading-6 text-muted-foreground">
            建议补强人物动机：旧信不仅推动情节，也应该改变主角对母亲失踪的判断。
          </div>
          <div className="mt-4 space-y-2">
            {aiCommands.slice(0, 3).map((command) => (
              <div
                className="homepage-preview-command rounded-full border border-workspace-border bg-workspace-paper/70 px-3 py-2 text-xs font-medium"
                key={command}
              >
                {command}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProblemSection() {
  return (
    <section className="homepage-screen px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="homepage-motion-item">
          <SectionLabel>创作失控点</SectionLabel>
        </div>
        <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="homepage-motion-item">
            <h2 className="text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              长篇失控，通常不是因为不会写。
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              真正拖住作者的，是信息越写越多、线索越铺越散，而写作现场却看不到完整结构。
            </p>
          </div>
          <div className="homepage-motion-item homepage-motion-late grid gap-3">
            {problemPoints.map((point) => (
              <div
                className="studio-soft-panel flex items-center gap-4 rounded-2xl p-4"
                key={point.label}
              >
                <span className={`h-10 w-1 rounded-full ${point.accent}`} />
                <div>
                  <p className="text-sm font-semibold">{point.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{point.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SystemSection() {
  return (
    <section
      id="system"
      aria-labelledby="system-heading"
      className="homepage-screen px-5 py-16 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="homepage-motion-item">
          <SectionLabel>连接式工作台</SectionLabel>
        </div>
        <div className="homepage-motion-item mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2
            id="system-heading"
            className="max-w-2xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl"
          >
            一条故事线，连接蓝图、角色和正文。
          </h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            SuperWriter 不是把功能摆成一排，而是让每个创作动作都回到同一条故事线上。
          </p>
        </div>
        <div className="homepage-motion-item homepage-motion-late mt-8 grid gap-4 md:grid-cols-3">
          {systemPillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article className="studio-paper rounded-2xl p-5" key={pillar.title}>
                <Icon className={`h-5 w-5 ${pillar.accent}`} />
                <h3 className="mt-5 text-lg font-semibold tracking-normal">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {pillar.text}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AICoPilotSection() {
  return (
    <section
      id="ai-copilot"
      aria-labelledby="ai-heading"
      className="homepage-screen px-5 py-16 sm:px-8 lg:px-10"
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="homepage-motion-item">
          <SectionLabel>AI 副驾驶</SectionLabel>
          <h2
            id="ai-heading"
            className="mt-4 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl"
          >
            AI 在上下文里工作，而不是空口续写。
          </h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
            它知道当前章节、场景目标、人物关系和未回收伏笔，所以建议更像编辑伙伴，而不是随机生成器。
          </p>
        </div>

        <div className="homepage-motion-item homepage-motion-late studio-ai-tray rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <WandSparkles className="h-5 w-5 text-workspace-ai" />
            <h3 className="text-lg font-semibold tracking-normal">上下文命令</h3>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {aiCommands.map((command) => (
              <button
                className="homepage-command-chip rounded-full border border-workspace-border bg-workspace-paper/75 px-4 py-3 text-left text-sm font-medium text-foreground"
                key={command}
                type="button"
              >
                {command}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-workspace-ai/25 bg-workspace-ai/10 p-4 text-sm leading-7 text-muted-foreground">
            这一段已经承接旧信伏笔，但人物动机还偏弱。可以让主角在收信后主动隐瞒线索，为下一章的信任冲突埋下选择。
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="homepage-screen px-5 pb-14 pt-16 sm:px-8 lg:px-10">
      <div className="homepage-motion-item mx-auto max-w-6xl rounded-3xl bg-primary px-6 py-10 text-primary-foreground shadow-2xl sm:px-10 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <SectionLabel className="text-primary-foreground/65">开始写作</SectionLabel>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              把下一个长篇，放进一个不会散架的工作台。
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-primary-foreground/72">
              从第一章开始，就让蓝图、人物、伏笔和 AI 建议跟着正文一起生长。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button asChild size="lg" variant="secondary" className="h-12 rounded-xl px-6">
              <Link href="/register">
                开始创作
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 rounded-xl px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/login">已有账号，登录</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-workspace-border/70 px-5 py-8 text-xs text-muted-foreground sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p>© 2026 SuperWriter. All rights reserved.</p>
        <a
          href="https://beian.miit.gov.cn"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-foreground"
        >
          滇ICP备2026001874号-1
        </a>
      </div>
    </footer>
  );
}

function PreviewSignal({ color, label }: { color: string; label: string }) {
  return (
    <div className="homepage-preview-row flex items-center justify-between gap-2 text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </span>
      <CheckCircle2 className="h-3.5 w-3.5" />
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground ${className}`}
    >
      {children}
    </p>
  );
}
