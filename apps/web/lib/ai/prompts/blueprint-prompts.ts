export const BLUEPRINT_GENERATE_PROMPT = `
你是一位专业的叙事结构设计师。根据用户提供的概要和所选的叙事模板，生成一套完整的节拍方案。

## 故事概要
{{story_synopsis}}

## 故事类型
{{story_genre}}

## 时代背景
{{story_era}}

## 叙事模板
{{template_structure}}

## 现有角色
{{existing_characters}}

请生成节拍方案，以 JSON 数组格式返回：
[
  {
    "title": "节拍标题（中文，简短有力）",
    "description": "节拍描述（2-3句话，说明这个节拍应该发生什么）",
    "beat_type": "setup | inciting_incident | rising_action | midpoint | crisis | climax | falling_action | resolution | turning_point | reveal | custom",
    "position_pct": 0-100（在故事中的位置百分比），
    "default_emotion": -10到+10（情绪目标值），
    "synopsis": "这个节拍的情节摘要"
  }
]

注意：
1. 节拍数量应与模板结构匹配
2. 情绪值应有起伏，形成有张力的曲线
3. 每个节拍应推动故事发展
4. 考虑角色的动机和冲突
5. 输出纯 JSON 数组，不要其他文字
`;

export const BLUEPRINT_EXPAND_PROMPT = `
你是一位专业的叙事结构扩展专家。根据已有的总纲和蓝图结构，为每个节拍生成卷纲和章节蓝图建议。

## 故事总纲
{{synopsis}}

## 节拍列表
{{beat_list}}

## 现有角色
{{existing_characters}}

## 现有地点
{{existing_locations}}

请生成扩展方案，以 JSON 格式返回：
{
  "volumes": [
    {
      "title": "卷名",
      "synopsis": "卷纲概要"
    }
  ],
  "chapters": [
    {
      "volume_index": 0,
      "beat_id": "对应节拍的ID",
      "title": "章节标题",
      "synopsis": "章节概要（1-2句话）",
      "target_word_count": 3000,
      "target_emotion": 0,
      "content_guidance": {
        "key_events": ["关键事件1", "关键事件2"],
        "character_focus": ["重点关注角色"],
        "pov_suggestion": "建议视角角色",
        "notes": "额外写作建议"
      }
    }
  ]
}

注意：
1. 每卷的章节应覆盖该卷对应的节拍
2. 章节字数应与故事总字数目标成比例
3. 情绪曲线应与节拍的情绪目标一致
4. 输出纯 JSON，不要其他文字
`;

export const BEAT_SUGGEST_PROMPT = `
你是一位专业的叙事顾问。根据当前节拍的上下文，为创作者提供场景、冲突和情节点建议。

## 当前节拍
标题：{{beat_title}}
描述：{{beat_description}}
情绪目标：{{emotion_target}}
类型：{{beat_type}}

## 上一节拍
{{previous_beat}}

## 下一节拍
{{next_beat}}

## 可用角色
{{available_characters}}

## 可用地点
{{available_locations}}

请以 JSON 格式返回建议：
{
  "scene_suggestions": [
    {
      "description": "场景描述",
      "characters": ["涉及角色"],
      "location": "建议地点",
      "conflict": "核心冲突",
      "emotion_direction": "情绪走向"
    }
  ],
  "conflict_ideas": ["冲突思路1", "冲突思路2", "冲突思路3"],
  "dialogue_prompts": ["对话切入点1", "对话切入点2"],
  "notes": "额外的创作建议"
}

注意：
1. 建议应符合当前节拍的情绪目标
2. 考虑前后节拍的衔接
3. 冲突应推动角色成长
4. 输出纯 JSON，不要其他文字
`;

