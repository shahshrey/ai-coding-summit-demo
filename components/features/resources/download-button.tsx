'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ResourceMetadata } from '@/types/resources'

interface DownloadButtonProps {
  resource: ResourceMetadata
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function DownloadButton({ resource, variant = 'default', size = 'sm' }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  
  const handleDownload = async () => {
    setIsDownloading(true)
    
    try {
      const response = await fetch(`/api/resources/download/${resource.slug}`)
      
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = resource.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Downloaded ${resource.fileName}`)
    } catch (error) {
      toast.error('Failed to download file')
      console.error('Download error:', error)
    } finally {
      setIsDownloading(false)
    }
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isDownloading}
    >
      <Download className="h-4 w-4 mr-1" />
      {isDownloading ? 'Downloading...' : 'Download'}
    </Button>
  )
}

