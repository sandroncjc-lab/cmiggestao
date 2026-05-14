'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle } from 'lucide-react'
import { aprovarRdo, rejeitarRdo } from '@/lib/actions/rdo'
import { useRouter } from 'next/navigation'

export function RdoAcoesCliente({ rdoId }: { rdoId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [showRejeitar, setShowRejeitar] = useState(false)
  const [, startTransition] = useTransition()
  const [error, setError] = useState('')

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  function stopDraw() { setDrawing(false) }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }

  function handleAprovar() {
    const canvas = canvasRef.current
    const assinatura = canvas ? canvas.toDataURL('image/png') : ''
    startTransition(async () => {
      await aprovarRdo(rdoId, assinatura)
      router.push('/rdo')
    })
  }

  function handleRejeitar() {
    if (!motivoRejeicao.trim()) {
      setError('Informe o motivo da rejeição')
      return
    }
    startTransition(async () => {
      await rejeitarRdo(rdoId, motivoRejeicao)
      router.push('/rdo')
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
            width={400}
            height={120}
            className="w-full rounded-md border border-border bg-white cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />
          <Button variant="ghost" size="sm" className="mt-1" onClick={clearCanvas}>Limpar</Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleAprovar} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />Aprovar RDO
          </Button>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setShowRejeitar(!showRejeitar)}>
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
