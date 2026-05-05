import { db } from '@/app/db'
import { clientes, obras } from '@/app/db/schema'
import { criarContrato } from '@/lib/actions/contratos'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoContratoPage() {
  const [clientesList, obrasList] = await Promise.all([
    db.select().from(clientes).orderBy(clientes.nome),
    db.select().from(obras).orderBy(obras.nome),
  ])

  async function action(formData: FormData) {
    'use server'
    await criarContrato(formData)
    redirect('/contratos')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contratos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Contrato</h2>
          <p className="text-muted-foreground">Preencha os dados do contrato</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número do Contrato *</Label>
                <Input id="numero" name="numero" required placeholder="CT-2024-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status">
                  <option value="rascunho">Rascunho</option>
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="encerrado">Encerrado</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clienteId">Cliente *</Label>
              <Select id="clienteId" name="clienteId" required>
                <option value="">Selecione o cliente</option>
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obraId">Obra (opcional)</Label>
              <Select id="obraId" name="obraId">
                <option value="">Sem obra vinculada</option>
                {obrasList.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorTotal">Valor Total (R$) *</Label>
              <Input id="valorTotal" name="valorTotal" type="number" step="0.01" required placeholder="0,00" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input id="dataInicio" name="dataInicio" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data de Fim</Label>
                <Input id="dataFim" name="dataFim" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urlPdf">URL do PDF</Label>
              <Input id="urlPdf" name="urlPdf" type="url" placeholder="https://..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" name="observacoes" placeholder="Observações do contrato..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar Contrato</Button>
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
