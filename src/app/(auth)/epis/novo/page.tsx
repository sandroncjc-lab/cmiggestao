import { db } from '@/app/db'
import { obras } from '@/app/db/schema'
import { criarEpi } from '@/lib/actions/epis'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoEpiPage() {
  const obrasList = await db.select().from(obras).orderBy(obras.nome)

  async function action(formData: FormData) {
    'use server'
    await criarEpi(formData)
    redirect('/epis')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/epis"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo EPI</h2>
          <p className="text-muted-foreground">Registrar entrega de EPI</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de EPI *</Label>
              <Input id="tipo" name="tipo" required placeholder="Ex: Capacete, Luva, Bota..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroCa">Número CA</Label>
              <Input id="numeroCa" name="numeroCa" placeholder="000000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcionarioNome">Funcionário *</Label>
              <Input id="funcionarioNome" name="funcionarioNome" required placeholder="Nome do funcionário" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataEntrega">Data de Entrega *</Label>
                <Input id="dataEntrega" name="dataEntrega" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validade">Validade *</Label>
                <Input id="validade" name="validade" type="date" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obraId">Obra (opcional)</Label>
              <Select id="obraId" name="obraId">
                <option value="">Sem obra vinculada</option>
                {obrasList.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Registrar EPI</Button>
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
