'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ResourceType } from '@/types/resources'

export async function toggleFavorite(slug: string, type: ResourceType) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', isFavorited: false }
    }
    
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('resource_slug', slug)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      return { success: false, error: checkError.message, isFavorited: false }
    }
    
    if (existing) {
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id)
      
      if (deleteError) {
        return { success: false, error: deleteError.message, isFavorited: true }
      }
      
      revalidatePath('/dashboard')
      return { success: true, isFavorited: false }
    } else {
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          resource_slug: slug,
          resource_type: type
        })
      
      if (insertError) {
        return { success: false, error: insertError.message, isFavorited: false }
      }
      
      revalidatePath('/dashboard')
      return { success: true, isFavorited: true }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      isFavorited: false 
    }
  }
}

export async function getFavorites() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', favorites: [] }
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      return { success: false, error: error.message, favorites: [] }
    }
    
    return { success: true, favorites: data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      favorites: [] 
    }
  }
}

export async function getFavoritesByType(type: ResourceType) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Not authenticated', favorites: [] }
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('resource_type', type)
      .order('created_at', { ascending: false })
    
    if (error) {
      return { success: false, error: error.message, favorites: [] }
    }
    
    return { success: true, favorites: data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      favorites: [] 
    }
  }
}

export async function isFavorited(slug: string) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return false
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('resource_slug', slug)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      return false
    }
    
    return !!data
  } catch {
    return false
  }
}

