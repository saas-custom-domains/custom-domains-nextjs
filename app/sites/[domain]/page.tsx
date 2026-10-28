import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getSite } from '@/lib/sites'
import { SubscribeForm } from './subscribe-form'

export async function generateMetadata({
  params,
}: PageProps<'/sites/[domain]'>): Promise<Metadata> {
  const { domain } = await params
  const site = await getSite(domain)
  return site ? { title: site.name, description: site.bio } : {}
}

export default function SitePage({ params }: PageProps<'/sites/[domain]'>) {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Site params={params} />
      </Suspense>
    </main>
  )
}

async function Site({ params }: Pick<PageProps<'/sites/[domain]'>, 'params'>) {
  const { domain } = await params
  const site = await getSite(domain)
  if (!site) notFound()

  return (
    <div className="flex flex-col gap-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold">{site.name}</h1>
        <p className="mt-2 text-zinc-600">{site.bio}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {site.links.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              className="block rounded-lg border border-zinc-300 px-4 py-3
                hover:bg-zinc-100"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      <SubscribeForm />
      <p className="text-xs text-zinc-400">Served on {domain}</p>
    </div>
  )
}
