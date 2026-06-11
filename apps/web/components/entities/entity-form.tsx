"use client";

import { useState } from "react";
import type { EntityType } from "@superwriter/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ENTITY_TYPE_LABELS } from "@superwriter/shared";
import { mergeStructuredEntityData } from "@/lib/entities/structured-data";

interface EntityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EntityType;
  initialName?: string;
  initialData?: { name: string; data: Record<string, unknown>; tags: string[] };
  onSubmit: (data: { name: string; data: Record<string, unknown>; tags: string[] }) => Promise<void>;
}

export function EntityForm({
  open,
  onOpenChange,
  type,
  initialName,
  initialData,
  onSubmit,
}: EntityFormProps) {
  const [name, setName] = useState(initialData?.name ?? initialName ?? "");
  const [description, setDescription] = useState(
    (initialData?.data?.description as string) ?? "",
  );
  const [characterAliases, setCharacterAliases] = useState(
    Array.isArray(initialData?.data?.aliases)
      ? (initialData.data.aliases as string[]).join(", ")
      : "",
  );
  const [characterMotivations, setCharacterMotivations] = useState(
    Array.isArray(initialData?.data?.motivations)
      ? (initialData.data.motivations as string[]).join(", ")
      : "",
  );
  const [characterCurrentState, setCharacterCurrentState] = useState(
    ((initialData?.data?.arc as Record<string, unknown> | undefined)?.starting_state as string) ?? "",
  );
  const [locationAtmosphere, setLocationAtmosphere] = useState(
    (initialData?.data?.atmosphere as string) ?? "",
  );
  const sensoryDetails = initialData?.data?.sensory_details as Record<string, unknown> | undefined;
  const [locationVisual, setLocationVisual] = useState((sensoryDetails?.visual as string) ?? "");
  const [locationAuditory, setLocationAuditory] = useState((sensoryDetails?.auditory as string) ?? "");
  const [locationOlfactory, setLocationOlfactory] = useState((sensoryDetails?.olfactory as string) ?? "");
  const [chapterNumber, setChapterNumber] = useState(
    initialData?.data?.chapter_number ? String(initialData.data.chapter_number) : "",
  );
  const [chapterSummary, setChapterSummary] = useState(
    (initialData?.data?.summary as string) ?? "",
  );
  const [chapterTargetWordCount, setChapterTargetWordCount] = useState(
    initialData?.data?.target_word_count ? String(initialData.data.target_word_count) : "",
  );
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") ?? "",
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name: name.trim(),
        data: mergeStructuredEntityData(type, initialData?.data, {
          description,
          characterAliases,
          characterMotivations,
          characterCurrentState,
          locationAtmosphere,
          locationVisual,
          locationAuditory,
          locationOlfactory,
          chapterNumber,
          chapterSummary,
          chapterTargetWordCount,
        }),
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "编辑" : "新建"}
            {ENTITY_TYPE_LABELS[type]}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            {type === "character" ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <Label htmlFor="character-aliases">别名</Label>
                  <Input
                    id="character-aliases"
                    value={characterAliases}
                    onChange={(e) => setCharacterAliases(e.target.value)}
                    placeholder="如：阿晴, 晴姐"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="character-motivations">动机</Label>
                  <Input
                    id="character-motivations"
                    value={characterMotivations}
                    onChange={(e) => setCharacterMotivations(e.target.value)}
                    placeholder="如：寻找真相, 保护家人"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="character-current-state">当前状态</Label>
                  <Textarea
                    id="character-current-state"
                    value={characterCurrentState}
                    onChange={(e) => setCharacterCurrentState(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ) : null}
            {type === "location" ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <Label htmlFor="location-atmosphere">氛围</Label>
                  <Textarea
                    id="location-atmosphere"
                    value={locationAtmosphere}
                    onChange={(e) => setLocationAtmosphere(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="location-visual">视觉</Label>
                    <Input id="location-visual" value={locationVisual} onChange={(e) => setLocationVisual(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-auditory">听觉</Label>
                    <Input id="location-auditory" value={locationAuditory} onChange={(e) => setLocationAuditory(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-olfactory">气味</Label>
                    <Input id="location-olfactory" value={locationOlfactory} onChange={(e) => setLocationOlfactory(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : null}
            {type === "chapter" ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="chapter-number">章节序号</Label>
                    <Input
                      id="chapter-number"
                      type="number"
                      min={1}
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chapter-target-word-count">目标字数</Label>
                    <Input
                      id="chapter-target-word-count"
                      type="number"
                      min={1}
                      value={chapterTargetWordCount}
                      onChange={(e) => setChapterTargetWordCount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chapter-summary">章节摘要</Label>
                  <Textarea
                    id="chapter-summary"
                    value={chapterSummary}
                    onChange={(e) => setChapterSummary(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="tags">标签（逗号分隔）</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="如：主角, 母亲"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
