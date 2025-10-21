import { NextRequest, NextResponse } from 'next/server'
import { getResourceBySlug, getResourceContent } from '@/lib/resources'
import { incrementDownload } from '@/server/actions/resources'

const ALLOWED_EXTENSIONS = ['.md', '.mdc', '.json', '.sh']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    if (!/^[a-z0-9-]+$/.test(slug)) {
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
    
    if (!ALLOWED_EXTENSIONS.includes(resource.extension)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 403 }
      )
    }
    
    const content = getResourceContent(resource.filePath)
    
    incrementDownload(slug)
    
    const headers = new Headers()
    headers.set('Content-Type', 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${resource.fileName}"`)
    headers.set('Content-Length', Buffer.byteLength(content).toString())
    
    return new NextResponse(content, { headers })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

