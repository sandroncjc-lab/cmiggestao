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
interface Servico { id: string; nome: string; unidade: string | null; obraId: string }
interface Atividade { descricao: string; horaInicio: string; horaFim: string; observacoes: string }
interface Funcionario { nome: string; funcao: string; horas: string }
interface ServicoExec { servicoId: string; quantidade: string; observacoes: string }

// Detecta se o canvas tem algum traço (não está em branco)
function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return true
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  // O canvas é criado com fundo transparente (alpha=0); qualquer pixel desenhado tem alpha>0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false
  }
  return true
}

export function RdoForm({
  obras,
  servicosPorObra,
  defaultObraId,
}: {
  obras: Obra[]
  servicosPorObra: Record<string, Servico[]>
  defaultObraId?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 — Dados Gerais
  const [obraId, setObraId] = useState(defaultObraId ?? '')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [clima, setClima] = useState('ensolarado')

  // Step 2 — Atividades
  const [atividades, setAtividades] = useState<Atividade[]>([
    { descricao: '', horaInicio: '', horaFim: '', observacoes: '' },
  ])

  // Step 3 — Funcionários
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([{ nome: '', funcao: '', horas: '' }])

  // Step 4 — Serviços Executados
  const [servicosExec, setServicosExec] = useState<ServicoExec[]>([])

  // Step 5 — Fotos
  const [fotos, setFotos] = useState<{ url: string; file: File }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 6 — Assinatura
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)

  const obraSelecionada = obras.find((o) => o.id === obraId)
  const servicosDaObra = obraId ? (servicosPorObra[obraId] ?? []) : []

  // ── Atividades ──────────────────────────────────────────────────────────────
  function addAtividade() {
    setAtividades((p) => [...p, { descricao: '', horaInicio: '', horaFim: '', observacoes: '' }])
  }
  function removeAtividade(i: number) { setAtividades((p) => p.filter((_, idx) => idx !== i)) }
  function updateAtividade(i: number, field: keyof Atividade, value: string) {
    setAtividades((p) => p.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)))
  }

  // ── Funcionários ────────────────────────────────────────────────────────────
  function addFuncionario() { setFuncionarios((p) => [...p, { nome: '', funcao: '', horas: '' }]) }
  function removeFuncionario(i: number) { setFuncionarios((p) => p.filter((_, idx) => idx !== i)) }
  function updateFuncionario(i: number, field: keyof Funcionario, value: string) {
    setFuncionarios((p) => p.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)))
  }

  // ── Serviços Executados ─────────────────────────────────────────────────────
  function addServico() {
    setServicosExec((p) => [...p, { servicoId: '', quantidade: '', observacoes: '' }])
  }
  function removeServico(i: number) { setServicosExec((p) => p.filter((_, idx) => idx !== i)) }
  function updateServico(i: number, field: keyof ServicoExec, value: string) {
    setServicosExec((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
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
  function removeFoto(i: number) { setFotos((p) => p.filter((_, idx) => idx !== i)) }

  // ── Canvas ──────────────────────────────────────────────────────────────────
  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
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
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
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
    const c = canvasRef.current
    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(enviarParaAprovacao: boolean) {
    if (enviarParaAprovacao) {
      const canvas = canvasRef.current
      if (!canvas || isCanvasBlank(canvas)) {
        toast.error('Desenhe sua assinatura antes de enviar para aprovação')
        return
      }
    }

    setLoading(true)
    try {
      const assinatura = enviarParaAprovacao
        ? (canvasRef.current?.toDataURL('image/png') ?? null)
        : null

      const result = await criarRdoCompleto({
        obraId,
        data,
        clima: clima as 'ensolarado' | 'nublado' | 'chuvoso' | 'tempestade',
        atividades: atividades.filter((a) => a.descricao.trim()),
        funcionarios: funcionarios.filter((f) => f.nome.trim()),
        servicos: servicosExec
          .filter((s) => s.servicoId && Number(s.quantidade) > 0)
          .map((s) => ({ servicoId: s.servicoId, quantidade: Number(s.quantidade), observacoes: s.observacoes })),
        fotos: fotos.map((f) => f.url),
        assinaturaInterna: assinatura,
      })

      if (result.success) {
        toast.success(enviarParaAprovacao ? 'RDO enviado para aprovação!' : 'RDO salvo como rascunho!')
        router.push('/rdo')
      } else {
        toast.error(result.error ?? 'Erro ao salvar RDO')
      }
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Dados Gerais', 'Atividades', 'Funcionários', 'Serviços', 'Fotos', 'Assinatura']

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
                step === i + 1
                  ? 'bg-primary text-primary-foreground'
                  : i < step - 1
                    ? 'bg-primary/20 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {i + 1}
            </button>
            <span className={`text-sm hidden sm:block ${step === i + 1 ? 'font-medium' : 'text-muted-foreground'}`}>
              {s}
            </span>
            {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* ── Step 1 — Dados Gerais ── */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Obra *</Label>
              <Select value={obraId} onChange={(e) => setObraId(e.target.value)} required>
                <option value="">Selecione a obra</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
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
                      Esta obra não tem aprovador vinculado. O RDO pode ser salvo mas o cliente não conseguirá aprovar.{' '}
                      <a href="/obras" className="underline font-medium">Configure o aprovador na obra</a>.
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

      {/* ── Step 2 — Atividades ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Atividades</CardTitle>
              <Button size="sm" variant="outline" onClick={addAtividade}>
                <Plus className="h-4 w-4 mr-1" />Adicionar
              </Button>
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
                  <Input
                    value={a.descricao}
                    onChange={(e) => updateAtividade(i, 'descricao', e.target.value)}
                    placeholder="Descreva a atividade realizada"
                  />
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
                  <Textarea
                    value={a.observacoes}
                    onChange={(e) => updateAtividade(i, 'observacoes', e.target.value)}
                    placeholder="Opcional"
                    rows={2}
                  />
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

      {/* ── Step 3 — Funcionários ── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Funcionários</CardTitle>
              <Button size="sm" variant="outline" onClick={addFuncionario}>
                <Plus className="h-4 w-4 mr-1" />Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {funcionarios.map((f, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={f.nome}
                    onChange={(e) => updateFuncionario(i, 'nome', e.target.value)}
                    placeholder="Nome do funcionário"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Input
                    value={f.funcao}
                    onChange={(e) => updateFuncionario(i, 'funcao', e.target.value)}
                    placeholder="Ex: Soldador"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="space-y-2 flex-1">
                    <Label>Horas</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={f.horas}
                      onChange={(e) => updateFuncionario(i, 'horas', e.target.value)}
                      placeholder="8"
                    />
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

      {/* ── Step 4 — Serviços Executados ── */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Serviços Executados</CardTitle>
              {servicosDaObra.length > 0 && (
                <Button size="sm" variant="outline" onClick={addServico}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {servicosDaObra.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum serviço cadastrado para esta obra.{' '}
                <a href={`/obras/${obraId}/servicos/novo`} className="underline">Cadastrar serviço</a>
              </p>
            ) : servicosExec.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground">Nenhum serviço adicionado ainda.</p>
                <Button variant="outline" onClick={addServico}>
                  <Plus className="h-4 w-4 mr-2" />Adicionar serviço executado
                </Button>
              </div>
            ) : (
              servicosExec.map((s, i) => (
                <div key={i} className="space-y-3 rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Serviço {i + 1}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeServico(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Serviço *</Label>
                      <Select value={s.servicoId} onChange={(e) => updateServico(i, 'servicoId', e.target.value)}>
                        <option value="">Selecione</option>
                        {servicosDaObra.map((sv) => (
                          <option key={sv.id} value={sv.id}>{sv.nome}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Quantidade
                        {s.servicoId && (
                          <span className="ml-1 text-muted-foreground">
                            ({servicosDaObra.find((sv) => sv.id === s.servicoId)?.unidade ?? '—'})
                          </span>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={s.quantidade}
                        onChange={(e) => updateServico(i, 'quantidade', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input
                      value={s.observacoes}
                      onChange={(e) => updateServico(i, 'observacoes', e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
              <Button onClick={() => setStep(5)}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5 — Fotos ── */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fotos da Obra</CardTitle>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" />Adicionar
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
                    <img
                      src={f.url}
                      alt={`Foto ${i + 1}`}
                      className="h-full w-full rounded-md object-cover border border-border"
                    />
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
              <Button variant="outline" onClick={() => setStep(4)}>Voltar</Button>
              <Button onClick={() => setStep(6)}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 6 — Assinatura ── */}
      {step === 6 && (
        <Card>
          <CardHeader><CardTitle>Assinatura do Responsável</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assine abaixo para enviar para aprovação do cliente. Ou salve como rascunho e assine depois.
            </p>
            <div className="rounded-md border border-input overflow-hidden bg-white">
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
              <RotateCcw className="h-4 w-4 mr-2" />Limpar Assinatura
            </Button>
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setStep(5)}>Voltar</Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar Rascunho'}
                </Button>
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Assinar e Enviar para Aprovação'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
