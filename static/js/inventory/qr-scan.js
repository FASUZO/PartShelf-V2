/**
 * 二维码扫描模块
 * 实现扫描二维码入库功能
 */

let html5QrCode = null;
let isScanning = false;

// 初始化二维码扫描
function initQrScan() {
    const scanBtn = document.getElementById('qrScanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', openQrScanModal);
    }
}

// 打开扫描模态框
function openQrScanModal() {
    const modal = new bootstrap.Modal(document.getElementById('qrScanModal'));
    modal.show();

    // 模态框关闭时停止扫描
    document.getElementById('qrScanModal').addEventListener('hidden.bs.modal', function () {
        stopQrScan();
    });

    // 开始扫描
    startQrScan();
}

// 开始扫描
function startQrScan() {
    const readerEl = document.getElementById('qr-reader');
    const resultEl = document.getElementById('qr-scan-result');

    if (!readerEl) return;

    // 清除之前的结果
    resultEl.innerHTML = '<p class="text-muted">正在启动摄像头...</p>';
    document.getElementById('qr-confirm-section').style.display = 'none';

    // 检查是否已加载 html5-qrcode 库
    if (typeof Html5Qrcode === 'undefined') {
        resultEl.innerHTML = '<p class="text-danger">QR扫描库未加载，请刷新页面重试</p>';
        return;
    }

    html5QrCode = new Html5Qrcode("qr-reader");

    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        isScanning = true;
        resultEl.innerHTML = '<p class="text-info"><i class="fas fa-camera me-1"></i>请将二维码对准扫描框</p>';
    }).catch(err => {
        resultEl.innerHTML = `<p class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>无法启动摄像头: ${err}</p>`;
    });
}

// 停止扫描
function stopQrScan() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            isScanning = false;
        }).catch(err => {
            console.error('停止扫描失败:', err);
        });
    }
}

// 扫描成功回调
function onScanSuccess(decodedText, decodedResult) {
    // 停止扫描
    stopQrScan();

    const resultEl = document.getElementById('qr-scan-result');
    const confirmSection = document.getElementById('qr-confirm-section');

    try {
        // 解析二维码内容
        const parsed = parseQrCode(decodedText);

        if (!parsed) {
            resultEl.innerHTML = '<p class="text-danger"><i class="fas fa-times-circle me-1"></i>无法解析二维码内容</p>';
            return;
        }

        // 显示解析结果
        resultEl.innerHTML = `
            <div class="alert alert-success py-2 mb-2">
                <i class="fas fa-check-circle me-1"></i><strong>扫描成功</strong>
            </div>
            <div class="small">
                <div><strong>LC Number:</strong> ${escapeHtml(parsed.pc || '-')}</div>
                <div><strong>名称:</strong> ${escapeHtml(parsed.pm || '-')}</div>
                <div><strong>数量:</strong> ${parsed.qty || '-'}</div>
            </div>
        `;

        // 查询库存中是否存在该零件
        searchPartByLcNumber(parsed.pc, parsed);

    } catch (e) {
        resultEl.innerHTML = `<p class="text-danger"><i class="fas fa-times-circle me-1"></i>解析错误: ${e.message}</p>`;
    }
}

// 扫描失败回调（忽略）
function onScanFailure(error) {
    // 忽略扫描失败（通常是未检测到二维码）
}

// 解析二维码内容
function parseQrCode(text) {
    if (!text) return null;

    try {
        // 尝试直接解析（已经是合法JSON）
        return JSON.parse(text);
    } catch (e) {
        // 尝试添加引号使其成为合法JSON
        try {
            // 匹配 key:value 格式，添加引号
            const fixed = text
                .replace(/(\w+):/g, '"$1":')  // key: → "key":
                .replace(/:\s*null/g, ': null')  // 保持null
                .replace(/:\s*(\d+)/g, ': $1');  // 保持数字
            return JSON.parse(fixed);
        } catch (e2) {
            // 尝试正则提取
            const pc = text.match(/pc[:\s]+(\w+)/i);
            const pm = text.match(/pm[:\s]+([^,}]+)/i);
            const qty = text.match(/qty[:\s]+(\d+)/i);

            if (pc || pm || qty) {
                return {
                    pc: pc ? pc[1] : null,
                    pm: pm ? pm[1].trim() : null,
                    qty: qty ? parseInt(qty[1]) : null
                };
            }
            return null;
        }
    }
}

