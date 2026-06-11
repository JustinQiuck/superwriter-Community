export const DEVIATION_EMOTION_ANALYSIS_PROMPT = `你是一位专业的文本情绪分析师。分析以下小说章节内容的整体情绪基调。

请严格按照以下 JSON 格式返回结果（不要返回其他内容）：
{
  "score": <-10到+10的整数，-10表示极度消极，0表示中性，+10表示极度积极>,
  "reason": "<一句话说明判断依据>"
}

情绪评分标准：
- -10 到 -7：极度悲伤/恐惧/绝望
- -6 到 -3：明显忧郁/紧张/不安
- -2 到 +2：平静/中性/日常
- +3 到 +6：积极/温暖/希望
- +7 到 +10：极度喜悦/胜利/振奋

章节内容：
{{chapter_content}}`;

export const DEVIATION_CONTRADICTION_CHECK_PROMPT = `你是一位小说设定一致性检查专家。对比以下章节内容与已知的关键约束，检查是否存在设定矛盾。

已知关键约束：
{{key_constraints}}

章节内容：
{{chapter_content}}

请严格按照以下 JSON 格式返回结果（不要返回其他内容）：
{
  "has_contradiction": <true 或 false>,
  "contradiction_detail": "<具体矛盾描述，如果没有矛盾则为空字符串>"
}`;

export const DEVIATION_SUGGEST_PROMPT = `你是小说创作顾问。检测到以下偏差，请基于蓝图要求和记忆上下文，给出具体的修复建议。

偏差类型：{{deviation_type}}
蓝图目标：{{blueprint_value}}
实际内容：{{actual_value}}

故事上下文：
{{story_context}}

请给出：
1. 偏差分析（为什么产生了偏差）
2. 具体修复建议（包含建议增加或修改的文本片段方向）
3. 修复优先级（高/中/低）

请用简洁的中文回答，不超过300字。`;
