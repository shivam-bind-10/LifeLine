export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">LifeLine</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
        Find help when every minute matters.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted">
        Connect with nearby volunteers and providers for blood, oxygen, transport, hospital beds,
        and medicine.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <a
          className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
          href="mailto:help@lifeline.local?subject=Emergency%20help"
        >
          Request Help
        </a>
        <a
          className="rounded-md border border-border px-5 py-3 font-semibold text-foreground hover:bg-surface"
          href="mailto:help@lifeline.local?subject=Become%20a%20helper"
        >
          Become a Helper
        </a>
      </div>
      <aside
        aria-label="Emergency services disclaimer"
        className="mt-12 rounded-lg border border-warning-border bg-warning-surface p-5 text-sm leading-6 text-warning-foreground"
      >
        LifeLine connects volunteers and providers. It is not a replacement for emergency services.
        In a life-threatening emergency call 112 (India) or 108 (ambulance) immediately.
      </aside>
    </main>
  );
}
