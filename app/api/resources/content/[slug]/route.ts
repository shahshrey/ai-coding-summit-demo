import { NextResponse } from 'next/server'
import { getResourceBySlug, getResourceContent } from '@/lib/resources'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 }
      )
    }

    const resource = getResourceBySlug(slug)
    
    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    const content = getResourceContent(resource.filePath)
    
    return NextResponse.json({
      resource,
      content
    })
  } catch (error) {
    console.error('Error fetching resource content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resource content' },
      { status: 500 }
    )
  }
}

