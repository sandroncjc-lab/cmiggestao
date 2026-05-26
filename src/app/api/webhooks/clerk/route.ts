import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { db } from '@/app/db'
import { usuarios } from '@/app/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

// Tipos mínimos dos eventos Clerk que nos interessam
interface ClerkEmailAddress {
  email_address: string
  verification?: { status: string }
}

interface ClerkUserCreatedEvent {
  type: 'user.created'
  data: {
    id: string
    first_name: string | null
    last_name: string | null
    email_addresses: ClerkEmailAddress[]
    primary_email_address_id: string
  }
}

type ClerkWebhookEvent = ClerkUserCreatedEvent | { type: string; data: unknown }

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET

  if (!secret) {
    console.error('[webhook/clerk] CLERK_WEBHOOK_SECRET não configurado')
    return new Response('Webhook secret não configurado', { status: 500 })
  }

  // Lê headers de assinatura svix
  const headersList = await headers()
  const svixId = headersList.get('svix-id')
  const svixTimestamp = headersList.get('svix-timestamp')
  const svixSignature = headersList.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Headers de assinatura ausentes', { status: 400 })
  }

  // Valida assinatura
  const payload = await req.text()
  const wh = new Webhook(secret)
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as unknown as ClerkWebhookEvent
  } catch (err) {
    console.error('[webhook/clerk] assinatura inválida:', err)
    return new Response('Assinatura inválida', { status: 400 })
  }

  // Só processa user.created
  if (event.type !== 'user.created') {
    return new Response('Evento ignorado', { status: 200 })
  }

  const userCreated = event as ClerkUserCreatedEvent
  const { id: clerkId, email_addresses, first_name, last_name } = userCreated.data

  // Pega o email principal
  const primaryEmail = email_addresses.find((addr) =>
    addr.verification?.status === 'verified'
  )?.email_address ?? email_addresses[0]?.email_address

  if (!primaryEmail) {
    console.warn('[webhook/clerk] user.created sem email:', clerkId)
    return new Response('Sem email', { status: 200 })
  }

  // Casa pelo email: linha em usuarios com clerkId = null criada quando o convite foi enviado
  const [pendente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(and(eq(usuarios.email, primaryEmail), isNull(usuarios.clerkId)))
    .limit(1)

  const nomeCompleto = [first_name, last_name].filter(Boolean).join(' ') || primaryEmail

  if (!pendente) {
    // Auto-cadastro (sem convite): cria row pendente de atribuição pelo admin
    await db.insert(usuarios).values({
      clerkId,
      email: primaryEmail,
      nome: nomeCompleto,
      funcao: 'pendente',
      // empresaId: null — preenchido pelo admin depois
    })
    console.info('[webhook/clerk] usuário pendente criado:', primaryEmail, clerkId)
    return new Response('OK', { status: 200 })
  }

  // Convite existente: preenche o clerkId e atualiza nome se necessário
  await db
    .update(usuarios)
    .set({
      clerkId,
      ...(nomeCompleto ? { nome: nomeCompleto } : {}),
      atualizadoEm: new Date(),
    })
    .where(eq(usuarios.id, pendente.id))

  console.info('[webhook/clerk] clerkId vinculado:', primaryEmail, '->', clerkId)
  return new Response('OK', { status: 200 })
}
