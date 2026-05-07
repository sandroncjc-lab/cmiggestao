import { db } from '@/app/db'
import { obras, clientes } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { EditObraForm } from './edit-form'

export default async function EditObraClientePage({
  params,
}: {
  params: Promise<{ clientesId: string }>
}) {
  const { clientesId } = await params

  const [obra] = await db
    .select({
      id: obras.id,
      nome: obras.nome,
      descricao: obras.descricao,
      status: obras.status,
      dataInicio: obras.dataInicio,
      dataFim: obras.dataFim,
      clienteNome: clientes.nome,
      clienteId: clientes.id,
    })
    .from(obras)
    .leftJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(eq(obras.id, clientesId))
    .limit(1)

  if (!obra) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/obras/${obra.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Editar Obra</h2>
          <p className="text-muted-foreground">
            Cliente:{' '}
            <Link
              href={`/clientes/${obra.clienteId}`}
              className="hover:underline"
            >
              {obra.clienteNome}
            </Link>
          </p>
        </div>
      </div>

      <EditObraForm
        obra={{
          id: obra.id,
          nome: obra.nome,
          descricao: obra.descricao,
          status: obra.status,
          dataInicio: obra.dataInicio,
          dataFim: obra.dataFim,
        }}
      />
    </div>
  )
}
