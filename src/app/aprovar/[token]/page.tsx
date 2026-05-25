import { carregarRdoPorToken } from '@/lib/actions/rdo'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AprovarForm } from './aprovar-form'

const climaLabel: Record<string, string> = {
  ensolarado: '☀️ Ensolarado',
  nublado: '⛅ Nublado',
  chuvoso: '🌧️ Chuvoso',
  tempestade: '⛈️ Tempestade',
}

export default async function AprovarRdoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const dados = await carregarRdoPorToken(token)

  if (!dados) notFound()

  // Token expirado ou RDO já processado
  if (dados.erro) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">{dados.erro === 'EXPIRADO' ? '⏱️' : '✅'}</div>
          <h1 className="text-2xl font-bold text-slate-800">
            {dados.erro === 'EXPIRADO' ? 'Link Expirado' : 'RDO já processado'}
          </h1>
          <p className="text-slate-500">
            {dados.erro === 'EXPIRADO'
              ? 'Este link de aprovação expirou (validade de 7 dias). Solicite um novo envio ao responsável da obra.'
              : 'Este RDO já foi aprovado ou rejeitado anteriormente.'}
          </p>
        </div>
      </div>
    )
  }

  const { rdoRow, obraNome, clienteNome, atividades, funcionarios } = dados
  const totalHoras = funcionarios.reduce((s, f) => s + Number(f.horasTrabalhadas), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cabeçalho */}
      <div className="bg-blue-800 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wide">CMI Gestão de Obras</p>
          <h1 className="text-2xl font-bold mt-1">Aprovação de RDO</h1>
          <p className="text-blue-200 text-sm mt-1">{obraNome} — {rdoRow.data}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Data', value: rdoRow.data },
            { label: 'Obra', value: obraNome },
            { label: 'Cliente', value: clienteNome ?? '—' },
            { label: 'Clima', value: climaLabel[rdoRow.clima] ?? rdoRow.clima },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{c.label}</p>
              <p className="font-semibold text-slate-800 text-sm leading-tight">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Atividades */}
        {atividades.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atividades Realizadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {atividades.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <p className="font-medium text-sm text-slate-800">{a.descricao}</p>
                    {(a.horaInicio || a.horaFim) && (
                      <p className="text-xs text-slate-400 mt-0.5">{a.horaInicio} — {a.horaFim}</p>
                    )}
                    {a.observacoes && <p className="text-xs text-slate-500 mt-0.5">{a.observacoes}</p>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Funcionários */}
        {funcionarios.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Equipe — <span className="font-normal text-slate-500">{totalHoras}h total</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {funcionarios.map((f) => (
                  <li key={f.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-slate-800">{f.nomeFuncionario}</p>
                      {f.funcao && <p className="text-xs text-slate-400">{f.funcao}</p>}
                    </div>
                    <Badge variant="secondary">{Number(f.horasTrabalhadas)}h</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Formulário de aprovação/rejeição */}
        <AprovarForm token={token} />
      </div>
    </div>
  )
}
