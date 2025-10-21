import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { signOut } from '@/server/actions/auth'
import { getFavorites } from '@/server/actions/favorites'
import { getResourceIndex } from '@/lib/resources'
import { FavoritesDashboard } from '@/components/features/resources/favorites-dashboard'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const favoritesResult = await getFavorites()
  const index = getResourceIndex()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline">
              Browse Resources
            </Button>
          </Link>
          <form action={signOut}>
            <Button variant="outline" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>
            You are signed in as {user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            User ID: {user?.id}
          </p>
        </CardContent>
      </Card>
      
      <Separator className="my-8" />
      
      <FavoritesDashboard 
        favorites={favoritesResult.success ? favoritesResult.favorites : []}
        resourcesIndex={index.resources}
      />
    </div>
  )
}