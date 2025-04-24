import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// 添加/修改协作者
export async function POST(req: NextRequest) {
  try {
    const { album_id, user_id, permission } = await req.json()
    if (!album_id || !user_id || !permission) {
      return NextResponse.json({ success: false, error: '参数缺失' }, { status: 400 })
    }
    // UPSERT
    const { error } = await supabase.from('album_collaborators').upsert([
      { album_id, user_id, permission }
    ])
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// 移除协作者
export async function DELETE(req: NextRequest) {
  try {
    const { album_id, user_id } = await req.json()
    if (!album_id || !user_id) {
      return NextResponse.json({ success: false, error: '参数缺失' }, { status: 400 })
    }
    const { error } = await supabase.from('album_collaborators').delete().eq('album_id', album_id).eq('user_id', user_id)
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// 获取协作者列表
export async function GET(req: NextRequest) {
  const album_id = req.nextUrl.searchParams.get('album_id')
  if (!album_id) {
    return NextResponse.json({ success: false, error: '缺少album_id' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('album_collaborators')
    .select('user_id, permission')
    .eq('album_id', album_id)
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, collaborators: data })
} 