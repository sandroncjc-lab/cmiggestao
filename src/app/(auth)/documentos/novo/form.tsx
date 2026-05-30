'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { criarDocumento } from '@/lib/actions/documentos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import Link from 'next/link'

interface Props {
  obrasList: { id: string; nome: string }[]
  clientesList: { id: string; nome: string }[]
}

export function NovoDocumentoForm({ obrasList, clientesList }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(criarDocumento, null)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Documento salvo!')
      router.push('/documentos')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-4">
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

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar documento'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/documentos">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
