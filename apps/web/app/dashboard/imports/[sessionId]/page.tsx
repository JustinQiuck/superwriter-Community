import Link from "next/link";
import { notFound } from "next/navigation";

import { ImportStepRail } from "@/components/import/import-step-rail";
import { ImportSessionWorkbench } from "@/components/import/import-session-workbench";
import {
  calculateImportProgress,
  getImportCandidates,
  getImportJobs,
  getImportSections,
  getImportSessionById,
} from "@/lib/db/queries/imports";

interface ImportSessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ImportSessionDetailPage({ params }: ImportSessionDetailPageProps) {
  const { sessionId } = await params;
  const session = await getImportSessionById(sessionId);
  if (!session) notFound();

  const [sections, candidates, jobs] = await Promise.all([
    getImportSections(sessionId),
    getImportCandidates(sessionId),
    getImportJobs(sessionId),
  ]);
  const progress = calculateImportProgress(jobs);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/dashboard/imports"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              迁移工作台
            </Link>
            <h1 className="mt-2 truncate text-xl font-semibold">
              {session.inferred_title || session.source_filename}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {session.source_filename} · {session.source_word_count.toLocaleString("zh-CN")} 字
            </p>
          </div>
          <ImportStepRail currentStep={session.current_step} />
        </div>

        {session.error_message && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {session.error_message}
          </div>
        )}

        <ImportSessionWorkbench
          session={session}
          initialSections={sections}
          initialCandidates={candidates}
          jobs={jobs}
          progress={progress}
        />
      </div>
    </div>
  );
}
