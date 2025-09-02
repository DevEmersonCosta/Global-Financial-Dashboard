// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
}));

// Configurações da API
const API_CONFIG = {
    ALPHA_VANTAGE_KEY: process.env.ALPHA_VANTAGE_KEY || 'demo',
    ALPHA_VANTAGE_BASE: 'https://www.alphavantage.co/query',
    FINNHUB_KEY: process.env.FINNHUB_KEY || 'demo',
    FINNHUB_BASE: 'https://finnhub.io/api/v1',
    YAHOO_KEY: process.env.YAHOO_KEY || 'demo',
    YAHOO_BASE: 'https://yahoo-finance15.p.rapidapi.com',
};

// Cache de dados
let marketData = {
    indices: {},
    currencies: {},
    news: [],
    rankings: { gainers: [], losers: [] },
    lastUpdate: null
};

// Principais índices e símbolos - EXPANDIDO
const MARKET_SYMBOLS = {
    'SP500': '^GSPC',
    'NASDAQ': '^IXIC', 
    'DOW': '^DJI',
    'IBOVESPA': '^BVSP',
    'FTSE100': '^FTSE',
    'DAX': '^GDAXI',
    'NIKKEI': '^N225',
    'HANG_SENG': '^HSI',
    'CAC40': '^FCHI',        // França
    'TSX': '^GSPTSE',        // Canadá
    'ASX200': '^AXJO',       // Austrália
    'SENSEX': '^BSESN',      // Índia
    'KOSPI': '^KS11',        // Coreia do Sul
    'IBEX35': '^IBEX',       // Espanha
    'AEX': '^AEX',           // Holanda
    'SMI': '^SSMI',           // Suíça
    'BOVESPA_SMALL': '^BVSP', 
    'MOEX': 'IMOEX.ME',
    'TAIEX': '^TWII'
};

const CURRENCY_PAIRS = {
    'USDBRL': 'USD/BRL',
    'EURUSD': 'EUR/USD',
    'GBPUSD': 'GBP/USD',
    'USDJPY': 'USD/JPY',
    'BTCUSD': 'BTC/USD',
    'ETHUSD': 'ETH/USD',
    'USDCAD': 'USD/CAD',
    'AUDUSD': 'AUD/USD'
};

// Classe para gerenciar dados financeiros
class FinancialDataManager {
    constructor() {
        this.rateLimits = {
            alphaVantage: { count: 0, resetTime: Date.now() + 60000 },
            finnhub: { count: 0, resetTime: Date.now() + 60000 }
        };
    }

    checkRateLimit(api) {
        const now = Date.now();
        const limit = this.rateLimits[api];
        
        if (now > limit.resetTime) {
            limit.count = 0;
            limit.resetTime = now + 60000;
        }
        
        const maxCalls = api === 'alphaVantage' ? 5 : 60;
        return limit.count < maxCalls;
    }

    // Buscar dados de um índice específico
    async fetchIndexData(symbol, apiSymbol) {
        try {
            // Tentar Alpha Vantage primeiro
            if (this.checkRateLimit('alphaVantage')) {
                const data = await this.fetchFromAlphaVantage(apiSymbol);
                if (data) return data;
            }

            // Fallback para Finnhub
            if (this.checkRateLimit('finnhub')) {
                const data = await this.fetchFromFinnhub(apiSymbol);
                if (data) return data;
            }

            // Se não conseguir dados das APIs, gerar dados simulados
            return this.generateMockData(symbol);

        } catch (error) {
            console.error(`Erro ao buscar dados para ${symbol}:`, error.message);
            return this.generateMockData(symbol);
        }
    }

    // Alpha Vantage API
    async fetchFromAlphaVantage(symbol) {
        try {
            this.rateLimits.alphaVantage.count++;
            
            const response = await axios.get(API_CONFIG.ALPHA_VANTAGE_BASE, {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: symbol,
                    apikey: API_CONFIG.ALPHA_VANTAGE_KEY
                },
                timeout: 10000
            });

            const quote = response.data['Global Quote'];
            if (!quote) return null;

            return {
                symbol: quote['01. symbol'],
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
                volume: parseInt(quote['06. volume']),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Erro Alpha Vantage:', error.message);
            return null;
        }
    }

