import { connection } from 'next/server'
import { Suspense } from 'react'
import { listSites } from '@/lib/domains'
import { checkDomainAction, removeDomainAction } from './actions'
import { AddDomainForm } from './add-domain-form'

export default function Dashboard() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Linkpage dashboard</h1>
      <p className="mt-1 text-zinc-600">
        Connect a custom domain to each site.
      </p>
      <Suspense fallback={<p className="mt-8 text-zinc-500">Loading…</p>}>
        <Sites />
      </Suspense>
    </main>
  )
}

async function Sites() {
  await connection()
  const sites = listSites()

  return (
    <div className="mt-8 flex flex-col gap-8">
      {sites.map((site) => (
        <section
          key={site.id}
          className="rounded-xl border border-zinc-200 p-5"
          data-testid={`site-${site.slug}`}
        >
          <h2 className="text-lg font-medium">{site.name}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {site.domains.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 text-sm"
                data-testid={`domain-${d.host}`}
              >
                <span className="font-mono">{d.host}</span>
                <StatusBadge status={d.status} httpsReady={!!d.https_ready} />
                <form action={checkDomainAction} className="ml-auto">
                  <input type="hidden" name="domainId" value={d.id} />
                  <button className="underline">Check DNS</button>
                </form>
                <form action={removeDomainAction}>
                  <input type="hidden" name="domainId" value={d.id} />
                  <button className="text-red-700 underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
          <AddDomainForm siteId={site.id} />
        </section>
      ))}
    </div>
  )
}

function StatusBadge(props: { status: string; httpsReady: boolean }) {
  const label =
    props.status === 'active'
      ? props.httpsReady
        ? 'Live'
        : 'DNS OK, waiting for HTTPS'
      : 'Waiting for DNS'
  return (
    <span
      className={
        'rounded px-2 py-0.5 ' +
        (props.status === 'active' ? 'bg-green-100' : 'bg-amber-100')
      }
    >
      {label}
    </span>
  )
}
