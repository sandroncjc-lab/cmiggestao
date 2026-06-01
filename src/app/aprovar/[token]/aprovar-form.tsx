'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { aprovarRdoPorToken, rejeitarRdoPorToken } from '@/lib/actions/rdo'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return true
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false
  }
  return true
}

export function AprovarForm({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const w = canvas.offsetWidth
      canvas.width = w * ratio
      canvas.height = 180 * ratio
      const ctx = canvas.getContext('2d')
      if (ctx) { ctx.scale(ratio, ratio); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round' }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const [showRejeitar, setShowRejeitar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<'aprovado' | 'rejeitado' | null>(null)
  const [isPending, startTransition] = useTransition()

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setDrawing(true)
    const { x, y } = getPos(e)
    const ctx = canvas.getContext('2d')!
    ctx.beginPath(); ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const { x, y } = getPos(e)
    const ctx = canvas.getContext('2d')!
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function stopDraw() { setDrawing(false) }

  function limparCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setErro('')
  }

  function handleAprovar() {
    const canvas = canvasRef.current
    if (!canvas || isCanvasBlank(canvas)) {
      setErro('Assine o campo antes de aprovar.')
      return
    }
    setErro('')
    const assinatura = canvas.toDataURL('image/png')
    startTransition(async () => {
      try {
        await aprovarRdoPorToken(token, assinatura)
        setResultado('aprovado')
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao aprovar')
      }
    })
  }

  function handleRejeitar() {
    if (!motivo.trim()) { setErro('Informe o motivo da rejeição.'); return }
    setErro('')
    startTransition(async () => {
      try {
        await rejeitarRdoPorToken(token, motivo)
        setResultado('rejeitado')
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao rejeitar')
      }
    })
  }

  // Tela de confirmação pós-ação
  if (resultado) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-6xl">{resultado === 'aprovado' ? '✅' : '❌'}</div>
        <h2 className="text-2xl font-bold text-slate-800">
          {resultado === 'aprovado' ? 'RDO Aprovado!' : 'RDO Rejeitado'}
        </h2>
        <p className="text-slate-500">
          {resultado === 'aprovado'
            ? 'Sua aprovação foi registrada com sucesso. O responsável pela obra será notificado.'
            : 'Sua rejeição foi registrada. O responsável pela obra será notificado com o motivo informado.'}
        </p>
        {resultado === 'aprovado' && (
          <p className="text-sm text-slate-400">Você pode fechar esta janela.</p>
        )}
      </div>
    )
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-blue-800">Sua Aprovação</CardTitle>
        <p className="text-sm text-slate-500">
          Assine abaixo confirmando que revisou o relatório.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas de assinatura */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Assinatura *</p>
          <div className="rounded-lg border-2 border-slate-200 bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair touch-none"
              style={{ height: 180 }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <button
            type="button"
            onClick={limparCanvas}
            className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <RotateCcw className="h-3 w-3" />Limpar assinatura
          </button>
        </div>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{erro}</p>
        )}

        {/* Botões */}
        {!showRejeitar ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleAprovar}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isPending ? 'Aprovando...' : 'Aprovar RDO'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowRejeitar(true); setErro('') }}
              className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />Rejeitar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Motivo da rejeição *</p>
              <Textarea
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setErro('') }}
                placeholder="Descreva o motivo da rejeição..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleRejeitar}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowRejeitar(false); setErro(''); setMotivo('') }}
              >
                Voltar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
