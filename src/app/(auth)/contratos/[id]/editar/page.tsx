import { db } from '@/app/db'
import { contratos, clientes, obras } from '@/app/db/schema'
import { atualizarContrato } from '@/lib/actions/contratos'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { and, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresaId = await getEmpresaIdOuErro()

  // Carrega o contrato garantindo que pertence à empresa (via cliente)
  const [row] = await db
    .select({
      id: contratos.id,
      numero: contratos.numero,
      valorTotal: contratos.valorTotal,
      dataInicio: contratos.dataInicio,
      dataFim: contratos.dataFim,
      status: contratos.status,
      tipo: contratos.tipo,
      percentualExecucao: contratos.percentualExecucao,
      urlPdf: contratos.urlPdf,
      observacoes: contratos.observacoes,
      clienteId: contratos.clienteId,
      obraId: contratos.obraId,
      clienteNome: clientes.nome,
    })
    .from(contratos)
    .innerJoin(clientes, and(eq(contratos.clienteId, clientes.id), eq(clientes.empresaId, empresaId)))
    .where(eq(contratos.id, id))
    .limit(1)

  if (!row) notFound()

  const [clientesList, obrasList] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).where(eq(clientes.empresaId, empresaId)).orderBy(clientes.nome),
    db.select({ id: obras.id, nome: obras.nome }).from(obras).where(eq(obras.empresaId, empresaId)).orderBy(obras.nome),
  ])

  async function action(formData: FormData) {
    'use server'
    await atualizarContrato(id, formData)
    redirect('/contratos')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contratos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Editar Contrato</h2>
          <p className="text-muted-foreground font-mono text-sm">{row.numero}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número do Contrato *</Label>
                <Input id="numero" name="numero" required defaultValue={row.numero} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue={row.status}>
                  <option value="rascunho">Rascunho</option>
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="encerrado">Encerrado</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Contrato *</Label>
              <Select id="tipo" name="tipo" required defaultValue={row.tipo ?? 'valor_fechado'}>
                <option value="valor_fechado">Valor Fechado</option>
                <option value="homem_hora">Homem Hora (HH)</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                Contratos Homem Hora descontam horas automaticamente a cada RDO finalizado.
              </p>
            </div>

            {/* Cliente: exibido mas não editável para não quebrar o isolamento */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select id="clienteId" name="clienteId" defaultValue={row.clienteId}>
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obraId">Obra (opcional)</Label>
              <Select id="obraId" name="obraId" defaultValue={row.obraId ?? ''}>
                <option value="">Sem obra vinculada</option>
                {obrasList.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorTotal">Valor Total (R$) *</Label>
              <Input
                id="valorTotal"
                name="valorTotal"
                type="number"
                step="0.01"
                required
                defaultValue={Number(row.valorTotal)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input id="dataInicio" name="dataInicio" type="date" required defaultValue={String(row.dataInicio)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data de Fim</Label>
                <Input id="dataFim" name="dataFim" type="date" defaultValue={row.dataFim ? String(row.dataFim) : ''} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentualExecucao">% de Execução</Label>
              <Input
                id="percentualExecucao"
                name="percentualExecucao"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={Number(row.percentualExecucao ?? 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urlPdf">URL do PDF</Label>
              <Input id="urlPdf" name="urlPdf" type="url" placeholder="https://..." defaultValue={row.urlPdf ?? ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" name="observacoes" rows={3} defaultValue={row.observacoes ?? ''} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar Alterações</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/contratos">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
