import Link from 'next/link';
import { SiteHeader } from './site-header';

const needs = [
  {
    name: 'Blood',
    detail: 'Find compatible donors nearby',
    mark: 'B',
    tone: 'bg-rose-100 text-rose-700',
  },
  {
    name: 'Oxygen',
    detail: 'Connect with local support',
    mark: 'O₂',
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    name: 'Transport',
    detail: 'Get help reaching care',
    mark: '↗',
    tone: 'bg-amber-100 text-amber-800',
  },
  {
    name: 'Medicine',
    detail: 'Ask for essential supplies',
    mark: '+',
    tone: 'bg-violet-100 text-violet-700',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-12">
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-forest-950 px-6 py-12 text-white shadow-[0_28px_80px_-40px_rgba(21,41,35,0.65)] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-32 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-20 -z-10 h-[27rem] w-[27rem] rounded-full border border-white/10"
            />
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-2 text-xs font-medium tracking-wide text-mint-300">
                  <span className="h-2 w-2 rounded-full bg-[#8dcc9d] shadow-[0_0_12px_#8dcc9d]" />
                  A community-powered support network
                </div>
                <h1 className="mt-7 text-[2.7rem] leading-[1.06] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.25rem]">
                  When it matters,
                  <br />
                  <span className="text-[#c5dccb]">help is closer.</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
                  Find nearby people ready to help with blood, oxygen,
                  transport, medicine, and more. Small acts can make a real
                  difference.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5f4ef] px-5 py-3.5 text-sm font-semibold text-forest-950 shadow-sm hover:bg-white"
                    href="/requests"
                  >
                    Find nearby help
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link
                    className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
                    href="/requests/new"
                  >
                    Request support
                  </Link>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/55">
                  <span className="inline-flex items-center gap-2">
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="16"
                      viewBox="0 0 16 16"
                      width="16"
                    >
                      <path
                        d="M8 1.6 13 3.5v3.8c0 3.2-2.1 5.5-5 7.1-2.9-1.6-5-3.9-5-7.1V3.5L8 1.6Z"
                        stroke="#b9d2c0"
                        strokeWidth="1.3"
                      />
                      <path
                        d="m5.6 7.8 1.6 1.6 3.3-3.5"
                        stroke="#b9d2c0"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.3"
                      />
                    </svg>
                    Your exact location stays private
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-white/35 sm:block" />
                  Built for communities across India
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[25rem] lg:ml-auto">
                <div className="absolute -left-8 top-12 h-28 w-28 rounded-full bg-[#4d7964]/35 blur-2xl" />
                <div className="absolute -bottom-8 right-0 h-36 w-36 rounded-full bg-[#b53a35]/25 blur-3xl" />
                <div className="relative rounded-[1.75rem] border border-white/15 bg-white/[0.08] p-3 shadow-2xl backdrop-blur-sm">
                  <div className="rounded-[1.25rem] bg-[#fbfaf7] p-5 text-foreground sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                          Community care
                        </p>
                        <p className="mt-1.5 text-xl font-semibold tracking-tight text-forest-950">
                          Help, made human.
                        </p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-100 text-forest-700">
                        <svg
                          aria-hidden="true"
                          fill="none"
                          height="22"
                          viewBox="0 0 24 24"
                          width="22"
                        >
                          <path
                            d="M12 20.2s-7.7-4.6-7.7-10.3A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.7 2.2c0 5.7-7.7 10.3-7.7 10.3Z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-lg font-semibold text-rose-700">
                          B
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            Blood donor nearby
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            A neighbour is ready to help
                          </span>
                        </span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sm font-semibold text-sky-700">
                          O₂
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">
                            Oxygen support
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            Local resources, one connection away
                          </span>
                        </span>
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      </div>
                    </div>
                    <div className="mt-5 flex items-center gap-3 rounded-xl bg-mint-100 px-4 py-3">
                      <div className="flex -space-x-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-mint-100 bg-[#d5b99e] text-[10px] font-semibold text-forest-950">
                          A
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-mint-100 bg-[#b8c9ad] text-[10px] font-semibold text-forest-950">
                          R
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-mint-100 bg-[#d7b0a8] text-[10px] font-semibold text-forest-950">
                          S
                        </span>
                      </div>
                      <p className="text-xs leading-5 text-forest-900">
                        Every connection starts with someone who cares.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-white/15 bg-forest-900 px-4 py-3 shadow-xl sm:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#b53a35] text-white">
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="17"
                      viewBox="0 0 20 20"
                      width="17"
                    >
                      <path
                        d="M10 17s-6.5-3.8-6.5-8.5a3.5 3.5 0 0 1 6.5-1.9 3.5 3.5 0 0 1 6.5 1.9C16.5 13.2 10 17 10 17Z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      Here for each other
                    </span>
                    <span className="mt-0.5 block text-xs text-white/55">
                      Community is strength
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <section aria-labelledby="needs-heading" className="pt-16 sm:pt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase">
                  Find support
                </p>
                <h2
                  className="mt-2 text-2xl font-semibold tracking-tight text-forest-950 sm:text-3xl"
                  id="needs-heading"
                >
                  What do you need today?
                </h2>
              </div>
              <Link
                className="text-sm font-semibold text-forest-700 hover:text-forest-950"
                href="/requests"
              >
                Explore all requests <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {needs.map((need) => (
                <Link
                  className="group rounded-2xl border border-border bg-white p-5 shadow-[0_8px_24px_-22px_rgba(21,41,35,0.45)] hover:-translate-y-0.5 hover:border-[#c8d7cc] hover:shadow-md"
                  href="/requests"
                  key={need.name}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${need.tone}`}
                  >
                    {need.mark}
                  </span>
                  <span className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-forest-950">
                      {need.name}
                    </span>
                    <span className="text-muted transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                  <span className="mt-1.5 block text-sm text-muted">
                    {need.detail}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section
            className="mt-16 grid gap-10 rounded-[1.75rem] border border-border bg-white p-6 sm:mt-20 sm:grid-cols-[0.8fr_1.2fr] sm:p-10"
            id="how-it-works"
          >
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-brand-700 uppercase">
                Simple by design
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-forest-950 sm:text-3xl">
                Help should be easy to find.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                A thoughtful way to connect people asking for help with
                neighbours willing to give it.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                [
                  '01',
                  'Share what you need',
                  'Post a request with only the details that matter.',
                ],
                [
                  '02',
                  'Connect locally',
                  'Nearby volunteers can find a way to support you.',
                ],
                [
                  '03',
                  'Coordinate together',
                  'Message privately and follow through with care.',
                ],
              ].map(([step, title, detail]) => (
                <div key={step}>
                  <span className="text-xs font-bold tracking-[0.16em] text-brand-700">
                    {step}
                  </span>
                  <h3 className="mt-3 font-semibold text-forest-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-warning-border bg-warning-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-warning-foreground">
              <strong>In an emergency:</strong> LifeLine is a community
              connection, not an emergency service. Call 112 or 108 in India for
              urgent medical help.
            </p>
            <Link
              className="shrink-0 text-sm font-semibold text-warning-foreground underline decoration-warning-border underline-offset-4"
              href="/requests"
            >
              Browse community support
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>LifeLine · Neighbours helping neighbours.</span>
          <span>Community support, with privacy and care.</span>
        </div>
      </footer>
    </div>
  );
}
