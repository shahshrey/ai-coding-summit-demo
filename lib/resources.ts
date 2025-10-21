import fs from 'fs'
import path from 'path'
import type { ResourceIndex, ResourceMetadata, ResourceType } from '@/types/resources'

let cachedIndex: ResourceIndex | null = null

export function getResourceIndex(): ResourceIndex {
  if (cachedIndex) return cachedIndex
  
  const indexPath = path.join(process.cwd(), 'public', 'data', 'resources-index.json')
  
  if (!fs.existsSync(indexPath)) {
    throw new Error('Resource index not found. Run "npm run resources:index" to generate it.')
  }
  
  const content = fs.readFileSync(indexPath, 'utf-8')
  cachedIndex = JSON.parse(content)
  
  return cachedIndex!
}

export function getResourceBySlug(slug: string): ResourceMetadata | null {
  const index = getResourceIndex()
  return index.resources.find(r => r.slug === slug) || null
}

export function getResourcesByType(type: ResourceType): ResourceMetadata[] {
  const index = getResourceIndex()
  return index.resources.filter(r => r.type === type)
}

export function getResourcesByCategory(type: ResourceType, category: string): ResourceMetadata[] {
  const index = getResourceIndex()
  return index.resources.filter(r => r.type === type && r.category === category)
}

export function getResourceContent(filePath: string): string {
  const fullPath = path.join(process.cwd(), 'cursor-resources', filePath)
  
  const resolvedPath = path.resolve(fullPath)
  const baseDir = path.resolve(process.cwd(), 'cursor-resources')
  
  if (!resolvedPath.startsWith(baseDir)) {
    throw new Error('Invalid file path: path traversal detected')
  }
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('Resource file not found')
  }
  
  return fs.readFileSync(resolvedPath, 'utf-8')
}

export function getResourceWithContent(slug: string): (ResourceMetadata & { content: string }) | null {
  const resource = getResourceBySlug(slug)
  if (!resource) return null
  
  const content = getResourceContent(resource.filePath)
  return { ...resource, content }
}

