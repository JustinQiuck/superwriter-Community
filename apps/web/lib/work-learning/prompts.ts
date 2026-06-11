import type { WorkLearningSkill } from "./types";

export function buildWorkLearningAnalysisPrompt(input: {
  skill: WorkLearningSkill;
  text: string;
  sourceTitle?: string;
  targetStoryContext?: string;
}): string {
  const sourceTitle = input.sourceTitle?.trim() || "未命名参考文本";
  const targetStoryContext = input.targetStoryContext?.trim() || "暂无目标故事上下文。";

  return `你是 SuperWriter 的作品学习教练。你的任务是帮助创作者从参考文本中学习写作技法，而不是模仿、复刻或改编原文。

## 拆解 Skill
名称：${input.skill.label}
说明：${input.skill.description}
重点：${input.skill.analysisFocus.join("、")}
规则：${input.skill.promptGuidance}

## 目标故事上下文
${targetStoryContext}

## 输出要求
1. 只输出 JSON，不要 Markdown，不要解释性前后缀。
2. 输出必须是对象：{"summary":"...", "cards":[...]}。
3. cards 返回 3 到 5 张技法卡。
4. 不要生成剧本、短剧、分镜、场景表、镜头语言或分集方案。
5. 不要仿写参考文本，不要要求用户复制作者表达。
6. sourceManifestation 和 sourceAnchors 只做短引用或位置描述，避免长段复制原文。
7. applicationIntents 只能使用：blueprint、chapter、character、practice。

## 技法卡 JSON 结构
{
  "summary": "本次拆解的一句话总结",
  "cards": [
    {
      "title": "技法名称",
      "sourceManifestation": "它在参考文本中的表现，简短说明",
      "abstractRule": "脱离原文后的抽象写作规则",
      "whyItWorks": "为什么它对读者有效",
      "suitableUses": ["适用场景1", "适用场景2"],
      "migrationSuggestion": "如何迁移到用户自己的故事",
      "practiceTask": "一个具体练习任务",
      "applicationIntents": ["blueprint", "chapter"],
      "cautions": ["使用时的风险或边界"],
      "sourceAnchors": ["短位置描述或不超过短句的锚点"]
    }
  ]
}

## 参考文本标题
${sourceTitle}

## 参考文本
${input.text}`;
}

export function buildWorkLearningApplyPrompt(input: {
  cardTitle: string;
  abstractRule: string;
  migrationSuggestion: string;
  practiceTask: string;
  targetLabel: string;
  targetContext: string;
}): string {
  return `你是 SuperWriter 的作品学习教练。请把一张技法卡迁移到用户自己的故事中，输出可执行建议，不要直接替用户改写正文。

## 技法卡
名称：${input.cardTitle}
抽象规则：${input.abstractRule}
迁移建议：${input.migrationSuggestion}
练习任务：${input.practiceTask}

## 应用目标
${input.targetLabel}

## 目标故事上下文
${input.targetContext || "暂无上下文"}

## 输出要求
1. 只输出 JSON，不要 Markdown，不要解释性前后缀。
2. 输出对象结构为：{"title":"...", "guidance":"...", "tasks":[...], "cautions":[...]}。
3. 给出建议和任务，不要直接修改数据库、章节正文或蓝图。
4. 不要生成剧本、短剧、分镜、镜头语言或分集方案。`;
}
