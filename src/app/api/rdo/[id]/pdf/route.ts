import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoFotos, rdoServicos, servicos, obras, clientes, usuarios, empresas } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { RdoPdf } from './rdo-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Vercel: até 30s para gerar PDF

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuario = await getUsuarioAtual()
  if (!usuario) return new NextResponse('Não autenticado', { status: 401 })

  // Carrega o RDO com isolamento multi-tenant
  let rdoRow
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

    db
      .select({ nome: empresas.nome })
      .from(usuarios)
      .innerJoin(empresas, eq(usuarios.empresaId, empresas.id))
      .where(eq(usuarios.id, usuario.id))
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

  // Gera o PDF — externalizado via serverExternalPackages para evitar bundling
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

  // Nome do arquivo seguro para download
  const nomeObra = obraData.nome.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').replace(/\s+/g, '_')
  const filename = `RDO_${nomeObra}_${rdoRow.data}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      // RFC 5987: suporta caracteres UTF-8 no nome do arquivo
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
