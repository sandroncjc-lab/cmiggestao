'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Copy, CheckCheck, Users, UserX, Link2 } from 'lucide-react'
import { enviarRdoParaAprovacao, assinarInLocoComConta, assinarInLocoSemConta } from '@/lib/actions/rdo'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Aprovador = { usuarioId: string; nome: string; email: string }

type Props = {
  rdoId: string
  assinaturaAtual: string | null
  aprovadores: Aprovador[]
}

type Modo = 'link' | 'inloco_conta' | 'inloco_sem_conta'

// ─── Canvas utils ────────────────────────────────────────────────────────────

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return true
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return false
  return true
}

function getPos(
  e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  if ('touches' in e) {
    return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
  }
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
}

function SignatureCanvas({ canvasRef, label }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; label: string }) {
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const w = canvas.offsetWidth
      canvas.width = w * ratio
      canvas.height = 120 * ratio
      const ctx = canvas.getContext('2d')
      if (ctx) { ctx.scale(ratio, ratio); ctx.lineWidth = 2; ctx.lineCap = 'round' }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [canvasRef])

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function stopDraw() { setDrawing(false) }
  function clear() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <canvas
        ref={canvasRef}
        className="w-full rounded-md border border-border bg-white cursor-crosshair touch-none"
        style={{ height: 120 }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <Button variant="ghost" size="sm" onClick={clear}>Limpar</Button>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function RdoAcoesInterno({ rdoId, assinaturaAtual, aprovadores }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Assinatura interna (obrigatória em todos os modos)
  const internaRef = useRef<HTMLCanvasElement>(null)
  const [erroInterna, setErroInterna] = useState('')

  // Estado do modo selecionado
  const [modo, setModo] = useState<Modo>('link')

  // Modo 1 — link
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  // Modo 2 — in loco com conta
  const clienteRef = useRef<HTMLCanvasElement>(null)
  const [aprovadorSelecionado, setAprovadorSelecionado] = useState(aprovadores[0]?.usuarioId ?? '')

  // Modo 3 — in loco sem conta
  const semContaRef = useRef<HTMLCanvasElement>(null)
  const [nomeAssinante, setNomeAssinante] = useState('')
  const [cargoAssinante, setCargoAssinante] = useState('')

  function getAssinaturaInterna(): string | null {
    const canvas = internaRef.current
    if (!canvas || isCanvasBlank(canvas)) return null
    return canvas.toDataURL('image/png')
  }

  // Modo 1: enviar link
  function handleEnviarLink() {
    const assinatura = getAssinaturaInterna()
    if (!assinatura) { setErroInterna('Assine o campo antes de enviar.'); return }
    setErroInterna('')
    startTransition(async () => {
      const result = await enviarRdoParaAprovacao(rdoId, assinatura)
      if (!result.success) {
        setErroInterna(result.error ?? 'Erro ao enviar.')
        toast.error(result.error ?? 'Erro ao enviar.')
        return
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cmiggestao.vercel.app'
      const link = `${appUrl}/aprovar/${result.linkToken}`
      setLinkGerado(link)
      toast.success('RDO enviado! Copie o link abaixo.')
    })
  }

  // Modo 2: in loco com conta
  function handleInLocoComConta() {
    const assinInterna = getAssinaturaInterna()
    if (!assinInterna) { setErroInterna('Assine o campo antes de enviar.'); return }
    const canvas = clienteRef.current
    if (!canvas || isCanvasBlank(canvas)) { toast.error('O aprovador precisa assinar o campo.'); return }
    if (!aprovadorSelecionado) { toast.error('Selecione um aprovador.'); return }
    setErroInterna('')
    startTransition(async () => {
      // Salva assinatura interna primeiro (envia para pendente_aprovacao internamente)
      const saveInterna = await enviarRdoParaAprovacao(rdoId, assinInterna)
      if (!saveInterna.success) { toast.error(saveInterna.error ?? 'Erro'); return }
      // Registra aprovação in loco
      const result = await assinarInLocoComConta(rdoId, canvas.toDataURL('image/png'), aprovadorSelecionado)
      if (result.success) {
        toast.success('RDO aprovado in loco com sucesso!')
        router.push('/rdo')
      } else {
        toast.error(result.error ?? 'Erro ao registrar aprovação')
      }
    })
  }

  // Modo 3: in loco sem conta
  function handleInLocoSemConta() {
    const assinInterna = getAssinaturaInterna()
    if (!assinInterna) { setErroInterna('Assine o campo antes de enviar.'); return }
    if (!nomeAssinante.trim()) { toast.error('Informe o nome do assinante.'); return }
    const canvas = semContaRef.current
    if (!canvas || isCanvasBlank(canvas)) { toast.error('O responsável precisa assinar o campo.'); return }
    setErroInterna('')
    startTransition(async () => {
      const saveInterna = await enviarRdoParaAprovacao(rdoId, assinInterna)
      if (!saveInterna.success) { toast.error(saveInterna.error ?? 'Erro'); return }
      const result = await assinarInLocoSemConta(rdoId, {
        nomeAssinante: nomeAssinante.trim(),
        cargoAssinante: cargoAssinante.trim(),
        assinaturaCliente: canvas.toDataURL('image/png'),
      })
      if (result.success) {
        toast.success('RDO aprovado! Assinatura registrada.')
        router.push('/rdo')
      } else {
        toast.error(result.error ?? 'Erro ao registrar assinatura')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finalizar e Validar RDO</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Assine internamente e escolha como o cliente irá validar este RDO.
        </p>

        {/* Assinatura interna — sempre obrigatória */}
        {assinaturaAtual ? (
          <div>
            <p className="text-sm font-medium mb-1">Assinatura Interna (salva)</p>
            <img src={assinaturaAtual} alt="Assinatura salva" className="max-h-20 border border-border rounded" />
          </div>
        ) : (
          <div>
            <SignatureCanvas canvasRef={internaRef} label="Assinatura Interna (encarregado) *" />
            {erroInterna && <p className="text-sm text-destructive mt-1">{erroInterna}</p>}
          </div>
        )}

        {/* Seletor de modo de validação */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Modo de validação do cliente</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { id: 'link' as Modo, icon: Link2, label: 'Enviar link', desc: 'Cliente aprova remotamente (WhatsApp/e-mail)' },
              { id: 'inloco_conta' as Modo, icon: Users, label: 'In loco c/ conta', desc: 'Aprovador presente — assina no aparelho' },
              { id: 'inloco_sem_conta' as Modo, icon: UserX, label: 'In loco s/ conta', desc: 'Responsável presente sem cadastro no sistema' },
            ].map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => setModo(id)}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                  modo === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className="text-xs leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modo 1 — Link */}
        {modo === 'link' && !linkGerado && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Um link de aprovação será gerado. Copie e envie ao cliente.
            </p>
            <Button onClick={handleEnviarLink} disabled={isPending}>
              <Send className="h-4 w-4 mr-2" />
              {isPending ? 'Enviando...' : 'Gerar link e enviar para aprovação'}
            </Button>
          </div>
        )}

        {modo === 'link' && linkGerado && (
          <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">✅ RDO enviado para aprovação!</p>
            <p className="text-xs text-green-700">Copie o link e envie ao cliente (WhatsApp, e-mail, etc.):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white border border-green-200 px-2 py-1.5 text-xs text-slate-700">
                {linkGerado}
              </code>
              <Button
                variant="outline" size="sm" className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(linkGerado)
                  setCopiado(true)
                  setTimeout(() => setCopiado(false), 2000)
                }}
              >
                {copiado ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => router.push('/rdo')}>
              Voltar para lista de RDOs
            </Button>
          </div>
        )}

        {/* Modo 2 — In loco com conta */}
        {modo === 'inloco_conta' && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            {aprovadores.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Nenhum aprovador atribuído a esta obra. Atribua um aprovador na tela de Usuários.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Aprovador presente *</label>
                  <select
                    value={aprovadorSelecionado}
                    onChange={(e) => setAprovadorSelecionado(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {aprovadores.map((a) => (
                      <option key={a.usuarioId} value={a.usuarioId}>{a.nome} ({a.email})</option>
                    ))}
                  </select>
                </div>
                <SignatureCanvas canvasRef={clienteRef} label="Assinatura do Aprovador (in loco) *" />
                <Button onClick={handleInLocoComConta} disabled={isPending}>
                  {isPending ? 'Registrando...' : 'Registrar aprovação in loco'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Modo 3 — In loco sem conta */}
        {modo === 'inloco_sem_conta' && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome do responsável *</label>
                <input
                  type="text"
                  value={nomeAssinante}
                  onChange={(e) => setNomeAssinante(e.target.value)}
                  placeholder="Nome completo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cargo / Documento</label>
                <input
                  type="text"
                  value={cargoAssinante}
                  onChange={(e) => setCargoAssinante(e.target.value)}
                  placeholder="Ex: Gerente, CPF 000..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <SignatureCanvas canvasRef={semContaRef} label="Assinatura do responsável *" />
            <Button onClick={handleInLocoSemConta} disabled={isPending}>
              {isPending ? 'Registrando...' : 'Registrar assinatura presencial'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
