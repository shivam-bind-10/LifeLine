'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { ReviewForm, type ReviewSummary } from '../review-form';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const categories = [
  'BLOOD',
  'OXYGEN',
  'AMBULANCE',
  'HOSPITAL_BED',
  'MEDICINE',
  'OTHER',
] as const;

type HelperProfile = {
  offerings: string[];
  bloodGroup: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
  isAvailable: boolean;
  availableFrom: string | null;
  availableTo: string | null;
};

type MatchedRequest = {
  id: string;
  category: string;
  urgency: string;
  title: string;
  lat: number;
  lng: number;
  neededBy: string;
  createdAt: string;
  distanceKm: number;
};

type AcceptedRequest = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  neededBy: string;
  addressText: string | null;
  requester: { name: string; phone: string | null };
};

type CompletedRequest = {
  id: string;
  title: string;
  category: string;
  urgency: string;
  fulfilledAt: string;
  requester: { name: string };
  reviews: ReviewSummary[];
};

function isHelperProfile(value: unknown): value is HelperProfile {
  return (
    isRecord(value) &&
    Array.isArray(value.offerings) &&
    value.offerings.every((item) => typeof item === 'string') &&
    (typeof value.bloodGroup === 'string' || value.bloodGroup === null) &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    typeof value.radiusKm === 'number' &&
    Number.isFinite(value.radiusKm) &&
    typeof value.isAvailable === 'boolean' &&
    (typeof value.availableFrom === 'string' || value.availableFrom === null) &&
    (typeof value.availableTo === 'string' || value.availableTo === null)
  );
}

function isMatchedRequest(value: unknown): value is MatchedRequest {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.category === 'string' &&
    typeof value.urgency === 'string' &&
    typeof value.title === 'string' &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    typeof value.neededBy === 'string' &&
    Number.isFinite(Date.parse(value.neededBy)) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.distanceKm === 'number' &&
    Number.isFinite(value.distanceKm)
  );
}

function isAcceptedRequest(value: unknown): value is AcceptedRequest {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.category === 'string' &&
    typeof value.urgency === 'string' &&
    typeof value.neededBy === 'string' &&
    (typeof value.addressText === 'string' || value.addressText === null) &&
    isRecord(value.requester) &&
    typeof value.requester.name === 'string' &&
    (typeof value.requester.phone === 'string' ||
      value.requester.phone === null)
  );
}

function isReviewSummary(value: unknown): value is ReviewSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.rating === 'number' &&
    Number.isInteger(value.rating) &&
    value.rating >= 1 &&
    value.rating <= 5 &&
    (typeof value.comment === 'string' || value.comment === null) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

