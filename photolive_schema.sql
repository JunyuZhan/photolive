<<<<<<< HEAD
-- photolive 数据库结构与策略（支持 taken_at 拍摄时间字段）

-- 首先删除现有的表和策略
DROP POLICY IF EXISTS "用户只能查看自己的照片或公开照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能插入自己的照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能更新自己的照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能删除自己的照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能查看自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能插入自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能更新自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能删除自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能查看自己相册中的照片" ON public.album_photos;
DROP POLICY IF EXISTS "用户只能添加照片到自己的相册" ON public.album_photos;
DROP POLICY IF EXISTS "用户只能从自己的相册移除照片" ON public.album_photos;

DROP TABLE IF EXISTS public.album_photos;
DROP TABLE IF EXISTS public.albums;
DROP TABLE IF EXISTS public.photos;
DROP TABLE IF EXISTS public.share_links;

-- 确保UUID扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建photos表，增加 taken_at 字段
CREATE TABLE public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT,
    description TEXT,
    image_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    taken_at TIMESTAMPTZ, -- 新增：拍摄时间，可为空
    is_public BOOLEAN DEFAULT true NOT NULL,
    tags TEXT[],
    photographer TEXT,
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0
);

-- 创建albums表
CREATE TABLE public.albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    watermark_type TEXT DEFAULT 'none', -- 'none' | 'text' | 'image'
    watermark_text TEXT,
    watermark_image TEXT, -- 图片水印路径
    watermark_opacity FLOAT DEFAULT 0.5,
    watermark_position TEXT DEFAULT 'southeast', -- 'center' | 'northwest' | 'northeast' | 'southwest' | 'southeast'
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    cover_photo_id UUID REFERENCES public.photos
);

-- 创建album_photos关联表
CREATE TABLE public.album_photos (
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (album_id, photo_id)
);

-- 创建share_links表
CREATE TABLE public.share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    album_id UUID REFERENCES public.albums,
    photo_id UUID REFERENCES public.photos,
    access_code TEXT, -- 访问码，可为空
    expires_at TIMESTAMPTZ, -- 有效期，可为空
    permission TEXT DEFAULT 'view', -- 'view' | 'download' | 'edit'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 创建索引提高查询性能
CREATE INDEX idx_photos_user_id ON public.photos(user_id);
CREATE INDEX idx_photos_public ON public.photos(is_public);
CREATE INDEX idx_albums_user_id ON public.albums(user_id);
CREATE INDEX idx_album_photos_album_id ON public.album_photos(album_id);
CREATE INDEX idx_album_photos_photo_id ON public.album_photos(photo_id);
CREATE INDEX idx_share_links_album_id ON public.share_links(album_id);
CREATE INDEX idx_share_links_photo_id ON public.share_links(photo_id);

-- 设置RLS策略
-- 先启用RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- photos表策略
CREATE POLICY "用户只能查看自己的照片或公开照片"
ON public.photos FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "用户只能插入自己的照片"
ON public.photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的照片"
ON public.photos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的照片"
ON public.photos FOR DELETE
USING (auth.uid() = user_id);

-- albums表策略
CREATE POLICY "用户只能查看自己的相册"
ON public.albums FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的相册"
ON public.albums FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的相册"
ON public.albums FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的相册"
ON public.albums FOR DELETE
USING (auth.uid() = user_id);

-- album_photos表策略
CREATE POLICY "用户只能查看自己相册中的照片"
ON public.album_photos FOR SELECT
USING (album_id IN (SELECT id FROM public.albums WHERE user_id = auth.uid()));

CREATE POLICY "用户只能添加照片到自己的相册"
ON public.album_photos FOR INSERT
WITH CHECK (album_id IN (SELECT id FROM public.albums WHERE user_id = auth.uid()));

CREATE POLICY "用户只能从自己的相册移除照片"
ON public.album_photos FOR DELETE
USING (album_id IN (SELECT id FROM public.albums WHERE user_id = auth.uid()));

-- share_links表策略
CREATE POLICY "用户只能查看自己的分享链接"
ON public.share_links FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的分享链接"
ON public.share_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的分享链接"
ON public.share_links FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的分享链接"
ON public.share_links FOR DELETE
USING (auth.uid() = user_id);

-- 操作日志表
CREATE TABLE IF NOT EXISTS public.operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users,
    photo_id UUID REFERENCES public.photos,
    album_id UUID REFERENCES public.albums,
    action TEXT NOT NULL, -- 'view' | 'download' | 'upload' | 'delete' | 'share' 等
    detail TEXT,          -- 可选，附加信息
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 创建自增函数
CREATE OR REPLACE FUNCTION increment_photo_view(photo_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE photos SET view_count = view_count + 1 WHERE id = photo_id_param;
END;
$$ LANGUAGE plpgsql;

-- 通知表
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    type TEXT NOT NULL, -- 'upload' | 'album_update' | 'invite' | 'system' 等
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 用户角色表
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    role TEXT NOT NULL DEFAULT 'user' -- 'admin' | 'user' | 'collaborator' | 'guest'
);

