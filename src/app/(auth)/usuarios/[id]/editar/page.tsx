import { carregarUsuarioParaEdicao } from '@/lib/actions/usuarios'
import { listarClientesComObras, listarObrasDoUsuario } from '@/lib/actions/responsaveis'
import { getUsuarioOuErro } from '@/lib/server/getUsuario'
import { notFound } from 'next/navigation'
import { EditarUsuarioForm } from './form'
import { AtribuirObrasForm } from './atribuir-obras-form'

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [dados, admin, clientesComObras, obrasAtuais] = await Promise.all([
    carregarUsuarioParaEdicao(id).catch(() => null),
    getUsuarioOuErro(),
    listarClientesComObras(),
    listarObrasDoUsuario(id),
  ])

  if (!dados) notFound()

  const isPendente = !dados.usuario.funcao || dados.usuario.funcao === 'pendente'

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">
          {isPendente ? 'Atribuir Usuário' : 'Editar Usuário'}
        </h2>
        <p className="text-muted-foreground">
          {isPendente
            ? 'Defina o papel, a empresa e as obras deste usuário'
            : 'Altere os dados e atribuições do usuário'}
        </p>
      </div>

      {/* Dados básicos */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b border-border pb-2">Dados do usuário</h3>
        <EditarUsuarioForm usuario={dados.usuario} empresas={dados.empresas} />
      </section>

      {/* Atribuição de obras */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b border-border pb-2">Obras atribuídas</h3>
        <AtribuirObrasForm
          usuarioId={id}
          usuarioFuncao={dados.usuario.funcao}
          adminEmpresaId={admin.empresaId}
          clientesComObras={clientesComObras}
          obrasAtuais={obrasAtuais}
        />
      </section>
    </div>
  )
}
