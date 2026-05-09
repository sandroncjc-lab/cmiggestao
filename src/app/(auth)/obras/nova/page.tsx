import { db } from '@/app/db'
import { clientes } from '@/app/db/schema'
import { getSessionUsuario } from '@/data/session'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { NovaObraForm } from './form'

export default async function NovaObraPage() {
  const usuario = await getSessionUsuario()
  if (!usuario) return null

  const clientesList = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.empresaId, usuario.empresaId))
    .orderBy(clientes.nome)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/obras"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Nova Obra</h2>
          <p className="text-muted-foreground">Preencha os dados para criar uma nova obra</p>
        </div>
      </div>

      <NovaObraForm clientes={clientesList} />
    </div>
  )
}
