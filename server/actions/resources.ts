'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

export async function incrementDownload(slug: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.rpc('increment_download_count', {
      resource_slug_param: slug
    })
    
    if (error) {
      console.error('Failed to increment download count:', error)
    }
  } catch (err) {
    console.error('Failed to increment download count:', err)
  }
}

export async function getDownloadCount(slug: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('resources')
      .select('download_count')
      .eq('slug', slug)
      .single()
    
    if (error || !data) {
      return 0
    }
    
    return data.download_count
  } catch {
    return 0
  }
}

export const getPopularResources = unstable_cache(
  async (limit: number = 10) => {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase.rpc('get_popular_resources', {
        limit_count: limit
      })
      
      if (error || !data) {
        return []
      }
      
      return data
    } catch {
      return []
    }
  },
  ['popular-resources'],
  {
    revalidate: 3600
  }
)

