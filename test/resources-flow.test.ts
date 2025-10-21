import { describe, it, expect } from 'vitest'
import { getResourceIndex, getResourceBySlug } from '@/lib/resources'
import { createSearchIndex, searchResources } from '@/lib/search'

describe('Resource Management System', () => {
  describe('Resource Indexing', () => {
    it('should load resource index successfully', () => {
      const index = getResourceIndex()
      
      expect(index).toBeDefined()
      expect(index.resources).toBeInstanceOf(Array)
      expect(index.totalCount).toBeGreaterThan(0)
      expect(index.categories).toBeDefined()
    })
    
    it('should have all resource types', () => {
      const index = getResourceIndex()
      
      expect(index.categories.command).toBeInstanceOf(Array)
      expect(index.categories.rule).toBeInstanceOf(Array)
      expect(index.categories.mcp).toBeInstanceOf(Array)
      expect(index.categories.hook).toBeInstanceOf(Array)
    })
    
    it('should have valid resource metadata', () => {
      const index = getResourceIndex()
      const resource = index.resources[0]
      
      expect(resource.slug).toBeDefined()
      expect(resource.title).toBeDefined()
      expect(resource.description).toBeDefined()
      expect(resource.type).toMatch(/^(command|rule|mcp|hook)$/)
      expect(resource.category).toBeDefined()
      expect(resource.filePath).toBeDefined()
      expect(resource.fileName).toBeDefined()
      expect(resource.fileSize).toBeGreaterThan(0)
      expect(resource.extension).toMatch(/^\.(md|mdc|json|sh)$/)
    })
  })
  
  describe('Resource Lookup', () => {
    it('should find resource by slug', () => {
      const index = getResourceIndex()
      const firstResource = index.resources[0]
      
      const found = getResourceBySlug(firstResource.slug)
      
      expect(found).toBeDefined()
      expect(found?.slug).toBe(firstResource.slug)
    })
    
    it('should return null for non-existent slug', () => {
      const found = getResourceBySlug('non-existent-slug-12345')
      
      expect(found).toBeNull()
    })
  })
  
  describe('Search Functionality', () => {
    it('should create search index', () => {
      const index = getResourceIndex()
      const fuse = createSearchIndex(index.resources)
      
      expect(fuse).toBeDefined()
    })
    
    it('should search resources by title', () => {
      const index = getResourceIndex()
      const fuse = createSearchIndex(index.resources)
      
      const results = searchResources(fuse, 'audit', {}, index.resources)
      
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => 
        r.title.toLowerCase().includes('audit') || 
        r.description.toLowerCase().includes('audit')
      )).toBe(true)
    })
    
    it('should filter by resource type', () => {
      const index = getResourceIndex()
      const fuse = createSearchIndex(index.resources)
      
      const results = searchResources(fuse, '', { type: 'command' }, index.resources)
      
      expect(results.every(r => r.type === 'command')).toBe(true)
    })
    
    it('should return empty array for non-matching search', () => {
      const index = getResourceIndex()
      const fuse = createSearchIndex(index.resources)
      
      const results = searchResources(fuse, 'xyzabc123nonexistent', {}, index.resources)
      
      expect(results.length).toBe(0)
    })
  })
  
  describe('Slug Generation', () => {
    it('should generate unique slugs', () => {
      const index = getResourceIndex()
      const slugs = index.resources.map(r => r.slug)
      const uniqueSlugs = new Set(slugs)
      
      expect(slugs.length).toBe(uniqueSlugs.size)
    })
    
    it('should follow slug format', () => {
      const index = getResourceIndex()
      
      for (const resource of index.resources.slice(0, 10)) {
        expect(resource.slug).toMatch(/^[a-z0-9-]+$/)
        expect(resource.slug.startsWith(`${resource.type}-`)).toBe(true)
      }
    })
  })
})

