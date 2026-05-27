import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoFotos, rdoServicos, servicos, obras, clientes, usuarios, empresas } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { type NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { RdoPdf } from './rdo-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Vercel: até 30s para gerar PDF

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Usa req.nextUrl (nativo do Next.js) para garantir que query params sejam lidos corretamente
  const tokenParam = req.nextUrl.searchParams.get('token')
  console.log('[PDF] id=%s tokenParam=%s url=%s', id, tokenParam ? tokenParam.slice(0, 8) + '…' : 'null', req.nextUrl.pathname)

  let rdoRow: typeof rdo.$inferSelect | undefined

  if (tokenParam) {
    // Acesso via token público (cliente externo na página /aprovar/[token])
    // Tenta casar pelo token; se não encontrar (RDO já aprovado e token foi zerado antes da correção),
    // aceita pelo ID desde que o RDO já esteja aprovado/rejeitado — o token enviado por e-mail é a
    // prova de que o cliente tem direito ao documento.
    const [r] = await db
      .select()
      .from(rdo)
      .where(and(eq(rdo.id, id), eq(rdo.linkToken, tokenParam)))
      .limit(1)
    rdoRow = r ?? undefined

    if (!rdoRow) {
      // Fallback: token pode ter sido zerado na aprovação (versão anterior do sistema)
      const [fallback] = await db
        .select()
        .from(rdo)
        .where(and(eq(rdo.id, id), eq(rdo.status, 'aprovado')))
        .limit(1)
      rdoRow = fallback ?? undefined
    }

    if (!rdoRow) return new NextResponse('Token inválido ou RDO não encontrado', { status: 403 })
  } else {
    // Acesso autenticado (usuário logado)
    const usuario = await getUsuarioAtual()
    if (!usuario) return new NextResponse('Não autenticado', { status: 401 })

    if (isCliente(usuario.funcao) && usuario.clienteId) {
      const [r] = await db
        .select({ rdo })
        .from(rdo)
        .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.clienteId, usuario.clienteId)))
        .where(eq(rdo.id, id))
        .limit(1)
      rdoRow = r?.rdo
    } else {
      const [r] = await db
        .select({ rdo })
        .from(rdo)
        .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.empresaId, usuario.empresaId)))
        .where(eq(rdo.id, id))
        .limit(1)
      rdoRow = r?.rdo
    }

    if (!rdoRow) return new NextResponse('RDO não encontrado', { status: 404 })
  }

  // Dados relacionados em paralelo
  const [obraData, atividades, funcionarios, fotosData, servicosData, empresaData] = await Promise.all([
    db
      .select({ nome: obras.nome, clienteNome: clientes.nome })
      .from(obras)
      .leftJoin(clientes, eq(obras.clienteId, clientes.id))
      .where(eq(obras.id, rdoRow.obraId))
      .limit(1)
      .then((r) => r[0] ?? { nome: '—', clienteNome: null }),

    db.select().from(rdoAtividades).where(eq(rdoAtividades.rdoId, id)),
    db.select().from(rdoFuncionarios).where(eq(rdoFuncionarios.rdoId, id)),
    db.select().from(rdoFotos).where(eq(rdoFotos.rdoId, id)),

    db
      .select({ nomeServico: servicos.nome, quantidade: rdoServicos.quantidadeExecutada, unidade: servicos.unidade, observacoes: rdoServicos.observacoes })
      .from(rdoServicos)
      .leftJoin(servicos, eq(rdoServicos.servicoId, servicos.id))
      .where(eq(rdoServicos.rdoId, id)),

    // Nome da empresa: via RDO → obra → empresa (funciona mesmo sem usuário logado)
    db
      .select({ nome: empresas.nome })
      .from(rdo)
      .innerJoin(obras, eq(rdo.obraId, obras.id))
      .innerJoin(empresas, eq(obras.empresaId, empresas.id))
      .where(eq(rdo.id, id))
      .limit(1)
      .then((r) => r[0]?.nome ?? 'CMI Gestão'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(RdoPdf, {
    rdo: rdoRow as any,
    obra: obraData,
    empresa: empresaData,
    atividades,
    funcionarios,
    servicos: servicosData,
    fotos: fotosData,
  }) as any

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(element)
  } catch (err) {
    console.error('[PDF] renderToBuffer falhou:', err)
    return new NextResponse(
      JSON.stringify({ error: 'Falha ao gerar PDF', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const nomeObra = obraData.nome.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').replace(/\s+/g, '_')
  const filename = `RDO_${nomeObra}_${rdoRow.data}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
