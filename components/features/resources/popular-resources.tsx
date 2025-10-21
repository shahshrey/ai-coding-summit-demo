import { getPopularResources } from '@/server/actions/resources'
import { getResourceBySlug } from '@/lib/resources'
import { ResourceCard } from './resource-card'
import { Suspense } from 'react'
import { ResourceGridSkeleton } from './resource-card-skeleton'

async function PopularResourcesContent() {
  const popular = await getPopularResources(8)
  
  if (popular.length === 0) {
    return null
  }
  
  const resources = popular
    .map(p => getResourceBySlug(p.slug))
    .filter((r): r is NonNullable<typeof r> => r !== null)
  
  if (resources.length === 0) {
    return null
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Popular Resources</h2>
        <p className="text-muted-foreground">Most downloaded by the community</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {resources.map(resource => (
          <ResourceCard
            key={resource.slug}
            resource={resource}
            onPreview={() => console.log('Preview', resource.slug)}
            isAuthenticated={false}
          />
        ))}
      </div>
    </div>
  )
}

export function PopularResources() {
  return (
    <Suspense fallback={<ResourceGridSkeleton count={8} />}>
      <PopularResourcesContent />
    </Suspense>
  )
}

