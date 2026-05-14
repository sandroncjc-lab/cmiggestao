'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send } from 'lucide-react'
import { enviarRdoParaAprovacao } from '@/lib/actions/rdo'
import { useRouter } from 'next/navigation'

export function RdoAcoesInterno({ rdoId, assinaturaAtual }: { rdoId: string; assinaturaAtual: string | null }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [, startTransition] = useTransition()

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
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }

  function handleEnviar() {
    const canvas = canvasRef.current
    const assinatura = canvas ? canvas.toDataURL('image/png') : (assinaturaAtual ?? '')
    startTransition(async () => {
      await enviarRdoParaAprovacao(rdoId, assinatura)
      router.push('/rdo')
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
            className="w-full rounded-md border border-border bg-white cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />
          <Button variant="ghost" size="sm" className="mt-1" onClick={clearCanvas}>Limpar</Button>
        </div>

        <Button onClick={handleEnviar}>
          <Send className="h-4 w-4 mr-2" />Enviar para Aprovação do Cliente
        </Button>
      </CardContent>
    </Card>
  )
}
