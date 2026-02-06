# Sistema de Design - CRM

> **Para Desenvolvedores** | Tokens, cores, tipografia e padrões visuais

## Índice

- [Paleta de Cores](#paleta-de-cores)
- [Tipografia](#tipografia)
- [Espaçamento](#espaçamento)
- [Sombras e Bordas](#sombras-e-bordas)
- [Tokens de Design](#tokens-de-design)
- [Ícones](#ícones)

---

## Paleta de Cores

### Cores Primárias

As cores primárias são usadas para ações principais, links e elementos de destaque.

```
primary-50:  #EFF6FF  (fundo destaque)
primary-100: #DBEAFE  (fundo hover)
primary-200: #BFDBFE  (bordas)
primary-300: #93C5FD  (estados)
primary-400: #60A5FA  (elementos)
primary-500: #3B82F6  (ação principal)
primary-600: #2563EB  (texto/links)
primary-700: #1D4ED8  (hover)
primary-800: #1E40AF  (foco)
primary-900: #1E3A8A  (texto escuro)
```

**Uso:**
- `primary-600`: Links, botões primários, texto de destaque
- `primary-500`: Botões, badges primários
- `primary-100`: Backgrounds de destaque, badges suaves
- `primary-50`: Fundos de seção, highlights

### Cores Semânticas

#### Sucesso (Success)

```
success-50:  #F0FDF4
success-100: #DCFCE7
success-500: #22C55E
success-600: #16A34A
success-700: #15803D
```

**Uso:** Confirmações, status positivos, badges "Ativo"

#### Erro (Error)

```
error-50:   #FEF2F2
error-100:  #FEE2E2
error-500:  #EF4444
error-600:  #DC2626
error-700:  #B91C1C
```

**Uso:** Erros de validação, exclusões, status negativos

#### Aviso (Warning)

```
warning-50:  #FFFBEB
warning-100: #FEF3C7
warning-500: #F59E0B
warning-600: #D97706
warning-700: #B45309
```

**Uso:** Alertas, estados de atenção, pendências

#### Informação (Info)

```
info-50:   #EFF6FF
info-100:  #DBEAFE
info-500:  #3B82F6
info-600:  #2563EB
info-700:  #1D4ED8
```

**Uso:** Dicas, informações gerais, toasts informativos

### Cores Neutras

#### Cinza (Gray)

```
gray-50:   #F9FAFB   (fundo página)
gray-100:  #F3F4F6   (cards, hover)
gray-200:  #E5E7EB   (bordas)
gray-300:  #D1D5DB   (bordas input)
gray-400:  #9CA3AF   (placeholders)
gray-500:  #6B7280   (texto secundário)
gray-600:  #4B5563   (texto body)
gray-700:  #374151   (labels)
gray-800:  #1F2937   (títulos)
gray-900:  #111827   (texto principal)
```

**Uso:**
- `gray-900`: Títulos, texto principal
- `gray-700`: Labels, texto de formulário
- `gray-500`: Descrições, metadados
- `gray-400`: Placeholders (evitar para texto legível)
- `gray-200`: Bordas, divisores
- `gray-100`: Fundo de cards, hover states
- `gray-50`: Fundo de página

### Combinações de Contraste

#### ✅ Combinations Aprovadas (WCAG AA)

| Texto | Fundo | Contraste | Uso |
|-------|-------|-----------|-----|
| gray-900 | white | 16.1:1 | Títulos |
| gray-700 | white | 10.4:1 | Body text |
| gray-600 | white | 7.5:1 | Descrições |
| primary-600 | white | 4.6:1 | Links |
| error-600 | white | 5.3:1 | Erros |
| white | primary-600 | 4.5:1 | Botões primários |
| white | error-600 | 4.5:1 | Botões perigo |

#### ⚠️ Combinações a Evitar

| Texto | Fundo | Contraste | Problema |
|-------|-------|-----------|----------|
| gray-400 | white | 3.9:1 | Placeholders apenas |
| gray-500 | gray-100 | 4.2:1 | Verificar contexto |

---

## Tipografia

### Fonte

**Fonte Principal:** System font stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

**Monospace (código):**
```css
font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
```

### Escala de Tamanhos

```
text-xs:   0.75rem  (12px)  - Captions, badges pequenos
text-sm:   0.875rem (14px)  - Labels, botões pequenos
text-base: 1rem     (16px)  - Body padrão
text-lg:   1.125rem (18px)  - Subtítulos
text-xl:   1.25rem  (20px)  - Títulos pequenos
text-2xl:  1.5rem   (24px)  - Títulos de seção
text-3xl:  1.875rem (30px)  - Títulos de página
text-4xl:  2.25rem  (36px)  - Hero titles
```

### Hierarquia Visual

#### Página
```
Título da Página:     text-3xl, font-bold, gray-900
Descrição:            text-base, gray-600
```

#### Seção
```
Título da Seção:      text-xl, font-semibold, gray-800
Subtítulo:            text-sm, gray-500
```

#### Formulários
```
Label:                text-sm, font-medium, gray-700
Input:                text-base, gray-900
Placeholder:          text-base, gray-400
Error:                text-sm, error-600
Help Text:            text-sm, gray-500
```

#### Tabelas
```
Header:               text-xs, font-semibold, gray-700, uppercase
Célula:               text-sm, gray-900
```

### Peso de Fonte

```
font-normal:  400 - Texto body
font-medium:  500 - Labels, botões
font-semibold: 600 - Títulos, destaques
font-bold:    700 - Títulos principais
```

### Altura de Linha

```
leading-none:    1     - Títulos grandes
leading-tight:   1.25  - Títulos
leading-snug:    1.375 - Headlines
leading-normal:  1.5   - Body text (padrão)
leading-relaxed: 1.625 - Texto longo
```

---

## Espaçamento

### Sistema de 4px (0.25rem)

Baseado no sistema de 4px para consistência.

```
0:   0px    - Sem espaçamento
0.5: 2px    - Micro ajustes
1:   4px    - Ícones pequenos, gaps mínimos
2:   8px    - Ícones, badges
3:   12px   - Botões pequenos
4:   16px   - Cards padding, gaps
5:   20px   - - (não usado frequentemente)
6:   24px   - Seções, grandes gaps
8:   32px   - Espaçamento entre seções
10:  40px   - Grande separação
12:  48px   - Layout
16:  64px   - Espaçamento de página
20:  80px   - Hero sections
```

### Padrões de Uso

#### Componentes
```
Button padding:     px-4 py-2    (16px 8px)
Input padding:      px-3 py-2    (12px 8px)
Card padding:       p-6          (24px)
Badge padding:      px-3 py-1    (12px 4px)
```

#### Layout
```
Container:          max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Page padding:       py-6 ou py-8
Section gap:        space-y-6
Form gap:           space-y-4
```

#### Grid
```
Grid padrão:        grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
Lista horizontal:   flex gap-4
Lista vertical:     flex flex-col gap-2
```

---

## Sombras e Bordas

### Sombras

```
shadow-sm:    0 1px 2px 0 rgba(0, 0, 0, 0.05)   - Inputs, badges
shadow:       0 1px 3px 0 rgba(0, 0, 0, 0.1)    - Cards padrão
shadow-md:    0 4px 6px -1px rgba(0, 0, 0, 0.1) - Dropdowns, modais
shadow-lg:    0 10px 15px -3px rgba(0, 0, 0, 0.1) - Modais, toasts
shadow-xl:    0 20px 25px -5px rgba(0, 0, 0, 0.1) - Overlays
```

### Bordas

```
border:      1px solid - Padrão
border-0:    0         - Sem borda
border-2:    2px       - Destaque
border-4:    4px       - Destaque forte
```

### Cores de Borda

```
border-gray-200:    Bordas padrão
border-gray-300:    Inputs
border-primary-500: Inputs focados
border-error-500:   Inputs com erro
```

### Bordas Arredondadas

```
rounded-none: 0       - Quadrado
rounded-sm:   2px     - Leve
rounded:      4px     - Botões padrão
rounded-md:   6px     - Inputs, cards
rounded-lg:   8px     - Cards grandes
rounded-xl:   12px    - Modais
rounded-2xl:  16px    - Destaque
rounded-full: 9999px  - Pills, badges, avatares
```

---

## Tokens de Design

### Variáveis CSS

As variáveis CSS são geradas automaticamente pelo Tailwind. Para casos especiais:

```css
:root {
  /* Cores da marca */
  --color-primary: #2563EB;
  --color-primary-dark: #1D4ED8;
  
  /* Espaçamento */
  --space-unit: 4px;
  --space-xs: calc(var(--space-unit) * 1);
  --space-sm: calc(var(--space-unit) * 2);
  --space-md: calc(var(--space-unit) * 4);
  --space-lg: calc(var(--space-unit) * 6);
  --space-xl: calc(var(--space-unit) * 8);
  
  /* Sombras customizadas */
  --shadow-card: 0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-modal: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  
  /* Transições */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
}
```

### Tokens Tailwind

Configuração em `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#EFF6FF',
        100: '#DBEAFE',
        // ... até 900
      },
    },
    spacing: {
      '18': '4.5rem',
      '88': '22rem',
    },
    boxShadow: {
      'card': '0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
    },
  },
}
```

---

## Ícones

### Biblioteca

Usamos **Heroicons** (versão outline por padrão).

**Importação:**
```tsx
import { IconName } from '@heroicons/react/24/outline';
// ou
import { IconName } from '@heroicons/react/24/solid';
```

### Tamanhos

```
size-4:  16px - Botões pequenos, tabelas
size-5:  20px - Inputs, labels
size-6:  24px - Botões padrão, navegação (padrão Heroicons)
size-8:  32px - Empty states, destaque
size-10: 40px - Ícones grandes
size-12: 48px - Feature icons
```

### Uso com Acessibilidade

Sempre use `IconWrapper` ou adicione `aria-hidden`:

```tsx
// Ícone decorativo (dentro de botão)
<button aria-label="Editar">
  <PencilIcon className="w-4 h-4" aria-hidden="true" />
</button>

// Ícone standalone
<span aria-label="Notificação">
  <BellIcon className="w-6 h-6" />
</span>
```

### Ícones Comuns

| Uso | Ícone | Import |
|-----|-------|--------|
| Adicionar | PlusIcon | `@heroicons/react/24/outline` |
| Editar | PencilIcon | `@heroicons/react/24/outline` |
| Excluir | TrashIcon | `@heroicons/react/24/outline` |
| Salvar | CheckIcon | `@heroicons/react/24/outline` |
| Cancelar | XMarkIcon | `@heroicons/react/24/outline` |
| Buscar | MagnifyingGlassIcon | `@heroicons/react/24/outline` |
| Menu | Bars3Icon | `@heroicons/react/24/outline` |
| Usuário | UserIcon | `@heroicons/react/24/outline` |
| Email | EnvelopeIcon | `@heroicons/react/24/outline` |
| Telefone | PhoneIcon | `@heroicons/react/24/outline` |
| Empresa | BuildingOfficeIcon | `@heroicons/react/24/outline` |
| Calendário | CalendarIcon | `@heroicons/react/24/outline` |
| Relógio | ClockIcon | `@heroicons/react/24/outline` |
| Localização | MapPinIcon | `@heroicons/react/24/outline` |
| Configurações | CogIcon | `@heroicons/react/24/outline` |
| Sair | ArrowRightOnRectangleIcon | `@heroicons/react/24/outline` |

---

## Padrões de Estado

### Hover

```
Background:  lighten 5-10%
Cor:         darken 10%
Sombra:      aumentar um nível
Transição:   200ms ease
```

### Focus

```
Outline:     ring-2 ring-primary-500 ring-offset-2
Cor:         primary-500
Transição:   150ms ease
```

### Active

```
Transform:   scale(0.98) ou translateY(1px)
Background:  darken 5%
```

### Disabled

```
Opacity:     50%
Cursor:      not-allowed
Pointer:     none
Background:  gray-100
Cor:         gray-400
```

---

## Animações

### Durações

```
duration-150: 150ms - Fast (hover, focus)
duration-200: 200ms - Normal (transições padrão)
duration-300: 300ms - Slow (modais, toasts)
duration-500: 500ms - Very slow (página)
```

### Timing Functions

```
ease-linear:      linear
ease-in:          aceleração
ease-out:         desaceleração
ease-in-out:      acelera e desacelera (padrão)
```

### Animações Comuns

```
// Fade in
animate-fade-in: opacity 0 → 1, 200ms

// Slide up
animate-slide-up: translateY(10px) → 0, opacity 0 → 1

// Scale in
animate-scale-in: scale(0.95) → 1, opacity 0 → 1

// Spin
animate-spin: rotate 360deg, 1s linear infinite

// Pulse
animate-pulse: opacity 1 → 0.5 → 1, 2s infinite
```

---

## Z-Index

```
z-0:    0       - Base
z-10:   10      - Elementos sobrepostos
z-20:   20      - Dropdowns
z-30:   30      - Sticky headers
z-40:   40      - Modais backdrop
z-50:   50      - Modais, toasts
z-auto: auto    - Padrão
```

**Stacking Context:**
```
Toast:        z-50
Modal:        z-40 (backdrop), z-50 (content)
Header:       z-30 (sticky)
Dropdown:     z-20
Tooltip:      z-20
Content:      z-0
```

---

## Checklist de Implementação

Antes de criar um novo componente, verifique:

- [ ] Cores seguem a paleta definida
- [ ] Contraste atende WCAG AA (4.5:1 para texto)
- [ ] Tipografia usa a escala definida
- [ ] Espaçamento segue o sistema de 4px
- [ ] Estados (hover, focus, active, disabled) estão definidos
- [ ] Animações são suaves (150-300ms)
- [ ] Ícones têm acessibilidade adequada
- [ ] Funciona em todos os breakpoints

---

## Recursos

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Heroicons](https://heroicons.com/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Design Tokens](https://www.lightningdesignsystem.com/design-tokens/)

---

## Changelog

### 2026-02-05
- Documentação inicial criada
- Paleta de cores definida
- Tokens de design documentados

---

**Dúvidas?** Consulte os exemplos em `src/components/` ou veja o [Guia de Componentes](./COMPONENTES.md).
