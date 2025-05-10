document.addEventListener('DOMContentLoaded', () => {
    const searchIpBtn = document.getElementById('searchIpBtn');
    const searchUrlBtn = document.getElementById('searchUrlBtn');
    const ipInput = document.getElementById('ipInput');
    const urlInput = document.getElementById('urlInput');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const historyList = document.getElementById('historyList');
    const MAX_HISTORY = 10;

    let history = JSON.parse(localStorage.getItem('ipHistory') || '[]');

    // Mostrar el historial al cargar
    displayHistory();

    // Event listeners para ambos botones
    searchIpBtn.addEventListener('click', () => searchIP(ipInput.value));
    searchUrlBtn.addEventListener('click', () => searchURL(urlInput.value));

    // Event listeners para Enter
    ipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchIP(ipInput.value);
        }
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchURL(urlInput.value);
        }
    });

    // Event listener para el historial
    historyList.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-item')) {
            const ip = e.target.dataset.ip;
            ipInput.value = ip;
            searchIP();
        }
    });

    async function searchIP(ip) {
        ip = ip.trim();
        
        // Validar IP
        if (!ip) {
            showError('Por favor ingrese una dirección IP');
            return;
        }

        if (!isValidIP(ip)) {
            showError('Formato de IP inválido');
            return;
        }

        // Agregar a historial
        addHistory(ip);

        showLoading();
        await fetchIPInfo(ip);
    }

    async function searchURL(url) {
        url = url.trim();
        
        // Validar URL
        if (!url) {
            showError('Por favor ingrese una URL');
            return;
        }

        if (!isValidURL(url)) {
            showError('Formato de URL inválido');
            return;
        }

        showLoading();
        try {
            // Obtener la IP de la URL
            const ip = await getIPFromURL(url);
            
            if (!ip) {
                throw new Error('No se pudo obtener la IP de la URL');
            }

            // Agregar a historial
            addHistory(ip);

            // Mostrar la IP en el campo de IP
            ipInput.value = ip;

            // Obtener información de la IP
            await fetchIPInfo(ip);
        } catch (error) {
            showError(error.message);
        }
    }

    function isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async function getIPFromURL(url) {
        try {
            // Obtener el dominio de la URL
            const hostname = new URL(url).hostname;
            
            // Usar la API de DNS para obtener la IP
            const response = await fetch(`https://dns.google/resolve?name=${hostname}`);
            const data = await response.json();
            
            // Obtener la primera IP encontrada
            const ip = data.Answer?.[0]?.data || 
                      data.Answer?.[1]?.data || 
                      'No disponible';
            
            return ip;
        } catch {
            return null;
        }
    }

    function isValidIP(ip) {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        return ipRegex.test(ip) && 
               ip.split('.').every(segment => parseInt(segment) >= 0 && parseInt(segment) <= 255);
    }

    async function fetchIPInfo(ip) {
        try {
            // Obtener información básica de IPinfo.io
            const response = await fetch(`https://ipinfo.io/${ip}/json`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al obtener información');
            }

            // Obtener información adicional
            const additionalInfo = await getAdditionalInfo(ip);

            // Combinar datos
            const combinedData = {
                ...data,
                ...additionalInfo
            };

            displayResults(combinedData);
        } catch (error) {
            showError(error.message);
        }
    }

    async function getAdditionalInfo(ip) {
        const [hostname, pingTime] = await Promise.all([
            getHostname(ip),
            getPingTime(ip)
        ]);

        return {
            hostname,
            pingTime
        };
    }

    async function getHostname(ip) {
        try {
            const response = await fetch(`https://dns.google/resolve?name=${ip}`);
            const data = await response.json();
            return data.Answer?.[0]?.data || 'No disponible';
        } catch {
            return 'No disponible';
        }
    }

    async function getPingTime(ip) {
        try {
            const startTime = performance.now();
            await fetch(`https://api.ipify.org?format=json&ip=${ip}`);
            const endTime = performance.now();
            return `${Math.round(endTime - startTime)}ms`;
        } catch {
            return 'No disponible';
        }
    }

    function addHistory(ip) {
        const timestamp = new Date().toLocaleString();
        const newEntry = { ip, timestamp };

        history = history.filter(entry => entry.ip !== ip);
        history.unshift(newEntry);

        if (history.length > MAX_HISTORY) {
            history.pop();
        }

        localStorage.setItem('ipHistory', JSON.stringify(history));
        displayHistory();
    }

    function displayHistory() {
        historyList.innerHTML = '';
        history.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.dataset.ip = entry.ip;
            item.textContent = `${entry.ip} - ${entry.timestamp}`;
            historyList.appendChild(item);
        });
    }

    function displayResults(data) {
        hideLoading();
        hideError();

        // Mostrar información básica
        document.getElementById('ip').textContent = data.ip || 'No disponible';
        document.getElementById('hostname').textContent = data.hostname || 'No disponible';
        document.getElementById('pingTime').textContent = data.pingTime || 'No disponible';

        // Mostrar información de ubicación
        document.getElementById('country').textContent = data.country || 'No disponible';
        document.getElementById('city').textContent = data.city || 'No disponible';
        document.getElementById('region').textContent = data.region || 'No disponible';
        document.getElementById('postal').textContent = data.postal || 'No disponible';

        // Mostrar información del ISP
        document.getElementById('isp').textContent = data.org || 'No disponible';
        document.getElementById('org').textContent = data.org || 'No disponible';

        // Mostrar información técnica
        document.getElementById('ipType').textContent = data.ip_type || 'No disponible';
        document.getElementById('asn').textContent = data.asn || 'No disponible';
        document.getElementById('timezone').textContent = data.timezone || 'No disponible';
    }

    function showLoading() {
        loading.style.display = 'block';
    }

    function hideLoading() {
        loading.style.display = 'none';
    }

    function showError(message) {
        hideLoading();
        error.textContent = message;
        error.style.display = 'block';
    }

    function hideError() {
        error.style.display = 'none';
    }
});
