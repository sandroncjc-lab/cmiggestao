'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, RotateCcw, Camera, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { criarRdoCompleto } from '@/lib/actions/rdo'

interface Obra {
  id: string
  nome: string
  aprovadorClienteId: string | null
  aprovadorNome: string | null
  clienteNome: string | null
}
interface Atividade { descricao: string; horaInicio: string; horaFim: string; observacoes: string }
interface Funcionario { nome: string; funcao: string; horas: string }

export function RdoForm({ obras, defaultObraId }: { obras: Obra[]; defaultObraId?: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [obraId, setObraId] = useState(defaultObraId ?? '')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [clima, setClima] = useState('ensolarado')

  const obraSelecionada = obras.find((o) => o.id === obraId)

  // Step 2
  const [atividades, setAtividades] = useState<Atividade[]>([{ descricao: '', horaInicio: '', horaFim: '', observacoes: '' }])

  // Step 3
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([{ nome: '', funcao: '', horas: '' }])

  // Step 4 — fotos
  const [fotos, setFotos] = useState<{ url: string; file: File }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 5 — assinatura
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  // ── Atividades ──────────────────────────────────────────────────────────────
  function addAtividade() { setAtividades(p => [...p, { descricao: '', horaInicio: '', horaFim: '', observacoes: '' }]) }
  function removeAtividade(i: number) { setAtividades(p => p.filter((_, idx) => idx !== i)) }
  function updateAtividade(i: number, field: keyof Atividade, value: string) {
    setAtividades(p => p.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }

  // ── Funcionários ────────────────────────────────────────────────────────────
  function addFuncionario() { setFuncionarios(p => [...p, { nome: '', funcao: '', horas: '' }]) }
  function removeFuncionario(i: number) { setFuncionarios(p => p.filter((_, idx) => idx !== i)) }
  function updateFuncionario(i: number, field: keyof Funcionario, value: string) {
    setFuncionarios(p => p.map((f, idx) => idx === i ? { ...f, [field]: value } : f))
  }

  // ── Fotos ───────────────────────────────────────────────────────────────────
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFotos((p) => [...p, { url: ev.target!.result as string, file }])
        }
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  function removeFoto(i: number) { setFotos(p => p.filter((_, idx) => idx !== i)) }

  // ── Assinatura ──────────────────────────────────────────────────────────────
  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    const { x, y } = getPos(e)
    ctx.beginPath(); ctx.moveTo(x, y)
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke()
  }
  function stopDraw() { setDrawing(false) }
  function clearCanvas() { canvasRef.current?.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height) }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true)
    try {
      const assinatura = canvasRef.current?.toDataURL('image/png') ?? ''
      const result = await criarRdoCompleto({
        obraId,
        data,
        clima: clima as 'ensolarado' | 'nublado' | 'chuvoso' | 'tempestade',
        atividades: atividades.filter((a) => a.descricao.trim()),
        funcionarios: funcionarios.filter((f) => f.nome.trim()),
        fotos: fotos.map((f) => f.url),
        assinaturaInterna: assinatura,
      })

      if (result.success) {
        toast.success('RDO enviado para aprovação!')
        router.push('/rdo')
      } else {
        toast.error(result.error ?? 'Erro ao salvar RDO')
      }
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Dados Gerais', 'Atividades', 'Funcionários', 'Fotos', 'Assinatura']

  return (
    <div className="space-y-6">
      {/* Indicador de passos */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => i < step - 1 && setStep(i + 1)}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step === i + 1 ? 'bg-primary text-primary-foreground'
                  : i < step - 1 ? 'bg-primary/20 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {i + 1}
            </button>
            <span className={`text-sm hidden sm:block ${step === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Dados Gerais */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Obra *</Label>
              <Select value={obraId} onChange={(e) => setObraId(e.target.value)} required>
                <option value="">Selecione a obra</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
              {obraSelecionada && (
                obraSelecionada.aprovadorClienteId ? (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      Aprovador: <strong>{obraSelecionada.aprovadorNome}</strong>
                      {obraSelecionada.clienteNome && ` (${obraSelecionada.clienteNome})`}
                      {' '}— receberá notificação para assinar digitalmente
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Esta obra não tem aprovador vinculado. O RDO será salvo mas o cliente não conseguirá aprovar.{' '}
                      <a href="/obras" className="underline font-medium">Configure o aprovador na obra</a> antes de criar o RDO.
                    </span>
                  </div>
                )
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Clima *</Label>
                <Select value={clima} onChange={(e) => setClima(e.target.value)}>
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

      {/* Step 2 — Atividades */}
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
                  <Input value={a.descricao} onChange={(e) => updateAtividade(i, 'descricao', e.target.value)} placeholder="Descreva a atividade" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Início</Label>
                    <Input type="time" value={a.horaInicio} onChange={(e) => updateAtividade(i, 'horaInicio', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fim</Label>
                    <Input type="time" value={a.horaFim} onChange={(e) => updateAtividade(i, 'horaFim', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={a.observacoes} onChange={(e) => updateAtividade(i, 'observacoes', e.target.value)} placeholder="Opcional" />
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

      {/* Step 3 — Funcionários */}
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
                  <Input value={f.nome} onChange={(e) => updateFuncionario(i, 'nome', e.target.value)} placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Input value={f.funcao} onChange={(e) => updateFuncionario(i, 'funcao', e.target.value)} placeholder="Ex: Pedreiro" />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-2 flex-1">
                    <Label>Horas</Label>
                    <Input type="number" step="0.5" min="0" value={f.horas} onChange={(e) => updateFuncionario(i, 'horas', e.target.value)} placeholder="8" />
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

      {/* Step 4 — Fotos */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fotos da Obra</CardTitle>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" />Adicionar Fotos
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFotoChange}
            />
            {fotos.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border py-12 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Clique para adicionar fotos</p>
                <p className="text-xs text-muted-foreground">(opcional)</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fotos.map((f, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={f.url} alt={`Foto ${i + 1}`} className="h-full w-full rounded-md object-cover border border-border" />
                    <button
                      onClick={() => removeFoto(i)}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div
                  className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-border cursor-pointer hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
              <Button onClick={() => setStep(5)}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5 — Assinatura */}
      {step === 5 && (
        <Card>
          <CardHeader><CardTitle>Assinatura do Responsável</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Assine abaixo. O RDO será enviado automaticamente para aprovação do cliente.</p>
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
              <Button variant="outline" onClick={() => setStep(4)}>Voltar</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar e Enviar para Aprovação'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
