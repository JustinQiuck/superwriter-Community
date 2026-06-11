// apps/web/lib/ai/template-engine.ts
// 将 prompt 模板中的 {{变量名}} 替换为实际值
// 未匹配的变量保留原样（不静默失败）
export function fillTemplate(
  template: string,
  vars: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return vars[key] ?? match;
  });
}
