-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 删除表
DROP TABLE IF EXISTS public.album_photos;
DROP TABLE IF EXISTS public.albums;
DROP TABLE IF EXISTS public.photos;

-- 创建photos表
CREATE TABLE public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT,
    description TEXT,
    image_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    taken_at TIMESTAMPTZ,
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
    is_public BOOLEAN DEFAULT true NOT NULL
);

-- 创建album_photos表
CREATE TABLE public.album_photos (
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (album_id, photo_id)
);

-- 启用RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;

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