import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, name, role } = await req.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'Email dan role wajib diisi' }, { status: 400 })
  }

  // This route uses the service role key below, which bypasses RLS entirely.
  // Without an explicit check here, anyone who can reach this (unauthenticated)
  // endpoint could invite themselves as 'owner'.
  const cookieStore = await cookies()
  const supabaseSession = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabaseSession.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  const { data: requesterProfile } = await supabaseSession
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (requesterProfile?.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh mengundang pengguna' }, { status: 403 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Service role key tidak dikonfigurasi' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
