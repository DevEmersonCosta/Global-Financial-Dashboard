# Global Markets Dashboard 📈

Um dashboard em tempo real para monitoramento de mercados financeiros globais com interface moderna e responsiva.

## 🚀 Demonstração

Dashboard completo com:
- **12 índices globais** em tempo real
- **WebSocket** para atualizações instantâneas
- **Múltiplos timeframes** (1D, 1W, 1M, 3M, 1Y)
- **Rankings** de maiores altas/quedas
- **Notícias financeiras** atualizadas
- **Cotações de moedas** e criptomoedas
- **Tema claro/escuro**

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web minimalista
- **Socket.IO** - Comunicação WebSocket em tempo real
- **Axios** - Cliente HTTP para APIs externas
- **node-cron** - Agendamento de tarefas
- **Helmet** - Middleware de segurança
- **express-rate-limit** - Limitação de requisições
- **CORS** - Controle de acesso entre origens

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilização moderna com gradientes e animações
- **JavaScript ES6+** - Lógica de interface
- **Chart.js** - Gráficos interativos
- **Socket.IO Client** - Conexão WebSocket
- **CSS Grid & Flexbox** - Layout responsivo

### APIs Financeiras
- **Alpha Vantage** - Dados de ações e índices
- **Finnhub** - Cotações e notícias financeiras
- **Sistema de fallback** com dados simulados

## 📊 Recursos

### Índices Monitorados
- 🇺🇸 **S&P 500, NASDAQ, Dow Jones**
- 🇧🇷 **IBOVESPA, BOVESPA Small**
- 🇬🇧 **FTSE 100**
- 🇩🇪 **DAX**
- 🇯🇵 **Nikkei 225**
- 🇭🇰 **Hang Seng**
- 🇫🇷 **CAC 40**
- 🇷🇺 **MOEX Russia**
- 🇹🇼 **TAIEX**

### Funcionalidades
- ⚡ **Tempo Real**: Atualizações via WebSocket
- 📱 **Responsivo**: Otimizado para mobile e desktop
- 🌙 **Tema Dual**: Modo claro e escuro
- 📈 **Múltiplos Timeframes**: 1D, 1W, 1M, 3M, 1Y
- 🔄 **Auto-reconexão**: Sistema robusto de fallback
- 📰 **Notícias**: Feed de notícias financeiras
- 💱 **Moedas**: Cotações de forex e crypto
- 🏆 **Rankings**: Top gainers e losers

## ⚡ Instalação e Uso

### Pré-requisitos
```bash
node -v  # v14 ou superior
npm -v   # v6 ou superior
```

### Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/global-financial-dashboard.git
cd global-financial-dashboard

# Instale as dependências
npm install

# Configure as variáveis de ambiente (opcional)
cp .env.example .env
# Edite o .env com suas chaves de API
```

### Configuração das APIs (Opcional)
```bash
# .env
ALPHA_VANTAGE_KEY=sua_chave_aqui
FINNHUB_KEY=sua_chave_aqui
YAHOO_KEY=sua_chave_aqui
PORT=3001
```

**Nota**: O sistema funciona perfeitamente sem chaves de API, utilizando dados simulados realistas.

### Executar
```bash
# Desenvolvimento
npm start

# ou
node server.js
```

Acesse: `http://localhost:3001`

## 🏗️ Arquitetura

### Estrutura do Projeto
```
📁 global-markets-dashboard/
├── 📄 server.js           # Servidor Express + Socket.IO
├── 📁 public/
│   ├── 📄 index.html      # Interface principal
│   ├── 📄 style.css       # Estilos e animações
│   └── 📄 app.js          # Lógica frontend
├── 📄 package.json        # Dependências
├── 📄 .env.example        # Exemplo de configuração
└── 📄 README.md          # Documentação
```

### Fluxo de Dados
1. **APIs Externas** → Rate limiting → Cache
2. **Cache** → WebSocket → **Frontend**
3. **Fallback**: API HTTP com polling
4. **Dados Simulados** quando APIs indisponíveis

### Sistema de Rate Limiting
- **Alpha Vantage**: 5 calls/minuto
- **Finnhub**: 60 calls/minuto
- **Fallback automático** para dados simulados
- **Rate limiting** por IP no Express

## 🎨 Interface

### Design
- **Glassmorphism**: Efeitos de vidro e blur
- **Gradientes**: Cores modernas e vibrantes
- **Animações**: Transições suaves
- **Micro-interações**: Hover effects e loading states
- **Typography**: Fonte system (Segoe UI)

### Responsividade
- **Desktop**: Layout em grid 4x3
- **Tablet**: Layout 2x6
- **Mobile**: Layout 1x12
- **Touch-friendly**: Botões e controles otimizados

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```bash
PORT=3001                    # Porta do servidor
ALPHA_VANTAGE_KEY=demo      # Chave Alpha Vantage
FINNHUB_KEY=demo            # Chave Finnhub
YAHOO_KEY=demo              # Chave Yahoo Finance
NODE_ENV=production         # Ambiente
```

### Customização
- **Novos índices**: Adicionar em `MARKET_SYMBOLS`
- **Novas moedas**: Adicionar em `CURRENCY_PAIRS`
- **Intervalos**: Modificar `cron.schedule`
- **Temas**: Editar variáveis CSS

## 📈 Performance

### Otimizações
- **WebSocket** para updates em tempo real
- **Caching** de dados por 30 segundos
- **Debounced updates** nos gráficos
- **Lazy loading** de componentes
- **Rate limiting** inteligente

## 🔒 Segurança

### Middleware de Segurança
- **Helmet.js**: Headers de segurança
- **CORS**: Controle de origem
- **Rate Limiting**: 100 req/15min por IP
- **Input Validation**: Sanitização de dados
- **Error Handling**: Logs seguros

## 🤝 Contribuição

1. **Fork** o projeto
2. **Crie** sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. **Commit** suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
5. **Abra** um Pull Request

### Convenções
- **Commits**: Conventional Commits
- **Code Style**: ESLint + Prettier
- **Tests**: Jest (futuramente)

## 📄 Licença

Este projeto está sob a licença Apache-2.0. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- **Alpha Vantage** - API de dados financeiros
- **Finnhub** - API de cotações e notícias
- **Chart.js** - Biblioteca de gráficos
- **Socket.IO** - Comunicação em tempo real

---

## 👨‍💻 Autor

Emerson Dev - [GitHub](https://github.com/devemersoncosta)

## 📞 Suporte

Para suporte, envie um email para emersoncurry72@gmail.com ou abra uma issue no GitHub.

---

⭐ Se este projeto foi útil para você, considere dar uma estrela!

### 📊 Status

![GitHub last commit](https://img.shields.io/github/last-commit/DevEmersonCosta/Global-Financial-Dashboard)
![GitHub issues](https://img.shields.io/github/issues/DevEmersonCosta/Global-Financial-Dashboard)
![GitHub stars](https://img.shields.io/github/stars/DevEmersonCosta/Global-Financial-Dashboard)
![GitHub forks](https://img.shields.io/github/forks/DevEmersonCosta/Global-Financial-Dashboard)
