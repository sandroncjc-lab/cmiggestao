# Data Mutations — CMIG Gestão

## Fundamental Rules

1. **All database writes go through `src/data/` helper functions** — never call Drizzle ORM directly from a Server Action or component.
2. **All mutations are triggered via Server Actions** defined in colocated `actions.ts` files.
3. **Server Action params must be typed TypeScript objects** — never `FormData`.
4. **Every Server Action must validate its arguments with Zod** before touching the database.

---

## Layer Architecture

```
Component / Page
      │  calls
      ▼
actions.ts          ← Server Action (validates with Zod, calls data helper)
      │  calls
      ▼
src/data/*.ts       ← data helper (wraps Drizzle ORM db call)
      │  calls
      ▼
Drizzle ORM + DB
```

No layer may skip another. A component must not import from `src/data/` directly for mutations; it must go through a Server Action.

---

## `src/data/` Helper Functions

All Drizzle ORM mutation calls (`db.insert`, `db.update`, `db.delete`) must live in `src/data/`. Group helpers by domain (e.g., `src/data/obras.ts`, `src/data/contratos.ts`).

```ts
// src/data/obras.ts
import { db } from '@/app/db';
import { obras } from '@/app/db/schema';
import { eq } from 'drizzle-orm';

export async function createObra(data: {
  nome: string;
  empresaId: string;
  status: string;
}) {
  const [obra] = await db.insert(obras).values(data).returning();
  return obra;
}

export async function updateObra(
  id: string,
  data: Partial<{ nome: string; status: string }>
) {
  const [obra] = await db.update(obras).set(data).where(eq(obras.id, id)).returning();
  return obra;
}

export async function deleteObra(id: string) {
  await db.delete(obras).where(eq(obras.id, id));
}
```

Rules for data helpers:
- One file per domain module.
- Functions are plain `async` functions — no `'use server'` directive here.
- Accept typed parameters, never raw `FormData`.
- Return the mutated record (via `.returning()`) when the caller needs it.

---

## Server Actions (`actions.ts`)

Place `actions.ts` files **colocated with the feature** that uses them:

```
src/app/obras/
  page.tsx
  actions.ts      ← mutations for this route
src/app/contratos/
  page.tsx
  actions.ts
```

Every `actions.ts` file must:

1. Start with `'use server'` at the top of the file.
2. Define a Zod schema for each action's input.
3. Parse and validate arguments through Zod before any other logic.
4. Call a `src/data/` helper — never Drizzle directly.
5. Use typed parameters — never `FormData`.

```ts
// src/app/obras/actions.ts
'use server';

import { z } from 'zod';
import { createObra, updateObra, deleteObra } from '@/data/obras';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

const createObraSchema = z.object({
  nome: z.string().min(1),
  status: z.enum(['planejamento', 'em_andamento', 'concluida', 'cancelada']),
});

export async function createObraAction(params: z.infer<typeof createObraSchema>) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error('Unauthenticated');

  const parsed = createObraSchema.safeParse(params);
  if (!parsed.success) throw new Error(parsed.error.message);

  const obra = await createObra({ ...parsed.data, empresaId: orgId });
  revalidatePath('/obras');
  return obra;
}

const updateObraSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1).optional(),
  status: z.enum(['planejamento', 'em_andamento', 'concluida', 'cancelada']).optional(),
});

export async function updateObraAction(params: z.infer<typeof updateObraSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const parsed = updateObraSchema.safeParse(params);
  if (!parsed.success) throw new Error(parsed.error.message);

  const { id, ...data } = parsed.data;
  const obra = await updateObra(id, data);
  revalidatePath('/obras');
  return obra;
}

const deleteObraSchema = z.object({
  id: z.string().uuid(),
});

export async function deleteObraAction(params: z.infer<typeof deleteObraSchema>) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const parsed = deleteObraSchema.safeParse(params);
  if (!parsed.success) throw new Error(parsed.error.message);

  await deleteObra(parsed.data.id);
  revalidatePath('/obras');
}
```

---

## Calling Actions from Components

Import and call Server Actions directly — no API routes needed.

```tsx
// src/app/obras/page.tsx (or a client component within the route)
'use client';

import { createObraAction } from './actions';

export function NovaObraForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createObraAction({
      nome: formData.get('nome') as string,
      status: 'planejamento',
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* shadcn/ui components — see docs/ui.md */}
    </form>
  );
}
```

Note: `FormData` is used only to read HTML form values in the component. The object passed to the action must be a typed plain object — never pass `FormData` itself.

---

## Rules Summary

| Rule | Details |
|---|---|
| ORM calls | Only inside `src/data/*.ts` helpers |
| Server Actions location | Colocated `actions.ts` next to the route that uses them |
| `'use server'` | Top of every `actions.ts` file |
| Action parameter type | Typed TypeScript object — never `FormData` |
| Validation | Zod `safeParse` on every action before any logic |
| Auth check | Always verify `userId` (and `orgId` when needed) via `await auth()` before mutating |
| Cache invalidation | Call `revalidatePath` (or `revalidateTag`) after successful mutations |
| Drizzle in actions | Forbidden — always delegate to `src/data/` helpers |
