import { db } from '@/app/db'
import { usuarios, empresas } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

const funcaoConfig: Record<string, { label: string; variant: string }> = {
  admin: { label: 'Admin', variant: 'default' },
  engenheiro: { label: 'Engenheiro', variant: 'info' },
  encarregado: { label: 'Encarregado', variant: 'secondary' },
  aprovador_cliente: { label: 'Aprovador Cliente', variant: 'outline' },
}

export default async function UsuariosPage() {
  const rows = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      funcao: usuarios.funcao,
      criadoEm: usuarios.criadoEm,
      empresaNome: empresas.nome,
    })
    .from(usuarios)
    .leftJoin(empresas, eq(usuarios.empresaId, empresas.id))
    .orderBy(usuarios.nome)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-muted-foreground">{rows.length} usuário{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/usuarios/novo"><Plus className="h-4 w-4 mr-2" />Novo Usuário</Link>
        </Button>
      </div>

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
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum usuário cadastrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((u) => {
                const cfg = funcaoConfig[u.funcao] ?? { label: u.funcao, variant: 'secondary' }
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
