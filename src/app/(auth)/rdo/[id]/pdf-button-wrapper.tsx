'use client'
/**
 * Wrapper client component para carregar PdfDownloadButton com ssr: false.
 * Next.js 16: dynamic({ ssr: false }) só pode ser usado em Client Components.
 */
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import type { RdoPdfData } from './pdf-download-button'

const PdfDownloadButton = dynamic(
  () => import('./pdf-download-button').then((m) => m.PdfDownloadButton),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled>PDF…</Button> }
)

export function PdfButtonWrapper({ data }: { data: RdoPdfData }) {
  return <PdfDownloadButton data={data} />
}
