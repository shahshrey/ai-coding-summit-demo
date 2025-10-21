'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { toggleFavorite } from '@/server/actions/favorites'
import type { ResourceType } from '@/types/resources'

interface FavoriteButtonProps {
  resourceSlug: string
  resourceType: ResourceType
  initialIsFavorited: boolean
  isAuthenticated: boolean
}

export function FavoriteButton({ 
  resourceSlug, 
  resourceType, 
  initialIsFavorited,
  isAuthenticated
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to favorite resources')
      return
    }
    
    setIsLoading(true)
    
    const optimisticValue = !isFavorited
    setIsFavorited(optimisticValue)
    
    const result = await toggleFavorite(resourceSlug, resourceType)
    
    if (result.success) {
      setIsFavorited(result.isFavorited)
      toast.success(result.isFavorited ? 'Added to favorites' : 'Removed from favorites')
    } else {
      setIsFavorited(!optimisticValue)
      toast.error(result.error || 'Failed to update favorite')
    }
    
    setIsLoading(false)
  }
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isLoading}
      className="h-8 w-8"
      title={isAuthenticated ? (isFavorited ? 'Remove from favorites' : 'Add to favorites') : 'Sign in to favorite'}
    >
      <Heart 
        className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} 
      />
    </Button>
  )
}

