/**
 * Componente @react-pdf/renderer para Relatório de Controle de Horas (HH).
 * Usado apenas no servidor (API route). Não importar em Client Components.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const cor = {
  primaria: '#1e40af',
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: cor.primaria },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: cor.primaria, marginBottom: 2 },
  headerSub: { fontSize: 9, color: cor.cinzaMedio },
  headerRight: { alignItems: 'flex-end' },
  headerMeta: { fontSize: 8, color: cor.cinzaMedio, marginBottom: 2 },

  // cards de resumo
  cards: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  card: { flex: 1, borderRadius: 6, padding: 12 },
  cardLabel: { fontSize: 7, color: cor.cinzaMedio, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  cardSub: { fontSize: 7, color: cor.cinzaMedio, marginTop: 2 },

  // barra de progresso
  barContainer: { backgroundColor: cor.borda, borderRadius: 3, height: 8, marginBottom: 16 },
  barFill: { borderRadius: 3, height: 8 },

  // seção
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: cor.primaria, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: cor.borda },

  // tabela
  tableHeader: { flexDirection: 'row', backgroundColor: cor.primaria, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 2 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: cor.branco },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: cor.borda },
  tableRowAlt: { backgroundColor: cor.cinzaClaro },
  tableCell: { fontSize: 8, color: cor.cinzaEscuro },
  tableCellBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: cor.cinzaEscuro },

  // colunas
  colData: { flex: 1.5 },
  colNome: { flex: 3 },
  colFuncao: { flex: 2 },
  colNormais: { flex: 1, textAlign: 'right' },
  colExtras: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },

  // rodapé
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: cor.borda, paddingTop: 6 },
  footerText: { fontSize: 7, color: cor.cinzaMedio },
})

export interface HhPdfProps {
  obra: { nome: string; clienteNome: string | null }
  empresa: string
  hhContrato: { totalHH: number }
  consumoRdo: number
  registros: {
    id: string
    nomeFuncionario: string
    funcao: string | null
    data: string
    horasNormais: string
    horasExtras: string
  }[]
  lancamentosRdo: {
    rdoId: string
    rdoData: string
    nomeFuncionario: string
    funcao: string | null
    horas: string
  }[]
}

export function HhPdf({ obra, empresa, hhContrato, consumoRdo, registros, lancamentosRdo }: HhPdfProps) {
  const geradoEm = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const contratado = hhContrato.totalHH
  const consumido = consumoRdo
  const saldo = Math.max(0, contratado - consumido)
  const pct = contratado > 0 ? Math.min(100, Math.round((consumido / contratado) * 100)) : 0
  const corBarra = pct >= 100 ? cor.vermelho : pct >= 80 ? cor.amarelo : cor.verde

  return (
    <Document title={`Controle HH — ${obra.nome}`} author={empresa}>
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Controle de Horas — HH</Text>
            <Text style={s.headerSub}>{empresa}</Text>
            <Text style={[s.headerSub, { marginTop: 2 }]}>Obra: {obra.nome}{obra.clienteNome ? ` | Cliente: ${obra.clienteNome}` : ''}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerMeta}>Gerado em {geradoEm}</Text>
          </View>
        </View>

        {/* Cards de resumo */}
        <View style={s.cards}>
          <View style={[s.card, { backgroundColor: cor.cinzaClaro }]}>
            <Text style={s.cardLabel}>Total Contratado</Text>
            <Text style={[s.cardValue, { color: cor.cinzaEscuro }]}>{contratado}h</Text>
          </View>
          <View style={[s.card, { backgroundColor: pct >= 100 ? '#fee2e2' : pct >= 80 ? '#fef3c7' : '#dcfce7' }]}>
            <Text style={s.cardLabel}>Consumido (RDOs)</Text>
            <Text style={[s.cardValue, { color: pct >= 100 ? cor.vermelho : pct >= 80 ? cor.amarelo : cor.verde }]}>{consumido.toFixed(1)}h</Text>
            <Text style={[s.cardSub, { color: pct >= 100 ? cor.vermelho : pct >= 80 ? cor.amarelo : cor.verde }]}>{pct}% utilizado</Text>
          </View>
          <View style={[s.card, { backgroundColor: saldo <= 0 ? '#fee2e2' : cor.cinzaClaro }]}>
            <Text style={s.cardLabel}>Saldo Disponível</Text>
            <Text style={[s.cardValue, { color: saldo <= 0 ? cor.vermelho : cor.verde }]}>{saldo.toFixed(1)}h</Text>
          </View>
        </View>

        {/* Barra de progresso */}
        <View style={s.barContainer}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: corBarra }]} />
        </View>

        {/* Lançamentos via RDO */}
        {lancamentosRdo.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Lançamentos de Horas por RDO ({lancamentosRdo.length} registros)</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colData]}>Data RDO</Text>
              <Text style={[s.tableHeaderText, s.colNome]}>Funcionário</Text>
              <Text style={[s.tableHeaderText, s.colFuncao]}>Função</Text>
              <Text style={[s.tableHeaderText, s.colTotal]}>Horas</Text>
            </View>
            {lancamentosRdo.map((r, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.tableCell, s.colData]}>{r.rdoData}</Text>
                <Text style={[s.tableCell, s.colNome]}>{r.nomeFuncionario}</Text>
                <Text style={[s.tableCell, s.colFuncao]}>{r.funcao ?? '—'}</Text>
                <Text style={[s.tableCell, s.colTotal]}>{Number(r.horas)}h</Text>
              </View>
            ))}
            {/* Total */}
            <View style={[s.tableRow, { backgroundColor: cor.cinzaClaro }]}>
              <Text style={[s.tableCellBold, s.colData]}>Total</Text>
              <Text style={[s.tableCell, s.colNome]}></Text>
              <Text style={[s.tableCell, s.colFuncao]}></Text>
              <Text style={[s.tableCellBold, s.colTotal]}>{consumido.toFixed(1)}h</Text>
            </View>
          </View>
        )}

        {/* Registros manuais */}
        {registros.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Registros Manuais de HH ({registros.length})</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, s.colData]}>Data</Text>
              <Text style={[s.tableHeaderText, s.colNome]}>Funcionário</Text>
              <Text style={[s.tableHeaderText, s.colFuncao]}>Função</Text>
              <Text style={[s.tableHeaderText, s.colNormais]}>Normal</Text>
              <Text style={[s.tableHeaderText, s.colExtras]}>Extra</Text>
              <Text style={[s.tableHeaderText, s.colTotal]}>Total</Text>
            </View>
            {registros.map((r, i) => {
              const total = Number(r.horasNormais) + Number(r.horasExtras)
              return (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.tableCell, s.colData]}>{r.data}</Text>
                  <Text style={[s.tableCell, s.colNome]}>{r.nomeFuncionario}</Text>
                  <Text style={[s.tableCell, s.colFuncao]}>{r.funcao ?? '—'}</Text>
                  <Text style={[s.tableCell, s.colNormais]}>{Number(r.horasNormais)}h</Text>
                  <Text style={[s.tableCell, s.colExtras]}>{Number(r.horasExtras)}h</Text>
                  <Text style={[s.tableCell, s.colTotal]}>{total.toFixed(1)}h</Text>
                </View>
              )
            })}
          </View>
        )}

        {lancamentosRdo.length === 0 && registros.length === 0 && (
          <Text style={{ fontSize: 9, color: cor.cinzaMedio, fontStyle: 'italic' }}>
            Nenhum lançamento de horas registrado para esta obra.
          </Text>
        )}

        {/* Rodapé */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{empresa} — Controle HH — {obra.nome}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
