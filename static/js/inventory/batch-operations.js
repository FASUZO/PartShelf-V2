/**
 * 库存管理系统 - 批量操作模块
 * 处理批量入库和批量出库功能
 */

// ==================== 批量出库 ====================
let batchStockOutData = [];

// 绑定批量出库事件
function bindBatchStockOutEvents() {
    const previewBtn = document.getElementById('previewBatchStockOutBtn');
    const confirmBtn = document.getElementById('confirmBatchStockOutBtn');
    const fileInput = document.getElementById('batchStockOutFile');

    if (previewBtn) previewBtn.addEventListener('click', previewBatchStockOut);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmBatchStockOut);
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            document.getElementById('batchStockOutPreview').classList.add('d-none');
            document.getElementById('confirmBatchStockOutBtn').classList.add('d-none');
            batchStockOutData = [];
        });
    }
}

// 预览批量出库
function previewBatchStockOut() {
    const fileInput = document.getElementById('batchStockOutFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('请选择文件', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = parseBatchFile(e.target.result, file.name);
            matchBatchStockOutData(data);
        } catch (error) {
            showToast('文件解析失败: ' + error.message, 'danger');
        }
    };
    reader.readAsText(file);
}

// 匹配批量出库数据
function matchBatchStockOutData(requestData) {
    fetch('/api/inventory/advanced_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, page_size: 10000 })
    })
    .then(response => response.json())
    .then(result => {
        const allParts = result.data || [];
        batchStockOutData = [];

        requestData.forEach(req => {
            const matchedParts = allParts.filter(p => 
                p.name.toLowerCase() === req.name.toLowerCase() ||
                p.name.toLowerCase().includes(req.name.toLowerCase()) ||
                req.name.toLowerCase().includes(p.name.toLowerCase())
            );

            if (matchedParts.length === 0) {
                batchStockOutData.push({
                    requestName: req.name,
                    requestQuantity: req.quantity,
                    matchedParts: [],
                    selectedPart: null,
                    status: 'not_found'
                });
            } else if (matchedParts.length === 1) {
                const part = matchedParts[0];
                batchStockOutData.push({
                    requestName: req.name,
                    requestQuantity: req.quantity,
                    matchedParts: matchedParts,
                    selectedPart: part,
                    status: part.quantity >= req.quantity ? 'ok' : 'insufficient'
                });
            } else {
                batchStockOutData.push({
                    requestName: req.name,
                    requestQuantity: req.quantity,
                    matchedParts: matchedParts,
                    selectedPart: null,
                    status: 'multiple_matches'
                });
            }
        });

        renderBatchStockOutPreview();
    })
    .catch(error => showToast('匹配失败: ' + error.message, 'danger'));
}

// 渲染批量出库预览
function renderBatchStockOutPreview() {
    const previewDiv = document.getElementById('batchStockOutPreview');
    const tbody = document.getElementById('batchStockOutPreviewBody');
    const confirmBtn = document.getElementById('confirmBatchStockOutBtn');

    previewDiv.classList.remove('d-none');

    if (batchStockOutData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">无数据</td></tr>';
        confirmBtn.classList.add('d-none');
        return;
    }

    tbody.innerHTML = batchStockOutData.map((item, index) => {
        if (item.status === 'multiple_matches') {
            return renderBatchOutMultipleMatch(item, index);
        } else if (item.status === 'not_found') {
            return renderBatchOutNotFound(item);
        } else {
            return renderBatchOutMatched(item, index);
        }
    }).join('');

    const hasOkItems = batchStockOutData.some(item => 
        item.selectedPart && (item.status === 'ok' || item.status === 'insufficient')
    );
    hasOkItems ? confirmBtn.classList.remove('d-none') : confirmBtn.classList.add('d-none');
}

// 渲染多匹配项
function renderBatchOutMultipleMatch(item, index) {
    const selectOptions = item.matchedParts.map((p, i) => {
        return `<option value="${i}">${p.name} | ${p.manufacturer || '-'} | ${p.package || '-'} | 库存:${p.quantity}</option>`;
    }).join('');
    
    return `
        <tr class="table-warning">
            <td>${escapeHtml(item.requestName)}</td>
            <td>${item.requestQuantity}</td>
            <td><span class="text-muted">找到 ${item.matchedParts.length} 个匹配项</span></td>
            <td>-</td>
            <td>-</td>
            <td><span class="badge bg-warning text-dark">需选择</span></td>
            <td>
                <select class="form-select form-select-sm" onchange="selectPartForBatchOut(${index}, this.value)" style="min-width: 200px;">
                    <option value="">选择零件...</option>
                    ${selectOptions}
                </select>
            </td>
        </tr>
    `;
}

