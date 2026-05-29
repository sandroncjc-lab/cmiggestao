import { db } from '@/app/db'
import { obras, clientes, obraResponsaveis } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { redirect } from 'next/navigation'
import { criarDocumento } from '@/lib/actions/documentos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NovoDocumentoPage() {
  const usuario = await getUsuarioAtual()
  if (!usuario || isCliente(usuario.funcao)) redirect('/documentos')

  // Obras visíveis ao usuário
  let obrasList: { id: string; nome: string }[] = []
  if (usuario.funcao === 'encarregado') {
    const atribuicoes = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(and(eq(obraResponsaveis.usuarioId, usuario.id), eq(obraResponsaveis.papel, 'encarregado')))
    const obraIds = atribuicoes.map((a) => a.obraId)
    if (obraIds.length > 0) {
      obrasList = await db
        .select({ id: obras.id, nome: obras.nome })
        .from(obras)
        .where(and(eq(obras.empresaId, usuario.empresaId)))
        .then((rows) => rows.filter((o) => obraIds.includes(o.id)))
    }
  } else {
    obrasList = await db
      .select({ id: obras.id, nome: obras.nome })
      .from(obras)
      .where(eq(obras.empresaId, usuario.empresaId))
      .orderBy(obras.nome)
  }

  // Clientes visíveis (só admin/engenheiro)
  const clientesList = (usuario.funcao === 'admin' || usuario.funcao === 'engenheiro')
    ? await db
        .select({ id: clientes.id, nome: clientes.nome })
        .from(clientes)
        .where(eq(clientes.empresaId, usuario.empresaId))
        .orderBy(clientes.nome)
    : []

  async function action(formData: FormData) {
    'use server'
    const result = await criarDocumento(null, formData)
    if (result.success) redirect('/documentos')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documentos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Documento</h2>
          <p className="text-muted-foreground">Adicione um link de documento externo</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input id="titulo" name="titulo" required placeholder="Ex: Contrato de Prestação de Serviços" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select id="tipo" name="tipo" required>
                <option value="contrato">Contrato</option>
                <option value="alvara">Alvará</option>
                <option value="planta">Planta</option>
                <option value="relatorio">Relatório</option>
                <option value="outro">Outro</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Link do documento *</Label>
              <Input
                id="url"
                name="url"
                type="url"
                required
                placeholder="https://drive.google.com/..."
              />
              <p className="text-xs text-muted-foreground">Cole o link do Google Drive, OneDrive ou qualquer URL pública.</p>
            </div>

            {obrasList.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="obraId">Obra vinculada</Label>
                <Select id="obraId" name="obraId">
                  <option value="">Nenhuma</option>
                  {obrasList.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </Select>
              </div>
            )}

            {clientesList.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="clienteId">Cliente vinculado</Label>
                <Select id="clienteId" name="clienteId">
                  <option value="">Nenhum</option>
                  {clientesList.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar documento</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/documentos">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
