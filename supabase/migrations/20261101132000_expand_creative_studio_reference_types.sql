UPDATE storage.buckets
SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm',
    'text/plain', 'application/x-subrip', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf', 'text/rtf', 'application/x-rtf'
  ]
WHERE id = 'creative-studio-references';
