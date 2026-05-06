'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  FileText,
  Timer,
  FolderOpen,
  CalendarDays,
  ChevronRight,
  CloudSun,
} from 'lucide-react'

const today = format(new Date(), 'yyyy-MM-dd')

const formatDatePtBR = (iso: string) =>
  format(new Date(iso + 'T00:00:00'), "dd 'de' MMMM yyyy", { locale: ptBR })

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockRdos = [
  {
    id: 1,
    obra: 'Edifício Comercial Torre Norte',
    clima: '☀️ Ensolarado',
    status: 'aprovado',
    funcionarios: 8,
    atividades: 3,
  },
  {
    id: 2,
    obra: 'Residencial Parque das Flores',
    clima: '⛅ Nublado',
    status: 'pendente_aprovacao',
    funcionarios: 5,
    atividades: 2,
  },
  {
    id: 3,
    obra: 'Galpão Industrial Sul',
    clima: '🌧️ Chuvoso',
    status: 'rascunho',
    funcionarios: 12,
    atividades: 4,
  },
]

const mockDocumentos = [
  {
    id: 1,
    nome: 'ART — Responsabilidade Técnica',
    obra: 'Edifício Comercial Torre Norte',
    tipo: 'ART',
    validade: '2026-12-31',
  },
  {
    id: 2,
    nome: 'Alvará de Construção',
    obra: 'Residencial Parque das Flores',
    tipo: 'Alvará',
    validade: '2026-08-15',
  },
  {
    id: 3,
    nome: 'Relatório de Ensaio Concreto',
    obra: 'Galpão Industrial Sul',
    tipo: 'Ensaio',
    validade: null,
  },
]

const mockHH = [
  {
    id: 1,
    funcionario: 'Carlos Souza',
    funcao: 'Pedreiro',
    obra: 'Edifício Comercial Torre Norte',
    normais: 8,
    extras: 1,
  },
  {
    id: 2,
    funcionario: 'Marcos Lima',
    funcao: 'Eletricista',
    obra: 'Residencial Parque das Flores',
    normais: 8,
    extras: 0,
  },
  {
    id: 3,
    funcionario: 'João Ferreira',
    funcao: 'Encarregado',
    obra: 'Galpão Industrial Sul',
    normais: 9,
    extras: 2,
  },
  {
    id: 4,
    funcionario: 'Paulo Rodrigues',
    funcao: 'Servente',
    obra: 'Galpão Industrial Sul',
    normais: 8,
    extras: 0,
  },
]

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_aprovacao: { label: 'Pendente', variant: 'outline' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiarioPage() {
  const [dataSelecionada, setDataSelecionada] = useState(today)

  const totalHH = mockHH.reduce((acc, r) => acc + r.normais + r.extras, 0)

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diário de Obras</h2>
          <p className="text-muted-foreground">
            {formatDatePtBR(dataSelecionada)}
          </p>
        </div>

        {/* Seletor de data */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="data-seletor" className="flex items-center gap-1.5 text-sm">
              <CalendarDays className="h-4 w-4" />
              Data
            </Label>
            <Input
              id="data-seletor"
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="w-44"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDataSelecionada(today)}
            disabled={dataSelecionada === today}
          >
            Hoje
          </Button>
        </div>
      </div>

      {/* Cards de resumo do dia */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RDOs do dia</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockRdos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mockRdos.filter(r => r.status === 'pendente_aprovacao').length} pendente(s) de aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentos</CardTitle>
            <FolderOpen className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockDocumentos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">registros no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Horas registradas</CardTitle>
            <Timer className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalHH}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mockHH.length} funcionário(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="rdo">
        <TabsList>
          <TabsTrigger value="rdo" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            RDOs
            <Badge variant="secondary" className="ml-1 text-xs">{mockRdos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documentos
            <Badge variant="secondary" className="ml-1 text-xs">{mockDocumentos.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="hh" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            HH
            <Badge variant="secondary" className="ml-1 text-xs">{mockHH.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab: RDOs */}
        <TabsContent value="rdo" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Obra</TableHead>
                    <TableHead>Clima</TableHead>
                    <TableHead>Funcionários</TableHead>
                    <TableHead>Atividades</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRdos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        Nenhum RDO registrado para esta data
                      </TableCell>
                    </TableRow>
                  ) : (
                    mockRdos.map((r) => {
                      const cfg = statusConfig[r.status]
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.obra}</TableCell>
                          <TableCell>{r.clima}</TableCell>
                          <TableCell>{r.funcionarios}</TableCell>
                          <TableCell>{r.atividades}</TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="gap-1">
                              Ver <ChevronRight className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDocumentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        Nenhum documento registrado para esta data
                      </TableCell>
                    </TableRow>
                  ) : (
                    mockDocumentos.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.nome}</TableCell>
                        <TableCell>{d.obra}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{d.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {d.validade ? formatDatePtBR(d.validade) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-1">
                            Ver <ChevronRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: HH */}
        <TabsContent value="hh" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>H. Normais</TableHead>
                    <TableHead>H. Extras</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockHH.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        Nenhum registro de HH para esta data
                      </TableCell>
                    </TableRow>
                  ) : (
                    mockHH.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.funcionario}</TableCell>
                        <TableCell>{r.funcao}</TableCell>
                        <TableCell>{r.obra}</TableCell>
                        <TableCell>{r.normais}h</TableCell>
                        <TableCell>{r.extras}h</TableCell>
                        <TableCell className="font-medium">{r.normais + r.extras}h</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
