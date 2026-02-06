# Breakpoints e Responsividade - CRM

> **Para Desenvolvedores** | Guia de desenvolvimento responsivo

## Índice

- [Breakpoints](#breakpoints)
- [Estratégia Mobile-First](#estratégia-mobile-first)
- [Componentes Responsivos](#componentes-responsivos)
- [Padrões de Layout](#padrões-de-layout)
- [Testes de Responsividade](#testes-de-responsividade)

---

## Breakpoints

O projeto usa os breakpoints padrão do Tailwind CSS:

```
sm: 640px   - Celulares grandes
md: 768px   - Tablets pequenos
lg: 1024px  - Tablets/laptops
xl: 1280px  - Desktops
2xl: 1536px - Telas grandes
```

### Uso com Tailwind

```tsx
// Mobile-first: estilo base para mobile, modificações para telas maiores
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* 100% mobile, 50% tablet, 33% desktop */}
</div>

// Apenas acima de breakpoint
<div className="hidden md:block">
  {/* Só aparece em tablet+ */}
</div>

// Apenas abaixo de breakpoint
<div className="md:hidden">
  {/* Só aparece em mobile */}
</div>

// Entre breakpoints
<div className="hidden md:block lg:hidden">
  {/* Só aparece entre 768px e 1023px */}
</div>
```

### Media Queries CSS

```css
/* Mobile first */
.element {
  /* Estilos mobile */
}

@media (min-width: 640px) {
  .element {
    /* Estilos sm+ */
  }
}

@media (min-width: 768px) {
  .element {
    /* Estilos md+ */
  }
}
```

---

## Estratégia Mobile-First

### Princípios

1. **Comece pelo mobile**: Escreva CSS para telas pequenas primeiro
2. **Use `min-width`**: Adicione breakpoints para cima
3. **Conteúdo é rei**: Priorize conteúdo sobre navegação
4. **Toques grandes**: Botões mínimo 44x44px em mobile
5. **Performance**: Carregue apenas o necessário para mobile

### Exemplo Prático

```tsx
// ❌ Evite: Desktop-first
<div className="w-1/4 sm:w-1/2 md:w-full">

// ✅ Faça: Mobile-first
<div className="w-full sm:w-1/2 md:w-1/4">
```

### Estrutura de Componente

```tsx
function ResponsiveComponent() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Padding aumenta conforme a tela */}
      
      <h1 className="text-xl sm:text-2xl lg:text-3xl">
        {/* Título cresce proporcionalmente */}
        Título Responsivo
      </h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1 coluna mobile, 2 tablet, 3 desktop */}
        <Card />
        <Card />
        <Card />
      </div>
    </div>
  );
}
```

---

## Componentes Responsivos

### Layout

#### Sidebar

```
Mobile:  Sidebar colapsada (ícone menu)
Tablet+: Sidebar expandida fixa (240px)
```

**Implementação:**
```tsx
// Mobile: Drawer
<div className="fixed inset-y-0 left-0 z-40 w-64 transform -translate-x-full transition-transform md:translate-x-0 md:static">
  <Sidebar />
</div>

// Overlay em mobile
{isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={close} />}
```

#### Header

```
Mobile:  Logo + Menu hamburguer + Ícones
Tablet+: Logo completa + Navegação horizontal
```

### DataTable

```
Mobile:  Cards verticais com dados principais
Tablet+: Tabela simplificada
Desktop: Tabela completa com todas colunas
```

**Implementação:**
```tsx
<DataTable
  data={data}
  columns={columns}
  mobileView="cards"      // Renderiza cards em mobile
  tabletView="simplified" // Menos colunas em tablet
/>
```

### Formulários

```
Mobile:  1 coluna, inputs empilhados
Tablet+:  2 colunas para campos relacionados
Desktop:  2-3 colunas, agrupamento lógico
```

**Implementação:**
```tsx
<form className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Input label="Nome" />
    <Input label="Sobrenome" />
  </div>
  
  <Input label="Email" className="md:max-w-md" />
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Input label="CEP" />
    <Input label="Cidade" className="md:col-span-2" />
  </div>
</form>
```

### Modais

```
Mobile:  Full screen ou quase full
Tablet+:  Max-width 640px
Desktop:  Max-width conforme conteúdo
```

**Implementação:**
```tsx
<Modal
  size="md"
  className="w-full h-full sm:h-auto sm:max-w-lg sm:rounded-lg"
>
```

### Cards

```
Mobile:  1 coluna, padding reduzido
Tablet:  2 colunas
Desktop:  3-4 colunas
```

**Implementação:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id} className="p-4 sm:p-6">
      <Card.Title className="text-lg sm:text-xl">{item.title}</Card.Title>
    </Card>
  ))}
</div>
```

---

## Padrões de Layout

### Container Responsivo

```tsx
// Container que se adapta a todos os tamanhos
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {children}
</div>

// Valores:
// px-4:   16px em mobile
// sm:px-6: 24px em tablet
// lg:px-8: 32px em desktop
```

### Navegação Responsiva

```tsx
<nav className="flex items-center justify-between">
  {/* Logo sempre visível */}
  <Logo />
  
  {/* Menu desktop */}
  <div className="hidden md:flex space-x-4">
    <NavLink to="/contacts">Contatos</NavLink>
    <NavLink to="/companies">Empresas</NavLink>
    <NavLink to="/leads">Leads</NavLink>
  </div>
  
  {/* Menu mobile (hamburguer) */}
  <button className="md:hidden" onClick={toggleMenu}>
    <Bars3Icon className="w-6 h-6" />
  </button>
</nav>

{/* Drawer mobile */}
{isMenuOpen && (
  <div className="fixed inset-0 z-50 md:hidden">
    <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />
    <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-4">
      {/* Links de navegação */}
    </div>
  </div>
)}
```

### Tabela Responsiva

```tsx
// Abordagem 1: Scroll horizontal em mobile
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* Tabela completa */}
  </table>
