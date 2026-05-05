import { db } from '@/app/db'
import { obras } from '@/app/db/schema'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { RdoForm } from './rdo-form'

export default async function NovoRdoPage({
  searchParams,
}: {
  searchParams: Promise<{ obraId?: string }>
}) {
  const { obraId } = await searchParams
  const obrasList = await db.select().from(obras).orderBy(obras.nome)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rdo"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo RDO</h2>
          <p className="text-muted-foreground">Relatório Diário de Obras</p>
        </div>
      </div>
      <RdoForm obras={obrasList} defaultObraId={obraId} />
    </div>
  )
}
