import { FileCode, FileText, FileJson, Terminal } from 'lucide-react'
import type { ResourceType } from '@/types/resources'

export function getFileIcon(extension: string) {
  switch (extension) {
    case '.md':
    case '.mdc':
      return FileText
    case '.json':
      return FileJson
    case '.sh':
      return Terminal
    default:
      return FileCode
  }
}

export function getTypeIcon(type: ResourceType) {
  switch (type) {
    case 'command':
      return Terminal
    case 'rule':
      return FileText
    case 'mcp':
      return FileJson
    case 'hook':
      return FileCode
    default:
      return FileCode
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}

export function formatNumber(num: number): string {
  if (num < 1000) return num.toString()
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
  return `${(num / 1000000).toFixed(1)}M`
}

