import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ui } from '@/lib/ui'

export default async function StaffReportsPage () {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!me?.is_admin) redirect('/app')

  const { data: reports } = await supabase
    .from('reports')
    .select('id, reporter_id, target_kind, target_id, reason, detail, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link href="/app/staff" className={ui.linkAccent}>Staff</Link>
      <h1 className={ui.pageTitle}>Reports</h1>
      <p className={ui.pageSubtitle}>Open queue from the social graph. Resolve in Supabase or a later admin pass.</p>
      <div className="space-y-2">
        {(reports ?? []).map((report) => (
          <article key={report.id} className={ui.cardSm}>
            <p className="text-sm font-semibold">{report.reason} · {report.target_kind}</p>
            <p className="text-xs text-[var(--muted)]">{report.status} · {new Date(report.created_at).toLocaleString()}</p>
            {report.detail && <p className="mt-2 text-sm">{report.detail}</p>}
            <p className="mt-1 font-mono text-xs text-[var(--muted)]">{report.target_id}</p>
          </article>
        ))}
        {(reports ?? []).length === 0 && <p className={ui.pageSubtitle}>No reports yet.</p>}
      </div>
    </div>
  )
}