// 渲染未找到项
function renderBatchOutNotFound(item) {
    return `
        <tr class="table-danger">
            <td>${escapeHtml(item.requestName)}</td>
            <td>${item.requestQuantity}</td>
            <td><span class="text-danger">未找到匹配的零件</span></td>
            <td>-</td>
            <td>-</td>
            <td><span class="badge bg-danger">未找到</span></td>
            <td>-</td>
        </tr>
    `;
}

// 渲染已匹配项
function renderBatchOutMatched(item, index) {
    const part = item.selectedPart;
    const afterQty = part.quantity - item.requestQuantity;
    const statusClass = item.status === 'ok' ? 'bg-success' : 'bg-warning text-dark';
    const statusText = item.status === 'ok' ? '可出库' : '库存不足';
    const actionHtml = item.status === 'insufficient' 
        ? `<button class="btn btn-sm btn-outline-primary" onclick="adjustStockForBatch(${index}, ${part.id})">修改库存</button>`
        : '<span class="text-success"><i class="fas fa-check"></i></span>';

    return `
        <tr class="${item.status === 'ok' ? '' : 'table-warning'}">
            <td>${escapeHtml(item.requestName)}</td>
            <td>${item.requestQuantity}</td>
            <td>
                <div><strong>${part.name}</strong></div>
                <small class="text-muted">${part.manufacturer || '-'} | ${part.package || '-'} | ${part.part_type || '-'}</small>
            </td>
            <td>${part.quantity}</td>
            <td class="${afterQty < 0 ? 'text-danger fw-bold' : ''}">${afterQty}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>${actionHtml}</td>
        </tr>
    `;
}

// 选择批量出库零件
function selectPartForBatchOut(index, selectedIndex) {
    if (selectedIndex === '') {
        batchStockOutData[index].selectedPart = null;
        batchStockOutData[index].status = 'multiple_matches';
    } else {
        const part = batchStockOutData[index].matchedParts[parseInt(selectedIndex)];
        batchStockOutData[index].selectedPart = part;
        batchStockOutData[index].status = part.quantity >= batchStockOutData[index].requestQuantity ? 'ok' : 'insufficient';
    }
    renderBatchStockOutPreview();
}

// 调整批量出库库存
function adjustStockForBatch(index, partId) {
    const item = batchStockOutData[index];
    const part = item.selectedPart || item.matchedParts.find(p => p.id === partId);
    
    const newQty = prompt(`请输入 ${part.name} 的新库存数量:`, part.quantity);
    if (newQty === null) return;

    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) {
        showToast('请输入有效的数量', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('part_id', partId);
    formData.append('quantity_change', qty - part.quantity);
    formData.append('remark', '批量出库前调整库存');

    fetch('/api/inventory/update_quantity', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        showToast('库存已调整', 'success');
        part.quantity = qty;
        if (part.quantity >= item.requestQuantity) {
            item.status = 'ok';
        }
        renderBatchStockOutPreview();
        applyAdvancedFilter();
    })
    .catch(error => showToast('调整失败: ' + error.message, 'danger'));
}

// 确认批量出库
function confirmBatchStockOut() {
    const remark = document.getElementById('batchStockOutRemark').value || '批量出库';
    const okItems = batchStockOutData.filter(item => 
        item.selectedPart && (item.status === 'ok' || item.status === 'insufficient')
    );

    if (okItems.length === 0) {
        showToast('没有可出库的项目，请选择零件', 'warning');
        return;
    }

    let completed = 0;
    let failed = 0;

    okItems.forEach(item => {
        const formData = new FormData();
        formData.append('part_id', item.selectedPart.id);
        formData.append('quantity_change', -item.requestQuantity);
        formData.append('remark', remark);

        fetch('/api/inventory/update_quantity', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) completed++;
            else failed++;
        })
        .catch(() => failed++)
        .finally(() => {
            if (completed + failed === okItems.length) {
                showToast(`批量出库完成: ${completed} 成功, ${failed} 失败`, failed > 0 ? 'warning' : 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('batchStockOutModal'));
                if (modal) modal.hide();
                applyAdvancedFilter();
            }
        });
    });
}

// 下载批量出库模板
function downloadBatchStockOutTemplate() {
    downloadBatchTemplate('批量出库模板.csv', 'Name,Quantity\nNE555,10\nLM358,5\nArduino Uno,2');
}

// ==================== 批量入库 ====================
let batchStockInData = [];

// 绑定批量入库事件
function bindBatchStockInEvents() {
    const previewBtn = document.getElementById('previewBatchStockInBtn');
    const confirmBtn = document.getElementById('confirmBatchStockInBtn');
    const fileInput = document.getElementById('batchStockInFile');

    if (previewBtn) previewBtn.addEventListener('click', previewBatchStockIn);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmBatchStockIn);
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            document.getElementById('batchStockInPreview').classList.add('d-none');
            document.getElementById('confirmBatchStockInBtn').classList.add('d-none');
            batchStockInData = [];
        });
    }
}

