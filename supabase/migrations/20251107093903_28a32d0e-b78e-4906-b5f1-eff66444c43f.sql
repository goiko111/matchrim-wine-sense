-- Add price field to user_wines table
ALTER TABLE user_wines
ADD COLUMN price numeric(10,2);

-- Add index for price queries
CREATE INDEX idx_user_wines_price ON user_wines(user_id, price) WHERE price IS NOT NULL;