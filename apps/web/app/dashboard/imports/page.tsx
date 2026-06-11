import { ImportUpload } from "@/components/import/import-upload";
import { ImportWorkbenchList } from "@/components/import/import-workbench-list";
import { getImportSessions } from "@/lib/db/queries/imports";

export default async function DashboardImportsPage() {
  const sessions = await getImportSessions();

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">迁移工作台</h1>
          <p className="text-muted-foreground">
            {sessions.length} 个迁移任务
          </p>
        </div>
        <ImportUpload />
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">还没有迁移任务</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            上传 .txt、.md 或 .docx 文件，先建立迁移会话，再进入切章与分析流程。
          </p>
        </div>
      ) : (
        <ImportWorkbenchList sessions={sessions} />
      )}
    </div>
  );
}
