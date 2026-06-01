import { db } from '@/app/db'
import { obras, hhContratos, contratos, obraResponsaveis } from '@/app/db/schema'
import { definirHHContratado } from '@/lib/actions/hh'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { redirect } from 'next/navigation'
import { and, eq, inArray } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function DefinirHHContratoPage() {
  const usuario = await getUsuarioAtual()
  if (!usuario || isCliente(usuario.funcao)) redirect('/hh')

  let obrasWhere
  if (usuario.funcao === 'encarregado') {
    const atrib = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(eq(obraResponsaveis.usuarioId, usuario.id))
    const atribIds = atrib.map((r) => r.obraId)
    obrasWhere = atribIds.length > 0
      ? and(eq(obras.empresaId, usuario.empresaId), inArray(obras.id, atribIds))
      : and(eq(obras.empresaId, usuario.empresaId), eq(obras.id, ''))
  } else {
    obrasWhere = eq(obras.empresaId, usuario.empresaId)
  }

  const obrasList = await db
    .selectDistinct({ id: obras.id, nome: obras.nome, totalHH: hhContratos.totalHH })
    .from(obras)
    .innerJoin(contratos, and(eq(contratos.obraId, obras.id), eq(contratos.tipo, 'homem_hora')))
    .leftJoin(hhContratos, eq(hhContratos.obraId, obras.id))
    .where(obrasWhere)
    .orderBy(obras.nome)

  async function action(formData: FormData) {
    'use server'
    await definirHHContratado(formData)
    redirect('/hh')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hh"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Definir HH Contratado</h2>
          <p className="text-muted-foreground">Informe o total de horas contratadas por obra</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obraId">Obra *</Label>
              <Select id="obraId" name="obraId" required>
                <option value="">Selecione a obra</option>
                {obrasList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}{o.totalHH ? ` — ${Number(o.totalHH)}h definidas` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalHH">Total de Horas Contratadas *</Label>
              <Input
                id="totalHH"
                name="totalHH"
                type="number"
                step="0.5"
                min="1"
                required
                placeholder="Ex: 500"
              />
              <p className="text-xs text-muted-foreground">
                Se a obra já tiver HH definido, este valor substituirá o anterior.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Salvar</Button>
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
