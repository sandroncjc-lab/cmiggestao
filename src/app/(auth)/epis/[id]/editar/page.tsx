import { db } from '@/app/db'
import { epis, obras } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { atualizarEpi } from '@/lib/actions/epis'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditarEpiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresaId = await getEmpresaIdOuErro()

  const [epi] = await db
    .select()
    .from(epis)
    .where(and(eq(epis.id, id), eq(epis.empresaId, empresaId)))
    .limit(1)

  if (!epi) notFound()

  const obrasList = await db
    .select({ id: obras.id, nome: obras.nome })
    .from(obras)
    .where(eq(obras.empresaId, empresaId))
    .orderBy(obras.nome)

  async function action(formData: FormData) {
    'use server'
    await atualizarEpi(id, formData)
    redirect('/epis')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/epis"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Editar EPI</h2>
          <p className="text-muted-foreground">{epi.tipo}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de EPI *</Label>
              <Input id="tipo" name="tipo" required defaultValue={epi.tipo} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroCa">Número CA</Label>
              <Input id="numeroCa" name="numeroCa" defaultValue={epi.numeroCa ?? ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcionarioNome">Funcionário *</Label>
              <Input id="funcionarioNome" name="funcionarioNome" required defaultValue={epi.funcionarioNome} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataEntrega">Data de Entrega *</Label>
                <Input id="dataEntrega" name="dataEntrega" type="date" required defaultValue={String(epi.dataEntrega)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validade">Validade *</Label>
                <Input id="validade" name="validade" type="date" required defaultValue={String(epi.validade)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obraId">Obra (opcional)</Label>
              <Select id="obraId" name="obraId" defaultValue={epi.obraId ?? ''}>
                <option value="">Sem obra vinculada</option>
                {obrasList.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/epis">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
