-- 計測用の表。1日ごと・出来事ごとの回数だけを持つ（個人を特定する情報は入れない）
CREATE TABLE IF NOT EXISTS events (
  day TEXT NOT NULL,
  name TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name)
);
