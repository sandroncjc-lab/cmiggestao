'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createObraAction } from './actions'

interface Cliente {
  id: string
  nome: string
}

export function NovaObraForm({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    try {
      setPending(true)
      const obra = await createObraAction({
        nome: fd.get('nome') as string,
        descricao: (fd.get('descricao') as string) || null,
        status: (fd.get('status') as 'planejada' | 'em_andamento' | 'pausada' | 'concluida') ?? 'planejada',
        dataInicio: (fd.get('dataInicio') as string) || null,
        dataFim: (fd.get('dataFim') as string) || null,
        clienteId: fd.get('clienteId') as string,
      })
      router.push(`/obras/${obra.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar obra')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" name="nome" required placeholder="Nome da obra" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clienteId">Cliente *</Label>
        <Select name="clienteId" required>
          <SelectTrigger id="clienteId">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue="planejada">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dataInicio">Data de Início</Label>
          <Input id="dataInicio" name="dataInicio" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataFim">Data de Término</Label>
          <Input id="dataFim" name="dataFim" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" name="descricao" placeholder="Descrição opcional" rows={3} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Criar Obra'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
