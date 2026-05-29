import { db } from '@/app/db'
import { obras, clientes, usuarios } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuario = await getUsuarioAtual()
  if (!usuario || isCliente(usuario.funcao)) redirect(`/obras/${id}`)

  const [obra] = await db
    .select()
    .from(obras)
    .where(and(eq(obras.id, id), eq(obras.empresaId, usuario.empresaId)))
    .limit(1)

  if (!obra) notFound()

  const [clientesList, responsaveisList] = await Promise.all([
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).where(eq(clientes.empresaId, usuario.empresaId)).orderBy(clientes.nome),
    db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(eq(usuarios.empresaId, usuario.empresaId)).orderBy(usuarios.nome),
  ])

  async function action(formData: FormData) {
    'use server'
    const u = await getUsuarioAtual()
    if (!u || isCliente(u.funcao)) throw new Error('Acesso negado')
    await verificarOwnershipObra(id, u.empresaId)
    await db.update(obras).set({
      nome: formData.get('nome') as string,
      descricao: (formData.get('descricao') as string) || null,
      status: formData.get('status') as 'planejada' | 'em_andamento' | 'pausada' | 'concluida',
      dataInicio: (formData.get('dataInicio') as string) || null,
      dataFim: (formData.get('dataFim') as string) || null,
      clienteId: formData.get('clienteId') as string,
      responsavelInternoId: (formData.get('responsavelInternoId') as string) || null,
      atualizadoEm: new Date(),
    }).where(and(eq(obras.id, id), eq(obras.empresaId, u.empresaId)))
    revalidatePath('/obras')
    revalidatePath(`/obras/${id}`)
    redirect(`/obras/${id}`)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/obras/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Editar Obra</h2>
          <p className="text-muted-foreground">{obra.nome}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" required defaultValue={obra.nome} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" defaultValue={obra.descricao ?? ''} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue={obra.status}>
                  <option value="planejada">Planejada</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="pausada">Pausada</option>
                  <option value="concluida">Concluída</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="clienteId">Cliente *</Label>
                <Select id="clienteId" name="clienteId" required defaultValue={obra.clienteId}>
                  {clientesList.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input id="dataInicio" name="dataInicio" type="date" defaultValue={obra.dataInicio ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input id="dataFim" name="dataFim" type="date" defaultValue={obra.dataFim ?? ''} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavelInternoId">Responsável Interno</Label>
              <Select id="responsavelInternoId" name="responsavelInternoId" defaultValue={obra.responsavelInternoId ?? ''}>
                <option value="">Nenhum</option>
                {responsaveisList.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar</Button>
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
