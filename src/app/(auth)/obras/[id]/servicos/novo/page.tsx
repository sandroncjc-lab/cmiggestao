import { db } from '@/app/db'
import { obras } from '@/app/db/schema'
import { criarServico } from '@/lib/actions/servicos'
import { eq } from 'drizzle-orm'
import { redirect, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoServicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [obra] = await db
    .select({ id: obras.id, nome: obras.nome })
    .from(obras)
    .where(eq(obras.id, id))
    .limit(1)

  if (!obra) notFound()

  async function action(formData: FormData) {
    'use server'
    await criarServico(formData)
    redirect(`/obras/${id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/obras/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Serviço</h2>
          <p className="text-muted-foreground">{obra.nome}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <input type="hidden" name="obraId" value={id} />

            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Serviço *</Label>
              <Input id="nome" name="nome" required placeholder="Ex: Fundação, Alvenaria, Instalação elétrica..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" placeholder="Descrição do serviço" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade de Medida *</Label>
                <Input id="unidade" name="unidade" required placeholder="m², m³, un, h..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precoUnitario">Preço Unitário (R$) *</Label>
                <Input
                  id="precoUnitario"
                  name="precoUnitario"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar Serviço</Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/obras/${id}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
