'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { vincularAprovadorObra, criarAprovadorInline } from '@/lib/actions/obras'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ObraInfo = {
  id: string
  nome: string
  clienteId: string | null
  clienteNome: string | null
  aprovadorClienteId: string | null
  aprovadorNome: string | null
  aprovadorEmail: string | null
}
type Aprovador = { id: string; nome: string; email: string; clienteId: string | null }

export function EditarObraClient({
  obra,
  aprovadoresIniciais,
}: {
  obra: ObraInfo
  aprovadoresIniciais: Aprovador[]
}) {
  const router = useRouter()
  const [aprovadorId, setAprovadorId] = useState(obra.aprovadorClienteId ?? '')
  const [aprovadores, setAprovadores] = useState<Aprovador[]>(aprovadoresIniciais)
  const [saving, startSave] = useTransition()

  // dialog criar novo aprovador
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [, startDialog] = useTransition()

  function handleSalvar() {
    startSave(async () => {
      const result = await vincularAprovadorObra(obra.id, aprovadorId || null)
      if (result.success) {
        toast.success('Aprovador atualizado com sucesso!')
        router.push(`/obras/${obra.id}`)
      } else {
        toast.error(result.error ?? 'Erro ao salvar')
      }
    })
  }

  function handleCriarAprovador(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDialogError('')
    if (!obra.clienteId) return
    const form = e.currentTarget
    const nome = (form.elements.namedItem('aprovNome') as HTMLInputElement).value
    const email = (form.elements.namedItem('aprovEmail') as HTMLInputElement).value

    startDialog(async () => {
      const result = await criarAprovadorInline(obra.clienteId!, nome, email, '')
      if (result.success && result.aprovador) {
        const novo: Aprovador = { ...result.aprovador, clienteId: obra.clienteId }
        setAprovadores((p) => [...p, novo])
        setAprovadorId(result.aprovador!.id)
        setDialogOpen(false)
        toast.success('Aprovador criado e selecionado!')
      } else {
        setDialogError(result.error ?? 'Erro ao criar aprovador')
      }
    })
  }

  const aprovadorSelecionado = aprovadores.find((a) => a.id === aprovadorId)

  return (
    <>
      <div className="max-w-lg space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/obras/${obra.id}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Editar Obra</h2>
            <p className="text-muted-foreground">{obra.nome}</p>
          </div>
        </div>

        <div className="rounded-md border p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Cliente</p>
            <p className="font-medium">{obra.clienteNome ?? '—'}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Aprovador do Cliente</Label>
              {obra.clienteId && (
                <button
                  type="button"
                  onClick={() => { setDialogError(''); setDialogOpen(true) }}
                  className="text-xs text-primary hover:underline"
                >
                  + Criar novo aprovador
                </button>
              )}
            </div>

            {!obra.clienteId ? (
              <p className="text-sm text-muted-foreground">Esta obra não tem cliente vinculado.</p>
            ) : aprovadores.length === 0 ? (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Nenhum aprovador cadastrado para este cliente.{' '}
                  <button type="button" onClick={() => setDialogOpen(true)} className="underline font-medium">
                    Criar agora
                  </button>
                </span>
              </div>
            ) : (
              <select
                value={aprovadorId}
                onChange={(e) => setAprovadorId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sem aprovador</option>
                {aprovadores.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome} — {a.email}</option>
                ))}
              </select>
            )}

            {aprovadorSelecionado && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{aprovadorSelecionado.nome}</strong> ({aprovadorSelecionado.email}) receberá os RDOs para aprovação com assinatura digital
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSalvar} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/obras/${obra.id}`}>Cancelar</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog criar aprovador */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Criar Aprovador{obra.clienteNome ? ` para ${obra.clienteNome}` : ''}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleCriarAprovador} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="aprovNome">Nome completo</Label>
              <Input id="aprovNome" name="aprovNome" required placeholder="João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aprovEmail">Email</Label>
              <Input id="aprovEmail" name="aprovEmail" type="email" required placeholder="joao@cliente.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              O aprovador receberá um convite por email para criar a própria senha de acesso.
            </p>
            {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar e Selecionar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
