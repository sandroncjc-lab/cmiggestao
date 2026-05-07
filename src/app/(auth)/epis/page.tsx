import { db } from '@/app/db'
import { epis, epiDistribuicoes, epiMovimentacoes, obras, usuarios } from '@/app/db/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { getSessionUsuario } from '@/data/session'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, Truck, HardHat, BarChart3 } from 'lucide-react'
import { CatalogoTab } from './_components/catalogo-tab'
import { DistribuicoesTab } from './_components/distribuicoes-tab'
import { PorObraTab } from './_components/por-obra-tab'
import { MovimentacoesTab } from './_components/movimentacoes-tab'

export default async function EpisPage() {
  const usuario = await getSessionUsuario()
  if (!usuario) return null

  const { empresaId } = usuario

  // ── Catálogo ──────────────────────────────────────────────────────────────
  const catalogo = await db.select().from(epis)
    .where(eq(epis.empresaId, empresaId))
    .orderBy(epis.tipo)

  const epiIds = catalogo.map(e => e.id)

  const totaisDistribuidos = epiIds.length > 0
    ? await db
        .select({
          epiId: epiDistribuicoes.epiId,
          totalDistribuido: sql<number>`cast(sum(${epiDistribuicoes.quantidade}) as int)`,
        })
        .from(epiDistribuicoes)
        .where(inArray(epiDistribuicoes.epiId, epiIds))
        .groupBy(epiDistribuicoes.epiId)
    : []

  const totaisMap = Object.fromEntries(totaisDistribuidos.map(t => [t.epiId, t.totalDistribuido]))
  const catalogoComTotais = catalogo.map(e => ({ ...e, totalDistribuido: totaisMap[e.id] ?? 0 }))

  // ── Distribuições ─────────────────────────────────────────────────────────
  const distribuicoesBruto = await db
    .select({
      id: epiDistribuicoes.id,
      quantidade: epiDistribuicoes.quantidade,
      dataDistribuicao: epiDistribuicoes.dataDistribuicao,
      observacoes: epiDistribuicoes.observacoes,
      epiTipo: epis.tipo,
      epiCa: epis.ca,
      obraId: epiDistribuicoes.obraId,
      encarregadoId: epiDistribuicoes.encarregadoId,
    })
    .from(epiDistribuicoes)
    .innerJoin(epis, eq(epiDistribuicoes.epiId, epis.id))
    .where(eq(epiDistribuicoes.empresaId, empresaId))
    .orderBy(epiDistribuicoes.dataDistribuicao)

  // ── Obras ativas (para selects) ───────────────────────────────────────────
  const obrasAtivas = await db
    .select({ id: obras.id, nome: obras.nome, status: obras.status, responsavelInternoId: obras.responsavelInternoId })
    .from(obras)
    .where(eq(obras.empresaId, empresaId))
    .orderBy(obras.nome)

  // ── Usuários da empresa (encarregados) ────────────────────────────────────
  const usuariosDaEmpresa = await db
    .select({ id: usuarios.id, nome: usuarios.nome, funcao: usuarios.funcao })
    .from(usuarios)
    .where(eq(usuarios.empresaId, empresaId))
    .orderBy(usuarios.nome)

  // Enriquecer distribuições com nome da obra e encarregado
  const obraMap = Object.fromEntries(obrasAtivas.map(o => [o.id, o.nome]))
  const usuarioMap = Object.fromEntries(usuariosDaEmpresa.map(u => [u.id, u.nome]))

  const distribuicoes = distribuicoesBruto.map(d => ({
    ...d,
    obraNome: obraMap[d.obraId] ?? 'Obra desconhecida',
    encarregadoNome: usuarioMap[d.encarregadoId] ?? 'Desconhecido',
  }))

  // ── EPIs por obra (query agregada) ────────────────────────────────────────
  const episPorObra = await db
    .select({
      obraId: epiDistribuicoes.obraId,
      epiId: epiDistribuicoes.epiId,
      epiTipo: epis.tipo,
      epiCa: epis.ca,
      totalDistribuido: sql<number>`cast(sum(${epiDistribuicoes.quantidade}) as int)`,
    })
    .from(epiDistribuicoes)
    .innerJoin(epis, eq(epiDistribuicoes.epiId, epis.id))
    .where(eq(epiDistribuicoes.empresaId, empresaId))
    .groupBy(epiDistribuicoes.obraId, epiDistribuicoes.epiId, epis.tipo, epis.ca)
    .orderBy(epiDistribuicoes.obraId)

  const obrasInfo = obrasAtivas.map(o => ({
    id: o.id,
    nome: o.nome,
    status: o.status,
    encarregadoNome: o.responsavelInternoId ? (usuarioMap[o.responsavelInternoId] ?? null) : null,
  }))

  // ── Movimentações ─────────────────────────────────────────────────────────
  const movimentacoesBruto = await db
    .select({
      id: epiMovimentacoes.id,
      tipo: epiMovimentacoes.tipo,
      quantidade: epiMovimentacoes.quantidade,
      dataMovimentacao: epiMovimentacoes.dataMovimentacao,
      notaFiscal: epiMovimentacoes.notaFiscal,
      observacoes: epiMovimentacoes.observacoes,
      distribuicaoId: epiMovimentacoes.distribuicaoId,
      epiTipo: epis.tipo,
      epiCa: epis.ca,
      obraId: epiDistribuicoes.obraId,
      criadoEm: epiMovimentacoes.criadoEm,
    })
    .from(epiMovimentacoes)
    .innerJoin(epis, eq(epiMovimentacoes.epiId, epis.id))
    .leftJoin(epiDistribuicoes, eq(epiMovimentacoes.distribuicaoId, epiDistribuicoes.id))
    .where(eq(epiMovimentacoes.empresaId, empresaId))
    .orderBy(epiMovimentacoes.dataMovimentacao)

  const movimentacoes = movimentacoesBruto.map(m => ({
    ...m,
    obraNome: m.obraId ? (obraMap[m.obraId] ?? null) : null,
  }))

  // ── Contadores para as abas ───────────────────────────────────────────────
  const semEstoque = catalogoComTotais.filter(e => e.quantidadeEstoque === 0 && e.ativo).length
  const abaixoMinimo = catalogoComTotais.filter(
    e => e.quantidadeEstoque > 0 && e.quantidadeEstoque < e.estoqueMinimo && e.ativo
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">EPIs</h2>
        <p className="text-muted-foreground">
          Controle de equipamentos de proteção individual por obra
          {semEstoque > 0 && (
            <span className="ml-2 text-red-600 font-medium">• {semEstoque} sem estoque</span>
          )}
          {abaixoMinimo > 0 && (
            <span className="ml-2 text-yellow-600 font-medium">• {abaixoMinimo} abaixo do mínimo</span>
          )}
        </p>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="catalogo" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Catálogo</span>
            <span className="sm:hidden">Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="distribuicoes" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Distribuições</span>
            <span className="sm:hidden">Distrib.</span>
          </TabsTrigger>
          <TabsTrigger value="por-obra" className="flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            <span className="hidden sm:inline">Por Obra</span>
            <span className="sm:hidden">Obras</span>
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Movimentações</span>
            <span className="sm:hidden">Movim.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          <CatalogoTab epis={catalogoComTotais} />
        </TabsContent>

        <TabsContent value="distribuicoes" className="mt-4">
          <DistribuicoesTab
            distribuicoes={distribuicoes}
            epis={catalogo.filter(e => e.ativo).map(e => ({
              id: e.id, tipo: e.tipo, ca: e.ca, quantidadeEstoque: e.quantidadeEstoque
            }))}
            obras={obrasAtivas.filter(o => o.status === 'em_andamento').map(o => ({ id: o.id, nome: o.nome }))}
            usuarios={usuariosDaEmpresa.map(u => ({ id: u.id, nome: u.nome }))}
            usuarioAtualId={usuario.id}
            usuarioAtualFuncao={usuario.funcao}
          />
        </TabsContent>

        <TabsContent value="por-obra" className="mt-4">
          <PorObraTab agrupado={episPorObra} obras={obrasInfo} />
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-4">
          <MovimentacoesTab
            movimentacoes={movimentacoes}
            epis={catalogo.filter(e => e.ativo).map(e => ({ id: e.id, tipo: e.tipo, ca: e.ca }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
