import { db } from '@/app/db'
import { hhContratos, hhRegistros, obras, clientes, usuarios, empresas, rdo, rdoFuncionarios } from '@/app/db/schema'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { HhPdf } from './hh-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const obraId = searchParams.get('obraId')
  if (!obraId) return new NextResponse('obraId obrigatório', { status: 400 })

  const usuario = await getUsuarioAtual()
  if (!usuario) return new NextResponse('Não autenticado', { status: 401 })

  // Valida acesso à obra
  let obraRow
  if (isCliente(usuario.funcao) && usuario.clienteId) {
    const [r] = await db
      .select({ id: obras.id, nome: obras.nome, clienteNome: clientes.nome, clienteId: obras.clienteId })
      .from(obras)
      .leftJoin(clientes, eq(obras.clienteId, clientes.id))
      .where(and(eq(obras.id, obraId), eq(obras.clienteId, usuario.clienteId)))
      .limit(1)
    obraRow = r
  } else {
    const [r] = await db
      .select({ id: obras.id, nome: obras.nome, clienteNome: clientes.nome, clienteId: obras.clienteId })
      .from(obras)
      .leftJoin(clientes, eq(obras.clienteId, clientes.id))
      .where(and(eq(obras.id, obraId), eq(obras.empresaId, usuario.empresaId)))
      .limit(1)
    obraRow = r
  }

  if (!obraRow) return new NextResponse('Obra não encontrada', { status: 404 })

  const [hhContrato] = await db
    .select({ totalHH: hhContratos.totalHH })
    .from(hhContratos)
    .where(eq(hhContratos.obraId, obraId))
    .limit(1)

  if (!hhContrato) return new NextResponse('Contrato de HH não definido para esta obra', { status: 404 })

  // Registros manuais
  const registros = await db
    .select({
      id: hhRegistros.id,
      nomeFuncionario: hhRegistros.nomeFuncionario,
      funcao: hhRegistros.funcao,
      data: hhRegistros.data,
      horasNormais: hhRegistros.horasNormais,
      horasExtras: hhRegistros.horasExtras,
    })
    .from(hhRegistros)
    .where(eq(hhRegistros.obraId, obraId))
    .orderBy(hhRegistros.data)

  // Lançamentos via RDO (fonte oficial do saldo)
  const rdosObra = await db
    .select({ id: rdo.id, data: rdo.data })
    .from(rdo)
    .where(and(eq(rdo.obraId, obraId), ne(rdo.status, 'rejeitado')))

  const rdoIds = rdosObra.map((r) => r.id)
  const rdoDataMap = Object.fromEntries(rdosObra.map((r) => [r.id, String(r.data)]))

  let lancamentosRdo: { rdoId: string; rdoData: string; nomeFuncionario: string; funcao: string | null; horas: string }[] = []
  let consumoRdo = 0

  if (rdoIds.length > 0) {
    const funcs = await db
      .select({
        rdoId: rdoFuncionarios.rdoId,
        nomeFuncionario: rdoFuncionarios.nomeFuncionario,
        funcao: rdoFuncionarios.funcao,
        horas: rdoFuncionarios.horasTrabalhadas,
      })
      .from(rdoFuncionarios)
      .where(inArray(rdoFuncionarios.rdoId, rdoIds))
      .orderBy(rdoFuncionarios.rdoId, rdoFuncionarios.nomeFuncionario)

    lancamentosRdo = funcs.map((f) => ({
      rdoId: f.rdoId,
      rdoData: rdoDataMap[f.rdoId] ?? '—',
      nomeFuncionario: f.nomeFuncionario,
      funcao: f.funcao,
      horas: String(f.horas),
    }))

    consumoRdo = funcs.reduce((sum, f) => sum + Number(f.horas), 0)
  }

  const empresaNome = await db
    .select({ nome: empresas.nome })
    .from(usuarios)
    .innerJoin(empresas, eq(usuarios.empresaId, empresas.id))
    .where(eq(usuarios.id, usuario.id))
    .limit(1)
    .then((r) => r[0]?.nome ?? 'CMI Gestão')

  const element = createElement(HhPdf, {
    obra: { nome: obraRow.nome, clienteNome: obraRow.clienteNome ?? null },
    empresa: empresaNome,
    hhContrato: { totalHH: Number(hhContrato.totalHH) },
    consumoRdo,
    registros: registros.map((r) => ({
      id: r.id,
      nomeFuncionario: r.nomeFuncionario,
      funcao: r.funcao,
      data: String(r.data),
      horasNormais: String(r.horasNormais),
      horasExtras: String(r.horasExtras),
    })),
    lancamentosRdo,
  }) as any

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(element)
  } catch (err) {
    console.error('[HH PDF] renderToBuffer falhou:', err)
    return new NextResponse(JSON.stringify({ error: 'Falha ao gerar PDF', detail: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const nomeObra = obraRow.nome.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').replace(/\s+/g, '_')
  const filename = `HH_${nomeObra}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
