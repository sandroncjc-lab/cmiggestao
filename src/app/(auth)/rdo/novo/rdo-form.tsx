'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, PenLine, RotateCcw } from 'lucide-react'

interface Obra { id: string; nome: string }

interface Atividade { descricao: string; horaInicio: string; horaFim: string; observacoes: string }
interface Funcionario { nome: string; funcao: string; horas: string }

export function RdoForm({ obras, defaultObraId }: { obras: Obra[]; defaultObraId?: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 — básico
  const [obraId, setObraId] = useState(defaultObraId ?? '')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [clima, setClima] = useState('ensolarado')

  // Step 2 — atividades
  const [atividades, setAtividades] = useState<Atividade[]>([{ descricao: '', horaInicio: '', horaFim: '', observacoes: '' }])

  // Step 3 — funcionários
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([{ nome: '', funcao: '', horas: '' }])

  // Step 4 — assinatura
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  function addAtividade() {
    setAtividades(prev => [...prev, { descricao: '', horaInicio: '', horaFim: '', observacoes: '' }])
  }
  function removeAtividade(i: number) {
    setAtividades(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateAtividade(i: number, field: keyof Atividade, value: string) {
    setAtividades(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }

  function addFuncionario() {
    setFuncionarios(prev => [...prev, { nome: '', funcao: '', horas: '' }])
  }
  function removeFuncionario(i: number) {
    setFuncionarios(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateFuncionario(i: number, field: keyof Funcionario, value: string) {
    setFuncionarios(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f))
  }

  // Canvas drawing
  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
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
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }
  function getSignature() {
    return canvasRef.current?.toDataURL('image/png') ?? ''
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.set('obraId', obraId)
      formData.set('data', data)
      formData.set('clima', clima)
      formData.set('criadoPorId', 'placeholder') // será substituído por auth real
      formData.set('assinaturaInterna', getSignature())
      formData.set('atividades', JSON.stringify(atividades))
      formData.set('funcionarios', JSON.stringify(funcionarios))

      const res = await fetch('/api/rdo', { method: 'POST', body: formData })
      if (res.ok) router.push('/rdo')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { label: 'Dados Gerais' },
    { label: 'Atividades' },
    { label: 'Funcionários' },
    { label: 'Assinatura' },
  ]

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => i < step - 1 && setStep(i + 1)}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step === i + 1
                  ? 'bg-primary text-primary-foreground'
                  : i < step - 1
                    ? 'bg-primary/20 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {i + 1}
            </button>
            <span className={`text-sm hidden sm:block ${step === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Obra *</Label>
              <Select value={obraId} onChange={e => setObraId(e.target.value)} required>
                <option value="">Selecione a obra</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Clima *</Label>
                <Select value={clima} onChange={e => setClima(e.target.value)}>
                  <option value="ensolarado">☀️ Ensolarado</option>
                  <option value="nublado">⛅ Nublado</option>
                  <option value="chuvoso">🌧️ Chuvoso</option>
                  <option value="tempestade">⛈️ Tempestade</option>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!obraId || !data}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Atividades</CardTitle>
              <Button size="sm" variant="outline" onClick={addAtividade}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {atividades.map((a, i) => (
              <div key={i} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Atividade {i + 1}</span>
                  {atividades.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => removeAtividade(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={a.descricao} onChange={e => updateAtividade(i, 'descricao', e.target.value)} placeholder="Descreva a atividade" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Início</Label>
                    <Input type="time" value={a.horaInicio} onChange={e => updateAtividade(i, 'horaInicio', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fim</Label>
                    <Input type="time" value={a.horaFim} onChange={e => updateAtividade(i, 'horaFim', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={a.observacoes} onChange={e => updateAtividade(i, 'observacoes', e.target.value)} placeholder="Observações opcionais" />
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Funcionários</CardTitle>
              <Button size="sm" variant="outline" onClick={addFuncionario}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {funcionarios.map((f, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={f.nome} onChange={e => updateFuncionario(i, 'nome', e.target.value)} placeholder="Nome do funcionário" />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Input value={f.funcao} onChange={e => updateFuncionario(i, 'funcao', e.target.value)} placeholder="Ex: Pedreiro" />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-2 flex-1">
                    <Label>Horas</Label>
                    <Input type="number" step="0.5" min="0" value={f.horas} onChange={e => updateFuncionario(i, 'horas', e.target.value)} placeholder="8" />
                  </div>
                  {funcionarios.length > 1 && (
                    <Button size="icon" variant="ghost" className="mt-6" onClick={() => removeFuncionario(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={() => setStep(4)}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 — Assinatura */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Assinatura do Responsável Interno</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Assine no campo abaixo (touch ou mouse)</p>
            <div className="rounded-md border border-input bg-white">
              <canvas
                ref={canvasRef}
                width={560}
                height={200}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <RotateCcw className="h-4 w-4 mr-2" />Limpar
            </Button>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Salvando...' : 'Enviar para Aprovação'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
