import { db } from '@/app/db'
import { clientes, usuarios } from '@/app/db/schema'
import { getUsuarioAtual } from '@/lib/server/getUsuario'
import { eq, inArray } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ObraForm } from './ObraForm'

export default async function NovaObraPage() {
  const usuario = await getUsuarioAtual()

  if (!usuario) {
    return (
      <div className="max-w-2xl">
        <p className="text-destructive">Você não está vinculado a uma empresa. Contate o administrador.</p>
      </div>
    )
  }

  const [clientesList, aprovadoresList, responsaveisList] = await Promise.all([
    db
      .select({ id: clientes.id, nome: clientes.nome })
      .from(clientes)
      .where(eq(clientes.empresaId, usuario.empresaId))
      .orderBy(clientes.nome),
    db
      .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, clienteId: usuarios.clienteId })
      .from(usuarios)
      .where(eq(usuarios.funcao, 'aprovador_cliente')),
    db
      .select({ id: usuarios.id, nome: usuarios.nome })
      .from(usuarios)
      .where(inArray(usuarios.funcao, ['admin', 'engenheiro', 'encarregado']))
      .orderBy(usuarios.nome),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/obras"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Nova Obra</h2>
          <p className="text-muted-foreground">Preencha os dados da obra</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ObraForm
            clientes={clientesList}
            aprovadores={aprovadoresList}
            responsaveis={responsaveisList}
          />
        </CardContent>
      </Card>
    </div>
  )
}
