import { db } from '@/app/db'
import { usuarios, empresas } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { getUsuarioOuErro } from '@/lib/server/getUsuario'
import { redirect } from 'next/navigation'

const funcaoConfig: Record<string, { label: string; variant: string }> = {
  admin: { label: 'Admin', variant: 'default' },
  engenheiro: { label: 'Engenheiro', variant: 'info' },
  encarregado: { label: 'Encarregado', variant: 'secondary' },
  aprovador_cliente: { label: 'Aprovador Cliente', variant: 'outline' },
  pendente: { label: 'Pendente', variant: 'warning' },
}

export default async function UsuariosPage() {
  // Apenas admin/engenheiro podem ver a lista de usuários
  let usuarioLogado
  try {
    usuarioLogado = await getUsuarioOuErro()
  } catch {
    redirect('/dashboard')
  }
  if (usuarioLogado.funcao !== 'admin' && usuarioLogado.funcao !== 'engenheiro') {
    redirect('/dashboard')
  }

  // Busca TODOS os usuários — incluindo pendentes (sem empresa)
  // LEFT JOIN para que usuários sem empresa apareçam com empresaNome = null
  const rows = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      funcao: usuarios.funcao,
      criadoEm: usuarios.criadoEm,
      empresaNome: empresas.nome,
      clerkId: usuarios.clerkId,
    })
    .from(usuarios)
    .leftJoin(empresas, eq(usuarios.empresaId, empresas.id))
    .orderBy(usuarios.funcao, usuarios.nome)

  const pendentes = rows.filter((u) => u.funcao === 'pendente')
  const ativos = rows.filter((u) => u.funcao !== 'pendente')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-muted-foreground">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            {pendentes.length > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''} aguardando atribuição
              </span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/usuarios/novo"><Plus className="h-4 w-4 mr-2" />Novo Usuário</Link>
        </Button>
      </div>

      {/* Usuários pendentes — destacados no topo */}
      {pendentes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-amber-200">
              <p className="text-sm font-semibold text-amber-800">
                ⏳ Aguardando atribuição ({pendentes.length})
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Esses usuários se cadastraram mas ainda não têm empresa ou papel atribuídos.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((u) => (
                  <TableRow key={u.id} className="bg-amber-50/50">
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="warning">Pendente</Badge>
                    </TableCell>
                    <TableCell>{u.criadoEm.toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/usuarios/${u.id}/editar`}>Atribuir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Usuários ativos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ativos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum usuário cadastrado
                  </TableCell>
                </TableRow>
              )}
              {ativos.map((u) => {
                const cfg = funcaoConfig[u.funcao ?? 'pendente'] ?? { label: u.funcao ?? '—', variant: 'secondary' }
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant={cfg.variant as any}>{cfg.label}</Badge></TableCell>
                    <TableCell>{u.empresaNome ?? '—'}</TableCell>
                    <TableCell>{u.criadoEm.toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/usuarios/${u.id}/editar`}>Editar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
