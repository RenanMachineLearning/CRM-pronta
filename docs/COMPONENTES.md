# Guia de Componentes - CRM

> **Para Desenvolvedores** | Documentação técnica da biblioteca de componentes

## Índice

- [Componentes Base](#componentes-base)
- [Componentes de Formulário](#componentes-de-formulário)
- [Componentes de Feedback](#componentes-de-feedback)
- [Componentes de Layout](#componentes-de-layout)
- [Hooks Úteis](#hooks-úteis)

---

## Componentes Base

### Button

Botão versátil com múltiplas variantes e tamanhos.

**Importação:**
```tsx
import { Button } from '../components/Button';
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'link'` | `'primary'` | Estilo visual do botão |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamanho do botão |
| `isLoading` | `boolean` | `false` | Estado de carregamento |
| `isDisabled` | `boolean` | `false` | Estado desabilitado |
| `leftIcon` | `ReactNode` | - | Ícone à esquerda do texto |
| `rightIcon` | `ReactNode` | - | Ícone à direita do texto |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Tipo HTML do botão |

**Exemplos:**

```tsx
// Botão primário
<Button onClick={handleClick}>Salvar</Button>

// Botão perigo com ícone
<Button variant="danger" leftIcon={<TrashIcon />}>
  Excluir
</Button>

// Botão de carregamento
<Button isLoading>Processando...</Button>

// Botão pequeno, estilo ghost
<Button variant="ghost" size="sm">Cancelar</Button>
```

**Acessibilidade:**
- Suporta foco visível (`focus:ring-2`)
- Estados desabilitados corretamente anunciados
- Ícones decorativos com `aria-hidden`

---

### Input

Campo de entrada de texto com label, erro e ajuda integrados.

**Importação:**
```tsx
import { Input } from '../components/Input';
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `label` | `string` | - | Label do campo |
| `error` | `string` | - | Mensagem de erro |
| `helpText` | `string` | - | Texto de ajuda |
| `variant` | `'default' \| 'error'` | `'default'` | Variante visual |
| `leftIcon` | `ReactNode` | - | Ícone à esquerda |
| `rightIcon` | `ReactNode` | - | Ícone à direita |

**Exemplos:**

```tsx
// Input básico
<Input 
  label="Nome" 
  placeholder="Digite seu nome"
/>

// Input com erro
<Input 
  label="Email"
  error="Email inválido"
  type="email"
/>

// Input com ícone
<Input 
  label="Senha"
  type="password"
  leftIcon={<LockIcon />}
/>
```

**Acessibilidade:**
- Label associada via `htmlFor`/`id`
- Erro anunciado via `aria-describedby`
- Estado inválido via `aria-invalid`

---

### Badge

Indicador visual para status, contagens ou categorias.

**Importação:**
```tsx
import { Badge } from '../components/Badge';
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `variant` | `'default' \| 'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | `'default'` | Cor do badge |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamanho |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'` | `'full'` | Bordas arredondadas |

**Exemplos:**

```tsx
// Badge de status
<Badge variant="success">Ativo</Badge>
<Badge variant="error">Inativo</Badge>

// Badge de contagem
<Badge variant="primary" size="sm">99+</Badge>

// Badge quadrado
<Badge variant="warning" rounded="sm">Pendente</Badge>
```

**Uso Comum:**
- Status de contatos (Ativo/Inativo/Arquivado)
- Badges de contagem em notificações
- Categorias de tags

---

### Tooltip

Dica contextual ao passar o mouse ou focar em elementos.

**Importação:**
```tsx
import { Tooltip } from '../components/Tooltip';
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `content` | `string` | obrigatório | Texto do tooltip |
| `position` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Posição |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alinhamento |
| `delay` | `number` | `200` | Delay em ms |
| `disabled` | `boolean` | `false` | Desabilitar tooltip |

**Exemplo:**

```tsx
<Tooltip content="Editar contato">
  <button aria-label="Editar contato">
    <PencilIcon />
  </button>
</Tooltip>
```

**Acessibilidade:**
- Totalmente acessível via Radix UI
- Anunciado por leitores de tela
- Funciona com navegação por teclado

---

## Componentes de Formulário

### Form

Wrapper de formulário com gerenciamento de estado e validação.

**Importação:**
```tsx
import { Form } from '../components/Form';
import { FormField } from '../components/FormField';
import { FormSection } from '../components/FormSection';
```

**Estrutura Recomendada:**

```tsx
<Form onSubmit={handleSubmit}>
  <FormSection title="Informações Pessoais">
    <FormField label="Nome" name="firstName" required>
      <Input {...register('firstName')} />
    </FormField>
    
    <FormField label="Email" name="email" error={errors.email?.message}>
      <Input type="email" {...register('email')} />
    </FormField>
  </FormSection>
  
  <FormActions>
    <Button type="submit">Salvar</Button>
  </FormActions>
</Form>
```

**FormField Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `label` | `string` | Label do campo |
| `name` | `string` | Nome do campo (para registro) |
| `required` | `boolean` | Se é obrigatório |
| `error` | `string` | Mensagem de erro |
| `helpText` | `string` | Texto de ajuda |

---

## Componentes de Feedback

### Toast (useToast)

Sistema de notificações temporárias.

**Importação:**
```tsx
import { useToast } from '../components/Toast';
```

**Uso:**

```tsx
function MyComponent() {
  const { toast } = useToast();

  const handleSuccess = () => {
    toast.success('Contato criado com sucesso!');
  };

  const handleError = () => {
    toast.error('Erro ao salvar', 8000); // duração customizada
  };

  const handleWarning = () => {
    toast.warning('Verifique os dados');
  };

  return <Button onClick={handleSuccess}>Criar</Button>;
}
```

**Tipos de Toast:**
- `toast.success(message, duration?)` - Sucesso (verde)
- `toast.error(message, duration?)` - Erro (vermelho)
- `toast.warning(message, duration?)` - Aviso (amarelo)
- `toast.info(message, duration?)` - Informação (azul)

**Padrões:**
- Duração padrão: 5000ms (5 segundos)
- Máximo de 5 toasts simultâneos
- Auto-dismiss com animação
- Botão de fechar manual

---

### Modal

Janela modal para diálogos e formulários.

**Importação:**
```tsx
import { Modal } from '../components/Modal';
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `isOpen` | `boolean` | `false` | Controla visibilidade |
| `onClose` | `() => void` | - | Callback ao fechar |
| `title` | `string` | - | Título do modal |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Tamanho |
| `closeOnOverlayClick` | `boolean` | `true` | Fechar ao clicar fora |
| `closeOnEsc` | `boolean` | `true` | Fechar com ESC |

**Exemplo:**

```tsx
<Modal
  isOpen={isOpen}
  onClose={closeModal}
  title="Confirmar Exclusão"
  size="sm"
>
  <p>Tem certeza que deseja excluir?</p>
  <div className="flex justify-end gap-2 mt-4">
    <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
    <Button variant="danger" onClick={handleDelete}>Excluir</Button>
  </div>
</Modal>
```

**Acessibilidade:**
- Foco automático no modal
- Trap de foco (Tab circula no modal)
- Fechamento com ESC
- Retorno de foco ao elemento anterior

---

### ConfirmDialog

Modal de confirmação pré-configurado.

**Uso:**

```tsx
import { ConfirmDialog } from '../components/ConfirmDialog';

<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Excluir Contato"
  description="Esta ação não pode ser desfeita."
  confirmText="Excluir"
  cancelText="Cancelar"
  variant="danger"
/>
```

---

## Componentes de Layout

### Layout

Layout principal da aplicação com Header e Sidebar.

**Importação:**
```tsx
import { Layout } from '../components/Layout';
```

**Uso:**

```tsx
function App() {
  return (
    <Layout>
      {/* Conteúdo das páginas */}
    </Layout>
  );
}
```

**Features:**
- Header fixo no topo
- Sidebar colapsável (mobile/desktop)
- Área de conteúdo scrollável
- SkipLink para acessibilidade

---

### Card

Container visual para agrupar conteúdo.

**Importação:**
```tsx
import { Card } from '../components/Card';
```

**Props:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `variant` | `'default' \| 'outlined' \| 'elevated'` | `'default'` | Estilo visual |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Espaçamento interno |
| `hover` | `boolean` | `false` | Efeito hover |

**Exemplo:**

```tsx
<Card variant="elevated" padding="lg">
  <h3>Título do Card</h3>
  <p>Conteúdo aqui...</p>
</Card>
```

---

### EmptyState

Estado vazio para listas e páginas.

**Importação:**
```tsx
import { EmptyState } from '../components/EmptyState';
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `title` | `string` | Título principal |
| `description` | `string` | Descrição |
| `icon` | `string` | Ícone (nome do Heroicon) |
| `actionLabel` | `string` | Texto do botão de ação |
| `onAction` | `() => void` | Callback do botão |
| `filtersApplied` | `boolean` | Se há filtros ativos |

**Exemplo:**

```tsx
<EmptyState
  title="Nenhum contato encontrado"
  description="Comece criando um novo contato."
  icon="users"
  actionLabel="Novo Contato"
  onAction={() => navigate('/contacts/new')}
/>
```

---

## Hooks Úteis

### useToast

Hook para exibir notificações toast.

```tsx
const { toast } = useToast();
toast.success('Mensagem');
```

### useErrorHandler

Hook padronizado para tratamento de erros.

```tsx
const handleError = useErrorHandler();

try {
  await apiCall();
} catch (error) {
  handleError(error, 'mensagem customizada');
}
```

### useFocusManager

Hook para gerenciamento de foco em modais.

```tsx
const { trapFocus, returnFocus } = useFocusManager();

useEffect(() => {
  if (isOpen) {
    trapFocus(modalRef.current);
    return () => returnFocus();
  }
}, [isOpen]);
```

---

## Convenções

### Nomenclatura

- **Componentes:** PascalCase (ex: `Button`, `ContactList`)
- **Props booleanas:** Prefixo `is` (ex: `isLoading`, `isOpen`)
- **Eventos:** Prefixo `on` (ex: `onClick`, `onChange`)

### Estrutura de Arquivos

```
src/components/
├── Button.tsx              # Componente base
├── Button.test.tsx         # Testes
├── Button.stories.tsx      # Documentação Storybook (futuro)
├── ContactList/
│   ├── index.tsx           # Export principal
│   ├── ContactList.tsx     # Componente
│   ├── ContactList.test.tsx
│   └── types.ts            # Tipos específicos
```

### Acessibilidade Obrigatória

Todo componente deve:
1. ✅ Suportar navegação por teclado
2. ✅ Ter foco visível
3. ✅ Usar atributos ARIA apropriados
4. ✅ Funcionar com leitores de tela
5. ✅ Manter contraste adequado

---

## Dicas de Uso

### Composição vs Configuração

Prefira composição para componentes complexos:

```tsx
// ✅ Bom - Composição
<Card>
  <Card.Header>
    <Card.Title>Título</Card.Title>
  </Card.Header>
  <Card.Body>Conteúdo</Card.Body>
</Card>

// ❌ Evite - Muitas props
<Card 
  header="Título"
  body="Conteúdo"
  showHeader={true}
/>
```

### Performance

- Use `React.memo` para componentes que recebem props estáveis
- Use `useMemo` para cálculos caros
- Use `useCallback` para funções passadas como props

### Imports

Sempre use imports absolutos com alias `@`:

```tsx
// ✅ Bom
import { Button } from '@/components/Button';

// ❌ Evite
import { Button } from '../../../components/Button';
```

---

## Changelog

### Últimas Alterações

- **2026-02-05:** Adicionado IconWrapper para acessibilidade de ícones
- **2026-02-05:** Documentação de acessibilidade criada
- **2026-01-20:** Componente Tooltip adicionado
- **2026-01-15:** Sistema de Toast implementado

---

## Precisa de Ajuda?

- Ver exemplos em `src/components/__tests__/`
- Consulte a documentação de [Acessibilidade](./ACESSIBILIDADE_CONTRASTE.md)
- Veja o [Guia de Uso](./GUIA-RAPIDO-USUARIO.md) para exemplos práticos
