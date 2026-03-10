const WalletRecargasModule = {
    pendingDeposits: [],

    getHTML() {
        return `
        <div style="padding: 24px; max-width: 900px; margin: 0 auto;">
            <h2 style="margin-bottom: 8px; color: #1e293b;">💰 Recargas de Billetera</h2>
            <p style="color: #64748b; margin-bottom: 24px;">Sube el PDF del BHD para acreditar billeteras automáticamente.</p>

            <!-- Instrucciones -->
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <strong style="color: #1d4ed8;">📋 Instrucciones:</strong>
                <ol style="margin: 8px 0 0 20px; color: #1e40af; line-height: 1.8;">
                    <li>El conductor transfiere al banco Squid usando su código (ej: <strong>SQUID-001</strong>) en el concepto</li>
                    <li>Descarga el PDF "Detalle de movimientos" desde BHD León</li>
                    <li>Súbelo aquí — el sistema detecta automáticamente los pagos</li>
                    <li>Revisa el preview y confirma para acreditar las billeteras</li>
                </ol>
            </div>

            <!-- Upload -->
            <div style="background: white; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 32px; text-align: center; margin-bottom: 24px; cursor: pointer;" 
                 onclick="document.getElementById('pdfInput').click()" id="dropZone">
                <div style="font-size: 48px; margin-bottom: 12px;">📄</div>
                <div style="font-size: 16px; font-weight: 600; color: #475569; margin-bottom: 4px;">Haz clic para seleccionar el PDF del BHD</div>
                <div style="font-size: 13px; color: #94a3b8;">Solo archivos PDF</div>
                <input type="file" id="pdfInput" accept=".pdf" style="display:none;" onchange="WalletRecargasModule.handleFile(this)">
            </div>

            <!-- Preview -->
            <div id="walletPreview" style="display:none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="color: #1e293b; margin: 0;">📊 Preview — Transacciones Detectadas</h3>
                    <span id="previewCount" style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px;"></span>
                </div>
                <div id="previewTable"></div>
                <div style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="WalletRecargasModule.cancelar()" 
                            style="padding: 10px 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; color: #64748b;">
                        Cancelar
                    </button>
                    <button onclick="WalletRecargasModule.procesar()" id="btnProcesar"
                            style="padding: 10px 24px; border: none; border-radius: 8px; background: #16a34a; color: white; font-weight: 600; cursor: pointer; font-size: 15px;">
                        ✅ Acreditar Billeteras
                    </button>
                </div>
            </div>

            <!-- Historial -->
            <div style="margin-top: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="color: #1e293b; margin: 0;">🕒 Historial de Recargas</h3>
                    <button onclick="WalletRecargasModule.loadHistorial()" 
                            style="padding: 6px 16px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-size: 13px;">
                        🔄 Actualizar
                    </button>
                </div>
                <div id="historialTable"><div style="text-align:center; padding: 20px; color: #94a3b8;">Cargando historial...</div></div>
            </div>
        </div>`;
    },

    init() {
        this.pendingDeposits = [];
        this.loadHistorial();
    },

    async handleFile(input) {
        const file = input.files[0];
        if (!file) return;

        const dropZone = document.getElementById('dropZone');
        dropZone.innerHTML = `<div style="font-size: 32px;">⏳</div><div style="color: #475569; margin-top: 8px;">Procesando PDF...</div>`;

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch('https://web-production-99844.up.railway.app/api/admin/wallet/upload-pdf', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al procesar PDF');

            this.pendingDeposits = data.deposits;
            this.showPreview(data.deposits, file.name);

            dropZone.innerHTML = `
                <div style="font-size: 32px;">✅</div>
                <div style="color: #16a34a; font-weight: 600; margin-top: 8px;">${file.name}</div>
                <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">PDF procesado — ${data.deposits.length} transacciones detectadas</div>`;

        } catch (err) {
            dropZone.innerHTML = `
                <div style="font-size: 32px;">❌</div>
                <div style="color: #dc2626; margin-top: 8px;">${err.message}</div>
                <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Haz clic para intentar de nuevo</div>`;
            dropZone.onclick = () => document.getElementById('pdfInput').click();
        }
    },

    showPreview(deposits, filename) {
        const listas = { listo: [], duplicado: [], sin_codigo: [], conductor_no_encontrado: [] };
        deposits.forEach(d => (listas[d.status] || listas['sin_codigo']).push(d));

        const statusLabel = { listo: '✅ Listo', duplicado: '⚠️ Duplicado', sin_codigo: '❓ Sin código', conductor_no_encontrado: '❌ No encontrado' };
        const statusColor = { listo: '#16a34a', duplicado: '#d97706', sin_codigo: '#64748b', conductor_no_encontrado: '#dc2626' };
        const statusBg   = { listo: '#f0fdf4', duplicado: '#fffbeb', sin_codigo: '#f8fafc', conductor_no_encontrado: '#fef2f2' };

        const listos = listas['listo'].length;
        document.getElementById('previewCount').textContent = `${listos} a acreditar`;
        document.getElementById('btnProcesar').disabled = listos === 0;
        document.getElementById('btnProcesar').style.opacity = listos === 0 ? '0.5' : '1';

        let html = `<table style="width:100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
            <thead>
                <tr style="background: #f8fafc;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">FECHA</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">CONFIRMACIÓN</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">CÓDIGO</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600;">CONDUCTOR</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; font-weight: 600;">MONTO</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b; font-weight: 600;">ESTADO</th>
                </tr>
            </thead><tbody>`;

        deposits.forEach(d => {
            html += `<tr style="border-top: 1px solid #f1f5f9; background: ${statusBg[d.status] || '#fff'};">
                <td style="padding: 12px 16px; font-size: 14px; color: #475569;">${d.deposit_date || '-'}</td>
                <td style="padding: 12px 16px; font-size: 12px; color: #94a3b8; font-family: monospace;">${d.confirmation_number}</td>
                <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b;">${d.driver_code || '-'}</td>
                <td style="padding: 12px 16px; font-size: 14px; color: #475569;">${d.driver_name || '-'}</td>
                <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: #16a34a; text-align: right;">RD$ ${parseFloat(d.amount || 0).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                <td style="padding: 12px 16px; text-align: center;">
                    <span style="background: ${statusBg[d.status]}; color: ${statusColor[d.status]}; border: 1px solid ${statusColor[d.status]}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        ${statusLabel[d.status] || d.status}
                    </span>
                </td>
            </tr>`;
        });

        html += `</tbody></table>`;
        document.getElementById('previewTable').innerHTML = html;
        document.getElementById('walletPreview').style.display = 'block';
    },

    cancelar() {
        this.pendingDeposits = [];
        document.getElementById('walletPreview').style.display = 'none';
        document.getElementById('pdfInput').value = '';
        const dropZone = document.getElementById('dropZone');
        dropZone.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">📄</div>
            <div style="font-size: 16px; font-weight: 600; color: #475569; margin-bottom: 4px;">Haz clic para seleccionar el PDF del BHD</div>
            <div style="font-size: 13px; color: #94a3b8;">Solo archivos PDF</div>
            <input type="file" id="pdfInput" accept=".pdf" style="display:none;" onchange="WalletRecargasModule.handleFile(this)">`;
        dropZone.onclick = () => document.getElementById('pdfInput').click();
    },

    async procesar() {
        const listos = this.pendingDeposits.filter(d => d.status === 'listo');
        if (listos.length === 0) return;

        const btn = document.getElementById('btnProcesar');
        btn.disabled = true;
        btn.textContent = '⏳ Procesando...';

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch('https://web-production-99844.up.railway.app/api/admin/wallet/process-deposits', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ deposits: listos })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al procesar');

            alert(`✅ ¡Listo! Se acreditaron ${data.processed} recargas correctamente.`);
            this.cancelar();
            this.loadHistorial();

        } catch (err) {
            alert('❌ Error: ' + err.message);
            btn.disabled = false;
            btn.textContent = '✅ Acreditar Billeteras';
        }
    },

    async loadHistorial() {
        const el = document.getElementById('historialTable');
        if (!el) return;
        el.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8;">Cargando...</div>';

        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch('https://web-production-99844.up.railway.app/api/admin/wallet/history?limit=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (!data.deposits || data.deposits.length === 0) {
                el.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8;">No hay recargas registradas aún.</div>';
                return;
            }

            let html = `<table style="width:100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                <thead><tr style="background: #f8fafc;">
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b;">FECHA</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b;">CÓDIGO</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b;">CONDUCTOR</th>
                    <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b;">MONTO</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b;">CONFIRMACIÓN</th>
                </tr></thead><tbody>`;

            data.deposits.forEach(d => {
                html += `<tr style="border-top: 1px solid #f1f5f9;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">${new Date(d.processed_at).toLocaleDateString('es-DO')}</td>
                    <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${d.driver_code}</td>
                    <td style="padding: 12px 16px; color: #475569;">${d.driver_name || '-'}</td>
                    <td style="padding: 12px 16px; font-weight: 700; color: #16a34a; text-align: right;">RD$ ${parseFloat(d.amount).toLocaleString('es-DO', {minimumFractionDigits: 2})}</td>
                    <td style="padding: 12px 16px; font-size: 12px; color: #94a3b8; font-family: monospace;">${d.confirmation_number}</td>
                </tr>`;
            });

            html += '</tbody></table>';
            el.innerHTML = html;

        } catch (err) {
            el.innerHTML = `<div style="text-align:center; padding: 20px; color: #dc2626;">Error cargando historial: ${err.message}</div>`;
        }
    }
};