// 预览批量入库
function previewBatchStockIn() {
    const fileInput = document.getElementById('batchStockInFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('请选择文件', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = parseBatchFile(e.target.result, file.name);
            matchBatchStockInData(data);
        } catch (error) {
            showToast('文件解析失败: ' + error.message, 'danger');
        }
    };
    reader.readAsText(file);
}

// 匹配批量入库数据
function matchBatchStockInData(requestData) {
    fetch('/api/inventory/advanced_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, page_size: 10000 })
    })
    .then(response => response.json())
    .then(result => {
        const allParts = result.data || [];
        batchStockInData = [];

        requestData.forEach(req => {
            const matchedParts = allParts.filter(p => 
                p.name.toLowerCase() === req.name.toLowerCase() ||
                p.name.toLowerCase().includes(req.name.toLowerCase()) ||
                req.name.toLowerCase().includes(p.name.toLowerCase())
            );

            if (matchedParts.length === 0) {
                batchStockInData.push({
                    requestName: req.name,
                    requestQuantity: req.quantity,
                    matchedParts: [],
                    selectedPart: null,
                    status: 'not_found'
                });
            } else if (matchedParts.length === 1) {
                batchStockInData.push({
                    requestName: req.name,
                    requestQuantity: req.quantity,
                    matchedParts: matchedParts,
                    selectedPart: matchedParts[0],
                    status: 'ok'
                });
            } else {
                batchStockInData.push({
                    requestName: req.name,
                    requestQuantity: req.quantity,
                    matchedParts: matchedParts,
                    selectedPart: null,
                    status: 'multiple_matches'
                });
            }
        });

        renderBatchStockInPreview();
    })
    .catch(error => showToast('匹配失败: ' + error.message, 'danger'));
}

// 渲染批量入库预览
function renderBatchStockInPreview() {
    const previewDiv = document.getElementById('batchStockInPreview');
    const tbody = document.getElementById('batchStockInPreviewBody');
    const confirmBtn = document.getElementById('confirmBatchStockInBtn');

    previewDiv.classList.remove('d-none');

    if (batchStockInData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">无数据</td></tr>';
        confirmBtn.classList.add('d-none');
        return;
    }

    tbody.innerHTML = batchStockInData.map((item, index) => {
        if (item.status === 'multiple_matches') {
            return renderBatchInMultipleMatch(item, index);
        } else if (item.status === 'not_found') {
            return renderBatchInNotFound(item, index);
        } else {
            return renderBatchInMatched(item);
        }
    }).join('');

    const hasOkItems = batchStockInData.some(item => item.selectedPart);
    hasOkItems ? confirmBtn.classList.remove('d-none') : confirmBtn.classList.add('d-none');
}

// 渲染批量入库多匹配
function renderBatchInMultipleMatch(item, index) {
    const selectOptions = item.matchedParts.map((p, i) => {
        return `<option value="${i}">${p.name} | ${p.manufacturer || '-'} | ${p.package || '-'} | 库存:${p.quantity}</option>`;
    }).join('');
    
    return `
        <tr class="table-warning">
            <td>${escapeHtml(item.requestName)}</td>
            <td>${item.requestQuantity}</td>
            <td><span class="text-muted">找到 ${item.matchedParts.length} 个匹配项</span></td>
            <td>-</td>
            <td>-</td>
            <td><span class="badge bg-warning text-dark">需选择</span></td>
            <td>
                <select class="form-select form-select-sm" onchange="selectPartForBatchIn(${index}, this.value)" style="min-width: 200px;">
                    <option value="">选择零件...</option>
                    ${selectOptions}
                </select>
            </td>
        </tr>
    `;
}

// 渲染批量入库未找到
function renderBatchInNotFound(item, index) {
    return `
        <tr class="table-danger">
            <td>${escapeHtml(item.requestName)}</td>
            <td>${item.requestQuantity}</td>
            <td><span class="text-danger">未找到匹配的零件</span></td>
            <td>-</td>
            <td>-</td>
            <td><span class="badge bg-danger">未找到</span></td>
            <td><button class="btn btn-sm btn-outline-success" onclick="createNewPartForBatchIn(${index})">新增零件</button></td>
        </tr>
    `;
}

// 渲染批量入库已匹配
function renderBatchInMatched(item) {
    const part = item.selectedPart;
    const afterQty = part.quantity + item.requestQuantity;
    
    return `
        <tr>
            <td>${escapeHtml(item.requestName)}</td>
            <td>${item.requestQuantity}</td>
            <td>
                <div><strong>${part.name}</strong></div>
                <small class="text-muted">${part.manufacturer || '-'} | ${part.package || '-'} | ${part.part_type || '-'}</small>
            </td>
            <td>${part.quantity}</td>
            <td class="text-success fw-bold">${afterQty}</td>
            <td><span class="badge bg-success">可入库</span></td>
            <td><span class="text-success"><i class="fas fa-check"></i></span></td>
        </tr>
    `;
}

