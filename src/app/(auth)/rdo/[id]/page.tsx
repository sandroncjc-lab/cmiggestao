import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoFotos, rdoServicos, servicos, obras, clientes, empresas, usuarios } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { RdoAcoesCliente } from './rdo-acoes-cliente'
import { RdoAcoesInterno } from './rdo-acoes-interno'
import { LinkAprovacao } from './link-aprovacao'
import type { RdoPdfData } from './pdf-download-button'

// Carrega o botão PDF apenas no cliente (evita bundling server-side do react-pdf)
const PdfDownloadButton = dynamic(
  () => import('./pdf-download-button').then((m) => m.PdfDownloadButton),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled>PDF…</Button> }
)

const statusConfig: Record<string, { label: string; variant: string }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_aprovacao: { label: 'Pendente Aprovação', variant: 'warning' },
  aprovado: { label: 'Aprovado', variant: 'success' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
}

const climaLabel: Record<string, string> = {
  ensolarado: '☀️ Ensolarado',
  nublado: '⛅ Nublado',
  chuvoso: '🌧️ Chuvoso',
  tempestade: '⛈️ Tempestade',
}

async function carregarRdo(id: string, usuario: NonNullable<Awaited<ReturnType<typeof getUsuarioAtual>>>) {
  // SELECT * já traz linkToken e tokenExpiresAt (schema atualizado)
  if (isCliente(usuario.funcao) && usuario.clienteId) {
    const [row] = await db
      .select()
      .from(rdo)
      .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.clienteId, usuario.clienteId)))
      .where(eq(rdo.id, id))
      .limit(1)
    return row ? row.rdo : null
  }
  const [row] = await db
    .select()
    .from(rdo)
    .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.empresaId, usuario.empresaId)))
    .where(eq(rdo.id, id))
    .limit(1)
  return row ? row.rdo : null
}

