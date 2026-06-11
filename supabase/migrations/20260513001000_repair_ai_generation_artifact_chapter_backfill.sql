WITH chapter_repairs AS (
  SELECT
    ai_generations.id AS generation_id,
    context_chapter.id AS repaired_chapter_id
  FROM ai_generations
  LEFT JOIN entities current_chapter
    ON current_chapter.id = ai_generations.chapter_id
    AND current_chapter.story_id = ai_generations.story_id
    AND current_chapter.type = 'chapter'
  LEFT JOIN entities context_chapter
    ON context_chapter.id = ai_generations.context_entity_ids[1]
    AND context_chapter.story_id = ai_generations.story_id
    AND context_chapter.type = 'chapter'
  WHERE ai_generations.source <> 'unknown'
    AND (
      (ai_generations.chapter_id IS NOT NULL AND current_chapter.id IS NULL)
      OR (ai_generations.chapter_id IS NULL AND context_chapter.id IS NOT NULL)
    )
)
UPDATE ai_generations
SET chapter_id = chapter_repairs.repaired_chapter_id
FROM chapter_repairs
WHERE ai_generations.id = chapter_repairs.generation_id;
