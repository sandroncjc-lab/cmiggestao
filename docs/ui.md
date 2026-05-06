# Padrões de UI — CMIG Gestão

## Regra fundamental

**Todo elemento de interface deve ser construído exclusivamente com componentes do shadcn/ui.**
Nenhum componente customizado de UI é permitido. Não crie wrappers, não reimplemente primitivos, não construa componentes visuais do zero.

Se o shadcn/ui não possui o componente que você precisa, adicione-o via CLI:

```bash
npx shadcn@latest add <nome-do-componente>
```

---

## Biblioteca de componentes

| Finalidade | Componente shadcn/ui |
|---|---|
| Contêiner de conteúdo | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| Entrada de texto | `Input`, `Textarea` |
| Seleção | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` |
| Rótulos | `Label` |
| Ações | `Button` (variantes: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) |
| Tabelas | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` |
| Diálogos / Modais | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` |
| Abas | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| Progresso | `Progress` |
| Separadores | `Separator` |
| Etiquetas de status | `Badge` (variantes: `default`, `secondary`, `destructive`, `outline`) |

Todos os componentes ficam em `src/components/ui/` e são instalados com `npx shadcn@latest add`.

---

## Ícones

Use exclusivamente **Lucide React** (já configurado em `components.json`).

```tsx
import { HardHat, FileText, Wrench } from 'lucide-react'
```

Não instale nem importe ícones de outras bibliotecas (Heroicons, React Icons, FontAwesome, etc.).

---

## Estilo e classes

- **Tailwind CSS v4** para espaçamento, tipografia, layout e cores.
- Use as variáveis de design token do shadcn/ui: `text-muted-foreground`, `bg-sidebar`, `border-sidebar-border`, `text-sidebar-primary-foreground`, etc. Não escreva cores hardcoded quando existir token equivalente.
- Combine classes condicionalmente com o utilitário `cn` de `@/lib/utils`:

```tsx
import { cn } from '@/lib/utils'

<div className={cn('base-class', condition && 'conditional-class')} />
```

---

## Configuração shadcn/ui

| Chave | Valor |
|---|---|
| Style | `radix-nova` |
| Base color | `neutral` |
| CSS variables | `true` |
| Icon library | `lucide` |
| Alias `ui` | `@/components/ui` |

---

## O que não fazer

| Proibido | Use em vez disso |
|---|---|
| Criar `<MyButton>`, `<CustomCard>`, etc. | `<Button>`, `<Card>` do shadcn/ui |
| Estilizar elementos HTML brutos (`<button>`, `<input>`) em páginas | Componentes shadcn/ui correspondentes |
| Importar de outras bibliotecas de UI (MUI, Chakra, Ant Design, etc.) | shadcn/ui + Tailwind |
| Criar componentes de layout globais visuais além dos já existentes em `src/components/layout/` | Reusar `Sidebar` e `Header` existentes |

---

## Estrutura de diretórios relevante

```
src/
  components/
    ui/          ← componentes shadcn/ui instalados (não editar manualmente)
    layout/      ← Sidebar e Header — os únicos componentes estruturais permitidos
  lib/
    utils.ts     ← utilitário cn()
```

---

## Formatação de datas

Use exclusivamente **date-fns** para formatar datas. Nunca use `toLocaleDateString`, `Intl.DateTimeFormat`, ou qualquer outra API nativa de formatação.

Instale a biblioteca caso ainda não esteja no projeto:

```bash
npm install date-fns
```

### Formato padrão

Todas as datas exibidas na interface devem seguir o padrão:

```
DD de MMMM YYYY
```

Exemplos:
- `01 de setembro 2026`
- `02 de outubro 2026`
- `03 de agosto 2026`
- `04 de fevereiro 2026`

### Implementação

```tsx
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

format(date, "dd 'de' MMMM yyyy", { locale: ptBR })
```

O token `'de'` está entre aspas simples para ser tratado como texto literal pelo date-fns.

### Utilitário recomendado

Centralize em `src/lib/utils.ts` para evitar repetição:

```ts
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd 'de' MMMM yyyy", { locale: ptBR })
}
```

Uso nas páginas:

```tsx
import { formatDate } from '@/lib/utils'

<span>{formatDate(contrato.dataInicio)}</span>
```

### O que não fazer

| Proibido | Use em vez disso |
|---|---|
| `new Date().toLocaleDateString('pt-BR', ...)` | `formatDate()` de `@/lib/utils` |
| `new Intl.DateTimeFormat(...)` | `formatDate()` de `@/lib/utils` |
| Formatos diferentes (DD/MM/YYYY, MM-DD-YYYY, etc.) | `dd 'de' MMMM yyyy` com `ptBR` |
| Importar `format` diretamente em cada arquivo sem locale | Sempre passar `{ locale: ptBR }` |

---

## Exemplo de uso correto

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HardHat } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ExemploPage() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Obras Ativas
        </CardTitle>
        <HardHat className="h-5 w-5 text-blue-600" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">12</div>
        <Badge variant="secondary" className="mt-2">em andamento</Badge>
        <Button className="mt-4 w-full">Ver detalhes</Button>
      </CardContent>
    </Card>
  )
}
```
