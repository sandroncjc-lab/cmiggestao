# Server Components — CMIG Gestão

## Params and Search Params Are Promises

This project runs **Next.js 15**. The `params` and `searchParams` props passed to page and layout components are **Promises** — they must be `await`ed before accessing any property.

```tsx
// ✅ Correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // use id
}

// ❌ Wrong — params is a Promise, not a plain object
export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params.id // runtime error
}
```

The same rule applies to `searchParams`:

```tsx
// ✅ Correct
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
}
```

**Never** destructure `params` or `searchParams` directly in the function signature — always `await` them inside the function body.

---

## Type Signatures

Always type `params` and `searchParams` as `Promise<...>`:

```tsx
// Single dynamic segment
{ params: Promise<{ id: string }> }

// Multiple segments
{ params: Promise<{ obraId: string; servicoId: string }> }

// With searchParams
{
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; page?: string }>
}
```

---

## Server Component Rules

1. **Always `async`** — server components that fetch data or read params must be `async` functions.
2. **No `'use client'`** — server components must not have this directive. If interactivity is needed, extract a dedicated client component.
3. **No browser APIs** — `window`, `document`, `localStorage`, etc. are not available. Move any code that uses them to a client component.
4. **Database access goes through `src/data/`** — never call Drizzle ORM directly inside a page or layout. Follow the layer architecture in `docs/data-mutations.md`.
5. **`notFound()` for missing records** — call `notFound()` from `next/navigation` when a DB lookup returns nothing.
6. **Parallel fetches with `Promise.all`** — when a page needs multiple independent queries, run them in parallel:

```tsx
const [obra, servicos] = await Promise.all([
  getObraById(id),
  getServicosByObraId(id),
])
```

---

## Passing Data to Client Components

Server components fetch data and pass it down as props. Client components must not import from `src/data/` or call DB helpers directly.

```tsx
// page.tsx — server component
import { getObraById } from '@/data/obras'
import { EditObraForm } from './edit-form' // client component

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const obra = await getObraById(id)
  if (!obra) notFound()

  return <EditObraForm obra={obra} />
}
```

```tsx
// edit-form.tsx — client component
'use client'

export function EditObraForm({ obra }: { obra: Obra }) {
  // interactivity here — no DB calls
}
```

---

## What Not to Do

| Prohibited | Correct alternative |
|---|---|
| Sync access to `params` | `await params` inside the function body |
| `params: { id: string }` type | `params: Promise<{ id: string }>` |
| Drizzle ORM calls inside a page | Delegate to `src/data/` helpers |
| `redirect()` inside a server action | Client-side redirect via `useRouter` — see `docs/data-mutations.md` |
| `'use client'` on a data-fetching page | Keep page as server component; extract client form separately |