function isCompletedRequest(value: unknown): value is CompletedRequest {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.category === 'string' &&
    typeof value.urgency === 'string' &&
    typeof value.fulfilledAt === 'string' &&
    Number.isFinite(Date.parse(value.fulfilledAt)) &&
    isRecord(value.requester) &&
    typeof value.requester.name === 'string' &&
    Array.isArray(value.reviews) &&
    value.reviews.every(isReviewSummary)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(body: unknown, status: number) {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return `Request failed (HTTP ${status}).`;
}

export function HelperDashboard() {
  const { user, isLoading, apiFetch } = useAuth();
  const [profile, setProfile] = useState<HelperProfile | null>(null);
  const [offerings, setOfferings] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchedRequest[]>([]);
  const [assisting, setAssisting] = useState<AcceptedRequest[]>([]);
  const [completed, setCompleted] = useState<CompletedRequest[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadProfileAndMatches() {
    setError(null);
    setIsLoadingData(true);
    try {
      const profileResponse = await apiFetch(
        `${API_URL}/requests/helper-profile`,
      );
      const profileBody: unknown = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(getErrorMessage(profileBody, profileResponse.status));
      }
      if (!isRecord(profileBody) || !('profile' in profileBody)) {
        throw new Error('The server returned an invalid helper profile.');
      }
      const currentProfile = profileBody.profile;
      if (currentProfile !== null && !isHelperProfile(currentProfile)) {
        throw new Error('The server returned an invalid helper profile.');
      }
      if (currentProfile) {
        setProfile(currentProfile);
        setOfferings(currentProfile.offerings);
        setIsAvailable(currentProfile.isAvailable);
        setRadiusKm(currentProfile.radiusKm);
      } else {
        setProfile(null);
        setOfferings([]);
        setMatches([]);
        setAssisting([]);
        setCompleted([]);
        setIsAvailable(false);
        return;
      }

      const assistingResponse = await apiFetch(`${API_URL}/requests/assisting`);
      const assistingBody: unknown = await assistingResponse.json();
      if (!assistingResponse.ok) {
        throw new Error(
          getErrorMessage(assistingBody, assistingResponse.status),
        );
      }
      if (
        !isRecord(assistingBody) ||
        !Array.isArray(assistingBody.requests) ||
        !assistingBody.requests.every(isAcceptedRequest)
      ) {
        throw new Error(
          'The server returned an invalid accepted request list.',
        );
      }
      setAssisting(assistingBody.requests);

      const completedResponse = await apiFetch(`${API_URL}/requests/completed`);
      const completedBody: unknown = await completedResponse.json();
      if (!completedResponse.ok) {
        throw new Error(
          getErrorMessage(completedBody, completedResponse.status),
        );
      }
      if (
        !isRecord(completedBody) ||
        !Array.isArray(completedBody.requests) ||
        !completedBody.requests.every(isCompletedRequest)
      ) {
        throw new Error(
          'The server returned an invalid completed request list.',
        );
      }
      setCompleted(completedBody.requests);

      const matchesResponse = await apiFetch(`${API_URL}/requests/matches`);
      const matchesBody: unknown = await matchesResponse.json();
      if (!matchesResponse.ok) {
        throw new Error(getErrorMessage(matchesBody, matchesResponse.status));
      }
      if (
        !isRecord(matchesBody) ||
        !('requests' in matchesBody) ||
        !Array.isArray(matchesBody.requests) ||
        !matchesBody.requests.every(isMatchedRequest)
      ) {
        throw new Error('The server returned an invalid matches list.');
      }
      setMatches(matchesBody.requests);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your volunteer dashboard.',
      );
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    if (!isLoading && user?.role === 'HELPER') {
      void loadProfileAndMatches();
    }
  }, [isLoading, user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      offerings,
      ...(String(form.get('bloodGroup') ?? '')
        ? { bloodGroup: String(form.get('bloodGroup')) }
        : {}),
      lat: Number(form.get('lat')),
      lng: Number(form.get('lng')),
      radiusKm,
      isAvailable,
    };

    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const response = await apiFetch(`${API_URL}/requests/helper-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body, response.status));
      }
      if (!isRecord(body) || !isHelperProfile(body.profile)) {
        throw new Error('The server returned an invalid helper profile.');
      }
      setProfile(body.profile);
      setIsAvailable(body.profile.isAvailable);
      setRadiusKm(body.profile.radiusKm);
      setNotice('Volunteer profile saved.');
      await loadProfileAndMatches();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save your volunteer profile.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function acceptMatch(match: MatchedRequest) {
    setError(null);
    setNotice(null);
    setAcceptingId(match.id);
    try {
      const acceptResponse = await apiFetch(
        `${API_URL}/requests/${encodeURIComponent(match.id)}/accept`,
        { method: 'POST' },
      );
      const acceptBody: unknown = await acceptResponse.json();
      if (!acceptResponse.ok) {
        throw new Error(getErrorMessage(acceptBody, acceptResponse.status));
      }

      setNotice('Request accepted. The requester details are shown below.');
      await loadProfileAndMatches();
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Unable to accept this request.',
      );
    } finally {
      setAcceptingId(null);
    }
  }

  async function fulfillRequest(item: AcceptedRequest) {
    setError(null);
    setNotice(null);
    setAcceptingId(item.id);
    try {
      const response = await apiFetch(
        `${API_URL}/requests/${encodeURIComponent(item.id)}/fulfill`,
        { method: 'POST' },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(body, response.status));
      }
      setNotice(`Marked "${item.title}" fulfilled.`);
      await loadProfileAndMatches();
    } catch (fulfillError) {
      setError(
        fulfillError instanceof Error
          ? fulfillError.message
          : 'Unable to mark the request fulfilled.',
      );
    } finally {
      setAcceptingId(null);
    }
  }

  function toggleOffering(category: string) {
    setOfferings((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  if (isLoading || (user && isLoadingData && !profile)) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-12 text-muted" role="status">
        Loading volunteer dashboard...
      </p>
    );
  }
  if (!user) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold">Sign in to volunteer</h1>
        <Link className="mt-5 inline-block text-brand-700" href="/auth">
          Continue to sign in
        </Link>
      </section>
    );
  }
  if (user.role !== 'HELPER') {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold">Volunteer account required</h1>
        <p className="mt-3 text-muted">
          Create a helper account to set your availability and see nearby
          matches.
        </p>
        <Link className="mt-5 inline-block text-brand-700" href="/auth">
          Create a helper account
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
          Volunteer profile
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Set your availability
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Choose what you can help with, where you are, and how far you can
          travel. You control when you appear as available.
        </p>

        <form className="mt-6 space-y-5" onSubmit={saveProfile}>
          <fieldset className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4 sm:grid-cols-3">
            <legend className="px-1 text-sm font-semibold">
              I can help with
            </legend>
            {categories.map((category) => (
              <label className="flex items-center gap-2 text-sm" key={category}>
                <input
                  checked={offerings.includes(category)}
                  onChange={() => toggleOffering(category)}
                  type="checkbox"
                />
                {category.replaceAll('_', ' ')}
              </label>
            ))}
          </fieldset>

          {offerings.includes('BLOOD') && (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="helper-blood-group"
              >
                Your blood group
              </label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                defaultValue={profile?.bloodGroup ?? ''}
                id="helper-blood-group"
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
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="helper-lat"
              >
                Latitude
              </label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                defaultValue={profile?.lat}
                id="helper-lat"
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
                htmlFor="helper-lng"
              >
                Longitude
              </label>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2.5"
                defaultValue={profile?.lng}
                id="helper-lng"
                max={180}
                min={-180}
                name="lng"
                required
                step="any"
                type="number"
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="helper-radius"
            >
              Travel radius: {radiusKm} km
            </label>
            <input
              className="w-full accent-brand-700"
              onChange={(event) => setRadiusKm(Number(event.target.value))}
              id="helper-radius"
              max={100}
              min={1}
              name="radiusKm"
              required
              value={radiusKm}
              type="range"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border p-4">
            <input
              checked={isAvailable}
              onChange={(event) => setIsAvailable(event.target.checked)}
              name="isAvailable"
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold">
                Available to help
              </span>
              <span className="mt-1 block text-xs text-muted">
                Accepting a request pauses your availability until you turn it
                back on.
              </span>
            </span>
          </label>

          {error && (
            <p
              className="rounded-md border border-warning-border bg-warning-surface p-3 text-sm text-warning-foreground"
              role="alert"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              className="rounded-md border border-border bg-surface p-3 text-sm"
              role="status"
            >
              {notice}
            </p>
          )}
          <button
            className="rounded-md bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            disabled={isSaving || offerings.length === 0}
            type="submit"
          >
            {isSaving ? 'Saving...' : 'Save availability'}
          </button>
        </form>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">
              Nearby requests
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Matching your profile
            </h2>
          </div>
          <button
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface disabled:opacity-60"
            disabled={isLoadingData}
            onClick={() => void loadProfileAndMatches()}
            type="button"
          >
            Refresh
          </button>
        </div>
        {!profile ? (
          <p className="mt-5 rounded-lg border border-border bg-surface p-5 text-sm text-muted">
            Save your location and offerings to find requests you can help with.
          </p>
        ) : matches.length === 0 ? (
          <p className="mt-5 rounded-lg border border-border bg-surface p-5 text-sm text-muted">
            No matching open requests are nearby. Keep your profile updated and
            check again later.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {matches.map((match) => (
              <li
                className="rounded-xl border border-border p-5"
                key={match.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {match.category.replaceAll('_', ' ')}
                    </p>
                    <h3 className="mt-2 font-semibold">{match.title}</h3>
                  </div>
                  <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold">
                    {match.urgency.toLowerCase()}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">
                  {match.distanceKm} km away · Needed by{' '}
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(match.neededBy))}
                </p>
                <button
                  className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-surface disabled:opacity-60"
                  disabled={acceptingId !== null}
                  onClick={() => void acceptMatch(match)}
                  type="button"
                >
                  {acceptingId === match.id ? 'Accepting...' : 'Accept request'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {assisting.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">
              Requests you&apos;re helping with
            </h3>
            <ul className="mt-4 space-y-3">
              {assisting.map((item) => (
                <li
                  className="rounded-xl border border-brand-700 bg-surface p-5"
                  key={item.id}
                >
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="mt-2 text-sm">
                    Requester: {item.requester.name}
                    {item.requester.phone && ` · ${item.requester.phone}`}
                  </p>
                  {item.addressText && (
                    <p className="mt-1 text-sm">Address: {item.addressText}</p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    Needed by{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(item.neededBy))}
                  </p>
                  <Link
                    className="mt-4 inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-background"
                    href={`/requests/${encodeURIComponent(item.id)}/messages`}
                  >
                    Message requester
                  </Link>
                  <button
                    className="ml-3 mt-4 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-background disabled:opacity-60"
                    disabled={acceptingId !== null}
                    onClick={() => void fulfillRequest(item)}
                    type="button"
                  >
                    {acceptingId === item.id ? 'Updating...' : 'Mark fulfilled'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {completed.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Recently fulfilled</h3>
            <ul className="mt-4 space-y-3">
              {completed.map((item) => (
                <li
                  className="rounded-xl border border-border bg-surface p-5"
                  key={item.id}
                >
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="mt-2 text-sm text-muted">
                    Fulfilled{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                    }).format(new Date(item.fulfilledAt))}
                  </p>
                  <Link
                    className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800"
                    href={`/requests/${encodeURIComponent(item.id)}/messages`}
                  >
                    View conversation
                  </Link>
                  <ReviewForm
                    requestId={item.id}
                    revieweeName={item.requester.name}
                    initialReview={item.reviews[0] ?? null}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
