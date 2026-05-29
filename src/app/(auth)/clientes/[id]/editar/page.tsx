import { db } from '@/app/db'
import { clientes } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { atualizarCliente } from '@/lib/actions/clientes'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresaId = await getEmpresaIdOuErro()

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.empresaId, empresaId)))
    .limit(1)

  if (!cliente) notFound()

  async function action(formData: FormData) {
    'use server'
    await atualizarCliente(id, formData)
    redirect(`/clientes/${id}`)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clientes/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Editar Cliente</h2>
          <p className="text-muted-foreground">{cliente.nome}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" required defaultValue={cliente.nome} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documento">CPF / CNPJ</Label>
                <Input id="documento" name="documento" defaultValue={cliente.documento ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" defaultValue={cliente.telefone ?? ''} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={cliente.email ?? ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" defaultValue={cliente.endereco ?? ''} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar</Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/clientes/${id}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
