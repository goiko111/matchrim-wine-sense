-- Add status column to user_wines table to support wishlist, collection, and tasted wines
ALTER TABLE user_wines 
ADD COLUMN status text DEFAULT 'collection' NOT NULL;

-- Add check constraint for valid status values
ALTER TABLE user_wines
ADD CONSTRAINT user_wines_status_check 
CHECK (status IN ('collection', 'wishlist', 'tasted'));

-- Create index for faster filtering by user and status
CREATE INDEX idx_user_wines_status ON user_wines(user_id, status);

-- Add comment to explain the column
COMMENT ON COLUMN user_wines.status IS 'Wine status: collection (owned), wishlist (want to try), tasted (already drunk and rated)';
