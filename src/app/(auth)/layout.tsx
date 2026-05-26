import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getUsuarioAtual } from '@/lib/server/getUsuario'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioAtual()

  // Usuário autenticado no Clerk mas pendente (sem empresa/papel) →
  // página amigável fora do grupo (auth), sem risco de loop
  if (!usuario) {
    redirect('/aguardando')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar funcao={usuario.funcao} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
