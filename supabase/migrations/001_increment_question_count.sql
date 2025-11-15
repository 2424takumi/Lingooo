-- アトミックな質問カウントインクリメント関数
--
-- この関数は use-question-count.ts の incrementQuestionCount から呼び出され、
-- 競合状態（race condition）を回避するためのアトミックなインクリメントを提供します。
--
-- 使用方法:
-- SELECT increment_question_count('user-id-here');

CREATE OR REPLACE FUNCTION increment_question_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- アトミックなインクリメント操作
  UPDATE users
  SET monthly_question_count = monthly_question_count + 1
  WHERE id = user_id
  RETURNING monthly_question_count INTO new_count;

  -- 更新が成功した場合は新しいカウントを返す
  IF new_count IS NULL THEN
    -- ユーザーが存在しない、またはカウントがNULLの場合
    RAISE EXCEPTION 'User not found or count is null: %', user_id;
  END IF;

  RETURN new_count;
END;
$$;

-- 関数の実行権限を認証済みユーザーに付与
GRANT EXECUTE ON FUNCTION increment_question_count(UUID) TO authenticated;

-- セキュリティ: ユーザーは自分自身のカウントのみインクリメント可能
-- Row Level Security (RLS) はusersテーブルで既に設定されていることを前提とします

COMMENT ON FUNCTION increment_question_count(UUID) IS
'Atomically increments the monthly_question_count for a user and returns the new count.
Prevents race conditions when multiple questions are asked simultaneously.';
