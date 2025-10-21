import { Badge } from "@/components/ui/badge"
import { Terminal, FileText, FileJson, Code2 } from "lucide-react"
import { getResourceIndex } from '@/lib/resources'
import { ResourceBrowser } from '@/components/features/resources/resource-browser'
import { createClient } from '@/lib/supabase/server'
import { getFavorites } from '@/server/actions/favorites'

export default async function Home() {
  const index = getResourceIndex()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let favoriteSlugs: string[] = []
  if (user) {
    const result = await getFavorites()
    if (result.success) {
      favoriteSlugs = result.favorites.map(f => f.resource_slug)
    }
  }
  
  const stats = {
    commands: index.resources.filter(r => r.type === 'command').length,
    rules: index.resources.filter(r => r.type === 'rule').length,
    mcps: index.resources.filter(r => r.type === 'mcp').length,
    hooks: index.resources.filter(r => r.type === 'hook').length
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <section className="border-b bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="px-4 py-1.5">
              {index.totalCount} Cursor Resources Available
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Discover Cursor
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {" "}Resources
            </span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Browse, search, and download commands, rules, MCP tools, and shell scripts 
            to supercharge your Cursor workflow.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <Terminal className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{stats.commands} Commands</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <FileText className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">{stats.rules} Rules</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <FileJson className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{stats.mcps} MCPs</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <Code2 className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">{stats.hooks} Hooks</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <ResourceBrowser 
          initialResources={index.resources}
          categories={index.categories}
          favoriteSlugs={favoriteSlugs}
          isAuthenticated={!!user}
        />
      </section>
    </div>
  )
}
