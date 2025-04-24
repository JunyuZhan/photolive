import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const uploadsDir = path.join(process.cwd(), 'uploads')

export async function POST(req: NextRequest) {
  try {
    const { photo_ids } = await req.json()
    if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
      return new Response(JSON.stringify({ success: false, error: '参数错误' }), { status: 400 })
    }
    // 查询图片路径
    const { data, error } = await supabase
      .from('photos')
      .select('id, image_path')
      .in('id', photo_ids)
    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 })
    }
    // 创建zip流
    const archive = archiver('zip', { zlib: { level: 9 } })
    const passThrough = new Readable().wrap(archive)
    // 添加文件
    for (const photo of data) {
      const filePath = path.join(uploadsDir, photo.image_path)
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: path.basename(filePath) })
      }
    }
    archive.finalize()
    // 返回zip流
    return new Response(passThrough, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="photos.zip"'
      }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 })
  }
} 