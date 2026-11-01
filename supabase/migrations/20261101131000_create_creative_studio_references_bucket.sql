INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'creative-studio-references',
  'creative-studio-references',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;