</div>

// Abordagem 2: Cards em mobile, tabela em desktop
<div className="md:hidden">
  {/* Cards com dados principais */}
  {data.map(item => (
    <MobileCard key={item.id} data={item} />
  ))}
</div>

<div className="hidden md:block">
  {/* Tabela completa */}
  <Table data={data} />
</div>
```

### Imagens Responsivas

```tsx
// LazyImage com diferentes tamanhos
<LazyImage
  src={imageUrl}
  alt="Descrição"
  className="w-full h-48 sm:h-64 lg:h-80 object-cover"
/>

// Ou usando srcset (quando disponível)
<img
  src="image-400.jpg"
  srcSet="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w
  "
  sizes="
    (max-width: 640px) 100vw,
    (max-width: 1024px) 50vw,
    33vw
  "
  alt="Descrição"
/>
```

### Fontes Responsivas

```tsx
// Escala fluida de tamanhos
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
  Título
</h1>

// Ou usando clamp() para escala fluida
<h1 className="text-[clamp(1.5rem,4vw,3rem)]">
  Título Fluido
</h1>
```

---

## Breakpoints Específicos

### Telas Pequenas (< 640px)

**Características:**
- Touch targets mínimo 44x44px
- Layout de coluna única
- Navegação hamburguer
- Fontes legíveis (mínimo 16px)

**Dicas:**
```css
/* Prevenir zoom em inputs iOS */
input, select, textarea {
  font-size: 16px;
}
```

### Tablets (640px - 1023px)

**Características:**
- Layouts de 2 colunas
- Sidebar colapsável opcional
- Tabelas simplificadas

**Dicas:**
- Use `sm:` para ajustes específicos
- Considere orientação landscape

### Desktops (1024px+)

**Características:**
- Layouts multi-coluna
- Sidebar fixa
- Tabelas completas
- Hover states disponíveis

**Dicas:**
- Use `lg:` para features desktop-only
- Aproveite espaço extra com grids

---

## Testes de Responsividade

### Chrome DevTools

1. Abra DevTools (F12)
2. Clique no ícone de devices (📱)
3. Selecione um device ou defina dimensões customizadas:
   - iPhone SE: 375x667
   - iPad: 768x1024
   - Desktop: 1280x800

### Breakpoints para Testar

Sempre teste nestes tamanhos:

```
320px:   iPhone SE (mínimo)
375px:   iPhone X/11/12
414px:   iPhone Plus/Max
768px:   iPad
1024px:  iPad Pro / Laptop pequeno
1280px:  Laptop médio
1440px:  Laptop grande
1920px:  Desktop Full HD
```

### Checklist de Testes

Para cada tela, verifique:

- [ ] Não há scroll horizontal indesejado
- [ ] Conteúdo legível sem zoom
- [ ] Botões/links clicáveis (fácil toque)
- [ ] Imagens não distorcidas
- [ ] Texto não truncado
- [ ] Navegação acessível
- [ ] Performance aceitável

### Ferramentas Úteis

```bash
# Teste responsivo via CLI
npm install -g responsively-app

# Ou use online:
# - https://responsively.app/
# - https://www.browserstack.com/
# - https://blisk.io/
```

---

## Anti-Padrões

### ❌ Evite

```tsx
// 1. Larguras fixas em px
<div className="w-[300px]">

// 2. Media queries com max-width
@media (max-width: 768px) {
  /* Desktop-first - evite */
}

// 3. Zoom manual
<div style={{ zoom: 0.8 }}>

// 4. !important excessivo
<div className="w-full !important">
```

### ✅ Faça

```tsx
// 1. Larguras responsivas
<div className="w-full max-w-md">

// 2. Min-width (mobile-first)
@media (min-width: 768px) {
  /* Mobile-first - prefira */
}

// 3. Transform scale se necessário
<div className="transform scale-90">

// 4. Classes utilitárias
<div className="w-full md:w-1/2">
```

---

## Exemplos Completos

### Página de Dashboard

```tsx
function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Visão geral do seu CRM
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard title="Contatos" value="1,234" />
        <StatCard title="Empresas" value="56" />
        <StatCard title="Leads" value="89" />
        <StatCard title="Oportunidades" value="23" />
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6">
          <Card.Title className="text-lg sm:text-xl mb-4">
            Vendas por Mês
          </Card.Title>
          <Chart className="h-64 sm:h-80" />
        </Card>
        
        <Card className="p-4 sm:p-6">
          <Card.Title className="text-lg sm:text-xl mb-4">
            Leads por Origem
          </Card.Title>
          <PieChart className="h-64 sm:h-80" />
        </Card>
      </div>
    </div>
  );
}
```

### Lista de Contatos

```tsx
function ContactsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Contatos</h1>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <SearchInput className="w-full sm:w-64" />
          <Button className="w-full sm:w-auto">
            <PlusIcon className="w-5 h-5 mr-2" />
            Novo Contato
          </Button>
        </div>
      </div>
      
      {/* Lista - Cards em mobile, Tabela em desktop */}
      <div className="md:hidden space-y-4">
        {contacts.map(contact => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
      
      <div className="hidden md:block">
        <ContactTable contacts={contacts} />
      </div>
    </div>
  );
}
```

---

## Configuração Tailwind

### tailwind.config.js

```javascript
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
}
```

---

## Recursos

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
- [Mobile-First vs Desktop-First](https://www.uxpin.com/studio/blog/a-hands-on-guide-to-mobile-first-design/)

---

**Lembre-se:** Teste sempre em dispositivos reais quando possível! Emuladores são ótimos, mas não substituem a experiência real.
