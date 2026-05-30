'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle } from 'lucide-react'
import { aprovarRdo, rejeitarRdo } from '@/lib/actions/rdo'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function RdoAcoesCliente({ rdoId }: { rdoId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const w = canvas.offsetWidth
      canvas.width = w * ratio
      canvas.height = 120 * ratio
      const ctx = canvas.getContext('2d')
      if (ctx) { ctx.scale(ratio, ratio); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round' }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const [drawing, setDrawing] = useState(false)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [showRejeitar, setShowRejeitar] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    // escala: canvas interno pode ser maior que o tamanho CSS
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function stopDraw() { setDrawing(false) }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }

  function isCanvasBlank(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return true
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return false
    return true
  }

  function handleAprovar() {
    const canvas = canvasRef.current
    if (!canvas || isCanvasBlank(canvas)) {
      setError('Assine o campo antes de aprovar.')
      return
    }
    startTransition(async () => {
      const result = await aprovarRdo(rdoId, canvas.toDataURL('image/png'))
      if (result.success) {
        router.push('/rdo')
      } else {
        toast.error(result.error ?? 'Erro ao aprovar RDO')
      }
    })
  }

  function handleRejeitar() {
    if (!motivoRejeicao.trim()) {
      setError('Informe o motivo da rejeição')
      return
    }
    startTransition(async () => {
      const result = await rejeitarRdo(rdoId, motivoRejeicao)
      if (result.success) {
        router.push('/rdo')
      } else {
        toast.error(result.error ?? 'Erro ao rejeitar RDO')
      }
    })
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="text-yellow-700 dark:text-yellow-400">Aprovação do Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Este RDO aguarda sua aprovação. Assine abaixo e aprove ou informe o motivo de rejeição.</p>

        <div>
          <p className="text-sm font-medium mb-2">Assinatura</p>
          <canvas
            ref={canvasRef}
            className="w-full rounded-md border border-border bg-white cursor-crosshair touch-none"
            style={{ height: 120 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          <Button variant="ghost" size="sm" className="mt-1" onClick={clearCanvas}>Limpar</Button>
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleAprovar} disabled={isPending} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />{isPending ? 'Aprovando...' : 'Aprovar RDO'}
          </Button>
          <Button variant="outline" disabled={isPending} className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setShowRejeitar(!showRejeitar)}>
            <XCircle className="h-4 w-4 mr-2" />Rejeitar
          </Button>
        </div>

        {showRejeitar && (
          <div className="space-y-2">
            <Textarea
              placeholder="Informe o motivo da rejeição..."
              value={motivoRejeicao}
              onChange={(e) => { setMotivoRejeicao(e.target.value); setError('') }}
              rows={3}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="destructive" onClick={handleRejeitar}>Confirmar Rejeição</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