    // Finnhub API
    async fetchFromFinnhub(symbol) {
        try {
            this.rateLimits.finnhub.count++;
            
            const response = await axios.get(`${API_CONFIG.FINNHUB_BASE}/quote`, {
                params: {
                    symbol: symbol,
                    token: API_CONFIG.FINNHUB_KEY
                },
                timeout: 10000
            });

            const data = response.data;
            if (!data.c) return null;

            const change = data.c - data.pc;
            const changePercent = (change / data.pc) * 100;

            return {
                symbol: symbol,
                price: data.c,
                change: change,
                changePercent: changePercent,
                volume: 0,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Erro Finnhub:', error.message);
            return null;
        }
    }

    // Gerar dados simulados - EXPANDIDO
    generateMockData(symbol) {
        const baseValues = {
            'SP500': 4200,
            'NASDAQ': 13000,
            'DOW': 34000,
            'IBOVESPA': 118000,
            'FTSE100': 7600,
            'DAX': 16000,
            'NIKKEI': 33800,
            'HANG_SENG': 17500,
            'CAC40': 7250,
            'TSX': 20100,
            'ASX200': 7680,
            'SENSEX': 65500,
            'KOSPI': 2580,
            'IBEX35': 9850,
            'AEX': 890,
            'SMI': 11200
        };

        const basePrice = baseValues[symbol] || 1000;
        const variation = (Math.random() - 0.5) * basePrice * 0.05;
        const price = basePrice + variation;
        const change = variation;
        const changePercent = (variation / basePrice) * 100;

        return {
            symbol: symbol,
            price: parseFloat(price.toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            volume: Math.floor(Math.random() * 1000000000),
            timestamp: new Date().toISOString()
        };
    }

    // Buscar dados de moedas - EXPANDIDO
    async fetchCurrencyData() {
        const currencies = {};
        
        const mockRates = {
            'USDBRL': { rate: 5.12 + (Math.random() - 0.5) * 0.2, change: (Math.random() - 0.5) * 2 },
            'EURUSD': { rate: 1.0875 + (Math.random() - 0.5) * 0.05, change: (Math.random() - 0.5) * 1 },
            'GBPUSD': { rate: 1.2645 + (Math.random() - 0.5) * 0.05, change: (Math.random() - 0.5) * 1 },
            'USDJPY': { rate: 148.75 + (Math.random() - 0.5) * 2, change: (Math.random() - 0.5) * 1 },
            'BTCUSD': { rate: 42500 + (Math.random() - 0.5) * 2000, change: (Math.random() - 0.5) * 5 },
            'ETHUSD': { rate: 2650 + (Math.random() - 0.5) * 100, change: (Math.random() - 0.5) * 3 },
            'USDCAD': { rate: 1.345 + (Math.random() - 0.5) * 0.05, change: (Math.random() - 0.5) * 1 },
            'AUDUSD': { rate: 0.675 + (Math.random() - 0.5) * 0.05, change: (Math.random() - 0.5) * 1 }
        };

        Object.entries(mockRates).forEach(([pair, data]) => {
            currencies[pair] = {
                pair: CURRENCY_PAIRS[pair] || pair,
                rate: parseFloat(data.rate.toFixed(4)),
                change: parseFloat(data.change.toFixed(2)),
                timestamp: new Date().toISOString()
            };
        });

        return currencies;
    }

    // Buscar notícias financeiras - MELHORADO
    async fetchFinancialNews() {
        try {
            if (this.checkRateLimit('finnhub')) {
                const response = await axios.get(`${API_CONFIG.FINNHUB_BASE}/news`, {
                    params: {
                        category: 'general',
                        token: API_CONFIG.FINNHUB_KEY
                    },
                    timeout: 10000
                });

                return response.data.slice(0, 10).map(news => ({
                    id: news.id,
                    title: news.headline,
                    summary: news.summary.substring(0, 150) + '...',
                    source: news.source,
                    url: news.url,
                    timestamp: new Date(news.datetime * 1000).toISOString(),
                    category: news.category
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar notícias:', error.message);
        }

        // Notícias mockadas melhoradas
        return [
            {
                id: 1,
                title: "Fed mantém taxa de juros inalterada em nova decisão",
                summary: "O Federal Reserve decidiu manter as taxas de juros no patamar atual, sinalizando cautela com a inflação...",
                source: "Reuters",
                timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
                category: "monetary-policy"
            },
            {
                id: 2,
                title: "Tesla reporta lucros acima do esperado no trimestre",
                summary: "A montadora elétrica superou as expectativas dos analistas com forte demanda por veículos...",
                source: "Bloomberg",
                timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
                category: "earnings"
            },
            {
                id: 3,
                title: "Petrobras anuncia novo programa de dividendos",
                summary: "A estatal brasileira aprovou distribuição extraordinária de dividendos aos acionistas...",
                source: "Valor Econômico",
                timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
                category: "dividends"
            },
            {
                id: 4,
                title: "Mercados asiáticos fecham em queda após dados da China",
                summary: "Índices da região recuaram após indicadores econômicos chineses decepcionarem investidores...",
                source: "Financial Times",
                timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
                category: "markets"
            },
            {
                id: 5,
                title: "Bitcoin atinge nova máxima histórica em meio a otimismo",
                summary: "Criptomoeda principal bateu recorde em sessão de alta volatilidade e volume expressivo...",
                source: "CoinDesk",
                timestamp: new Date(Date.now() - 10 * 3600000).toISOString(),
                category: "crypto"
            }
        ];
    }

    // Buscar rankings de ações - MELHORADO
    async fetchStockRankings() {
        const gainers = [
            { symbol: 'NVDA', name: 'NVIDIA Corp', change: 8.45, price: 875.30 },
            { symbol: 'TSLA', name: 'Tesla Inc', change: 6.12, price: 248.50 },
            { symbol: 'AMD', name: 'Advanced Micro Devices', change: 5.87, price: 105.25 },
            { symbol: 'META', name: 'Meta Platforms', change: 4.23, price: 485.75 },
            { symbol: 'GOOGL', name: 'Alphabet Inc', change: 3.95, price: 138.90 },
            { symbol: 'AAPL', name: 'Apple Inc', change: 3.12, price: 185.45 },
            { symbol: 'MSFT', name: 'Microsoft Corp', change: 2.87, price: 375.20 },
            { symbol: 'AMZN', name: 'Amazon.com Inc', change: 2.45, price: 145.80 }
        ];

        const losers = [
            { symbol: 'NFLX', name: 'Netflix Inc', change: -4.56, price: 445.20 },
            { symbol: 'BABA', name: 'Alibaba Group', change: -3.89, price: 78.95 },
            { symbol: 'PYPL', name: 'PayPal Holdings', change: -3.12, price: 58.75 },
            { symbol: 'UBER', name: 'Uber Technologies', change: -2.95, price: 52.30 },
            { symbol: 'SNAP', name: 'Snap Inc', change: -2.78, price: 12.45 },
            { symbol: 'TWTR', name: 'Twitter Inc', change: -2.45, price: 45.30 },
            { symbol: 'SPOT', name: 'Spotify Technology', change: -2.12, price: 145.60 },
            { symbol: 'ZM', name: 'Zoom Video', change: -1.98, price: 68.75 }
        ];

        // Adicionar variação aos dados
        gainers.forEach(stock => {
            stock.change += (Math.random() - 0.5) * 2;
            stock.price += (Math.random() - 0.5) * stock.price * 0.02;
            stock.change = parseFloat(stock.change.toFixed(2));
            stock.price = parseFloat(stock.price.toFixed(2));
        });

        losers.forEach(stock => {
            stock.change += (Math.random() - 0.5) * 2;
            stock.price += (Math.random() - 0.5) * stock.price * 0.02;
            stock.change = parseFloat(stock.change.toFixed(2));
            stock.price = parseFloat(stock.price.toFixed(2));
        });

        return { gainers, losers };
    }

    // Atualizar todos os dados
    async updateAllData() {
        console.log('🔄 Atualizando dados do mercado...');
        
        try {
            // Buscar dados dos índices
            const indicesPromises = Object.entries(MARKET_SYMBOLS).map(async ([key, symbol]) => {
                const data = await this.fetchIndexData(key, symbol);
                return [key, data];
            });

            const indicesResults = await Promise.all(indicesPromises);
            const indices = Object.fromEntries(indicesResults);

            // Buscar outros dados em paralelo
            const [currencies, news, rankings] = await Promise.all([
                this.fetchCurrencyData(),
                this.fetchFinancialNews(),
                this.fetchStockRankings()
            ]);

            // Atualizar cache global
            marketData = {
                indices,
                currencies,
                news,
                rankings,
                lastUpdate: new Date().toISOString()
            };

            console.log('✅ Dados atualizados com sucesso');
            
            // Emitir dados para todos os clientes conectados
            io.emit('marketData', marketData);
            
            return marketData;

        } catch (error) {
            console.error('❌ Erro ao atualizar dados:', error.message);
            return null;
        }
    }
}

// Instanciar o gerenciador de dados
const dataManager = new FinancialDataManager();

// Rotas da API
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        lastUpdate: marketData.lastUpdate,
        totalIndices: Object.keys(MARKET_SYMBOLS).length,
        totalCurrencies: Object.keys(CURRENCY_PAIRS).length
    });
});

app.get('/api/market-data', async (req, res) => {
    try {
        if (!marketData.lastUpdate || Date.now() - new Date(marketData.lastUpdate).getTime() > 30000) {
            await dataManager.updateAllData();
        }
        res.json(marketData);
    } catch (error) {
        console.error('Erro na API:', error.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.get('/api/indices', (req, res) => {
    res.json(marketData.indices);
});

app.get('/api/currencies', (req, res) => {
    res.json(marketData.currencies);
});

app.get('/api/news', (req, res) => {
    const { limit = 10, category } = req.query;
    let news = marketData.news;
    
    if (category) {
        news = news.filter(item => item.category === category);
    }
    
    res.json(news.slice(0, parseInt(limit)));
});

app.get('/api/rankings', (req, res) => {
    res.json(marketData.rankings);
});

// Nova rota para dados históricos por timeframe
app.get('/api/historical/:symbol', (req, res) => {
    const { symbol } = req.params;
    const { timeframe = '1D' } = req.query;
    
    // Gerar dados históricos simulados baseado no timeframe
    const periods = {
        '1D': 24,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '1Y': 365
    };
    
    const points = periods[timeframe] || 24;
    const historicalData = [];
    const basePrice = marketData.indices[symbol]?.price || 1000;
    
    let price = basePrice;
    for (let i = 0; i < points; i++) {
        const variation = (Math.random() - 0.5) * basePrice * 0.02;
        price += variation;
        historicalData.push({
            timestamp: new Date(Date.now() - (points - i) * 3600000).toISOString(),
            price: parseFloat(price.toFixed(2)),
            volume: Math.floor(Math.random() * 1000000)
        });
    }
    
    res.json({
        symbol,
        timeframe,
        data: historicalData
    });
});

// WebSocket connections
io.on('connection', (socket) => {
    console.log(`🔌 Cliente conectado: ${socket.id}`);
    
    // Enviar dados atuais para o novo cliente
    socket.emit('marketData', marketData);
    
    // Eventos do cliente
    socket.on('requestUpdate', async () => {
        console.log(`📡 Atualização solicitada por: ${socket.id}`);
        await dataManager.updateAllData();
    });
    
    socket.on('subscribe', (symbols) => {
        console.log(`📺 Cliente ${socket.id} se inscreveu em:`, symbols);
        socket.join(symbols);
    });
    
    socket.on('getHistorical', async (data) => {
        const { symbol, timeframe } = data;
        console.log(`📈 Dados históricos solicitados: ${symbol} - ${timeframe}`);
        
        // Aqui você implementaria a busca de dados históricos reais
        // Por agora, enviamos dados simulados
        const historicalData = generateHistoricalData(symbol, timeframe);
        socket.emit('historicalData', { symbol, timeframe, data: historicalData });
    });
    
    socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
});

// Função para gerar dados históricos
function generateHistoricalData(symbol, timeframe) {
    const periods = {
        '1D': { points: 24, interval: 3600000 },
        '1W': { points: 7, interval: 86400000 },
        '1M': { points: 30, interval: 86400000 },
        '3M': { points: 90, interval: 86400000 },
        '1Y': { points: 365, interval: 86400000 }
    };
    
    const config = periods[timeframe] || periods['1D'];
    const data = [];
    const basePrice = 1000 + Math.random() * 1000;
    
    let price = basePrice;
    for (let i = 0; i < config.points; i++) {
        const variation = (Math.random() - 0.5) * basePrice * 0.03;
        price = Math.max(price + variation, basePrice * 0.7); // Não deixar cair muito
        
        data.push({
            timestamp: new Date(Date.now() - (config.points - i) * config.interval).toISOString(),
            price: parseFloat(price.toFixed(2)),
            volume: Math.floor(Math.random() * 10000000)
        });
    }
    
    return data;
}

// Agendar atualizações automáticas - OTIMIZADO
cron.schedule('*/30 * * * * *', async () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Atualizar mais frequentemente durante horário comercial
    if (day >= 1 && day <= 5 && hour >= 9 && hour <= 18) {
        await dataManager.updateAllData();
    }
});

// Atualização menos frequente fora do horário comercial
cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    if (day === 0 || day === 6 || hour < 9 || hour > 18) {
        await dataManager.updateAllData();
    }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('💥 Erro não tratado:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
        timestamp: new Date().toISOString()
    });
});

// Middleware 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Inicializar servidor
const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`📊 Índices monitorados: ${Object.keys(MARKET_SYMBOLS).length}`);
    console.log(`💱 Pares de moedas: ${Object.keys(CURRENCY_PAIRS).length}`);
    
    // Fazer primeira atualização
    await dataManager.updateAllData();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado com sucesso');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Interrupção recebida, encerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor encerrado com sucesso');
        process.exit(0);
    });
});

module.exports = { app, server, io };