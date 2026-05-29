import { db } from '@/app/db'
import { obras, clientes, usuarios, servicos, contratos, obraResponsaveis } from '@/app/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { RdoForm } from './rdo-form'
import { getUsuarioAtual } from '@/lib/server/getUsuario'

export default async function NovoRdoPage({
  searchParams,
}: {
  searchParams: Promise<{ obraId?: string }>
}) {
  const { obraId } = await searchParams
  const usuario = await getUsuarioAtual()

  // Encarregado só vê obras que está atribuído via obraResponsaveis
  let obrasIds: string[] | null = null
  if (usuario?.funcao === 'encarregado') {
    const atribuicoes = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(and(eq(obraResponsaveis.usuarioId, usuario.id), eq(obraResponsaveis.papel, 'encarregado')))
    obrasIds = atribuicoes.map((a) => a.obraId)
  }

  const obrasList = usuario
    ? await db
        .select({
          id: obras.id,
          nome: obras.nome,
          aprovadorClienteId: obras.aprovadorClienteId,
          aprovadorNome: usuarios.nome,
          clienteNome: clientes.nome,
        })
        .from(obras)
        .leftJoin(usuarios, eq(obras.aprovadorClienteId, usuarios.id))
        .leftJoin(clientes, eq(obras.clienteId, clientes.id))
        .where(
          obrasIds !== null
            ? and(eq(obras.empresaId, usuario.empresaId), obrasIds.length > 0 ? inArray(obras.id, obrasIds) : eq(obras.id, ''))
            : eq(obras.empresaId, usuario.empresaId)
        )
        .orderBy(obras.nome)
    : []

  const obraIdsVisiveis = obrasList.map((o) => o.id)

  const [servicosList, contratosList] = obraIdsVisiveis.length > 0 && usuario
    ? await Promise.all([
        db
          .select({ id: servicos.id, nome: servicos.nome, unidade: servicos.unidade, obraId: servicos.obraId })
          .from(servicos)
          .where(inArray(servicos.obraId, obraIdsVisiveis))
          .orderBy(servicos.nome),
        db
          .select({ id: contratos.id, numero: contratos.numero, tipo: contratos.tipo, obraId: contratos.obraId })
          .from(contratos)
          .where(inArray(contratos.obraId, obraIdsVisiveis))
          .orderBy(contratos.numero),
      ])
    : [[], []]

  const servicosPorObra = servicosList.reduce<Record<string, typeof servicosList>>((acc, s) => {
    if (!acc[s.obraId]) acc[s.obraId] = []
    acc[s.obraId].push(s)
    return acc
  }, {})

  const contratosPorObra = contratosList.reduce<Record<string, typeof contratosList>>((acc, c) => {
    if (!c.obraId) return acc
    if (!acc[c.obraId]) acc[c.obraId] = []
    acc[c.obraId].push(c)
    return acc
  }, {})

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rdo"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo RDO</h2>
          <p className="text-muted-foreground">Relatório Diário de Obras</p>
        </div>
      </div>
      <RdoForm obras={obrasList} servicosPorObra={servicosPorObra} contratosPorObra={contratosPorObra} defaultObraId={obraId} />
    </div>
  )
}
