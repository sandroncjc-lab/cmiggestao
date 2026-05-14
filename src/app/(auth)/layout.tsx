import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getUsuarioAtual } from '@/lib/server/getUsuario'

export const dynamic = 'force-dynamic'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual()
  const funcao = usuario?.funcao ?? 'admin'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar funcao={funcao} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