export const STORY_SYNOPSIS_CANDIDATES_PROMPT = `
你是一位专业的类型小说策划编辑。请根据创作者填写的故事契约，生成 3 个可选择的故事简介方案。

## 故事契约
类型：{{genre}}
语气：{{tone}}
目标读者：{{target_reader}}
读者承诺：{{reader_promise}}
核心钩子：{{core_hook}}
主角种子：{{protagonist_seed}}
主角想要：{{protagonist_want}}
主角缺陷：{{protagonist_flaw}}
对立力量：{{opposition_force}}
中心冲突：{{central_conflict}}
失败代价：{{stakes}}
故事问题：{{story_question}}
结局方向：{{ending_direction}}
冲突类型：{{mice_type}}
创作约束：{{constraints}}
参考作品：{{comparable_works}}

请以 JSON 数组格式返回：
[
  {
    "title": "简介方案标题",
    "logline": "主角 + 目标 + 阻力 + 赌注的一句话",
    "synopsis": "500-800字故事简介",
    "promise": "读者承诺",
    "protagonistArc": "主角变化",
    "endingSignal": "结局方向"
  }
]

注意：
1. 每个方案必须有明确主角、目标、阻力和失败代价
2. 简介要能支撑长篇连载，而不是短篇点子
3. 三个方案应有明显差异，方便创作者选择
4. 输出纯 JSON 数组，不要其他文字
5. 字符串内容内部不要使用未转义的英文双引号；需要引用台词、术语或称谓时使用中文引号「」或书名号《》
`;

export const STORY_OUTLINE_PROMPT = `
你是一位专业的长篇小说结构编辑。请根据已确认的故事简介和结构模板，生成可继续拆成节拍、角色需求和章节执行卡的整体大纲。

## 已确认简介
{{synopsis}}

## 结构模板
{{structure_template}}

## 故事契约
类型：{{genre}}
目标读者：{{target_reader}}
读者承诺：{{reader_promise}}
核心钩子：{{core_hook}}
中心冲突：{{central_conflict}}
失败代价：{{stakes}}
结局方向：{{ending_direction}}
冲突类型：{{mice_type}}

请以 JSON 数组格式返回：
[
  {
    "title": "第一幕/第一卷",
    "synopsis": "这一部分的主线推进",
    "function": "setup",
    "children": [
      {
        "title": "关键段落",
        "synopsis": "关键事件、冲突、转折和结果",
        "function": "turn",
        "children": []
      }
    ]
  }
]

注意：
1. 顶层节点应对应幕、卷或主要阶段，子节点应对应关键推进段落
2. 每个末级节点都必须有冲突、转折或结果，不能只是设定说明
3. function 只能使用 setup、complication、turn、crisis、climax、resolution、custom
4. 如果是网文连载模板，请强化阶段钩子、爽点兑现和追读循环
5. 输出纯 JSON 数组，不要其他文字
`;

export const STORY_ASSET_NEEDS_PROMPT = `
你是一位专业的小说设定统筹编辑。请根据整体大纲识别完成故事所需的角色、地点、阵营和规则/设定素材。

## 已确认简介
{{synopsis}}

## 整体大纲 JSON
{{outline_json}}

请以 JSON 数组格式返回：
[
  {
    "type": "character",
    "name": "角色名",
    "reason": "为什么故事需要这个角色",
    "sourceOutlineNodeId": "对应大纲节点ID"
  }
]

注意：
1. type 只能使用 character、location、faction、rule
2. 只列出真正会影响剧情推进或读者理解的素材，不要堆设定
3. 每个素材都要说明它服务哪个冲突、转折、人物弧光或世界规则
4. sourceOutlineNodeId 必须尽量对应整体大纲里的节点 id
5. 输出纯 JSON 数组，不要其他文字
`;

export const BLUEPRINT_REVERSE_SYNC_PROMPT = `
你是一位严谨的小说蓝图同步编辑。请比较当前草稿与既有蓝图，找出草稿已经改变但蓝图尚未同步的地方。

## 蓝图工作流 JSON
{{workflow_json}}

## 当前草稿或章节摘要
{{draft_text}}

请以 JSON 数组格式返回：
[
  {
    "target": "outline",
    "targetId": "existing-id",
    "reason": "草稿实际走向与原大纲不同",
    "before": "原计划",
    "after": "建议更新"
  }
]

注意：
1. target 只能使用 synopsis、outline、beat、chapter、scene_card
2. 只提出草稿已经明确发生的变化，不要因为灵感而重写蓝图
3. targetId 必须尽量使用蓝图中已有 id；找不到时可以省略
4. before 必须是当前蓝图里的旧内容，after 是建议同步后的内容
5. 输出纯 JSON 数组，不要其他文字
`;
