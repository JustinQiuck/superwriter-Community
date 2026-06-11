"use client";

import { useEffect, useRef, useState } from "react";

import { AnalysisProgress } from "@/components/import/analysis-progress";
import { ApplyPreview } from "@/components/import/apply-preview";
import { CandidateReview } from "@/components/import/candidate-review";
import { SectionReview } from "@/components/import/section-review";
import type {
  ImportAnalysisJob,
  ImportCandidate,
  ImportSection,
  ImportSession,
  ImportSessionStatus,
  ImportSourceFileType,
} from "@/types/import";

interface ImportProgress {
  completed: number;
  total: number;
  percent: number;
}

interface ImportSessionWorkbenchProps {
  session: ImportSession;
  initialSections: ImportSection[];
  initialCandidates: ImportCandidate[];
  jobs: ImportAnalysisJob[];
  progress: ImportProgress;
}

const SOURCE_FILE_TYPE_LABELS: Record<ImportSourceFileType, string> = {
  txt: "TXT",
  md: "Markdown",
  docx: "DOCX",
};

const SESSION_STATUS_LABELS: Record<ImportSessionStatus, string> = {
  uploaded: "已上传",
  parsed: "已解析",
  sections_confirmed: "章节已确认",
  analyzing: "分析中",
  ready_for_review: "待审阅",
  applying: "应用中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

export function ImportSessionWorkbench({
  session,
  initialSections,
  initialCandidates,
  jobs,
  progress,
}: ImportSessionWorkbenchProps) {
  const [sections, setSections] = useState(initialSections);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [sectionsDirty, setSectionsDirty] = useState(false);
  const [candidatesDirty, setCandidatesDirty] = useState(false);
  const previousSectionsProp = useRef(initialSections);
  const previousCandidatesProp = useRef(initialCandidates);

  useEffect(() => {
    if (previousSectionsProp.current === initialSections) return;
    if (!sectionsDirty) {
      previousSectionsProp.current = initialSections;
      setSections(initialSections);
    }
  }, [initialSections, sectionsDirty]);

  useEffect(() => {
    if (previousCandidatesProp.current === initialCandidates) return;
    if (!candidatesDirty) {
      previousCandidatesProp.current = initialCandidates;
      setCandidates(initialCandidates);
    }
  }, [initialCandidates, candidatesDirty]);

  const reviewDirty = sectionsDirty || candidatesDirty;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section id="import-step-file" className="scroll-mt-6 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">文件信息</p>
              <h2 className="mt-1 truncate text-base font-semibold">{session.source_filename}</h2>
            </div>
            <span className="w-fit rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {SESSION_STATUS_LABELS[session.status]}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">类型</p>
              <p className="mt-1 text-sm font-semibold">
                {SOURCE_FILE_TYPE_LABELS[session.source_file_type]}
              </p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">字数</p>
              <p className="mt-1 text-sm font-semibold">
                {session.source_word_count.toLocaleString("zh-CN")} 字
              </p>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">片段</p>
              <p className="mt-1 text-sm font-semibold">{sections.length} 个</p>
            </div>
          </div>
        </section>
        <div id="import-step-sections" className="scroll-mt-6">
          <SectionReview
            sessionId={session.id}
            sections={sections}
            onSectionsChange={setSections}
            onDirtyChange={setSectionsDirty}
          />
        </div>
        <div id="import-step-review" className="scroll-mt-6">
          <CandidateReview
            sessionId={session.id}
            candidates={candidates}
            sections={sections}
            onCandidatesChange={setCandidates}
            onDirtyChange={setCandidatesDirty}
          />
        </div>
      </div>
      <aside className="space-y-5">
        <div id="import-step-analysis" className="scroll-mt-6">
          <AnalysisProgress
            sessionId={session.id}
            sessionStatus={session.status}
            sections={sections}
            jobs={jobs}
            progress={progress}
          />
        </div>
        <div id="import-step-apply" className="scroll-mt-6">
          <ApplyPreview
            session={session}
            sections={sections}
            candidates={candidates}
            reviewDirty={reviewDirty}
          />
        </div>
      </aside>
    </div>
  );
}