export default async function RdoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuario = await getUsuarioAtual()
  if (!usuario) notFound()

  const rdoData = await carregarRdo(id, usuario)
  if (!rdoData) notFound()

  const [obraData] = await db
    .select({ nome: obras.nome, clienteId: obras.clienteId, aprovadorClienteId: obras.aprovadorClienteId })
    .from(obras).where(eq(obras.id, rdoData.obraId)).limit(1)

  const [atividades, funcionarios, fotos, rdoServsList, obraComCliente, nomeEmpresa] = await Promise.all([
    db.select().from(rdoAtividades).where(eq(rdoAtividades.rdoId, id)),
    db.select().from(rdoFuncionarios).where(eq(rdoFuncionarios.rdoId, id)),
    db.select().from(rdoFotos).where(eq(rdoFotos.rdoId, id)),
    db
      .select({ id: rdoServicos.id, quantidade: rdoServicos.quantidadeExecutada, obs: rdoServicos.observacoes, nomeServico: servicos.nome, unidade: servicos.unidade })
      .from(rdoServicos)
      .leftJoin(servicos, eq(rdoServicos.servicoId, servicos.id))
      .where(eq(rdoServicos.rdoId, id)),
    db
      .select({ clienteNome: clientes.nome })
      .from(obras)
      .leftJoin(clientes, eq(obras.clienteId, clientes.id))
      .where(eq(obras.id, rdoData.obraId))
      .limit(1)
      .then((r) => r[0] ?? { clienteNome: null }),
    db
      .select({ nome: empresas.nome })
      .from(usuarios)
      .innerJoin(empresas, eq(usuarios.empresaId, empresas.id))
      .where(eq(usuarios.id, usuario.id))
      .limit(1)
      .then((r) => r[0]?.nome ?? 'CMI Gestão'),
  ])

  const pdfData: RdoPdfData = {
    rdo: {
      id: rdoData.id,
      data: rdoData.data,
      clima: rdoData.clima,
      status: rdoData.status,
      motivoRejeicao: rdoData.motivoRejeicao,
      assinaturaInterna: rdoData.assinaturaInterna,
      assinaturaCliente: rdoData.assinaturaCliente,
      criadoEm: rdoData.criadoEm.toISOString(),
    },
    obra: { nome: obraData?.nome ?? '—', clienteNome: obraComCliente.clienteNome },
    empresa: nomeEmpresa,
    atividades: atividades.map((a) => ({
      descricao: a.descricao,
      horaInicio: a.horaInicio,
      horaFim: a.horaFim,
      observacoes: a.observacoes,
    })),
    funcionarios: funcionarios.map((f) => ({
      nomeFuncionario: f.nomeFuncionario,
      funcao: f.funcao,
      horasTrabalhadas: String(f.horasTrabalhadas),
    })),
    servicos: rdoServsList.map((s) => ({
      nomeServico: s.nomeServico,
      quantidade: String(s.quantidade),
      unidade: s.unidade,
      observacoes: s.obs,
    })),
    fotos: fotos.map((f) => ({ url: f.url, legenda: f.legenda })),
  }

  const clienteVendo = isCliente(usuario.funcao)
  const podeAprovar = clienteVendo && rdoData.status === 'pendente_aprovacao'
  const podeEnviar = !clienteVendo && rdoData.status === 'rascunho'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cmiggestao.vercel.app'
  const linkAprovacao = rdoData.linkToken && rdoData.status === 'pendente_aprovacao' && !clienteVendo
    ? `${appUrl}/aprovar/${rdoData.linkToken}`
    : null

  const cfg = statusConfig[rdoData.status] ?? { label: rdoData.status, variant: 'secondary' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rdo"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">RDO — {rdoData.data}</h2>
            <p className="text-muted-foreground">{obraData?.nome ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={cfg.variant as any} className="text-sm px-3 py-1">{cfg.label}</Badge>
          <PdfDownloadButton data={pdfData} />
        </div>
      </div>

      {rdoData.motivoRejeicao && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong>Motivo da rejeição:</strong> {rdoData.motivoRejeicao}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-medium">{rdoData.data}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Clima</p>
            <p className="font-medium">{climaLabel[rdoData.clima] ?? rdoData.clima}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Obra</p>
            <p className="font-medium">{obraData?.nome ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      {atividades.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Atividades</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {atividades.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <p className="font-medium">{a.descricao}</p>
                  {(a.horaInicio || a.horaFim) && (
                    <p className="text-sm text-muted-foreground">{a.horaInicio} — {a.horaFim}</p>
                  )}
                  {a.observacoes && <p className="text-sm text-muted-foreground">{a.observacoes}</p>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {funcionarios.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Funcionários</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {funcionarios.map((f) => (
                <li key={f.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{f.nomeFuncionario}</p>
                    {f.funcao && <p className="text-sm text-muted-foreground">{f.funcao}</p>}
                  </div>
                  <span className="text-sm font-medium">{Number(f.horasTrabalhadas)}h</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {rdoServsList.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Serviços Executados</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rdoServsList.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3">
                  <p className="font-medium">{s.nomeServico ?? '—'}</p>
                  <span className="text-sm text-muted-foreground">{Number(s.quantidade)} {s.unidade}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {fotos.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Fotos ({fotos.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {fotos.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="group">
                  <div className="aspect-square overflow-hidden rounded-md border border-border bg-muted">
                    <img src={f.url} alt={f.legenda ?? 'Foto RDO'} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                  {f.legenda && <p className="mt-1 text-xs text-muted-foreground truncate">{f.legenda}</p>}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rdoData.assinaturaInterna && (
        <Card>
          <CardHeader><CardTitle>Assinatura Interna</CardTitle></CardHeader>
          <CardContent>
            <img src={rdoData.assinaturaInterna} alt="Assinatura interna" className="max-h-24 border border-border rounded" />
          </CardContent>
        </Card>
      )}

      {rdoData.assinaturaCliente && (
        <Card>
          <CardHeader><CardTitle>Assinatura do Cliente</CardTitle></CardHeader>
          <CardContent>
            <img src={rdoData.assinaturaCliente} alt="Assinatura do cliente" className="max-h-24 border border-border rounded" />
          </CardContent>
        </Card>
      )}

      {linkAprovacao && <LinkAprovacao link={linkAprovacao} />}
      {podeAprovar && <RdoAcoesCliente rdoId={id} />}
      {podeEnviar && <RdoAcoesInterno rdoId={id} assinaturaAtual={rdoData.assinaturaInterna} />}
    </div>
  )
}
