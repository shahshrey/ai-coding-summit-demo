'use client'

import { useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResourceCard } from './resource-card'
import type { ResourceMetadata, ResourceType } from '@/types/resources'
import type { Database } from '@/types/supabase'

type Favorite = Database['public']['Tables']['favorites']['Row']

interface FavoritesDashboardProps {
  favorites: Favorite[]
  resourcesIndex: ResourceMetadata[]
}

export function FavoritesDashboard({ favorites, resourcesIndex }: FavoritesDashboardProps) {
  const resourcesMap = useMemo(() => {
    return new Map(resourcesIndex.map(r => [r.slug, r]))
  }, [resourcesIndex])
  
  const favoritesByType = useMemo(() => {
    const groups: Record<ResourceType | 'all', ResourceMetadata[]> = {
      all: [],
      command: [],
      rule: [],
      mcp: [],
      hook: []
    }
    
    for (const favorite of favorites) {
      const resource = resourcesMap.get(favorite.resource_slug)
      if (resource) {
        groups.all.push(resource)
        groups[resource.type].push(resource)
      }
    }
    
    return groups
  }, [favorites, resourcesMap])
  
  const renderResourceGrid = (resources: ResourceMetadata[]) => {
    if (resources.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No favorites yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Browse resources and click the heart icon to add them here
          </p>
        </div>
      )
    }
    
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resources.map(resource => (
          <ResourceCard
            key={resource.slug}
            resource={resource}
            onPreview={() => console.log('Preview', resource.slug)}
            isFavorited={true}
            isAuthenticated={true}
          />
        ))}
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Favorites</h2>
        <p className="text-muted-foreground">
          {favorites.length} resource{favorites.length !== 1 ? 's' : ''} saved
        </p>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({favoritesByType.all.length})</TabsTrigger>
          <TabsTrigger value="command">Commands ({favoritesByType.command.length})</TabsTrigger>
          <TabsTrigger value="rule">Rules ({favoritesByType.rule.length})</TabsTrigger>
          <TabsTrigger value="mcp">MCPs ({favoritesByType.mcp.length})</TabsTrigger>
          <TabsTrigger value="hook">Hooks ({favoritesByType.hook.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {renderResourceGrid(favoritesByType.all)}
        </TabsContent>
        
        <TabsContent value="command" className="mt-6">
          {renderResourceGrid(favoritesByType.command)}
        </TabsContent>
        
        <TabsContent value="rule" className="mt-6">
          {renderResourceGrid(favoritesByType.rule)}
        </TabsContent>
        
        <TabsContent value="mcp" className="mt-6">
          {renderResourceGrid(favoritesByType.mcp)}
        </TabsContent>
        
        <TabsContent value="hook" className="mt-6">
          {renderResourceGrid(favoritesByType.hook)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

