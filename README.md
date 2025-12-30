# 📱 Mobiss - Catálogo de Acessórios para iPhone

Catálogo online com painel administrativo para gerenciar produtos.

## 🚀 Como hospedar na Vercel (Grátis)

### Passo 1: Criar conta no GitHub
1. Acesse [github.com](https://github.com)
2. Crie uma conta gratuita (se não tiver)

### Passo 2: Subir o código pro GitHub
1. No GitHub, clique em **"New repository"** (botão verde)
2. Nome: `mobiss-catalog`
3. Deixe público
4. Clique em **"Create repository"**
5. Faça upload de todos os arquivos desta pasta

### Passo 3: Conectar na Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta do GitHub
3. Clique em **"Add New Project"**
4. Selecione o repositório `mobiss-catalog`
5. Clique em **"Deploy"**
6. Aguarde alguns segundos... Pronto! 🎉

### Passo 4: Acessar seu site
- A Vercel vai gerar um link tipo: `mobiss-catalog.vercel.app`
- Você pode conectar um domínio próprio depois (ex: `mobiss.com.br`)

---

## 🔐 Acesso ao Painel Admin

- No rodapé do catálogo, clique no pontinho `•`
- Senha padrão: `mobiss2025`

**Para trocar a senha:**
Edite o arquivo `src/App.jsx` e procure por `mobiss2025`

---

## 📁 Estrutura do Projeto

```
mobiss-catalog/
├── public/
│   └── favicon.svg       # Ícone do site
├── src/
│   ├── App.jsx           # Componente principal (catálogo + admin)
│   ├── main.jsx          # Ponto de entrada
│   └── index.css         # Estilos globais
├── index.html            # HTML principal
├── package.json          # Dependências
├── vite.config.js        # Config do Vite
├── tailwind.config.js    # Config do Tailwind
└── postcss.config.js     # Config do PostCSS
```

---

## ✏️ Como editar

### Trocar cores da marca
No arquivo `src/App.jsx`, procure por:
```javascript
const colors = {
  primary: '#3D9A8B',      // Verde principal
  primaryDark: '#2D7A6D',  // Verde escuro
  primaryLight: '#4DB8A7', // Verde claro
  accent: '#5FCECE',       // Ciano (destaque)
  ...
}
```

### Trocar número do WhatsApp
Procure por `5548992082828` e substitua pelo novo número.

### Trocar categorias
Procure por `const categories = [` e edite a lista.

### Trocar modelos de iPhone
Procure por `const iphoneModels = [` e edite a lista.

---

## 💡 Próximos passos (opcional)

1. **Domínio próprio**: Compre um domínio (ex: Registro.br ~R$40/ano) e conecte na Vercel
2. **Banco de dados**: Migrar pro Firebase pra dados não ficarem só no navegador
3. **Analytics**: Adicionar Google Analytics pra ver quantas pessoas acessam

---

## 🩵 Feito com carinho pra Mobiss

Qualidade de verdade. Preço justo.
Seu celular merece Mobiss.
