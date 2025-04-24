import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new NextResponse('缺少url参数', { status: 400 })
  }
  try {
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, width: 256 })
    return new NextResponse(svg, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' }
    })
  } catch (err: any) {
    return new NextResponse('二维码生成失败: ' + err.message, { status: 500 })
  }
} 