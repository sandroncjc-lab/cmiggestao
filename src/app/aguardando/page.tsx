import { UserButton, SignOutButton } from '@clerk/nextjs'
import { Clock } from 'lucide-react'

export default function AguardandoPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header mínimo com UserButton para o usuário poder sair */}
      <header className="flex h-16 items-center justify-end border-b border-border bg-white px-6">
        <UserButton />
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mx-auto">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">
              Acesso em configuração
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Seu cadastro foi recebido com sucesso!<br />
              Aguarde o administrador atribuir seu papel e empresa para liberar o acesso.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Se precisar de acesso urgente, entre em contato com o responsável pelo sistema.
          </div>

          <SignOutButton>
            <button className="text-sm text-slate-500 underline hover:text-slate-700">
              Sair da conta
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}
