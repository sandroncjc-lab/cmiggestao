'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Copy, CheckCheck } from 'lucide-react'
import { enviarRdoParaAprovacao } from '@/lib/actions/rdo'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return true
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false
  }
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
    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY,
    }
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

export function RdoAcoesInterno({ rdoId, assinaturaAtual }: { rdoId: string; assinaturaAtual: string | null }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setDrawing(true)
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

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setError('')
  }

  function handleEnviar() {
    const canvas = canvasRef.current
    if (!canvas || isCanvasBlank(canvas)) {
      setError('Assine o campo antes de enviar.')
      return
    }
    setError('')
    const assinatura = canvas.toDataURL('image/png')
    startTransition(async () => {
      const result = await enviarRdoParaAprovacao(rdoId, assinatura)
      if (!result.success) {
        setError(result.error ?? 'Erro ao enviar para aprovação.')
        toast.error(result.error ?? 'Erro ao enviar para aprovação.')
        return
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cmiggestao.vercel.app'
      const link = `${appUrl}/aprovar/${result.linkToken}`
      setLinkGerado(link)
      toast.success('RDO enviado! Copie o link de aprovação abaixo.')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar para Aprovação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Assine e envie este RDO para aprovação do cliente responsável.</p>

        <div>
          <p className="text-sm font-medium mb-2">Assinatura Interna</p>
          {assinaturaAtual ? (
            <img src={assinaturaAtual} alt="Assinatura salva" className="max-h-20 border border-border rounded mb-2" />
          ) : null}
          <canvas
            ref={canvasRef}
            width={400}
            height={120}
            className="w-full rounded-md border border-border bg-white cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          <Button variant="ghost" size="sm" className="mt-1" onClick={clearCanvas}>Limpar</Button>
        </div>

        {!linkGerado && (
          <Button onClick={handleEnviar} disabled={isPending}>
            <Send className="h-4 w-4 mr-2" />
            {isPending ? 'Enviando...' : 'Enviar para Aprovação do Cliente'}
          </Button>
        )}

        {linkGerado && (
          <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">✅ RDO enviado para aprovação!</p>
            <p className="text-xs text-green-700">Copie o link e envie ao cliente (WhatsApp, e-mail, etc.):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-white border border-green-200 px-2 py-1.5 text-xs text-slate-700">
                {linkGerado}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
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
      </CardContent>
    </Card>
  )
}
