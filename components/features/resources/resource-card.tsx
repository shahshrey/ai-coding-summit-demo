'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { getTypeIcon, formatFileSize } from '@/lib/file-utils'
import { FavoriteButton } from './favorite-button'
import { DownloadButton } from './download-button'
import type { ResourceMetadata } from '@/types/resources'

interface ResourceCardProps {
  resource: ResourceMetadata
  onPreview?: () => void
  isFavorited?: boolean
  isAuthenticated?: boolean
}

export function ResourceCard({ 
  resource, 
  onPreview,
  isFavorited = false,
  isAuthenticated = false
}: ResourceCardProps) {
  const Icon = getTypeIcon(resource.type)
  
  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-2">
                {resource.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className="text-xs">
                  {resource.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(resource.fileSize)}
                </span>
              </div>
            </div>
          </div>
          <FavoriteButton
            resourceSlug={resource.slug}
            resourceType={resource.type}
            initialIsFavorited={isFavorited}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {resource.description}
        </p>
        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {resource.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {resource.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{resource.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
        <DownloadButton resource={resource} size="sm" />
      </CardFooter>
    </Card>
  )
}

