import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
  '/aprovar(.*)',        // aprovação remota de RDO — sem login necessário
  '/api/rdo/(.*)/pdf',  // download de PDF — protegido pela session cookie do Clerk internamente
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()

  if (userId && isPublicRoute(request)) {
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
