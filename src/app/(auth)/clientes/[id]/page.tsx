import { db } from '@/app/db'
import { clientes, obras, contratos, documentos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Pencil } from 'lucide-react'

const statusObraLabel: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  planejada: { label: 'Planejada', variant: 'secondary' },
  em_andamento: { label: 'Em Andamento', variant: 'info' as any },
  pausada: { label: 'Pausada', variant: 'warning' },
  concluida: { label: 'Concluída', variant: 'success' },
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1)
  if (!cliente) notFound()

  const [obrasDoCliente, contratosDoCliente, documentosDoCliente] = await Promise.all([
    db.select().from(obras).where(eq(obras.clienteId, id)).orderBy(obras.criadoEm),
    db.select().from(contratos).where(eq(contratos.clienteId, id)).orderBy(contratos.criadoEm),
    db.select().from(documentos).where(eq(documentos.clienteId, id)).orderBy(documentos.criadoEm),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{cliente.nome}</h2>
            <p className="text-muted-foreground">{cliente.documento ?? 'Sem documento'}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/clientes/${id}/editar`}><Pencil className="h-4 w-4 mr-2" />Editar</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{cliente.email ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Telefone</p>
            <p className="font-medium">{cliente.telefone ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Endereço</p>
            <p className="font-medium">{cliente.endereco ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="obras">
        <TabsList>
          <TabsTrigger value="obras">Obras ({obrasDoCliente.length})</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contratosDoCliente.length})</TabsTrigger>
          <TabsTrigger value="documentos">Documentos ({documentosDoCliente.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="obras">
          <Card>
            <CardContent className="p-0">
              {obrasDoCliente.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">Nenhuma obra vinculada</p>
              ) : (
                <ul className="divide-y divide-border">
                  {obrasDoCliente.map((o) => {
                    const s = statusObraLabel[o.status] ?? { label: o.status, variant: 'secondary' as const }
                    return (
                      <li key={o.id} className="flex items-center justify-between p-4">
                        <Link href={`/obras/${o.id}`} className="font-medium hover:underline">{o.nome}</Link>
                        <Badge variant={s.variant as any}>{s.label}</Badge>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos">
          <Card>
            <CardContent className="p-0">
              {contratosDoCliente.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">Nenhum contrato vinculado</p>
              ) : (
                <ul className="divide-y divide-border">
                  {contratosDoCliente.map((c) => (
                    <li key={c.id} className="flex items-center justify-between p-4">
                      <div>
                        <Link href={`/contratos/${c.id}`} className="font-medium hover:underline">{c.numero}</Link>
                        <p className="text-sm text-muted-foreground">R$ {Number(c.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <Badge>{c.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardContent className="p-0">
              {documentosDoCliente.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">Nenhum documento vinculado</p>
              ) : (
                <ul className="divide-y divide-border">
                  {documentosDoCliente.map((d) => (
                    <li key={d.id} className="flex items-center justify-between p-4">
                      <span className="font-medium">{d.titulo}</span>
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">Visualizar</Button>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
