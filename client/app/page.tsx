export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">LifeLine</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
        Find help when every minute matters.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-700">
        Connect with nearby volunteers and providers for blood, oxygen, transport, hospital beds,
        and medicine.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <a
          className="rounded-md bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          href="mailto:help@lifeline.local?subject=Emergency%20help"
        >
          Request Help
        </a>
        <a
          className="rounded-md border border-slate-400 px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          href="mailto:help@lifeline.local?subject=Become%20a%20helper"
        >
          Become a Helper
        </a>
      </div>
      <aside
        aria-label="Emergency services disclaimer"
        className="mt-12 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950"
      >
        LifeLine connects volunteers and providers. It is not a replacement for emergency services.
        In a life-threatening emergency call 112 (India) or 108 (ambulance) immediately.
      </aside>
    </main>
  );
}
