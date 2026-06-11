import type {
  WorkLearningApplicationIntent,
  WorkLearningSkill,
  WorkLearningSkillId,
} from "./types";

const ALL_INTENTS: WorkLearningApplicationIntent[] = [
  "blueprint",
  "chapter",
  "character",
  "practice",
];

export const WORK_LEARNING_SKILLS: WorkLearningSkill[] = [
  {
    id: "chapter_hook",
    label: "章节钩子拆解",
    description: "识别开场承诺、章末悬念和读者期待的建立方式。",
    recommendedInput: "一章或连续 2-3 个章节片段",
    applicationIntents: ["blueprint", "chapter", "practice"],
    analysisFocus: ["开场承诺", "信息延迟", "章末问题", "下一章期待"],
    promptGuidance: "重点拆解文本如何让读者产生继续读的理由，尤其是章节开头和结尾的期待管理。",
  },
  {
    id: "conflict_escalation",
    label: "冲突升级拆解",
    description: "拆出目标、阻力、升级、代价和阶段性失败。",
    recommendedInput: "包含明确行动目标和阻力的章节片段",
    applicationIntents: ["blueprint", "chapter", "practice"],
    analysisFocus: ["目标", "阻力", "代价", "升级", "失败或反击"],
    promptGuidance: "重点拆解冲突如何从小阻力逐步升级为更高代价，而不是只总结发生了什么。",
  },
  {
    id: "satisfaction_pacing",
    label: "爽点节奏拆解",
    description: "识别压制、反击、奖励、再压迫的节奏组合。",
    recommendedInput: "网文、类型文或强情绪回报片段",
    applicationIntents: ["blueprint", "chapter", "practice"],
    analysisFocus: ["压制", "反击", "奖励", "升级威胁", "节奏密度"],
    promptGuidance: "重点拆解读者情绪回报如何被延迟、兑现和再次拉高。",
  },
  {
    id: "character_desire_chain",
    label: "人物欲望链拆解",
    description: "拆出人物想要什么、为什么想要、如何被迫选择。",
    recommendedInput: "人物动机强、关系冲突明显的片段",
    applicationIntents: ["blueprint", "chapter", "character", "practice"],
    analysisFocus: ["外在目标", "内在需求", "错误信念", "伤口", "选择"],
    promptGuidance: "重点拆解人物欲望如何推动行动，以及行动如何暴露人物的缺口。",
  },
  {
    id: "reversal_information_gap",
    label: "反转与信息差拆解",
    description: "分析误导、隐瞒、揭示和读者认知变化。",
    recommendedInput: "悬疑、反转、误会或秘密揭露片段",
    applicationIntents: ["blueprint", "chapter", "practice"],
    analysisFocus: ["已知信息", "隐藏信息", "误导", "揭示时机", "认知翻转"],
    promptGuidance: "重点拆解谁知道什么、读者何时知道，以及揭示如何改变前文意义。",
  },
  {
    id: "emotional_pull",
    label: "情绪拉扯拆解",
    description: "拆解亲密、误解、失落、希望等情绪如何交替推进。",
    recommendedInput: "感情线、亲情线、师徒线或强情绪片段",
    applicationIntents: ["chapter", "character", "practice"],
    analysisFocus: ["情绪目标", "拉近", "推远", "克制", "爆发"],
    promptGuidance: "重点拆解情绪距离如何变化，以及文本如何让读者期待下一次靠近或爆发。",
  },
  {
    id: "reverse_outline",
    label: "反向大纲",
    description: "把文本反推为场景功能、章节功能和结构链条。",
    recommendedInput: "完整章节、短篇或一组连续章节摘要",
    applicationIntents: ["blueprint", "chapter", "practice"],
    analysisFocus: ["场景功能", "章节功能", "转折", "因果链", "结构位置"],
    promptGuidance: "重点把文本拆成可复用的结构骨架，而不是复述剧情。",
  },
  {
    id: "functional_story_dna",
    label: "作品功能 DNA",
    description: "提炼文本元素在故事中的功能，而不是表面设定。",
    recommendedInput: "任意代表性片段或作品摘要",
    applicationIntents: ALL_INTENTS,
    analysisFocus: ["元素功能", "读者承诺", "类型期待", "叙事杠杆", "迁移方式"],
    promptGuidance: "重点回答每个元素在故事里做了什么工作，以及这个功能如何迁移到原创故事。",
  },
];

const SKILL_BY_ID = new Map(WORK_LEARNING_SKILLS.map((skill) => [skill.id, skill]));

export function getWorkLearningSkill(id: string): WorkLearningSkill | null {
  return SKILL_BY_ID.get(id as WorkLearningSkillId) ?? null;
}

export function isWorkLearningSkillId(id: string): id is WorkLearningSkillId {
  return SKILL_BY_ID.has(id as WorkLearningSkillId);
}
