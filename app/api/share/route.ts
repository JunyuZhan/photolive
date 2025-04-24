import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, album_id, photo_id, access_code, expires_at, permission } = body
    if (!user_id || (!album_id && !photo_id)) {
      return NextResponse.json({ success: false, error: '参数缺失' }, { status: 400 })
    }
    const id = uuidv4()
    const { data, error } = await supabase.from('share_links').insert([
      {
        id,
        user_id,
        album_id: album_id || null,
        photo_id: photo_id || null,
        access_code: access_code || null,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        permission: permission || 'view',
        is_active: true
      }
    ])
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    // 构造外链URL
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/share/${id}`
    return NextResponse.json({ success: true, id, url })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // 获取当前用户所有分享链接
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ success: false, error: '缺少user_id参数' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, links: data })
}

export async function DELETE(req: NextRequest) {
  // 删除指定分享链接
  const { id, user_id } = await req.json()
  if (!id || !user_id) {
    return NextResponse.json({ success: false, error: '缺少id或user_id参数' }, { status: 400 })
  }
  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id)
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
} 