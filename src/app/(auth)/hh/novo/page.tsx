import { db } from '@/app/db'
import { obras } from '@/app/db/schema'
import { registrarHH } from '@/lib/actions/hh'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoHHPage() {
  const obrasList = await db.select().from(obras).orderBy(obras.nome)

  async function action(formData: FormData) {
    'use server'
    await registrarHH(formData)
    redirect('/hh')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hh"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Registrar HH</h2>
          <p className="text-muted-foreground">Horas trabalhadas do dia</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obraId">Obra *</Label>
              <Select id="obraId" name="obraId" required>
                <option value="">Selecione a obra</option>
                {obrasList.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeFuncionario">Funcionário *</Label>
                <Input id="nomeFuncionario" name="nomeFuncionario" required placeholder="Nome" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funcao">Função</Label>
                <Input id="funcao" name="funcao" placeholder="Ex: Pedreiro" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" name="data" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horasNormais">Horas Normais</Label>
                <Input id="horasNormais" name="horasNormais" type="number" step="0.5" min="0" defaultValue="8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horasExtras">Horas Extras</Label>
                <Input id="horasExtras" name="horasExtras" type="number" step="0.5" min="0" defaultValue="0" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Registrar</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/hh">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
