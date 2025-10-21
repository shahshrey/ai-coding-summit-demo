'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Download, Loader2 } from 'lucide-react'
import { CodeBlock } from './code-block'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import matter from 'gray-matter'
import { toast } from 'sonner'
import { getTypeIcon, formatFileSize } from '@/lib/file-utils'
import type { ResourceMetadata } from '@/types/resources'

interface ResourcePreviewModalProps {
  resource: ResourceMetadata | null
  isOpen: boolean
  onClose: () => void
  onDownload?: (resource: ResourceMetadata) => void
}

export function ResourcePreviewModal({ 
  resource, 
  isOpen, 
  onClose,
  onDownload 
}: ResourcePreviewModalProps) {
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && resource) {
      setIsLoading(true)
      setError(null)
      
      fetch(`/api/resources/content/${resource.slug}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch content')
          return res.json()
        })
        .then(data => {
          setContent(data.content)
          setIsLoading(false)
        })
        .catch(err => {
          setError(err.message)
          setIsLoading(false)
        })
    } else {
      setContent('')
      setError(null)
    }
  }, [isOpen, resource])

  if (!resource) return null

  const Icon = getTypeIcon(resource.type)
  const extension = resource.filePath.split('.').pop() || ''

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(content)
    toast.success('Copied to clipboard!')
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload(resource)
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )
    }

    if (extension === 'md') {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children: React.ReactNode; [key: string]: unknown }) => {
                const match = /language-(\w+)/.exec(className || '')
                const codeContent = String(children).replace(/\n$/, '')
                
                if (!inline && match) {
                  return <CodeBlock code={codeContent} language={match[1]} />
                }
                
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )
    }

    if (extension === 'mdc') {
      const { data: frontmatter, content: markdownContent } = matter(content)
      
      return (
        <div className="space-y-6">
          {Object.keys(frontmatter).length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-2">Metadata</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(frontmatter).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-medium text-muted-foreground">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children: React.ReactNode; [key: string]: unknown }) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const codeContent = String(children).replace(/\n$/, '')
                  
                  if (!inline && match) {
                    return <CodeBlock code={codeContent} language={match[1]} />
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        </div>
      )
    }

    if (extension === 'json') {
      try {
        const formatted = JSON.stringify(JSON.parse(content), null, 2)
        return <CodeBlock code={formatted} language="json" />
      } catch {
        return <CodeBlock code={content} language="json" />
      }
    }

    if (extension === 'sh') {
      return <CodeBlock code={content} language="bash" />
    }

    return <CodeBlock code={content} />
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Icon className="h-6 w-6 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">{resource.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Preview of {resource.title} - {resource.type} resource
              </DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{resource.category}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(resource.fileSize)}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {renderContent()}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={handleCopyAll}
            disabled={isLoading || !!error}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isLoading || !!error}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

