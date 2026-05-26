'use client'
/**
 * Gera o PDF do RDO diretamente no browser via @react-pdf/renderer (Web Worker).
 * Evita dependência de API route e problemas de bundling no Vercel.
 */
import { PDFDownloadLink } from '@react-pdf/renderer'
import { RdoPdf } from '@/app/api/rdo/[id]/pdf/rdo-pdf'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface RdoPdfData {
  rdo: {
    id: string
    data: string
    clima: string
    status: string
    motivoRejeicao: string | null
    assinaturaInterna: string | null
    assinaturaCliente: string | null
    criadoEm: string // string para sobreviver serialização server→client
    nomeAssinanteExterno?: string | null
    cargoAssinanteExterno?: string | null
    aprovadoPorNome?: string | null
  }
  obra: { nome: string; clienteNome: string | null }
  empresa: string
  atividades: { descricao: string; horaInicio: string | null; horaFim: string | null; observacoes: string | null }[]
  funcionarios: { nomeFuncionario: string; funcao: string | null; horasTrabalhadas: string }[]
  servicos: { nomeServico: string | null; quantidade: string; unidade: string | null; observacoes: string | null }[]
  fotos: { url: string; legenda: string | null }[]
}

export function PdfDownloadButton({ data }: { data: RdoPdfData }) {
  const safe = data.obra.nome.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').replace(/\s+/g, '_')
  const filename = `RDO_${safe}_${data.rdo.data}.pdf`

  return (
    <PDFDownloadLink
      document={<RdoPdf {...data} />}
      fileName={filename}
    >
      {({ loading, error }) => (
        <Button variant="outline" size="sm" disabled={loading} title={error ? String(error) : undefined}>
          <FileDown className="h-4 w-4 mr-2" />
          {error ? 'Erro PDF' : loading ? 'Gerando…' : 'PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
