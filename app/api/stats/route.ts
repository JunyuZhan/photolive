import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const user_id = searchParams.get('user_id')
  const album_id = searchParams.get('album_id')
  const photo_id = searchParams.get('photo_id')
  const action = searchParams.get('action')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase.from('operation_logs').select('*', { count: 'exact' })
  if (user_id) query = query.eq('user_id', user_id)
  if (album_id) query = query.eq('album_id', album_id)
  if (photo_id) query = query.eq('photo_id', photo_id)
  if (action) query = query.eq('action', action)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, count, logs: data })
} 