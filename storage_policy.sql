-- 注意：这个文件只是用于参考，实际需要在Supabase控制台中创建存储桶并设置权限
-- 这是在Supabase SQL编辑器中运行的命令，用于设置存储桶的安全策略

-- 确保存储桶存在（需要在控制台中手动创建名为"photos"的存储桶）

-- 为存储桶设置访问策略
-- 允许所有人查看照片
INSERT INTO storage.policies (name, definition, check_schema, check_tables, role, action, bucket_id)
VALUES (
  'Public Read Access',
  '(bucket_id = ''photos''::text)',
  FALSE,
  FALSE,
  'anon',
  'SELECT',
  'photos'
);

-- 只允许认证用户上传照片
INSERT INTO storage.policies (name, definition, check_schema, check_tables, role, action, bucket_id)
VALUES (
  'Auth Users Can Upload',
  '(bucket_id = ''photos''::text AND auth.role() = ''authenticated''::text)',
  FALSE,
  FALSE,
  'authenticated',
  'INSERT',
  'photos'
);

-- 只允许照片所有者更新或删除
INSERT INTO storage.policies (name, definition, check_schema, check_tables, role, action, bucket_id)
VALUES (
  'Owner Can Update',
  '(bucket_id = ''photos''::text AND auth.uid()::text = owner)',
  FALSE,
  FALSE,
  'authenticated',
  'UPDATE',
  'photos'
);

INSERT INTO storage.policies (name, definition, check_schema, check_tables, role, action, bucket_id)
VALUES (
  'Owner Can Delete',
  '(bucket_id = ''photos''::text AND auth.uid()::text = owner)',
  FALSE,
  FALSE,
  'authenticated',
  'DELETE',
  'photos'
); 