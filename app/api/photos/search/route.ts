import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const tags = searchParams.getAll('tags')
  const photographer = searchParams.get('photographer')
  const taken_from = searchParams.get('taken_from')
  const taken_to = searchParams.get('taken_to')
  const created_from = searchParams.get('created_from')
  const created_to = searchParams.get('created_to')
  const keyword = searchParams.get('keyword')

  let query = supabase.from('photos').select('*')

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags)
  }
  if (photographer) {
    query = query.ilike('photographer', `%${photographer}%`)
  }
  if (taken_from) {
    query = query.gte('taken_at', taken_from)
  }
  if (taken_to) {
    query = query.lte('taken_at', taken_to)
  }
  if (created_from) {
    query = query.gte('created_at', created_from)
  }
  if (created_to) {
    query = query.lte('created_at', created_to)
  }
  if (keyword) {
    query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, photos: data })
} 