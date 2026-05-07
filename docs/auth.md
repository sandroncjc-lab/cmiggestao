# Auth Standards — CMIG Gestão

## Fundamental Rule

**This app uses [Clerk](https://clerk.com) for all authentication and user management.**

Do not implement custom auth logic, session handling, JWT parsing, or password flows. All of that is handled by Clerk. If a use case seems to require custom auth code, check the Clerk docs first.

---

## Setup

Clerk is initialized via environment variables. These must be present:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

The root layout must wrap the app in `<ClerkProvider>`:

```tsx
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

---

## Protecting Routes

### Middleware (proxy.ts)

Use Clerk's `clerkMiddleware` in `proxy.ts` (not `middleware.ts` — see Next.js 16 breaking changes):

```ts
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
```

### Server Components

Use `auth()` from `@clerk/nextjs/server` to get the current user on the server. Always `await` it (async API in Next.js 16):

```tsx
import { auth } from '@clerk/nextjs/server';

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  // ...
}
```

### Client Components

Use `useAuth()` or `useUser()` hooks:

```tsx
'use client';
import { useUser } from '@clerk/nextjs';

export function ProfileButton() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return <span>{user?.firstName}</span>;
}
```

---

## UI Components

Use Clerk's pre-built components for sign-in/sign-up flows. Do not build custom auth forms.

```tsx
import { SignIn, SignUp, UserButton } from '@clerk/nextjs';
```

- `<SignIn />` — full sign-in form, place at `/sign-in/page.tsx`
- `<SignUp />` — full sign-up form, place at `/sign-up/page.tsx`
- `<UserButton />` — avatar dropdown with sign-out; place in the app header

---

## Accessing the User in Server Actions

```ts
'use server';
import { auth } from '@clerk/nextjs/server';

export async function myAction() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');
  // safe to proceed
}
```

---

## Rules Summary

| Rule | Details |
|---|---|
| Auth provider | Clerk only — no custom sessions, no NextAuth |
| Route protection | `clerkMiddleware` in `proxy.ts` |
| Server-side user | `await auth()` from `@clerk/nextjs/server` |
| Client-side user | `useAuth()` / `useUser()` hooks |
| Auth UI | Clerk's built-in components — no custom forms |
| Sign-in page | `/sign-in` with `<SignIn />` |
| Sign-up page | `/sign-up` with `<SignUp />` |
