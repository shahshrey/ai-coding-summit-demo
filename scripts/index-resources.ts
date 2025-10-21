import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { ResourceMetadata, ResourceIndex, ResourceType } from '../types/resources'

const CURSOR_RESOURCES_DIR = path.join(process.cwd(), 'cursor-resources')
const OUTPUT_PATH = path.join(process.cwd(), 'public', 'data', 'resources-index.json')

function determineResourceType(filePath: string): ResourceType {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.includes('commands/')) return 'command'
  if (normalized.includes('rules/')) return 'rule'
  if (normalized.includes('mcps/')) return 'mcp'
  if (normalized.includes('hooks/')) return 'hook'
  return 'command'
}

function extractCategory(filePath: string, type: ResourceType): string {
  const typeDir = type === 'command' ? 'commands' : type === 'rule' ? 'rules' : type === 'mcp' ? 'mcps' : 'hooks'
  const parts = filePath.split(typeDir + '/')
  if (parts.length > 1) {
    const categoryPath = parts[1].split('/')[0]
    return categoryPath
  }
  return 'general'
}

function generateSlug(type: ResourceType, category: string, fileName: string): string {
  const nameWithoutExt = path.parse(fileName).name
  return `${type}-${category}-${nameWithoutExt}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

function extractTitleFromMarkdown(content: string, fileName: string): string {
  const taskNameMatch = content.match(/<task name="([^"]+)"/)
  if (taskNameMatch) return taskNameMatch[1]
  
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1]
  
  return path.parse(fileName).name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function extractDescription(content: string, frontmatter: Record<string, any> | null): string {
  if (frontmatter?.description) return frontmatter.description
  
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('<'))
  return lines[0]?.substring(0, 200) || 'No description available'
}

function extractTags(frontmatter: Record<string, any> | null): string[] {
  if (frontmatter?.tags) {
    if (Array.isArray(frontmatter.tags)) return frontmatter.tags
    if (typeof frontmatter.tags === 'string') return frontmatter.tags.split(',').map(t => t.trim())
  }
  return []
}

function processFile(filePath: string): ResourceMetadata | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const stats = fs.statSync(filePath)
    const relativePath = path.relative(CURSOR_RESOURCES_DIR, filePath)
    const fileName = path.basename(filePath)
    const extension = path.extname(filePath)
    
    const type = determineResourceType(relativePath)
    const category = extractCategory(relativePath, type)
    const slug = generateSlug(type, category, fileName)
    
    let frontmatter: Record<string, any> | null = null
    let mainContent = content
    
    if (extension === '.md' || extension === '.mdc') {
      try {
        const parsed = matter(content)
        frontmatter = parsed.data
        mainContent = parsed.content
      } catch (e) {
        console.warn(`Failed to parse frontmatter for ${filePath}`)
      }
    }
    
    const title = extension === '.json' 
      ? (JSON.parse(content).name || fileName)
      : extractTitleFromMarkdown(mainContent, fileName)
    
    const description = extension === '.json'
      ? (JSON.parse(content).description || 'MCP tool configuration')
      : extractDescription(mainContent, frontmatter)
    
    const excerpt = mainContent.substring(0, 300).replace(/\s+/g, ' ').trim()
    const tags = extractTags(frontmatter)
    
    const searchContent = [title, description, excerpt, ...tags].join(' ')
    
    return {
      slug,
      title,
      description,
      type,
      category,
      filePath: relativePath,
      fileName,
      fileSize: stats.size,
      extension,
      excerpt,
      tags,
      frontmatter,
      searchContent,
      createdAt: stats.birthtime.toISOString()
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error)
    return null
  }
}

function scanDirectory(dir: string, resources: ResourceMetadata[] = []): ResourceMetadata[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath, resources)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (['.md', '.mdc', '.json', '.sh'].includes(ext)) {
        const resource = processFile(fullPath)
        if (resource) resources.push(resource)
      }
    }
  }
  
  return resources
}

function buildCategoriesMap(resources: ResourceMetadata[]): Record<ResourceType, string[]> {
  const categoriesMap: Record<ResourceType, string[]> = {
    command: [],
    rule: [],
    mcp: [],
    hook: []
  }
  
  for (const resource of resources) {
    if (!categoriesMap[resource.type].includes(resource.category)) {
      categoriesMap[resource.type].push(resource.category)
    }
  }
  
  for (const type of Object.keys(categoriesMap) as ResourceType[]) {
    categoriesMap[type].sort()
  }
  
  return categoriesMap
}

function main() {
  console.log('🔍 Scanning cursor-resources directory...')
  
  if (!fs.existsSync(CURSOR_RESOURCES_DIR)) {
    console.error(`❌ Directory not found: ${CURSOR_RESOURCES_DIR}`)
    process.exit(1)
  }
  
  const resources = scanDirectory(CURSOR_RESOURCES_DIR)
  
  console.log(`✅ Found ${resources.length} resources`)
  
  const slugCounts = new Map<string, number>()
  for (const resource of resources) {
    slugCounts.set(resource.slug, (slugCounts.get(resource.slug) || 0) + 1)
  }
  
  const duplicates = Array.from(slugCounts.entries()).filter(([, count]) => count > 1)
  if (duplicates.length > 0) {
    console.warn('⚠️  Duplicate slugs found:')
    for (const [slug, count] of duplicates) {
      console.warn(`  - ${slug}: ${count} occurrences`)
    }
  }
  
  const categories = buildCategoriesMap(resources)
  
  const index: ResourceIndex = {
    resources,
    categories,
    totalCount: resources.length,
    generatedAt: new Date().toISOString()
  }
  
  const outputDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2))
  
  console.log(`📝 Resource index written to: ${OUTPUT_PATH}`)
  console.log(`📊 Statistics:`)
  console.log(`  - Commands: ${resources.filter(r => r.type === 'command').length}`)
  console.log(`  - Rules: ${resources.filter(r => r.type === 'rule').length}`)
  console.log(`  - MCPs: ${resources.filter(r => r.type === 'mcp').length}`)
  console.log(`  - Hooks: ${resources.filter(r => r.type === 'hook').length}`)
  console.log('✨ Done!')
}

main()

