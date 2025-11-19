-- サブスクリプション関連フィールドを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS revenuecat_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_platform VARCHAR(20);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_users_subscription_status
ON users(subscription_status);

CREATE INDEX IF NOT EXISTS idx_users_subscription_expires
ON users(subscription_expires_at);

-- サブスクリプションステータス更新関数
CREATE OR REPLACE FUNCTION update_subscription_status(
  user_id UUID,
  status VARCHAR(20),
  expires_at TIMESTAMP,
  customer_id VARCHAR(255),
  platform VARCHAR(20)
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET
    subscription_status = status,
    subscription_expires_at = expires_at,
    revenuecat_customer_id = customer_id,
    subscription_platform = platform,
    plan = CASE
      WHEN status = 'active' THEN 'plus'
      ELSE 'free'
    END
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_subscription_status TO authenticated;

COMMENT ON FUNCTION update_subscription_status IS
'Update user subscription status from RevenueCat webhook';
