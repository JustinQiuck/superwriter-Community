"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImportSession, ImportSourceFileType } from "@/types/import";

const ACCEPTED_EXTENSIONS = ["txt", "md", "docx"] as const;
const UNSUPPORTED_FILE_MESSAGE = "仅支持 .txt、.md、.docx 文件";

type CreateSessionResponse = {
  data?: ImportSession;
  error?: { message?: string };
};

export function ImportUpload() {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inFlightRef.current) return;

    if (!file) {
      setError("请选择要迁移的文件");
      return;
    }

    const fileType = getFileType(file.name);
    if (!fileType) {
      setError(UNSUPPORTED_FILE_MESSAGE);
      toast.error(UNSUPPORTED_FILE_MESSAGE);
      return;
    }

    inFlightRef.current = true;
    setUploading(true);
    setError(null);

    try {
      const sessionResponse = await fetch("/api/import-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          fileType,
          fileSize: file.size,
        }),
      });

      const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as CreateSessionResponse;
      if (!sessionResponse.ok || !sessionPayload.data) {
        throw new Error(sessionPayload.error?.message || "创建迁移任务失败");
      }

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(
        `/api/import-sessions/${sessionPayload.data.id}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        throw new Error(readErrorMessage(uploadPayload) || "上传文件失败");
      }

      toast.success("已创建迁移任务");
      router.push(`/dashboard/imports/${sessionPayload.data.id}`);
      router.refresh();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "上传失败，请稍后重试";
      setError(message);
      toast.error(message);
    } finally {
      inFlightRef.current = false;
      setUploading(false);
    }
  };

  return (
    <Card className="w-full lg:w-[420px]">
      <CardContent className="p-4">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="import-file">选择文件</Label>
            <Input
              id="import-file"
              type="file"
              accept=".txt,.md,.docx"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" type="submit" disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "上传中..." : "上传并创建迁移"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function getFileType(filename: string): ImportSourceFileType | null {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return null;
  return ACCEPTED_EXTENSIONS.includes(extension as ImportSourceFileType)
    ? (extension as ImportSourceFileType)
    : null;
}

function readErrorMessage(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return null;
}
