/**
 * Componente @react-pdf/renderer para o RDO.
 * Usado apenas no servidor (API route). Não importar em Client Components.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

const cor = {
  primaria: '#1e40af',  // azul
  cinzaClaro: '#f1f5f9',
  cinzaMedio: '#94a3b8',
  cinzaEscuro: '#334155',
  borda: '#e2e8f0',
  branco: '#ffffff',
  verde: '#16a34a',
  amarelo: '#d97706',
  vermelho: '#dc2626',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: cor.cinzaEscuro, padding: 32 },

  // cabeçalho
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: cor.primaria },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: cor.primaria, marginBottom: 2 },
  headerSub: { fontSize: 9, color: cor.cinzaMedio },
  headerRight: { alignItems: 'flex-end' },
  headerMeta: { fontSize: 8, color: cor.cinzaMedio, marginBottom: 2 },

  // badges de status
  badgeBase: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeAprovado: { backgroundColor: '#dcfce7' },
  badgePendente: { backgroundColor: '#fef3c7' },
  badgeRascunho: { backgroundColor: '#f1f5f9' },
  badgeRejeitado: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  badgeTextAprovado: { color: cor.verde },
  badgeTextPendente: { color: cor.amarelo },
  badgeTextRascunho: { color: cor.cinzaMedio },
  badgeTextRejeitado: { color: cor.vermelho },

  // cards de resumo
  cards: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  card: { flex: 1, backgroundColor: cor.cinzaClaro, borderRadius: 6, padding: 10 },
  cardLabel: { fontSize: 7, color: cor.cinzaMedio, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: cor.cinzaEscuro },

  // seções
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: cor.primaria, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: cor.borda },

  // tabela
  tableHeader: { flexDirection: 'row', backgroundColor: cor.primaria, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 2 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: cor.branco },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: cor.borda },
  tableRowAlt: { backgroundColor: cor.cinzaClaro },
  tableCell: { fontSize: 8, color: cor.cinzaEscuro },

  // colunas funcionários
  colNome: { flex: 3 },
  colFuncao: { flex: 2 },
  colHoras: { flex: 1, textAlign: 'right' },

  // colunas atividades
  colDesc: { flex: 4 },
  colHorario: { flex: 2 },
  colObs: { flex: 3 },

  // colunas serviços
  colServico: { flex: 4 },
  colQtd: { flex: 1, textAlign: 'right' },
  colUnid: { flex: 1.5 },

  // assinaturas
  sigRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  sigBox: { flex: 1, borderWidth: 1, borderColor: cor.borda, borderRadius: 6, padding: 10 },
  sigLabel: { fontSize: 7, color: cor.cinzaMedio, marginBottom: 6 },
  sigImg: { width: '100%', height: 60, objectFit: 'contain' },
  sigEmpty: { height: 40, borderBottomWidth: 1, borderBottomColor: cor.borda },

  // rodapé
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: cor.borda, paddingTop: 6 },
  footerText: { fontSize: 7, color: cor.cinzaMedio },

  // rejeição
  rejeicao: { backgroundColor: '#fee2e2', borderRadius: 6, padding: 10, marginBottom: 14 },
  rejeicaoTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: cor.vermelho, marginBottom: 3 },
  rejeicaoText: { fontSize: 8, color: cor.vermelho },
})

const climaLabel: Record<string, string> = {
  ensolarado: '☀️ Ensolarado',
  nublado: '⛅ Nublado',
  chuvoso: '🌧️ Chuvoso',
  tempestade: '⛈️ Tempestade',
}

const statusLabel: Record<string, string> = {
  rascunho: 'Rascunho',
  pendente_aprovacao: 'Pendente Aprovação',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

interface RdoPdfProps {
  rdo: {
    id: string
    data: string
    clima: string
    status: string
    motivoRejeicao: string | null
    assinaturaInterna: string | null
    assinaturaCliente: string | null
    criadoEm: Date | string
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

function StatusBadge({ status }: { status: string }) {
  const styles = {
    aprovado: { box: s.badgeAprovado, text: s.badgeTextAprovado },
    pendente_aprovacao: { box: s.badgePendente, text: s.badgeTextPendente },
    rascunho: { box: s.badgeRascunho, text: s.badgeTextRascunho },
    rejeitado: { box: s.badgeRejeitado, text: s.badgeTextRejeitado },
  }
  const c = styles[status as keyof typeof styles] ?? styles.rascunho
  return (
    <View style={[s.badgeBase, c.box]}>
      <Text style={[s.badgeText, c.text]}>{statusLabel[status] ?? status}</Text>
    </View>
  )
}

export function RdoPdf({ rdo, obra, empresa, atividades, funcionarios, servicos, fotos }: RdoPdfProps) {
  const geradoEm = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const totalHoras = funcionarios.reduce((s, f) => s + Number(f.horasTrabalhadas), 0)

  return (
    <Document title={`RDO — ${obra.nome} — ${rdo.data}`} author={empresa}>
      <Page size="A4" style={s.page}>
        {/* ── Cabeçalho ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>Relatório Diário de Obra</Text>
            <Text style={s.headerSub}>{empresa}</Text>
          </View>
          <View style={s.headerRight}>
            <StatusBadge status={rdo.status} />
            <Text style={[s.headerMeta, { marginTop: 6 }]}>Gerado em {geradoEm}</Text>
          </View>
        </View>

        {/* ── Rejeição ── */}
        {rdo.motivoRejeicao && (
          <View style={s.rejeicao}>
            <Text style={s.rejeicaoTitle}>Motivo da Rejeição</Text>
            <Text style={s.rejeicaoText}>{rdo.motivoRejeicao}</Text>
          </View>
        )}

        {/* ── Cards de resumo ── */}
        <View style={s.cards}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Data</Text>
            <Text style={s.cardValue}>{rdo.data}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Obra</Text>
            <Text style={s.cardValue}>{obra.nome}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Cliente</Text>
            <Text style={s.cardValue}>{obra.clienteNome ?? '—'}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Clima</Text>
            <Text style={s.cardValue}>{climaLabel[rdo.clima] ?? rdo.clima}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Total HH</Text>
            <Text style={s.cardValue}>{totalHoras}h</Text>
          </View>
        </View>

        {/* ── Atividades ── */}
        {atividades.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Atividades Realizadas</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colDesc]}>Descrição</Text>
              <Text style={[s.tableHeaderText, s.colHorario]}>Horário</Text>
              <Text style={[s.tableHeaderText, s.colObs]}>Observações</Text>
            </View>
            {atividades.map((a, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.colDesc]}>{a.descricao}</Text>
                <Text style={[s.tableCell, s.colHorario]}>
                  {a.horaInicio && a.horaFim ? `${a.horaInicio} — ${a.horaFim}` : a.horaInicio ?? '—'}
                </Text>
                <Text style={[s.tableCell, s.colObs]}>{a.observacoes ?? '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Funcionários ── */}
        {funcionarios.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Funcionários e Horas Trabalhadas</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colNome]}>Nome</Text>
              <Text style={[s.tableHeaderText, s.colFuncao]}>Função</Text>
              <Text style={[s.tableHeaderText, s.colHoras]}>Horas</Text>
            </View>
            {funcionarios.map((f, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.colNome]}>{f.nomeFuncionario}</Text>
                <Text style={[s.tableCell, s.colFuncao]}>{f.funcao ?? '—'}</Text>
                <Text style={[s.tableCell, s.colHoras]}>{Number(f.horasTrabalhadas)}h</Text>
              </View>
            ))}
            {/* Total */}
            <View style={[s.tableRow, { backgroundColor: cor.cinzaClaro }]}>
              <Text style={[s.tableCell, s.colNome, { fontFamily: 'Helvetica-Bold' }]}>Total</Text>
              <Text style={[s.tableCell, s.colFuncao]}></Text>
              <Text style={[s.tableCell, s.colHoras, { fontFamily: 'Helvetica-Bold' }]}>{totalHoras}h</Text>
            </View>
          </View>
        )}

        {/* ── Serviços ── */}
        {servicos.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Serviços Executados</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colServico]}>Serviço</Text>
              <Text style={[s.tableHeaderText, s.colQtd]}>Qtd</Text>
              <Text style={[s.tableHeaderText, s.colUnid]}>Unidade</Text>
            </View>
            {servicos.map((sv, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.colServico]}>{sv.nomeServico ?? '—'}</Text>
                <Text style={[s.tableCell, s.colQtd]}>{Number(sv.quantidade)}</Text>
                <Text style={[s.tableCell, s.colUnid]}>{sv.unidade ?? '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Fotos ── */}
        {fotos.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Fotos da Obra ({fotos.length})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {fotos.slice(0, 6).map((f, i) => (
                <View key={i} style={{ width: '30%' }}>
                  <Image src={f.url} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }} />
                  {f.legenda && <Text style={{ fontSize: 7, color: cor.cinzaMedio, marginTop: 2 }}>{f.legenda}</Text>}
                </View>
              ))}
            </View>
            {fotos.length > 6 && (
              <Text style={{ fontSize: 7, color: cor.cinzaMedio, marginTop: 4 }}>
                + {fotos.length - 6} foto(s) não exibida(s) neste PDF.
              </Text>
            )}
          </View>
        )}

        {/* ── Assinaturas ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Assinaturas e Validação</Text>
          <View style={s.sigRow}>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>Responsável Interno (Encarregado)</Text>
              {rdo.assinaturaInterna
                ? <Image src={rdo.assinaturaInterna} style={s.sigImg} />
                : <View style={s.sigEmpty} />}
            </View>
            <View style={s.sigBox}>
              <Text style={s.sigLabel}>
                {rdo.nomeAssinanteExterno
                  ? `Assinatura Presencial — ${rdo.nomeAssinanteExterno}${rdo.cargoAssinanteExterno ? ` (${rdo.cargoAssinanteExterno})` : ''}`
                  : rdo.aprovadoPorNome
                    ? `Aprovado por ${rdo.aprovadoPorNome}`
                    : 'Aprovação do Cliente'}
              </Text>
              {rdo.assinaturaCliente
                ? <Image src={rdo.assinaturaCliente} style={s.sigImg} />
                : <View style={s.sigEmpty} />}
            </View>
          </View>
        </View>

        {/* ── Rodapé ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{empresa} — RDO {rdo.data} — {obra.nome}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
