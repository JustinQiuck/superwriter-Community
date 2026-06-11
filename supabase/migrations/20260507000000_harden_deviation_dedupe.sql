-- Make deviation report deduplication concurrency-safe.

ALTER TABLE story_deviation_reports
  ADD COLUMN fingerprint TEXT;

UPDATE story_deviation_reports
SET fingerprint = COALESCE(beat_id::TEXT, 'story')
  || '|'
  || deviation_type::TEXT
  || '|'
  || btrim(regexp_replace(blueprint_value, '\s+', ' ', 'g'));

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY story_id, fingerprint
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS row_number
  FROM story_deviation_reports
  WHERE status = 'pending'
)
DELETE FROM story_deviation_reports
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE row_number > 1
);

ALTER TABLE story_deviation_reports
  ALTER COLUMN fingerprint SET NOT NULL;

CREATE UNIQUE INDEX idx_deviation_story_pending_fingerprint
  ON story_deviation_reports(story_id, fingerprint)
  WHERE status = 'pending';
