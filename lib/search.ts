import Fuse from 'fuse.js'
import type { ResourceMetadata, ResourceType } from '@/types/resources'

export interface SearchFilters {
  type?: ResourceType | 'all'
  category?: string
  sortBy?: 'name' | 'downloads' | 'recent'
}

export function createSearchIndex(resources: ResourceMetadata[]) {
  return new Fuse(resources, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'searchContent', weight: 0.2 },
      { name: 'tags', weight: 0.1 }
    ],
    threshold: 0.4,
    minMatchCharLength: 2,
    shouldSort: true,
    includeScore: true
  })
}

export function searchResources(
  fuse: Fuse<ResourceMetadata>,
  query: string,
  filters: SearchFilters = {},
  allResources: ResourceMetadata[] = []
): ResourceMetadata[] {
  let results = query.trim() === '' 
    ? allResources
    : fuse.search(query).map(result => result.item)
  
  if (filters.type && filters.type !== 'all') {
    results = results.filter(r => r.type === filters.type)
  }
  
  if (filters.category) {
    results = results.filter(r => r.category === filters.category)
  }
  
  if (filters.sortBy === 'name') {
    results = results.sort((a, b) => a.title.localeCompare(b.title))
  } else if (filters.sortBy === 'recent') {
    results = results.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }
  
  return results
}

export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

