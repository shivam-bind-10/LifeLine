'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type Role = 'REQUESTER' | 'HELPER' | 'ORGANIZATION' | 'ADMIN';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isHelper: boolean;
  language: string;
  createdAt: string;
};

type Credentials = {
  email: string;
  password: string;
};

type Registration = Credentials & {
  name: string;
  role: 'REQUESTER' | 'HELPER';
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  sessionError: string | null;
  signIn: (credentials: Credentials) => Promise<void>;
  register: (details: Registration) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (typeof value.phone === 'string' || value.phone === null) &&
    typeof value.role === 'string' &&
    ['REQUESTER', 'HELPER', 'ORGANIZATION', 'ADMIN'].includes(value.role) &&
    typeof value.isHelper === 'boolean' &&
    typeof value.language === 'string' &&
    typeof value.createdAt === 'string'
  );
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const body: unknown = await response.json();
    if (
      isRecord(body) &&
      isRecord(body.error) &&
      typeof body.error.message === 'string'
    ) {
      return body.error.message;
    }
  } catch {
    return `${fallback} (HTTP ${response.status}).`;
  }

  return `${fallback} (HTTP ${response.status}).`;
}

async function readUserResponse(response: Response): Promise<AuthUser> {
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(await errorMessageFromBody(body, response));
  }
  if (!isRecord(body) || !isAuthUser(body.user)) {
    throw new Error('The server returned an invalid account response.');
  }
  return body.user;
}

async function errorMessageFromBody(body: unknown, response: Response) {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return `The request could not be completed (HTTP ${response.status}).`;
}

function accessTokenFromBody(body: unknown) {
  if (isRecord(body) && typeof body.accessToken === 'string') {
    return body.accessToken;
  }
  throw new Error('The server did not return a valid session.');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const accessToken = useRef<string | null>(null);
  const bootstrapStarted = useRef(false);

  const createSession = useCallback(
    async (path: 'login' | 'register', details: Credentials | Registration) => {
      const response = await fetch(`${API_URL}/auth/${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(await errorMessageFromBody(body, response));
      }
      if (!isRecord(body) || !isAuthUser(body.user)) {
        throw new Error('The server returned an invalid account response.');
      }

      accessToken.current = accessTokenFromBody(body);
      setSessionError(null);
      setUser(body.user);
    },
    [],
  );

  const signIn = useCallback(
    (credentials: Credentials) => createSession('login', credentials),
    [createSession],
  );

  const register = useCallback(
    (details: Registration) => createSession('register', details),
    [createSession],
  );

  const signOut = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Sign out failed'));
      }
    } finally {
      accessToken.current = null;
      setSessionError(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (bootstrapStarted.current) {
      return;
    }
    bootstrapStarted.current = true;

    void (async () => {
      try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshResponse.status === 401) {
          return;
        }
        if (!refreshResponse.ok) {
          throw new Error(
            await errorMessage(refreshResponse, 'Session restoration failed'),
          );
        }

        const refreshBody: unknown = await refreshResponse.json();
        accessToken.current = accessTokenFromBody(refreshBody);
        const profileResponse = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken.current}` },
        });
        setUser(await readUserResponse(profileResponse));
      } catch (bootstrapError) {
        accessToken.current = null;
        setUser(null);
        setSessionError(
          bootstrapError instanceof Error &&
            bootstrapError.message !== 'Failed to fetch'
            ? bootstrapError.message
            : 'Unable to connect to LifeLine. Check that the API is running, then try again.',
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, sessionError, signIn, register, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
