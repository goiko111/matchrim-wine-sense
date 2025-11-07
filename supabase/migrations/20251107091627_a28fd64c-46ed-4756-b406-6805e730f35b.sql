-- Add stock quantity field to user_wines table
ALTER TABLE user_wines
ADD COLUMN quantity integer DEFAULT 1 CHECK (quantity >= 0);

-- Add index for better performance on quantity queries
CREATE INDEX idx_user_wines_quantity ON user_wines(user_id, quantity) WHERE status = 'collection';