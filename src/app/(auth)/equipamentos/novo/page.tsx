import { criarEquipamento } from '@/lib/actions/equipamentos'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoEquipamentoPage() {
  async function action(formData: FormData) {
    'use server'
    await criarEquipamento(formData)
    redirect('/equipamentos')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/equipamentos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Equipamento</h2>
          <p className="text-muted-foreground">Cadastrar equipamento da empresa</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" required placeholder="Ex: Betoneira, Compactador..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input id="tipo" name="tipo" placeholder="Ex: Elétrico, Manual..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroSerie">Número de Série</Label>
                <Input id="numeroSerie" name="numeroSerie" placeholder="SN-0000" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Cadastrar</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/equipamentos">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