-- 相册协作者表
CREATE TABLE IF NOT EXISTS public.album_collaborators (
    album_id UUID REFERENCES public.albums ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users,
    permission TEXT NOT NULL DEFAULT 'edit', -- 'edit' | 'upload' | 'view'
    added_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (album_id, user_id)
=======
-- photolive 数据库结构与策略（支持 taken_at 拍摄时间字段）

-- 首先删除现有的表和策略
DROP POLICY IF EXISTS "用户只能查看自己的照片或公开照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能插入自己的照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能更新自己的照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能删除自己的照片" ON public.photos;
DROP POLICY IF EXISTS "用户只能查看自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能插入自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能更新自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能删除自己的相册" ON public.albums;
DROP POLICY IF EXISTS "用户只能查看自己相册中的照片" ON public.album_photos;
DROP POLICY IF EXISTS "用户只能添加照片到自己的相册" ON public.album_photos;
DROP POLICY IF EXISTS "用户只能从自己的相册移除照片" ON public.album_photos;

DROP TABLE IF EXISTS public.album_photos;
DROP TABLE IF EXISTS public.albums;
DROP TABLE IF EXISTS public.photos;
DROP TABLE IF EXISTS public.share_links;

-- 确保UUID扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建photos表，增加 taken_at 字段
CREATE TABLE public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT,
    description TEXT,
    image_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    taken_at TIMESTAMPTZ, -- 新增：拍摄时间，可为空
    is_public BOOLEAN DEFAULT true NOT NULL,
    tags TEXT[],
    photographer TEXT,
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0
);

-- 创建albums表
CREATE TABLE public.albums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    watermark_type TEXT DEFAULT 'none', -- 'none' | 'text' | 'image'
    watermark_text TEXT,
    watermark_image TEXT, -- 图片水印路径
    watermark_opacity FLOAT DEFAULT 0.5,
    watermark_position TEXT DEFAULT 'southeast', -- 'center' | 'northwest' | 'northeast' | 'southwest' | 'southeast'
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    cover_photo_id UUID REFERENCES public.photos
);

-- 创建album_photos关联表
CREATE TABLE public.album_photos (
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (album_id, photo_id)
);

-- 创建share_links表
CREATE TABLE public.share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    album_id UUID REFERENCES public.albums,
    photo_id UUID REFERENCES public.photos,
    access_code TEXT, -- 访问码，可为空
    expires_at TIMESTAMPTZ, -- 有效期，可为空
    permission TEXT DEFAULT 'view', -- 'view' | 'download' | 'edit'
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 创建索引提高查询性能
CREATE INDEX idx_photos_user_id ON public.photos(user_id);
CREATE INDEX idx_photos_public ON public.photos(is_public);
CREATE INDEX idx_albums_user_id ON public.albums(user_id);
CREATE INDEX idx_album_photos_album_id ON public.album_photos(album_id);
CREATE INDEX idx_album_photos_photo_id ON public.album_photos(photo_id);
CREATE INDEX idx_share_links_album_id ON public.share_links(album_id);
CREATE INDEX idx_share_links_photo_id ON public.share_links(photo_id);

-- 设置RLS策略
-- 先启用RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- photos表策略
CREATE POLICY "用户只能查看自己的照片或公开照片"
ON public.photos FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "用户只能插入自己的照片"
ON public.photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的照片"
ON public.photos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的照片"
ON public.photos FOR DELETE
USING (auth.uid() = user_id);

-- albums表策略
CREATE POLICY "用户只能查看自己的相册"
ON public.albums FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的相册"
ON public.albums FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的相册"
ON public.albums FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的相册"
ON public.albums FOR DELETE
USING (auth.uid() = user_id);

-- album_photos表策略
CREATE POLICY "用户只能查看自己相册中的照片"
ON public.album_photos FOR SELECT
USING (album_id IN (SELECT id FROM public.albums WHERE user_id = auth.uid()));

CREATE POLICY "用户只能添加照片到自己的相册"
ON public.album_photos FOR INSERT
WITH CHECK (album_id IN (SELECT id FROM public.albums WHERE user_id = auth.uid()));

CREATE POLICY "用户只能从自己的相册移除照片"
ON public.album_photos FOR DELETE
USING (album_id IN (SELECT id FROM public.albums WHERE user_id = auth.uid()));

-- share_links表策略
CREATE POLICY "用户只能查看自己的分享链接"
ON public.share_links FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户只能插入自己的分享链接"
ON public.share_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的分享链接"
ON public.share_links FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的分享链接"
ON public.share_links FOR DELETE
USING (auth.uid() = user_id);

-- 操作日志表
CREATE TABLE IF NOT EXISTS public.operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users,
    photo_id UUID REFERENCES public.photos,
    album_id UUID REFERENCES public.albums,
    action TEXT NOT NULL, -- 'view' | 'download' | 'upload' | 'delete' | 'share' 等
    detail TEXT,          -- 可选，附加信息
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 创建自增函数
CREATE OR REPLACE FUNCTION increment_photo_view(photo_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE photos SET view_count = view_count + 1 WHERE id = photo_id_param;
END;
$$ LANGUAGE plpgsql;

-- 通知表
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    type TEXT NOT NULL, -- 'upload' | 'album_update' | 'invite' | 'system' 等
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 用户角色表
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    role TEXT NOT NULL DEFAULT 'user' -- 'admin' | 'user' | 'collaborator' | 'guest'
);

-- 相册协作者表
CREATE TABLE IF NOT EXISTS public.album_collaborators (
    album_id UUID REFERENCES public.albums ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users,
    permission TEXT NOT NULL DEFAULT 'edit', -- 'edit' | 'upload' | 'view'
    added_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (album_id, user_id)
>>>>>>> e5fbdc63614b3061b16a5b3cc64c6080b9f29419
); 