// 根据LC Number查询库存
function searchPartByLcNumber(lcNumber, qrData) {
    const resultEl = document.getElementById('qr-scan-result');
    const confirmSection = document.getElementById('qr-confirm-section');

    if (!lcNumber) {
        // 没有LC Number，打开添加表单
        showAddPartWithQrData(qrData);
        return;
    }

    // 查询库存
    fetch(`/api/inventory/advanced_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_key: lcNumber, page: 1, page_size: 10 })
    })
    .then(response => response.json())
    .then(data => {
        const items = data.data || [];

        // 查找精确匹配的零件
        const matched = items.find(p =>
            p.lc_number && p.lc_number.toLowerCase() === lcNumber.toLowerCase()
        );

        if (matched) {
            // 找到零件，显示入库确认
            showStockInConfirm(matched, qrData);
        } else {
            // 未找到，提示添加
            showAddPartWithQrData(qrData);
        }
    })
    .catch(err => {
        resultEl.innerHTML += `<p class="text-danger mt-2">查询失败: ${err.message}</p>`;
    });
}

// 显示入库确认
function showStockInConfirm(part, qrData) {
    const resultEl = document.getElementById('qr-scan-result');
    const confirmSection = document.getElementById('qr-confirm-section');
    const quantity = parseInt(qrData.qty) || 1;

    resultEl.innerHTML += `
        <hr class="my-2">
        <div class="alert alert-info py-2 mb-0">
            <strong>已找到零件</strong><br>
            <span class="fw-bold">${escapeHtml(part.name)}</span> - ${escapeHtml(part.manufacturer)}<br>
            <small>当前库存: ${part.quantity}</small>
        </div>
    `;

    // 显示确认区域
    confirmSection.style.display = 'block';
    document.getElementById('qrStockInPartId').value = part.id;
    document.getElementById('qrStockInQuantity').value = quantity;
    document.getElementById('qrStockInPartInfo').innerHTML =
        `<strong>${escapeHtml(part.name)}</strong> - ${escapeHtml(part.manufacturer)}`;
}

// 显示添加零件表单（预填数据）
function showAddPartWithQrData(qrData) {
    const resultEl = document.getElementById('qr-scan-result');

    resultEl.innerHTML += `
        <hr class="my-2">
        <div class="alert alert-warning py-2 mb-0">
            <i class="fas fa-exclamation-triangle me-1"></i>
            <strong>库存中未找到该零件</strong><br>
            <small>LC Number: ${escapeHtml(qrData.pc || '-')}</small>
        </div>
        <button class="btn btn-primary btn-sm mt-2 w-100" onclick="openAddPartFromQr()">
            <i class="fas fa-plus me-1"></i>添加零件
        </button>
    `;

    // 保存QR数据供添加表单使用
    window._qrData = qrData;
}

// 从QR数据打开添加零件表单
function openAddPartFromQr() {
    // 关闭扫描模态框
    const scanModal = bootstrap.Modal.getInstance(document.getElementById('qrScanModal'));
    if (scanModal) scanModal.hide();

    // 打开添加零件模态框
    const addModal = new bootstrap.Modal(document.getElementById('addComponentModal'));
    addModal.show();

    // 预填数据
    const qrData = window._qrData;
    if (qrData) {
        if (qrData.pm) {
            document.getElementById('partName').value = qrData.pm;
        }
        if (qrData.pc) {
            document.getElementById('partLcNumber').value = qrData.pc;
        }
        if (qrData.qty) {
            document.getElementById('partQuantity').value = parseInt(qrData.qty);
        }
    }
}

// 绑定QR入库表单
function bindQrStockInForm() {
    const form = document.getElementById('qrStockInForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const partId = document.getElementById('qrStockInPartId').value;
        const quantity = parseInt(document.getElementById('qrStockInQuantity').value);
        const remark = document.getElementById('qrStockInRemark').value || '二维码扫描入库';

        if (!partId || !quantity || quantity <= 0) {
            showToast('请输入有效的数量', 'danger');
            return;
        }

        // 调用入库API
        const formData = new FormData();
        formData.append('part_id', partId);
        formData.append('quantity_change', quantity);
        formData.append('remark', remark);

        fetch('/api/inventory/update_quantity', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) throw new Error('入库失败');
            return response.json();
        })
        .then(data => {
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('qrScanModal'));
            if (modal) modal.hide();

            showToast(`入库成功！当前库存: ${data.new_quantity}`, 'success');

            // 刷新列表
            if (typeof applyAdvancedFilter === 'function') {
                applyAdvancedFilter();
            }
        })
        .catch(err => {
            showToast('入库失败: ' + err.message, 'danger');
        });
    });
}

// 手动解析二维码内容
function parseManualQrInput() {
    const input = document.getElementById('qrManualInput');
    const resultEl = document.getElementById('qr-scan-result');
    const confirmSection = document.getElementById('qr-confirm-section');

    if (!input || !input.value.trim()) {
        showToast('请输入二维码内容', 'warning');
        return;
    }

    try {
        const parsed = parseQrCode(input.value.trim());

        if (!parsed) {
            showToast('无法解析内容，请检查格式', 'danger');
            return;
        }

        // 显示解析结果
        resultEl.innerHTML = `
            <div class="alert alert-success py-2 mb-2">
                <i class="fas fa-check-circle me-1"></i><strong>解析成功</strong>
            </div>
            <div class="small">
                <div><strong>LC Number:</strong> ${escapeHtml(parsed.pc || '-')}</div>
                <div><strong>名称:</strong> ${escapeHtml(parsed.pm || '-')}</div>
                <div><strong>数量:</strong> ${parsed.qty || '-'}</div>
            </div>
        `;

        // 查询库存中是否存在该零件
        searchPartByLcNumber(parsed.pc, parsed);

        // 切换到结果显示
        document.querySelector('[data-bs-target="#tabCamera"]').classList.remove('active');
        document.querySelector('[data-bs-target="#tabCamera"]').setAttribute('aria-selected', 'false');
        document.getElementById('tabCamera').classList.remove('show', 'active');

    } catch (e) {
        showToast('解析错误: ' + e.message, 'danger');
    }
}

// 导出函数
window.initQrScan = initQrScan;
window.openQrScanModal = openQrScanModal;
window.openAddPartFromQr = openAddPartFromQr;
window.parseManualQrInput = parseManualQrInput;
