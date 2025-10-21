'use client'

import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import type { ResourceType } from '@/types/resources'

interface ResourceFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeType: ResourceType | 'all'
  onTypeChange: (type: ResourceType | 'all') => void
  activeCategory: string
  onCategoryChange: (category: string) => void
  categories: string[]
  sortBy: 'name' | 'downloads' | 'recent'
  onSortChange: (sort: 'name' | 'downloads' | 'recent') => void
  onClearFilters: () => void
}

export function ResourceFilters({
  searchQuery,
  onSearchChange,
  activeType,
  onTypeChange,
  activeCategory,
  onCategoryChange,
  categories,
  sortBy,
  onSortChange,
  onClearFilters
}: ResourceFiltersProps) {
  const hasActiveFilters = searchQuery || activeType !== 'all' || activeCategory || sortBy !== 'name'
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => onSearchChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeType} onValueChange={(v) => onTypeChange(v as ResourceType | 'all')}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="command">Commands</TabsTrigger>
            <TabsTrigger value="rule">Rules</TabsTrigger>
            <TabsTrigger value="mcp">MCPs</TabsTrigger>
            <TabsTrigger value="hook">Hooks</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 0 && (
            <select
              value={activeCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace(/-/g, ' ')}
                </option>
              ))}
            </select>
          )}
          
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'name' | 'downloads' | 'recent')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="name">Sort: A-Z</option>
            <option value="downloads">Sort: Downloads</option>
            <option value="recent">Sort: Recent</option>
          </select>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

