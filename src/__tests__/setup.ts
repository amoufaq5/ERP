import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ─── Mock next/navigation ───────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// ─── Mock next/image ────────────────────────────────────────────────────────

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill, priority, ...rest } = props
    return `img`
  },
}))

// ─── Mock next-auth/react ───────────────────────────────────────────────────

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// ─── Mock localStorage ──────────────────────────────────────────────────────

const localStorageMap = new Map<string, string>()

const localStorageMock: Storage = {
  getItem: (key: string) => localStorageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localStorageMap.set(key, value)
  },
  removeItem: (key: string) => {
    localStorageMap.delete(key)
  },
  clear: () => {
    localStorageMap.clear()
  },
  get length() {
    return localStorageMap.size
  },
  key: (index: number) => {
    const keys = Array.from(localStorageMap.keys())
    return keys[index] ?? null
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// ─── Mock window.matchMedia ─────────────────────────────────────────────────

Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ─── Reset mocks between tests ──────────────────────────────────────────────

beforeEach(() => {
  localStorageMap.clear()
})
