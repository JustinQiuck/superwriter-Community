-- Seed 6 preset narrative templates

INSERT INTO story_templates (id, name, description, template_type, is_preset, beat_definitions, sort_order) VALUES
(
  gen_random_uuid(), '三幕式结构', '经典的三幕式叙事结构：建置、对抗、结局。适合大多数类型的长篇小说。',
  'three_act', true,
  '[
    {"name":"开场画面","description":"展示主角的日常生活和初始状态，建立世界观","beat_type":"setup","position_pct":5,"default_emotion":0,"required":true},
    {"name":"铺垫主题","description":"通过对话或事件暗示故事的核心主题","beat_type":"setup","position_pct":10,"default_emotion":1,"required":true},
    {"name":"催化剂","description":"一个打破现状的事件，迫使主角面临改变","beat_type":"inciting_incident","position_pct":15,"default_emotion":3,"required":true},
    {"name":"争执与犹豫","description":"主角对是否接受改变感到犹豫和挣扎","beat_type":"rising_action","position_pct":20,"default_emotion":-2},
    {"name":"进入第二幕","description":"主角做出决定，正式踏上旅程或开始行动","beat_type":"turning_point","position_pct":25,"default_emotion":2,"required":true},
    {"name":"副线故事","description":"引入支持性情节线，丰富故事层次","beat_type":"rising_action","position_pct":30,"default_emotion":1},
    {"name":"游戏与乐趣","description":"主角在新环境中探索、成长，展现新能力","beat_type":"rising_action","position_pct":35,"default_emotion":4},
    {"name":"中点转折","description":"一个重大揭露或假胜利/假失败，故事方向改变","beat_type":"midpoint","position_pct":50,"default_emotion":5,"required":true},
    {"name":"反派逼近","description":"反派力量增强，压力不断升级","beat_type":"rising_action","position_pct":60,"default_emotion":-3},
    {"name":"失去一切","description":"主角遭遇重大挫折，似乎一切都完了","beat_type":"crisis","position_pct":70,"default_emotion":-7,"required":true},
    {"name":"灵魂黑夜","description":"主角在绝望中反思，找到内心的力量","beat_type":"crisis","position_pct":75,"default_emotion":-5},
    {"name":"进入第三幕","description":"主角获得新认知或力量，重新振作","beat_type":"turning_point","position_pct":80,"default_emotion":3},
    {"name":"高潮","description":"主角与反派的最终对决，所有冲突汇聚","beat_type":"climax","position_pct":90,"default_emotion":8,"required":true},
    {"name":"结局画面","description":"展示改变后的世界和主角成长后的状态","beat_type":"resolution","position_pct":98,"default_emotion":2,"required":true}
  ]'::jsonb, 1
),
(
  gen_random_uuid(), '英雄之旅', '约瑟夫·坎贝尔的经典英雄之旅模式，适合冒险、成长类故事。',
  'heros_journey', true,
  '[
    {"name":"平凡世界","description":"英雄的日常生活，展示尚未觉醒的状态","beat_type":"setup","position_pct":3,"default_emotion":0,"required":true},
    {"name":"冒险召唤","description":"一个事件或信息召唤英雄踏上未知之旅","beat_type":"inciting_incident","position_pct":10,"default_emotion":3,"required":true},
    {"name":"拒绝召唤","description":"英雄因恐惧或责任而拒绝冒险","beat_type":"rising_action","position_pct":15,"default_emotion":-2},
    {"name":"遇见导师","description":"一位智者或帮助者出现，给予指引","beat_type":"setup","position_pct":20,"default_emotion":2},
    {"name":"跨越第一道门槛","description":"英雄做出不可逆转的决定，进入特殊世界","beat_type":"turning_point","position_pct":25,"default_emotion":4,"required":true},
    {"name":"考验、盟友与敌人","description":"英雄在新世界中面对试炼，结交伙伴，识别敌友","beat_type":"rising_action","position_pct":35,"default_emotion":2},
    {"name":"接近最深的洞穴","description":"英雄接近最大的危险或最深的秘密","beat_type":"rising_action","position_pct":50,"default_emotion":-1},
    {"name":"严酷考验","description":"英雄面对最大的恐惧或生死危机","beat_type":"crisis","position_pct":60,"default_emotion":-7,"required":true},
    {"name":"获得奖赏","description":"英雄克服考验后获得宝藏、知识或力量","beat_type":"reveal","position_pct":65,"default_emotion":6},
    {"name":"返回之路","description":"英雄带着收获踏上归途，但仍有危险","beat_type":"falling_action","position_pct":72,"default_emotion":-3},
    {"name":"复活","description":"英雄面对最终的生死考验，获得净化或蜕变","beat_type":"climax","position_pct":85,"default_emotion":8,"required":true},
    {"name":"带着万灵丹归来","description":"英雄回到平凡世界，用获得的力量改变世界","beat_type":"resolution","position_pct":97,"default_emotion":4,"required":true}
  ]'::jsonb, 2
),
(
  gen_random_uuid(), '救猫咪', '布莱克·斯奈德的15拍编剧法，节奏明快，适合商业类型小说。',
  'save_the_cat', true,
  '[
    {"name":"开场画面","description":"展示主角的初始状态，与结尾形成对比","beat_type":"setup","position_pct":3,"default_emotion":0,"required":true},
    {"name":"设定主题","description":"有人向主角暗示主题或人生道理","beat_type":"setup","position_pct":5,"default_emotion":1},
    {"name":"铺垫","description":"介绍主要角色和他们的生活状态","beat_type":"setup","position_pct":10,"default_emotion":1,"required":true},
    {"name":"催化剂","description":"一个打破现状的事件发生了","beat_type":"inciting_incident","position_pct":12,"default_emotion":4,"required":true},
    {"name":"争执","description":"主角对改变感到犹豫，权衡利弊","beat_type":"rising_action","position_pct":18,"default_emotion":-1},
    {"name":"进入第二幕","description":"主角做出选择，进入新世界","beat_type":"turning_point","position_pct":25,"default_emotion":3,"required":true},
    {"name":"副线故事","description":"引入B故事线，通常是爱情或友谊","beat_type":"rising_action","position_pct":28,"default_emotion":2},
    {"name":"游戏时间","description":"主角在新世界中冒险的乐趣段落","beat_type":"rising_action","position_pct":35,"default_emotion":5},
    {"name":"中点","description":"假胜利或假失败，故事发生转折","beat_type":"midpoint","position_pct":50,"default_emotion":6,"required":true},
    {"name":"反派逼近","description":"反派力量加强，主角团队出现裂痕","beat_type":"rising_action","position_pct":58,"default_emotion":-3},
    {"name":"失去一切","description":"一切似乎都完了，主角跌入谷底","beat_type":"crisis","position_pct":68,"default_emotion":-8,"required":true},
    {"name":"灵魂黑夜","description":"主角在绝望中找到新的理解","beat_type":"crisis","position_pct":75,"default_emotion":-5},
    {"name":"进入第三幕","description":"主角获得新力量，决心反击","beat_type":"turning_point","position_pct":80,"default_emotion":4},
    {"name":"终幕风暴","description":"主角集结所有力量，向最终目标发起总攻","beat_type":"climax","position_pct":90,"default_emotion":8,"required":true},
    {"name":"结尾画面","description":"展示改变后的世界，与开场画面形成对比","beat_type":"resolution","position_pct":98,"default_emotion":3,"required":true}
  ]'::jsonb, 3
),
(
  gen_random_uuid(), '雪花法', '兰迪·英格曼森的雪花扩展法，从核心句逐步展开为完整大纲。适合从零开始的创作者。',
  'snowflake', true,
  '[
    {"name":"核心句","description":"用一句话概括整个故事","beat_type":"setup","position_pct":0,"default_emotion":0,"required":true},
    {"name":"扩展段落","description":"将核心句扩展为五句话的段落，涵盖开头、三幕转折和结尾","beat_type":"setup","position_pct":5,"default_emotion":0,"required":true},
    {"name":"角色概要","description":"为每个主要角色写出姓名、动机、目标、冲突和顿悟","beat_type":"setup","position_pct":10,"default_emotion":0,"required":true},
    {"name":"扩展概要","description":"将每句概要扩展为完整段落","beat_type":"rising_action","position_pct":15,"default_emotion":1},
    {"name":"角色详述","description":"深入刻画每个角色的详细背景和故事线","beat_type":"rising_action","position_pct":20,"default_emotion":0},
    {"name":"扩展为页面","description":"将概要扩展为完整的四页大纲","beat_type":"rising_action","position_pct":25,"default_emotion":1},
    {"name":"完善角色表","description":"扩展角色的完整故事弧线","beat_type":"rising_action","position_pct":30,"default_emotion":0},
    {"name":"场景列表","description":"列出所有需要的场景","beat_type":"midpoint","position_pct":50,"default_emotion":0,"required":true},
    {"name":"场景描述","description":"为每个场景写出描述段落","beat_type":"rising_action","position_pct":60,"default_emotion":0},
    {"name":"角色叙事","description":"从每个角色视角重新讲述故事","beat_type":"crisis","position_pct":70,"default_emotion":0},
    {"name":"扩展场景","description":"将场景描述扩展为完整叙事","beat_type":"climax","position_pct":85,"default_emotion":0,"required":true},
    {"name":"初稿","description":"基于完整大纲开始写作初稿","beat_type":"resolution","position_pct":100,"default_emotion":0,"required":true}
  ]'::jsonb, 4
),
(
  gen_random_uuid(), '七点式结构', '丹·威尔斯的七点式故事结构，注重转折和角色成长弧线。',
  'seven_point', true,
  '[
    {"name":"钩子","description":"展示主角的初始状态和世界——通常是不利的起点","beat_type":"setup","position_pct":5,"default_emotion":-1,"required":true},
    {"name":"第一转折","description":"改变主角处境的关键事件，故事正式启动","beat_type":"inciting_incident","position_pct":15,"default_emotion":4,"required":true},
    {"name":"第一捏合","description":"主角被迫适应新处境，压力开始施加","beat_type":"rising_action","position_pct":25,"default_emotion":-2},
    {"name":"中点","description":"主角从被动反应转为主动出击","beat_type":"midpoint","position_pct":50,"default_emotion":3,"required":true},
    {"name":"第二捏合","description":"更大的危机出现，主角似乎要失败","beat_type":"crisis","position_pct":65,"default_emotion":-6},
    {"name":"第二转折","description":"主角获得关键信息或力量，扭转局面","beat_type":"turning_point","position_pct":75,"default_emotion":5,"required":true},
    {"name":"结局","description":"主角运用所获一切解决核心冲突","beat_type":"resolution","position_pct":95,"default_emotion":7,"required":true}
  ]'::jsonb, 5
),
(
  gen_random_uuid(), '故事圈', '丹·哈蒙的故事圈理论，八个步骤形成完整的角色成长循环。',
  'dan_harmon_story', true,
  '[
    {"name":"舒适","description":"主角处于舒适但受限的状态中","beat_type":"setup","position_pct":5,"default_emotion":0,"required":true},
    {"name":"渴望","description":"主角内心萌生对某种东西的渴望","beat_type":"setup","position_pct":12,"default_emotion":2,"required":true},
    {"name":"进入","description":"主角进入一个不熟悉的新领域或情境","beat_type":"inciting_incident","position_pct":20,"default_emotion":3,"required":true},
    {"name":"适应","description":"主角适应新环境，面对挑战获得成长","beat_type":"rising_action","position_pct":35,"default_emotion":1},
    {"name":"得到","description":"主角得到了他们想要的东西——但付出了代价","beat_type":"midpoint","position_pct":50,"default_emotion":5,"required":true},
    {"name":"代价","description":"主角为所获付出沉重代价，面临艰难选择","beat_type":"crisis","position_pct":65,"default_emotion":-6,"required":true},
    {"name":"回归","description":"主角回到熟悉的世界，但已经改变了","beat_type":"falling_action","position_pct":80,"default_emotion":2,"required":true},
    {"name":"改变","description":"主角已经从根本上改变，能够修复之前无法解决的问题","beat_type":"resolution","position_pct":95,"default_emotion":4,"required":true}
  ]'::jsonb, 6
);
