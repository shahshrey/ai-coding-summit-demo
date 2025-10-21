'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResourceCard } from './resource-card'
import { ResourceFilters } from './resource-filters'
import { ResourceGridSkeleton } from './resource-card-skeleton'
import { ResourcePreviewModal } from './resource-preview-modal'
import { createSearchIndex, searchResources, debounce } from '@/lib/search'
import type { ResourceMetadata, ResourceType, ResourceIndex } from '@/types/resources'

interface ResourceBrowserProps {
  initialResources: ResourceMetadata[]
  categories: ResourceIndex['categories']
  favoriteSlugs?: string[]
  isAuthenticated?: boolean
}

export function ResourceBrowser({ 
  initialResources, 
  categories,
  favoriteSlugs = [],
  isAuthenticated = false
}: ResourceBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeType, setActiveType] = useState<ResourceType | 'all'>('all')
  const [activeCategory, setActiveCategory] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'recent'>('name')
  const [isSearching, setIsSearching] = useState(false)
  const [previewResource, setPreviewResource] = useState<ResourceMetadata | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  
  const fuse = useMemo(() => createSearchIndex(initialResources), [initialResources])
  
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setDebouncedQuery(query)
      setIsSearching(false)
    }, 300),
    []
  )
  
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setIsSearching(true)
    debouncedSearch(query)
  }, [debouncedSearch])
  
  const availableCategories = useMemo(() => {
    if (activeType === 'all') {
      return Object.values(categories).flat().filter((v, i, a) => a.indexOf(v) === i).sort()
    }
    return categories[activeType] || []
  }, [activeType, categories])
  
  const filteredResources = useMemo(() => {
    return searchResources(
      fuse,
      debouncedQuery,
      {
        type: activeType,
        category: activeCategory,
        sortBy
      },
      initialResources
    )
  }, [fuse, debouncedQuery, activeType, activeCategory, sortBy, initialResources])
  
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
    setActiveType('all')
    setActiveCategory('')
    setSortBy('name')
  }, [])
  
  const handleTypeChange = useCallback((type: ResourceType | 'all') => {
    setActiveType(type)
    setActiveCategory('')
  }, [])

  const handlePreview = useCallback((resource: ResourceMetadata) => {
    setPreviewResource(resource)
    setIsPreviewOpen(true)
  }, [])

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false)
  }, [])

  const handleDownloadFromPreview = useCallback((resource: ResourceMetadata) => {
    const link = document.createElement('a')
    link.href = `/api/resources/download/${resource.slug}`
    link.download = resource.filePath.split('/').pop() || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])
  
  return (
    <div className="space-y-8">
      <ResourceFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeType={activeType}
        onTypeChange={handleTypeChange}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        categories={availableCategories}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onClearFilters={handleClearFilters}
      />
      
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {isSearching ? (
          <ResourceGridSkeleton count={8} />
        ) : filteredResources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResources.map(resource => (
              <ResourceCard
                key={resource.slug}
                resource={resource}
                onPreview={() => handlePreview(resource)}
                isFavorited={favoriteSlugs.includes(resource.slug)}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}
      </div>

      <ResourcePreviewModal
        resource={previewResource}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onDownload={handleDownloadFromPreview}
      />
    </div>
  )
}

