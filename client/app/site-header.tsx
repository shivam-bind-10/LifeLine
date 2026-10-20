import Link from 'next/link';
import { SessionActions } from './session-actions';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3.5 sm:px-8"
      >
        <Link
          aria-label="LifeLine home"
          className="flex shrink-0 items-center gap-2.5"
          href="/"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-900 text-white shadow-sm">
            <svg
              aria-hidden="true"
              fill="none"
              height="23"
              viewBox="0 0 24 24"
              width="23"
            >
              <path
                d="M12 20.2s-7.7-4.6-7.7-10.3A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7.7 2.2c0 5.7-7.7 10.3-7.7 10.3Z"
                fill="currentColor"
              />
              <path
                d="M5.5 12h3l1.4-2.6 2.2 5.1 1.5-2.5h5"
                stroke="#b53a35"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          </span>
          <span className="leading-none">
            <span className="block text-base font-bold tracking-tight text-forest-950">
              LifeLine
            </span>
            <span className="mt-1 hidden text-[10px] font-medium tracking-[0.14em] text-muted uppercase sm:block">
              Neighbours helping neighbours
            </span>
          </span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          <Link
            className="text-sm font-medium text-muted hover:text-forest-900"
            href="/requests"
          >
            Find help
          </Link>
          <Link
            className="text-sm font-medium text-muted hover:text-forest-900"
            href="/requests/matches"
          >
            Volunteer
          </Link>
          <Link
            className="text-sm font-medium text-muted hover:text-forest-900"
            href="/#how-it-works"
          >
            How it works
          </Link>
        </div>
        <SessionActions />
      </nav>
      <nav
        aria-label="Mobile navigation"
        className="flex items-center justify-center gap-8 border-t border-border/70 px-5 py-2.5 text-xs font-medium text-muted md:hidden"
      >
        <Link className="hover:text-forest-900" href="/requests">
          Find help
        </Link>
        <Link className="hover:text-forest-900" href="/requests/matches">
          Volunteer
        </Link>
        <Link className="hover:text-forest-900" href="/#how-it-works">
          How it works
        </Link>
      </nav>
    </header>
  );
}
