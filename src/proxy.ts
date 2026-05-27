import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
  '/aprovar(.*)',        // aprovação remota de RDO — sem login necessário
  '/api/rdo/:id/pdf',   // download de PDF RDO
  '/api/hh/pdf',       // download de PDF HH
  '/aguardando',        // página amigável para usuários pendentes de atribuição
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()

  // Redireciona usuário logado que acessa sign-in/sign-up para o dashboard,
  // MAS NÃO redireciona /aprovar (aprovação remota deve ser acessível a qualquer um)
  const url = new URL(request.url)
  const isAuthPage = url.pathname.startsWith('/sign-in') || url.pathname.startsWith('/sign-up')
  if (userId && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
