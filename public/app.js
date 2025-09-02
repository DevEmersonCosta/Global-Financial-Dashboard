class FinancialDashboard {
    constructor() {
        this.charts = {};
        this.updateInterval = null;
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.apiBaseUrl = window.location.origin;
        this.currentTimeframe = '1D';
        this.timeframeMultipliers = {
            '1D': 1,
            '1W': 7,
            '1M': 30,
            '3M': 90,
            '1Y': 365
        };
        this.init();
    }

    init() {
        this.loadThemePreference();
        this.setupEventListeners();
        this.createCharts();
        this.initializeWebSocket();
        this.loadInitialData();
        this.updateTimeframeInfo();
    }

    initializeWebSocket() {
        try {
            console.log('🔌 Conectando ao WebSocket...');
            this.socket = io(this.apiBaseUrl);

            this.socket.on('connect', () => {
                console.log('✅ WebSocket conectado!');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
            });

            this.socket.on('disconnect', () => {
                console.log('❌ WebSocket desconectado');
                this.isConnected = false;
                this.updateConnectionStatus(false);
            });

            this.socket.on('marketData', (data) => {
                console.log('📊 Dados recebidos via WebSocket');
                this.updateWithServerData(data);
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Erro de conexão WebSocket:', error);
                this.handleConnectionError();
            });

        } catch (error) {
            console.error('❌ Erro ao inicializar WebSocket:', error);
            this.fallbackToPolling();
        }
    }

    handleConnectionError() {
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => {
                if (this.socket) {
                    this.socket.connect();
                }
            }, 5000 * this.reconnectAttempts);
        } else {
            console.log('🔄 Fallback para polling HTTP');
            this.fallbackToPolling();
        }
    }

    updateConnectionStatus(connected) {
        const header = document.querySelector('.header');
        const statusIndicator = document.getElementById('connectionStatus') || this.createConnectionStatus();
        
        if (connected) {
            statusIndicator.className = 'connection-status connected';
            statusIndicator.textContent = '🟢 Online';
        } else {
            statusIndicator.className = 'connection-status disconnected';
            statusIndicator.textContent = '🔴 Offline';
        }
    }

    createConnectionStatus() {
        const status = document.createElement('div');
        status.id = 'connectionStatus';
        status.className = 'connection-status';
        const controls = document.querySelector('.controls');
        controls.appendChild(status);
        return status;
    }

    fallbackToPolling() {
        console.log('📡 Iniciando polling HTTP...');
        this.startPolling();
    }

    startPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.fetchDataFromAPI();
        }, 15000);
        
        this.fetchDataFromAPI();
    }

    async loadInitialData() {
        console.log('📊 Carregando dados iniciais...');
        try {
            await this.fetchDataFromAPI();
        } catch (error) {
            console.error('❌ Erro ao carregar dados iniciais:', error);
            this.updateUI();
        }
    }

    async fetchDataFromAPI() {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = 'block';

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/market-data`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Dados recebidos via API:', data);
            this.updateWithServerData(data);

        } catch (error) {
            console.error('❌ Erro ao buscar dados da API:', error);
            this.updateUI();
        } finally {
            spinner.style.display = 'none';
        }
    }

    updateWithServerData(data) {
        if (!data) return;

        if (data.indices) {
            this.updateIndicesUI(data.indices);
            this.updatePerformanceWidget(data.indices);
        }

        if (data.currencies) {
            this.updateCurrenciesUI(data.currencies);
        }

        if (data.news) {
            this.updateNewsUI(data.news);
        }

        if (data.rankings) {
            this.updateRankingsUI(data.rankings);
        }

        this.updateChartsWithNewData();
    }

    updatePerformanceWidget(indices) {
        Object.entries(indices).forEach(([key, data]) => {
            const perfElement = document.getElementById(`perf-${key}`);
            if (perfElement && data.changePercent !== undefined) {
                const baseChange = data.changePercent;
                const timeframeMultiplier = this.timeframeMultipliers[this.currentTimeframe];
                const adjustedChange = baseChange * Math.sqrt(timeframeMultiplier) * (0.8 + Math.random() * 0.4);
                
                perfElement.textContent = `${adjustedChange > 0 ? '+' : ''}${adjustedChange.toFixed(2)}%`;
                perfElement.className = `performance ${adjustedChange > 0 ? 'positive' : 'negative'}`;
                
                this.addFlashEffect(perfElement, adjustedChange > 0);
            }
        });
    }

    updateIndicesUI(indices) {
        Object.entries(indices).forEach(([key, data]) => {
            const indexKey = key.toLowerCase().replace('_', '_'); // Para manter o underscore no HANG_SENG
            const priceElement = document.getElementById(`${indexKey}-price`);
            const changeElement = document.getElementById(`${indexKey}-change`);
            
            if (priceElement && data.price) {
                priceElement.textContent = this.formatPrice(data.price);
                this.addFlashEffect(priceElement, data.change > 0);
            }
            
            if (changeElement && data.change !== undefined) {
                const changeText = `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}% (${data.change > 0 ? '+' : ''}${data.change.toFixed(2)})`;
                changeElement.textContent = changeText;
                changeElement.className = `change ${data.change > 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    updateCurrenciesUI(currencies) {
        Object.entries(currencies).forEach(([key, data]) => {
            const currencyElements = document.querySelectorAll('.currency-item');
            currencyElements.forEach(element => {
                const pairText = element.querySelector('div span').textContent;
                if (pairText === key.replace('USD', '/').replace('BRL', 'BRL').replace('EUR', 'EUR/USD').replace('GBP', 'GBP/USD').replace('JPY', 'USD/JPY').replace('BTC', 'BTC/USD').replace('ETH', 'ETH/USD')) {
                    const priceEl = element.querySelector('.price');
                    const changeEl = element.querySelector('.change');
                    
                    if (priceEl) {
                        priceEl.textContent = data.rate ? data.rate.toFixed(4) : priceEl.textContent;
                        this.addFlashEffect(priceEl, data.change > 0);
                    }
                    
                    if (changeEl) {
                        changeEl.textContent = `${data.change > 0 ? '+' : ''}${data.change.toFixed(2)}%`;
                        changeEl.className = `change ${data.change > 0 ? 'positive' : 'negative'}`;
                    }
                }
            });
        });
    }

    updateNewsUI(news) {
        const newsFeed = document.getElementById('news-feed');
        if (!newsFeed || !news.length) return;

        newsFeed.innerHTML = '';
        news.slice(0, 8).forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            
            const timeAgo = this.getTimeAgo(new Date(item.timestamp));
            
            newsItem.innerHTML = `
                <div class="news-title">${item.title}</div>
                <div class="news-source">${item.source} • ${timeAgo}</div>
            `;
            
            if (item.url) {
                newsItem.style.cursor = 'pointer';
                newsItem.addEventListener('click', () => {
                    window.open(item.url, '_blank');
                });
            }
            
            newsFeed.appendChild(newsItem);
        });
    }

    updateRankingsUI(rankings) {
        if (rankings.gainers) {
            const gainersContainer = document.querySelector('.card:has(.card-title:contains("Maiores Altas")) .compact-grid');
            if (gainersContainer) {
                gainersContainer.innerHTML = '';
                rankings.gainers.slice(0, 8).forEach(stock => {
                    const item = document.createElement('div');
                    item.className = 'ranking-item';
                    item.innerHTML = `
                        <span>${stock.symbol}</span>
                        <span class="positive">+${stock.change.toFixed(2)}%</span>
                    `;
                    gainersContainer.appendChild(item);
                });
            }
        }

        if (rankings.losers) {
            const losersContainer = document.querySelector('.card:has(.card-title:contains("Maiores Quedas")) .compact-grid');
            if (losersContainer) {
                losersContainer.innerHTML = '';
                rankings.losers.slice(0, 8).forEach(stock => {
                    const item = document.createElement('div');
                    item.className = 'ranking-item';
                    item.innerHTML = `
                        <span>${stock.symbol}</span>
                        <span class="negative">${stock.change.toFixed(2)}%</span>
                    `;
                    losersContainer.appendChild(item);
                });
            }
        }
    }

    addFlashEffect(element, isPositive) {
        const originalColor = element.style.color;
        element.style.color = isPositive ? '#00ff88' : '#ff4444';
        element.style.transition = 'color 0.3s ease';
        
        setTimeout(() => {
            element.style.color = originalColor;
        }, 1500);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'agora';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
        return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
    }

    updateChartsWithNewData() {
        Object.keys(this.charts).forEach(key => {
            const chart = this.charts[key];
            const newData = this.generateDataForTimeframe(this.currentTimeframe);
            chart.data.labels = newData.labels;
            chart.data.datasets[0].data = newData.data;
            chart.update('none');
        });
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('timeframe').addEventListener('change', (e) => {
            this.updateTimeframe(e.target.value);
        });
    }

    createCharts() {
        // Incluindo todos os 12 índices (incluindo os 3 novos)
        const indices = ['sp500', 'ibov', 'nasdaq', 'dow', 'ftse', 'nikkei', 'dax', 'hang_seng', 'cac40', 'bovespa_small', 'moex', 'taiex'];
        
        indices.forEach(index => {
            const ctx = document.getElementById(`${index}-chart`);
            if (ctx) {
                const initialData = this.generateDataForTimeframe(this.currentTimeframe);
                this.charts[index] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: initialData.labels,
                        datasets: [{
                            data: initialData.data,
                            borderColor: '#00ff88',
                            backgroundColor: 'rgba(0, 255, 136, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            x: {
                                display: false
                            },
                            y: {
                                display: false
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        }
                    }
                });
            }
        });
    }

    generateDataForTimeframe(timeframe) {
        const config = {
            '1D': { points: 24, labelFormat: (i) => `${i}:00` },
            '1W': { points: 7, labelFormat: (i) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i] },
            '1M': { points: 30, labelFormat: (i) => `${i + 1}` },
            '3M': { points: 12, labelFormat: (i) => `Sem ${i + 1}` },
            '1Y': { points: 12, labelFormat: (i) => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i] }
        };

        const { points, labelFormat } = config[timeframe];
        const labels = [];
        const data = [];
        
        for (let i = 0; i < points; i++) {
            labels.push(labelFormat(i));
        }

        let value = 100;
        const volatility = timeframe === '1D' ? 2 : timeframe === '1W' ? 4 : timeframe === '1M' ? 6 : timeframe === '3M' ? 8 : 10;
        
        for (let i = 0; i < points; i++) {
            value += (Math.random() - 0.5) * volatility;
            data.push(Math.max(value, 50));
        }

        return { labels, data };
    }

    updateTimeframe(timeframe) {
        console.log('Atualizando timeframe para:', timeframe);
        this.currentTimeframe = timeframe;
        this.updateTimeframeInfo();
        
        Object.keys(this.charts).forEach(key => {
            const chart = this.charts[key];
            const newData = this.generateDataForTimeframe(timeframe);
            chart.data.labels = newData.labels;
            chart.data.datasets[0].data = newData.data;
            chart.update('active');
        });

        this.updatePerformanceForTimeframe(timeframe);
    }

    updateTimeframeInfo() {
        const timeframeInfo = document.getElementById('timeframeInfo');
        if (timeframeInfo) {
            const timeframeNames = {
                '1D': '1 Dia',
                '1W': '1 Semana', 
                '1M': '1 Mês',
                '3M': '3 Meses',
                '1Y': '1 Ano'
            };
            timeframeInfo.textContent = `Período: ${timeframeNames[this.currentTimeframe]}`;
        }
    }

    updatePerformanceForTimeframe(timeframe) {
        const performanceItems = document.querySelectorAll('.performance-item');
        performanceItems.forEach(item => {
            const symbol = item.dataset.symbol;
            const perfElement = item.querySelector('.performance');
            
            if (perfElement) {
                const baseChange = parseFloat(perfElement.textContent.replace('%', '').replace('+', ''));
                const multiplier = this.timeframeMultipliers[timeframe];
                const newChange = baseChange * Math.sqrt(multiplier) * (0.7 + Math.random() * 0.6);
                
                perfElement.textContent = `${newChange > 0 ? '+' : ''}${newChange.toFixed(2)}%`;
                perfElement.className = `performance ${newChange > 0 ? 'positive' : 'negative'}`;
                
                this.addFlashEffect(perfElement, newChange > 0);
            }
        });
    }

    async refreshData() {
        if (this.isConnected && this.socket) {
            console.log('📡 Solicitando atualização via WebSocket...');
            this.socket.emit('requestUpdate');
        } else {
            console.log('📡 Atualizando via API...');
            await this.fetchDataFromAPI();
        }
    }

    updateUI() {
        Object.keys(this.charts).forEach(key => {
            const chart = this.charts[key];
            const newData = this.generateDataForTimeframe(this.currentTimeframe);
            chart.data.labels = newData.labels;
            chart.data.datasets[0].data = newData.data;
            chart.update('none');
        });

        const priceElements = document.querySelectorAll('[id$="-price"]');
        priceElements.forEach(element => {
            const currentPrice = parseFloat(element.textContent.replace(/,/g, ''));
            const variation = (Math.random() - 0.5) * currentPrice * 0.01;
            const newPrice = currentPrice + variation;
            
            element.textContent = this.formatPrice(newPrice);
            
            element.style.color = variation > 0 ? '#00ff88' : '#ff4444';
            setTimeout(() => {
                element.style.color = '';
            }, 1000);
        });
    }

    formatPrice(price) {
        if (price > 1000) {
            return price.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
        }
        return price.toFixed(2);
    }

    toggleTheme() {
        document.body.classList.toggle('light-theme');
        const themeBtn = document.getElementById('themeToggle');
        const isLight = document.body.classList.contains('light-theme');
        themeBtn.textContent = isLight ? '🌙 Escuro' : '🌓 Claro';
        
        try {
            if (typeof Storage !== 'undefined') {
                // Store theme preference in variables instead of localStorage
                this.themePreference = isLight ? 'light' : 'dark';
            }
        } catch (e) {
            console.log('LocalStorage não disponível');
        }
    }

    loadThemePreference() {
        try {
            if (typeof Storage !== 'undefined') {
                // Load from variables instead of localStorage
                if (this.themePreference === 'light') {
                    document.body.classList.add('light-theme');
                    document.getElementById('themeToggle').textContent = '🌙 Escuro';
                }
            }
        } catch (e) {
            console.log('LocalStorage não disponível');
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
        Object.values(this.charts).forEach(chart => chart.destroy());
    }
}

// Inicializar dashboard
const dashboard = new FinancialDashboard();

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    dashboard.destroy();
});

// Efeitos de hover nos cards
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0, 255, 136, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%)`;
        } else {
            card.style.background = '';
        }
    });
});