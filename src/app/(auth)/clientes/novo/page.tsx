import { db } from '@/app/db'
import { empresas } from '@/app/db/schema'
import { criarCliente } from '@/lib/actions/clientes'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoClientePage() {
  const empresasList = await db.select().from(empresas).orderBy(empresas.nome)

  async function action(formData: FormData) {
    'use server'
    await criarCliente(formData)
    redirect('/clientes')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Cliente</h2>
          <p className="text-muted-foreground">Preencha os dados do cliente</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <input type="hidden" name="empresaId" value={empresasList[0]?.id ?? ''} />

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" required placeholder="Nome do cliente" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documento">CPF / CNPJ</Label>
                <Input id="documento" name="documento" placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="email@empresa.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" placeholder="Rua, número, cidade - UF" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar Cliente</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/clientes">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
