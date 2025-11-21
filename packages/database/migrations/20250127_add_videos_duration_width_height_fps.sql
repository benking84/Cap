-- Add duration, width, height, and fps columns to videos table
ALTER TABLE videos
  ADD COLUMN duration FLOAT,
  ADD COLUMN width INT,
  ADD COLUMN height INT,
  ADD COLUMN fps INT;

