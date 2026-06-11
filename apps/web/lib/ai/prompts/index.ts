export const CHARACTER_GENERATE_PROMPT = `
你是一位专业的小说创作顾问。根据以下简短描述，生成一份完整的角色档案。

## 输入描述
{{user_input}}

## 故事背景
- 类型：{{story_genre}}
- 时代：{{story_era}}

## 请生成以下内容（JSON 格式）：
{
  "name": "角色全名",
  "aliases": ["别名1", "别名2"],
  "age": "年龄",
  "gender": "性别",
  "occupation": "职业",
  "appearance": {
    "hair": "发型描述",
    "eyes": "眼睛描述",
    "build": "体型描述",
    "distinctive_features": "显著特征",
    "typical_clothing": "标志性穿着"
  },
  "personality_traits": ["特质1", "特质2", "特质3"],
  "motivations": ["动机1", "动机2"],
  "fears": ["恐惧1", "恐惧2"],
  "sensory_symbols": {
    "visual": "视觉符号（如标志性穿着/物品）",
    "auditory": "听觉符号（如特定声音）",
    "olfactory": "嗅觉符号（如特定气味）",
    "tactile": "触觉符号",
    "gustatory": "味觉符号"
  },
  "role": "protagonist",
  "arc": {
    "starting_state": "初始状态",
    "ending_state": "最终状态",
    "turning_points": ["转折点1", "转折点2"]
  },
  "brief_description": "一段50字的简短描述"
}

注意：
1. 感官符号应该与时代背景匹配
2. 角色性格要有内在矛盾（使角色更立体）
3. 避免陈词滥调
4. 输出纯 JSON，不要其他文字
`;

export const CHAPTER_CONTINUE_PROMPT = `
你是一位专业的小说续写助手。请根据以下上下文继续写作。

## 之前的章节摘要
{{previous_summary}}

## 当前章节内容
{{current_content}}

## 当前场景角色
{{characters_summary}}

## 时间线上下文
{{timeline_context}}

## 写作风格
{{style_profile}}

## 本章写作目标
- 节拍目标：{{beat_target}}
- 情绪目标（-10到+10）：{{emotion_target}}
- 场景目标：{{scene_goal}}
- 结尾钩子方向：{{ending_hook}}

## 写作参数
- 目标字数：{{target_word_count}}字
- 叙事视角：{{pov}}

请继续写下去，保持风格一致，注意角色的感官符号和已知信息。只输出续写内容，不要任何解释。
`;

export const CONSISTENCY_CHECK_PROMPT = `
你是一位小说一致性检查专家。请检查以下文本中是否存在矛盾。

## 角色设定
{{character_data}}

## 关系网络
{{relationships}}

## 时间线
{{timeline}}

## 待检查文本
{{text_to_check}}

请以 JSON 格式返回检查结果：
{
  "issues": [
    {
      "type": "character_inconsistency" | "timeline_error" | "relationship_error" | "sensory_mismatch",
      "description": "问题描述",
      "location": "原文中的位置引用",
      "suggestion": "修正建议"
    }
  ],
  "overall_score": 0-100
}
`;

export const DIALOGUE_GENERATE_PROMPT = `
你是一位专业的小说对话写作专家。根据以下信息生成角色对话。

## 场景描述
{{scene_description}}

## 参与角色
{{characters}}

## 对话目的/冲突
{{dialogue_purpose}}

## 故事风格
{{style_profile}}

请生成自然、有张力的对话，要求：
1. 每个角色有独特的语言风格和习惯用语
2. 对话推进情节或揭示角色性格
3. 包含潜台词（不要过于直白）
4. 穿插肢体语言和表情描写
5. 输出纯对话文本，格式为：角色名："对话内容"
`;

export const SENSORY_EXPANSION_PROMPT = `
你是一位小说感官描写专家。请为以下文本增加丰富的感官细节。

## 原始文本
{{original_text}}

## 场景环境
{{scene_environment}}

## 在场角色
{{characters_present}}

## 时代背景
{{era}}

请扩写文本，增加以下感官细节：
1. 视觉：光影、色彩、动态
2. 听觉：环境音、对话声、静默
3. 嗅觉：环境气味、角色气息
4. 触觉：温度、质地、接触
5. 味觉（如适用）

注意：保持原文的核心情节和节奏，只是丰富感官层次。输出扩写后的完整文本。
`;

export const INFO_TRACKING_PROMPT = `
你是一位小说信息追踪专家。从以下文本中提取需要追踪的关键信息。

## 待分析文本
{{text}}

## 已知信息库
{{known_info}}

请以 JSON 格式返回提取的信息：
{
  "new_info": [
    {
      "category": "character_detail" | "location_detail" | "item_detail" | "event" | "rule" | "timeline",
      "entity_name": "相关实体名称",
      "detail": "具体信息",
      "source_text": "原文引用"
    }
  ],
  "potential_contradictions": [
    {
      "new_info": "新信息",
      "existing_info": "已有信息",
      "conflict": "矛盾描述"
    }
  ]
}
`;
