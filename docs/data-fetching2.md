# Data Fetching

## Rule: Server Components Only

ALL data fetching in this app MUST be done via **Server Components**.

- **DO NOT** fetch data in Client Components (`"use client"`)
- **DO NOT** fetch data via Route Handlers (`/app/api/...`)
- **DO NOT** use `useEffect` + `fetch` or any client-side fetching pattern
- **DO NOT** use SWR, React Query, or similar client-side data libraries for initial data loading

If a component needs data, it must be a Server Component (or receive the data as props from a Server Component parent).

## Rule: All DB Queries via `/data` Helper Functions

Database access MUST go through helper functions in the `src/data/` directory.

- **DO NOT** write Drizzle queries inline in components or actions — always call a `src/data/` function
- **DO NOT** use raw SQL (`db.execute(sql\`...\`)`). Use Drizzle's query builder exclusively.
- One file per domain area (e.g., `src/data/users.ts`, `src/data/invoices.ts`)

```
src/
  data/
    users.ts
    invoices.ts
    ...
```

## Rule: Users Can Only Access Their Own Data — This Is Non-Negotiable

Every helper function in `src/data/` that returns user-owned data MUST scope the query to the currently authenticated user's ID.

**Always filter by `userId`:**

```ts
// CORRECT
export async function getInvoices() {
  const { userId } = await auth(); // get session server-side
  if (!userId) throw new Error("Unauthenticated");

  return db.select().from(invoices).where(eq(invoices.userId, userId));
}
```

```ts
// WRONG — never do this
export async function getInvoices() {
  return db.select().from(invoices); // returns ALL users' data
}
```

**Never accept `userId` as a parameter from the caller.** Always derive it from the server-side session. Accepting it as a param allows callers to pass arbitrary IDs and access other users' data.

```ts
// WRONG — do not accept userId as a parameter
export async function getInvoices(userId: string) { ... }
```

These rules apply without exception. A data leak caused by missing `userId` scoping is a critical security vulnerability.
