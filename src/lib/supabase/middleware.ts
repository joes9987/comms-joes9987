import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

export async function updateSession (request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll () {
          return request.cookies.getAll()
        },
        setAll (cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  if (!user && (path.startsWith('/app') || path.startsWith('/auth/update-password'))) {
    const url = request.nextUrl.clone()
    url.pathname = path.startsWith('/auth/update-password') ? '/forgot-password' : '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
