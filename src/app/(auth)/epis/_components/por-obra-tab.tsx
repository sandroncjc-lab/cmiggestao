'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HardHat, Package } from 'lucide-react'

interface EpiPorObra {
  obraId: string
  epiId: string
  epiTipo: string
  epiCa: string | null
  totalDistribuido: number
}

interface ObraInfo {
  id: string
  nome: string
  encarregadoNome: string | null
  status: string
}

interface Props {
  agrupado: EpiPorObra[]
  obras: ObraInfo[]
  onNovaDistribuicao?: (obraId: string) => void
}

export function PorObraTab({ agrupado, obras }: Props) {
  const [obraFiltro, setObraFiltro] = useState<string | null>(null)

  const obraIds = [...new Set(agrupado.map(r => r.obraId))]
  const obrasComEpis = obraIds
    .map(id => obras.find(o => o.id === id))
    .filter(Boolean) as ObraInfo[]

  const lista = obraFiltro ? obrasComEpis.filter(o => o.id === obraFiltro) : obrasComEpis

  if (agrupado.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Package className="h-10 w-10 opacity-30" />
        <p>Nenhuma distribuição registrada ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {obrasComEpis.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={obraFiltro === null ? 'default' : 'outline'}
            onClick={() => setObraFiltro(null)}>
            Todas as obras
          </Button>
          {obrasComEpis.map(o => (
            <Button key={o.id} size="sm" variant={obraFiltro === o.id ? 'default' : 'outline'}
              onClick={() => setObraFiltro(o.id)}>
              {o.nome}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map(obra => {
          const episDaObra = agrupado.filter(r => r.obraId === obra.id)
          const totalUnidades = episDaObra.reduce((acc, r) => acc + r.totalDistribuido, 0)

          return (
            <Card key={obra.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardHat className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <CardTitle className="text-base">{obra.nome}</CardTitle>
                      {obra.encarregadoNome && (
                        <p className="text-xs text-muted-foreground">
                          Encarregado: {obra.encarregadoNome}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">{totalUnidades} un. total</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {episDaObra.map(r => (
                    <li key={r.epiId} className="flex items-center justify-between py-2 text-sm">
                      <span>
                        {r.epiTipo}
                        {r.epiCa && <span className="ml-1 text-xs text-muted-foreground font-mono">CA {r.epiCa}</span>}
                      </span>
                      <span className="font-medium">{r.totalDistribuido} un.</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
