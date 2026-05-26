import { carregarUsuarioParaEdicao } from '@/lib/actions/usuarios'
import { notFound, redirect } from 'next/navigation'
import { EditarUsuarioForm } from './form'

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dados = await carregarUsuarioParaEdicao(id).catch(() => null)
  if (!dados) notFound()

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {dados.usuario.funcao === 'pendente' ? 'Atribuir Usuário' : 'Editar Usuário'}
        </h2>
        <p className="text-muted-foreground">
          {dados.usuario.funcao === 'pendente'
            ? 'Defina o papel e a empresa deste usuário pendente'
            : 'Altere os dados do usuário'}
        </p>
      </div>
      <EditarUsuarioForm usuario={dados.usuario} empresas={dados.empresas} />
    </div>
  )
}
