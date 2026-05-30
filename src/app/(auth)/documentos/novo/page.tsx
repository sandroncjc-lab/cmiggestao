import { db } from '@/app/db'
import { obras, clientes, obraResponsaveis } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { redirect } from 'next/navigation'
import { criarDocumento } from '@/lib/actions/documentos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NovoDocumentoForm } from './form'

export default async function NovoDocumentoPage() {
  const usuario = await getUsuarioAtual()
  if (!usuario || isCliente(usuario.funcao)) redirect('/documentos')

  // Obras visíveis ao usuário
  let obrasList: { id: string; nome: string }[] = []
  if (usuario.funcao === 'encarregado') {
    const atribuicoes = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(and(eq(obraResponsaveis.usuarioId, usuario.id), eq(obraResponsaveis.papel, 'encarregado')))
    const obraIds = atribuicoes.map((a) => a.obraId)
    if (obraIds.length > 0) {
      obrasList = await db
        .select({ id: obras.id, nome: obras.nome })
        .from(obras)
        .where(eq(obras.empresaId, usuario.empresaId))
        .then((rows) => rows.filter((o) => obraIds.includes(o.id)))
    }
  } else {
    obrasList = await db
      .select({ id: obras.id, nome: obras.nome })
      .from(obras)
      .where(eq(obras.empresaId, usuario.empresaId))
      .orderBy(obras.nome)
  }

  const clientesList = (usuario.funcao === 'admin' || usuario.funcao === 'engenheiro')
    ? await db
        .select({ id: clientes.id, nome: clientes.nome })
        .from(clientes)
        .where(eq(clientes.empresaId, usuario.empresaId))
        .orderBy(clientes.nome)
    : []

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documentos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Documento</h2>
          <p className="text-muted-foreground">Adicione um link de documento externo</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <NovoDocumentoForm obrasList={obrasList} clientesList={clientesList} />
        </CardContent>
      </Card>
    </div>
  )
}