// 选择批量入库零件
function selectPartForBatchIn(index, selectedIndex) {
    if (selectedIndex === '') {
        batchStockInData[index].selectedPart = null;
        batchStockInData[index].status = 'multiple_matches';
    } else {
        batchStockInData[index].selectedPart = batchStockInData[index].matchedParts[parseInt(selectedIndex)];
        batchStockInData[index].status = 'ok';
    }
    renderBatchStockInPreview();
}

// 为批量入库创建新零件
function createNewPartForBatchIn(index) {
    const item = batchStockInData[index];
    const name = prompt('请输入零件名称:', item.requestName);
    if (!name) return;
    
    const manufacturer = prompt('请输入制造商:', 'Unknown');
    if (!manufacturer) return;
    
    const package_ = prompt('请输入封装:', 'Unknown');
    if (!package_) return;
    
    const partType = prompt('请输入零件类型:', 'Other');
    if (!partType) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('manufacturer', manufacturer);
    formData.append('part_type', partType);
    formData.append('package', package_);
    formData.append('quantity', item.requestQuantity);

    fetch('/api/inventory/add_part_to_inventory', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            showToast('新零件创建成功', 'success');
            batchStockInData.splice(index, 1);
            renderBatchStockInPreview();
            applyAdvancedFilter();
        } else {
            showToast('创建失败', 'danger');
        }
    })
    .catch(error => showToast('创建失败: ' + error.message, 'danger'));
}

// 确认批量入库
function confirmBatchStockIn() {
    const remark = document.getElementById('batchStockInRemark').value || '批量入库';
    const okItems = batchStockInData.filter(item => item.selectedPart);

    if (okItems.length === 0) {
        showToast('没有可入库的项目，请选择零件', 'warning');
        return;
    }

    let completed = 0;
    let failed = 0;

    okItems.forEach(item => {
        const formData = new FormData();
        formData.append('part_id', item.selectedPart.id);
        formData.append('quantity_change', item.requestQuantity);
        formData.append('remark', remark);

        fetch('/api/inventory/update_quantity', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) completed++;
            else failed++;
        })
        .catch(() => failed++)
        .finally(() => {
            if (completed + failed === okItems.length) {
                showToast(`批量入库完成: ${completed} 成功, ${failed} 失败`, failed > 0 ? 'warning' : 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('batchStockInModal'));
                if (modal) modal.hide();
                applyAdvancedFilter();
            }
        });
    });
}

// 下载批量入库模板
function downloadBatchStockInTemplate() {
    downloadBatchTemplate('批量入库模板.csv', 'Name,Quantity\nNE555,100\nLM358,50\nArduino Uno,20');
}

// ==================== 通用函数 ====================

// 解析批量文件（CSV）
function parseBatchFile(content, filename) {
    const lines = content.trim().split('\n');
    const data = [];

    // 检测分隔符
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('型号') || h === '名称');
    const qtyIndex = headers.findIndex(h => h.includes('quantity') || h.includes('数量') || h === 'qty');

    if (nameIndex === -1 || qtyIndex === -1) {
        throw new Error('文件必须包含 Name/型号 和 Quantity/数量 列');
    }

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter);
        if (cols.length > Math.max(nameIndex, qtyIndex)) {
            const name = cols[nameIndex].trim();
            const quantity = parseInt(cols[qtyIndex].trim());
            if (name && !isNaN(quantity) && quantity > 0) {
                data.push({ name, quantity, line: i + 1 });
            }
        }
    }

    return data;
}

// 下载批量模板
function downloadBatchTemplate(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('模板下载成功', 'success');
}

// 导出到全局
window.batchStockOutData = batchStockOutData;
window.batchStockInData = batchStockInData;
window.bindBatchStockOutEvents = bindBatchStockOutEvents;
window.bindBatchStockInEvents = bindBatchStockInEvents;
window.previewBatchStockOut = previewBatchStockOut;
window.previewBatchStockIn = previewBatchStockIn;
window.selectPartForBatchOut = selectPartForBatchOut;
window.selectPartForBatchIn = selectPartForBatchIn;
window.adjustStockForBatch = adjustStockForBatch;
window.confirmBatchStockOut = confirmBatchStockOut;
window.confirmBatchStockIn = confirmBatchStockIn;
window.downloadBatchStockOutTemplate = downloadBatchStockOutTemplate;
window.downloadBatchStockInTemplate = downloadBatchStockInTemplate;
window.createNewPartForBatchIn = createNewPartForBatchIn;
