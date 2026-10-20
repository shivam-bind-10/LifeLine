'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/auth-provider';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function defaultNeededBy() {
  const date = new Date(Date.now() + 4 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function RequestForm() {
  const { user, isLoading, apiFetch } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [category, setCategory] = useState('BLOOD');
  const latitudeRef = useRef<HTMLInputElement>(null);
  const longitudeRef = useRef<HTMLInputElement>(null);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(
        'Location is not available in this browser. Enter coordinates instead.',
      );
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (latitudeRef.current && longitudeRef.current) {
          latitudeRef.current.value = String(position.coords.latitude);
          longitudeRef.current.value = String(position.coords.longitude);
        }
        setIsLocating(false);
      },
      () => {
        setError(
          'Could not get your location. Allow location access or enter coordinates.',
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const category = String(form.get('category'));
    const body: Record<string, string | number> = {
      category,
      urgency: String(form.get('urgency')),
      title: String(form.get('title')),
      lat: Number(form.get('lat')),
      lng: Number(form.get('lng')),
      neededBy: new Date(String(form.get('neededBy'))).toISOString(),
    };
    const details = String(form.get('details') ?? '').trim();
    const addressText = String(form.get('addressText') ?? '').trim();
    const bloodGroup = String(form.get('bloodGroup') ?? '');
    const units = String(form.get('units') ?? '');
    if (details) body.details = details;
    if (addressText) body.addressText = addressText;
    if (category === 'BLOOD') {
      body.bloodGroup = bloodGroup;
      body.units = Number(units);
    }

    try {
      const response = await apiFetch(`${API_URL}/requests`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const responseBody: unknown = await response.json();
        const message =
          typeof responseBody === 'object' &&
          responseBody !== null &&
          'error' in responseBody &&
          typeof responseBody.error === 'object' &&
          responseBody.error !== null &&
          'message' in responseBody.error &&
          typeof responseBody.error.message === 'string'
            ? responseBody.error.message
            : `Request could not be submitted (HTTP ${response.status}).`;
        throw new Error(message);
      }
      router.push('/requests/mine?created=1');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit your request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <p className="mx-auto max-w-2xl px-6 py-12 text-muted" role="status">
        Checking your session...
      </p>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">Sign in to request help</h1>
        <p className="mt-3 text-muted">
          Sign in or create a requester account before sharing an emergency
          request.
        </p>
        <Link
          className="mt-6 inline-block rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800"
          href="/auth"
        >
          Continue to sign in
        </Link>
      </section>
    );
  }

  if (user.role !== 'REQUESTER') {
    return (
      <section className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">Requester account required</h1>
        <p className="mt-3 text-muted">
          Emergency requests can currently be created by requester accounts.
        </p>
      </section>
    );
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-5 px-6 py-10"
      id="request-form"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
          Emergency request
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          What help is needed?
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Only an approximate location appears publicly. Your address and
          details are visible only to you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            htmlFor="category"
          >
            Type of help
          </label>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2.5"
            id="category"
            name="category"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="BLOOD">Blood</option>
            <option value="OXYGEN">Oxygen</option>
            <option value="AMBULANCE">Ambulance</option>
            <option value="HOSPITAL_BED">Hospital bed</option>
            <option value="MEDICINE">Medicine</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="urgency">
            Urgency
          </label>
          <select
            className="w-full rounded-md border border-border bg-background px-3 py-2.5"
            id="urgency"
            name="urgency"
          >
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="title">
          Short description
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2.5"
          id="title"
          maxLength={120}
          minLength={5}
          name="title"
          placeholder="For example, O positive blood donors needed"
          required
        />
      </div>

      {category === 'BLOOD' && (
        <fieldset className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">Blood details</legend>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="bloodGroup"
            >
              Blood group
            </label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2.5"
              id="bloodGroup"
              name="bloodGroup"
              required
            >
              <option value="">Select blood group</option>
              {[
                'O_POSITIVE',
                'A_POSITIVE',
                'B_POSITIVE',
                'AB_POSITIVE',
                'O_NEGATIVE',
                'A_NEGATIVE',
                'B_NEGATIVE',
                'AB_NEGATIVE',
              ].map((group) => (
                <option key={group} value={group}>
                  {group.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="units">
              Number of units
            </label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2.5"
              id="units"
              max={100}
              min={1}
              name="units"
              required
              type="number"
            />
          </div>
        </fieldset>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="details">
          Additional details (optional)
        </label>
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2.5"
          id="details"
          maxLength={2000}
          name="details"
          rows={4}
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium">Location</label>
          <button
            className="text-sm font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-60"
            disabled={isLocating}
            onClick={useMyLocation}
            type="button"
          >
            {isLocating ? 'Getting location...' : 'Use my current location'}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Share device location only if you choose. Coordinates in the public
          feed are rounded to about 1 km.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="latitude"
            >
              Latitude
            </label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2.5"
              id="latitude"
              ref={latitudeRef}
              max={90}
              min={-90}
              name="lat"
              required
              step="any"
              type="number"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="longitude"
            >
              Longitude
            </label>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2.5"
              id="longitude"
              ref={longitudeRef}
              max={180}
              min={-180}
              name="lng"
              required
              step="any"
              type="number"
            />
          </div>
        </div>
      </div>

      <div>
        <label
          className="mb-1.5 block text-sm font-medium"
          htmlFor="addressText"
        >
          Address for responders (optional, private)
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2.5"
          id="addressText"
          maxLength={200}
          name="addressText"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="neededBy">
          Needed by
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2.5"
          defaultValue={defaultNeededBy()}
          id="neededBy"
          name="neededBy"
          required
          type="datetime-local"
        />
      </div>

      {error && (
        <p
          className="rounded-md border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Submitting...' : 'Submit request'}
        </button>
        <Link
          className="rounded-md border border-border px-5 py-3 font-semibold hover:bg-surface"
          href="/requests"
        >
          Cancel
        </Link>
      </div>
      <p className="text-xs leading-5 text-muted">
        If this is a life-threatening emergency, call 112 or 108 immediately.
      </p>
    </form>
  );
}
