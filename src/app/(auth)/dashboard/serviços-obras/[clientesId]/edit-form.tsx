'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { updateObraAction } from './actions'

type Obra = {
  id: string
  nome: string
  descricao: string | null
  status: 'planejada' | 'em_andamento' | 'pausada' | 'concluida'
  dataInicio: string | null
  dataFim: string | null
}

export function EditObraForm({ obra }: { obra: Obra }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const fd = new FormData(e.currentTarget)

    try {
      await updateObraAction({
        id: obra.id,
        nome: fd.get('nome') as string,
        descricao: (fd.get('descricao') as string) || null,
        status: fd.get('status') as Obra['status'],
        dataInicio: (fd.get('dataInicio') as string) || null,
        dataFim: (fd.get('dataFim') as string) || null,
      })
      router.push(`/obras/${obra.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Obra</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" defaultValue={obra.nome} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              name="descricao"
              defaultValue={obra.descricao ?? ''}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={obra.status}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejada">Planejada</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="pausada">Pausada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data de Início</Label>
              <Input
                id="dataInicio"
                name="dataInicio"
                type="date"
                defaultValue={obra.dataInicio ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data de Término</Label>
              <Input
                id="dataFim"
                name="dataFim"
                type="date"
                defaultValue={obra.dataFim ?? ''}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/obras/${obra.id}`)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
