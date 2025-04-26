import { NextRequest, NextResponse } from 'next/server'

// 简化的搜索API - 返回空结果数组
export async function GET(req: NextRequest) {
  try {
    // 返回空照片数组，避免错误
    return NextResponse.json({ 
      success: true, 
      photos: [] 
    })
  } catch (error: any) {
    console.error('搜索API错误:', error)
    return NextResponse.json(
      { success: false, error: error.message || '搜索出错' }, 
      { status: 500 }
    )
  }
}