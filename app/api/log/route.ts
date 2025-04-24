import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { user_id, photo_id, album_id, action, detail } = await req.json()
    if (!user_id || !action) {
      return NextResponse.json({ success: false, error: '参数缺失' }, { status: 400 })
    }
    const { error } = await supabase.from('operation_logs').insert([
      { user_id, photo_id, album_id, action, detail }
    ])
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
} 