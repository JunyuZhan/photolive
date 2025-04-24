import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { photo_id, user_id } = await req.json()
    if (!photo_id) {
      return NextResponse.json({ success: false, error: '缺少photo_id' }, { status: 400 })
    }
    // view_count +1
    const { error: updateError } = await supabase.rpc('increment_photo_view', { photo_id_param: photo_id })
    // 写日志
    await supabase.from('operation_logs').insert([
      { user_id: user_id || null, photo_id, action: 'view' }
    ])
    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
} 