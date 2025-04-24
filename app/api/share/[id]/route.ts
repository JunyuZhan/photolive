import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(
  request: NextRequest,
  context: any
) {
  const { id } = context.params;
  const accessCode = request.nextUrl.searchParams.get('code') || ''

  // 查询分享链接
  const { data: link, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !link) {
    return NextResponse.json({ success: false, error: '分享链接不存在' }, { status: 404 })
  }
  if (!link.is_active) {
    return NextResponse.json({ success: false, error: '分享链接已失效' }, { status: 403 })
  }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: '分享链接已过期' }, { status: 403 })
  }
  if (link.access_code && link.access_code !== accessCode) {
    return NextResponse.json({ success: false, error: '访问码错误' }, { status: 401 })
  }
  // 查询资源
  if (link.album_id) {
    const { data: album, error: albumError } = await supabase
      .from('albums')
      .select('*')
      .eq('id', link.album_id)
      .single()
    if (albumError || !album) {
      return NextResponse.json({ success: false, error: '相册不存在' }, { status: 404 })
    }
    // 查询相册下所有照片
    const { data: photos } = await supabase
      .from('album_photos')
      .select('photo_id, photos(*)')
      .eq('album_id', link.album_id)
    return NextResponse.json({ success: true, type: 'album', album, photos, permission: link.permission })
  } else if (link.photo_id) {
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', link.photo_id)
      .single()
    if (photoError || !photo) {
      return NextResponse.json({ success: false, error: '照片不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: true, type: 'photo', photo, permission: link.permission })
  } else {
    return NextResponse.json({ success: false, error: '无效的分享链接' }, { status: 400 })
  }
} 