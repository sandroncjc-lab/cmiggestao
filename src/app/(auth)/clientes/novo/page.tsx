import { getUsuarioAtual } from '@/lib/server/getUsuario'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClienteForm } from './ClienteForm'

export default async function NovoClientePage() {
  const usuario = await getUsuarioAtual()

  if (!usuario) {
    return (
      <div className="max-w-2xl">
        <p className="text-destructive">
          Você não está vinculado a uma empresa. Contate o administrador.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo Cliente</h2>
          <p className="text-muted-foreground">Preencha os dados do cliente</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ClienteForm />
        </CardContent>
      </Card>
    </div>
  )
}
