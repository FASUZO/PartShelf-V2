/**
 * 库存管理系统 - 表格和排序模块
 * 管理零件列表的显示、排序和更新
 */

// 全局排序状态
let currentSort = { field: null, direction: 'asc' };
// 当前显示的零件数据
let currentPartsData = [];

// 绑定表头排序事件
function bindSortEvents() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortField = this.getAttribute('data-sort');
            handleSort(sortField);
        });
    });
}

// 处理排序逻辑
function handleSort(field) {
    // 切换排序方向或选择新字段
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    updateSortHeaders();
    applyAdvancedFilter();
}

// 更新表头排序样式
function updateSortHeaders() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.classList.remove('active', 'asc', 'desc');
        
        if (header.getAttribute('data-sort') === currentSort.field) {
            header.classList.add('active', currentSort.direction);
        }
    });
}

// 更新表格显示
function updateTable(data) {
    const tbody = document.getElementById('parts-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // 兼容数组和分页响应
    const items = Array.isArray(data) ? data : (data.data || []);
    currentPartsData = items;
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">暂无数据</td></tr>';
        return;
    }

    // 使用DocumentFragment优化DOM操作
    const fragment = document.createDocumentFragment();
    
    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'animate-fade-in';
        row.style.animationDelay = `${Math.min(index * 0.03, 0.5)}s`;
        
        // 根据库存数量设置样式
        const quantityClass = item.quantity > 10 ? 'bg-success' : 
                             (item.quantity > 0 ? 'bg-warning text-dark' : 'bg-danger');
        
        var actionButtons = `
                    <button class="btn btn-sm btn-outline-info action-btn" onclick="viewDetails(${item.id})" title="详情">
                        <i class="fas fa-eye"></i>
                    </button>`;

        if (typeof isAuthenticated !== 'undefined' && isAuthenticated) {
            actionButtons += `
                    <button class="btn action-btn action-btn-stock-in" data-part-id="${item.id}" 
                            data-bs-toggle="modal" data-bs-target="#stockInModal" title="入库">
                        <i class="fas fa-arrow-down"></i><span class="d-none d-sm-inline"> 入库</span>
                    </button>
                    <button class="btn action-btn action-btn-stock-out" data-part-id="${item.id}" 
                            data-bs-toggle="modal" data-bs-target="#stockOutModal" title="出库">
                        <i class="fas fa-arrow-up"></i><span class="d-none d-sm-inline"> 出库</span>
                    </button>
                    <button class="btn btn-sm btn-outline-warning action-btn" onclick="editPart(${item.id})" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>`;
        }

        row.innerHTML = `
            <td class="d-none d-md-table-cell"><code class="text-primary">${item.part_number || '-'}</code></td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td class="desc-cell d-none d-lg-table-cell" title="${escapeHtml(item.description || '')}">${escapeHtml(item.description || '-')}</td>
            <td class="d-none d-md-table-cell">${escapeHtml(item.manufacturer)}</td>
            <td class="d-none d-lg-table-cell"><span class="badge bg-secondary">${item.category_name ? escapeHtml(item.category_name) + (item.subcategory_name ? '/' + escapeHtml(item.subcategory_name) : '') : escapeHtml(item.part_type)}</span></td>
            <td>${escapeHtml(item.package)}</td>
            <td>
                <span class="badge quantity-badge ${quantityClass}">${item.quantity}</span>
            </td>
            <td>
                <div class="action-buttons">
                    ${actionButtons}
                </div>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tbody.appendChild(fragment);
    
    // 更新分页信息
    updatePaginationInfo(data.pagination);
}

// 更新分页信息和分页按钮
function updatePaginationInfo(pagination) {
    const paginationInfo = document.getElementById('pagination-info');
    const paginationUl = document.getElementById('pagination');
    
    if (!pagination) {
        if (paginationInfo) paginationInfo.textContent = '';
        if (paginationUl) paginationUl.innerHTML = '';
        return;
    }

    // 更新分页信息文字
    if (paginationInfo) {
        paginationInfo.textContent = `显示 ${pagination.page} / ${pagination.total_pages} 页 (共 ${pagination.total_count} 条)`;
    }

    // 生成分页按钮
    if (paginationUl) {
        const totalPages = pagination.total_pages;
        const currentPage = pagination.page;
        
        if (totalPages <= 1) {
            paginationUl.innerHTML = '';
            return;
        }

        let html = '';
        
        // 上一页
        html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">上一页</a>
        </li>`;

        // 页码
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
            if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
            </li>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
        }

        // 下一页
        html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">下一页</a>
        </li>`;

        paginationUl.innerHTML = html;
    }
}

// 查看器件详情（打开模态框）
function viewDetails(id) {
    // 清除上一次的基本信息和详细参数
    document.getElementById('detailPartId').textContent = '';
    document.getElementById('detailPartName').textContent = '加载中...';
    document.getElementById('detailPartManufacturer').textContent = '';
    document.getElementById('detailPartType').textContent = '';
    document.getElementById('detailPartPackage').textContent = '';
    document.getElementById('detailPartQuantity').textContent = '';
    document.getElementById('detailPartDescription').textContent = '加载中...';
    document.getElementById('detailPartLcNumber').textContent = '-';
    document.getElementById('detailPartPrice').textContent = '-';
    document.getElementById('detailInStockStatus').textContent = '-';
    document.getElementById('detailInStockStatus').className = '';
    const paramsBody = document.getElementById('detailParamsBody');
    if (paramsBody) paramsBody.innerHTML = '';
    const paramsCard = document.getElementById('detailParamsCard');
    if (paramsCard) paramsCard.style.display = 'none';

    const modal = new bootstrap.Modal(document.getElementById('componentDetailModal'));
    modal.show();
    loadComponentDetails(id);
}

// 编辑器件（打开编辑模态框）
async function editPart(id) {
    try {
        const response = await fetch(`/api/inventory/get_part_by_id?part_id=${id}`);
        if (!response.ok) throw new Error('加载失败');

        const data = await response.json();

        // 填充编辑表单
        document.getElementById('editPartId').value = data.id;
        document.getElementById('editPartNumber').value = data.part_number || '';
        document.getElementById('editPartName').value = data.name || '';
        document.getElementById('editPartManufacturer').value = data.manufacturer || '';
        document.getElementById('editPartPackage').value = data.package || '';
        document.getElementById('editPartPrice').value = data.price_display || data.price || '';
        document.getElementById('editPartLcNumber').value = data.lc_number || '';
        document.getElementById('editPartDescription').value = data.description || '';
        document.getElementById('editPartCategoryId').value = data.category_id || '';
        document.getElementById('editPartSubcategoryId').value = data.subcategory_id || '';

        // 加载类别和子类别选项
        populateEditCategorySelect(data.category_id);
        populateEditSubcategorySelect(data.category_id, data.subcategory_id);

        // 加载参数模板并预填参数值
        loadEditParamTemplate(data.category_id, data.subcategory_id, data.other);

        // 显示编辑模态框
        const modal = new bootstrap.Modal(document.getElementById('editPartModal'));
        modal.show();
    } catch (error) {
        console.error('加载器件数据失败:', error);
        alert('加载器件数据失败: ' + error.message);
    }
}

// 从编辑弹窗删除零件（二次确认）
function confirmDeleteFromEdit() {
    const partId = document.getElementById('editPartId').value;
    const partName = document.getElementById('editPartName').value;

    if (!partId) return;

    // 二次确认
    const confirmed = confirm(`确定要删除零件 "${partName}" 吗？\n\n此操作不可撤销，将同时删除库存记录和历史记录。`);

    if (!confirmed) return;

    // 调用删除API
    fetch(`/api/inventory/delete_part?part_id=${partId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) throw new Error('删除失败');
        return response.json();
    })
    .then(data => {
        // 关闭编辑模态框
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editPartModal'));
        if (editModal) editModal.hide();

        showToast('零件已删除', 'success');

        // 刷新列表
        if (typeof applyAdvancedFilter === 'function') {
            applyAdvancedFilter();
        }
    })
    .catch(err => {
        showToast('删除失败: ' + err.message, 'danger');
    });
}

// 加载器件详情数据
async function loadComponentDetails(partId) {
    try {
        const response = await fetch(`/api/inventory/get_part_by_id?part_id=${partId}`);
        if (!response.ok) throw new Error('加载失败');

        const data = await response.json();
        populateModal(data);
    } catch (error) {
        console.error('加载器件详情失败:', error);
        alert('加载器件详情失败: ' + error.message);
    }
}

// 填充模态框数据
function populateModal(data) {
    document.getElementById('detailPartId').textContent = data.id;
    document.getElementById('detailPartName').textContent = data.name || '未知';
    document.getElementById('detailPartManufacturer').textContent = data.manufacturer || '未知';
    document.getElementById('detailPartType').textContent = data.part_type || '未知';
    document.getElementById('detailPartPackage').textContent = data.package || '未知';
    document.getElementById('detailPartQuantity').textContent = data.quantity ?? '0';
    document.getElementById('detailPartDescription').textContent = data.description || '暂无描述';
    document.getElementById('detailPartLcNumber').textContent = data.lc_number || '-';

    // 单价（支持批量采购格式如 0.06@100）
    if (data.price) {
        const priceStr = String(data.price);
        if (priceStr.includes('@')) {
            const parts = priceStr.split('@');
            document.getElementById('detailPartPrice').textContent = `¥${parts[0]} @${parts[1]}`;
        } else {
            document.getElementById('detailPartPrice').textContent = `¥${priceStr}`;
        }
    } else {
        document.getElementById('detailPartPrice').textContent = '-';
    }

    // 库存状态
    const inStockSpan = document.getElementById('detailInStockStatus');
    if (data.quantity > 0) {
        inStockSpan.textContent = '是';
        inStockSpan.className = 'text-success';
    } else {
        inStockSpan.textContent = '否';
        inStockSpan.className = 'text-danger';
    }

    // 保存当前零件ID用于后续操作
    document.getElementById('componentDetailModal').dataset.partId = data.id;

    // 解析并填充参数
    try {
        const params = parsePartParams(data.other);
        populateParamsTable(params, data.category_id, data.subcategory_id);
    } catch (error) {
        console.error('解析参数失败:', error);
        // 隐藏参数卡片
        const card = document.getElementById('detailParamsCard');
        if (card) card.style.display = 'none';
    }
}

// 更新操作提示
function updateDetailOperationHint() {
    const operationMode = document.getElementById('detailOperationMode').value;
    const hintElement = document.getElementById('detailOperationHint');
    const currentQty = parseInt(document.getElementById('detailPartQuantity').textContent) || 0;

    const hints = {
        'set': `当前数量: ${currentQty}，输入新数量直接设置`,
        'add': `当前数量: ${currentQty}，输入要增加的数量`,
        'subtract': `当前数量: ${currentQty}，输入要减少的数量`
    };

    hintElement.textContent = hints[operationMode] || '';
}

// 更新数量（模态框内）
async function updateDetailQuantity() {
    const modal = document.getElementById('componentDetailModal');
    const partId = modal.dataset.partId;
    const newQuantity = document.getElementById('detailUpdateQuantity').value.trim();
    const operationMode = document.getElementById('detailOperationMode').value;

    if (!newQuantity || isNaN(newQuantity)) {
        alert('请输入有效数量');
        return;
    }

    // 计算数量变化
    let quantityChange;
    if (operationMode === 'add') {
        quantityChange = parseInt(newQuantity);
    } else if (operationMode === 'subtract') {
        quantityChange = -parseInt(newQuantity);
    } else {
        const currentQty = parseInt(document.getElementById('detailPartQuantity').textContent) || 0;
        quantityChange = parseInt(newQuantity) - currentQty;
    }

    try {
        const formData = new FormData();
        formData.append('part_id', partId);
        formData.append('quantity_change', quantityChange);
        formData.append('remark', '详情页更新');

        const response = await fetch('/api/inventory/update_quantity', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || '更新失败');
        }

        console.info('[库存] 详情页更新数量: part_id=%d, 变动=%d', partId, change);
        alert('数量更新成功！');
        // 重新加载器件详情
        loadComponentDetails(partId);
        // 刷新主表格
        applyAdvancedFilter();
    } catch (error) {
        console.error('更新数量失败:', error);
        alert('更新数量时出错: ' + error.message);
    }
}

// 查看使用历史
function viewDetailHistory() {
    const modal = document.getElementById('componentDetailModal');
    const partId = modal.dataset.partId;
    if (!partId) return;

    // 关闭详情模态框
    const detailModal = bootstrap.Modal.getInstance(modal);
    if (detailModal) detailModal.hide();

    // 打开历史模态框
    const historyModal = new bootstrap.Modal(document.getElementById('inventoryHistoryModal'));
    historyModal.show();

    // 加载该零件的历史记录
    loadPartHistory(partId);
}

// 加载指定零件的历史记录
function loadPartHistory(partId) {
    const url = `/api/inventory/inventory_history?page=1&page_size=50&part_id=${partId}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('加载失败');
            return response.json();
        })
        .then(data => {
            renderHistoryTable(data.data || []);
            updateHistoryPagination(data.pagination || { page: 1, total_pages: 1, total_count: 0 });
        })
        .catch(err => {
            console.error('加载历史记录失败:', err);
            showToast('加载历史记录失败', 'danger');
        });
}

// 导出详情
function exportDetailDetails() {
    const modal = document.getElementById('componentDetailModal');
    const partId = modal.dataset.partId;
    if (!partId) return;

    // 获取零件详情并导出为Excel
    fetch(`/api/inventory/get_part_by_id?part_id=${partId}`)
        .then(response => {
            if (!response.ok) throw new Error('获取失败');
            return response.json();
        })
        .then(data => {
            // 构建Excel内容
            const rows = [
                ['字段', '值'],
                ['编号', data.part_number || ''],
                ['名称', data.name || ''],
                ['制造商', data.manufacturer || ''],
                ['类型', data.category_name || ''],
                ['子类型', data.subcategory_name || ''],
                ['封装', data.package || ''],
                ['数量', data.quantity || 0],
                ['LC编号', data.lc_number || ''],
                ['单价', data.price_display || data.price || ''],
                ['描述', data.description || '']
            ];

            // 解析参数
            if (data.other) {
                try {
                    const params = JSON.parse(data.other);
                    if (params.fields && params.values) {
                        params.fields.forEach(field => {
                            rows.push([field, params.values[field] || '']);
                        });
                    }
                } catch (e) {}
            }

            // 下载Excel
            const ws = XLSX.utils.aoa_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '零件详情');
            XLSX.writeFile(wb, `${data.name || 'part'}_详情.xlsx`);

            showToast('导出成功', 'success');
        })
        .catch(err => {
            showToast('导出失败: ' + err.message, 'danger');
        });
}

// 删除零件（复用现有逻辑）
async function deleteDetailPart() {
    const modal = document.getElementById('componentDetailModal');
    const partId = modal.dataset.partId;

    if (!confirm('您确定要删除这个零件吗?')) return;

    try {
        const response = await fetch(`/api/inventory/delete_part?part_id=${partId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('删除失败');

        console.info('[库存] 零件删除成功: part_id=%s', partId);
        alert('删除成功！');
        bootstrap.Modal.getInstance(modal).hide();
        applyAdvancedFilter();
    } catch (error) {
        console.error('删除零件失败:', error);
        alert('删除零件时出错');
    }
}

// 填充编辑模态框的类别下拉
function populateEditCategorySelect(selectedCatId) {
    const select = document.getElementById('editPartCategory');
    if (!select) return;
    
    // 保留第一个 placeholder option
    const firstOpt = select.options[0];
    select.innerHTML = '';
    if (firstOpt) select.appendChild(firstOpt);
    
    const categories = getCategories();
    categories.forEach(function(cat) {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        if (cat.id == selectedCatId) opt.selected = true;
        select.appendChild(opt);
    });
    
    // 绑定类别变化事件
    select.addEventListener('change', function() {
        const catId = parseInt(this.value) || null;
        document.getElementById('editPartCategoryId').value = catId || '';
        populateEditSubcategorySelect(catId, null);
        loadEditParamTemplate(catId, null, null);
    });
}

// 填充编辑模态框的子类别下拉
function populateEditSubcategorySelect(catId, selectedSubcatId) {
    const select = document.getElementById('editPartSubcategory');
    if (!select) return;
    
    const firstOpt = select.options[0];
    select.innerHTML = '';
    if (firstOpt) select.appendChild(firstOpt);
    
    if (!catId) return;
    
    const subcats = getSubcategoriesByCategoryId(catId);
    subcats.forEach(function(sub) {
        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = sub.name;
        if (sub.id == selectedSubcatId) opt.selected = true;
        select.appendChild(opt);
    });
    
    // 绑定子类别变化事件
    select.addEventListener('change', function() {
        const subcatId = parseInt(this.value) || null;
        document.getElementById('editPartSubcategoryId').value = subcatId || '';
        const catId = parseInt(document.getElementById('editPartCategory').value) || null;
        loadEditParamTemplate(catId, subcatId, null);
    });
}

// 加载编辑模态框的参数模板
function loadEditParamTemplate(catId, subcatId, existingParams) {
    const container = document.getElementById('editParamTemplateFields');
    if (!container) return;
    container.innerHTML = '';
    console.info('[模板] loadEditParamTemplate: catId=%s, subcatId=%s, existingParams=%s', catId, subcatId, existingParams ? (typeof existingParams === 'string' ? existingParams.substring(0, 100) : typeof existingParams) : 'null');
    
    // 查找最匹配的模板
    let templates = [];
    if (subcatId) {
        templates = getTemplatesForSubcategory(subcatId);
    }
    if (templates.length === 0 && catId) {
        templates = getTemplatesForCategory(catId);
    }
    if (templates.length === 0) return;
    
    const tpl = templates[0];
    let fields = [];
    let units = {};
    try {
        const def = JSON.parse(tpl.definition_json || '{}');
        fields = def.fields || [];
        units = def.units || {};
    } catch (e) {
        return;
    }
    if (fields.length === 0) return;
    
    // 解析已有参数
    let params = {};
    let existingUnits = {};
    let existingFields = null;
    if (existingParams) {
        try {
            const data = JSON.parse(existingParams);
            if (data.fields && data.values) {
                params = data.values || {};
                existingUnits = data.units || {};
                existingFields = data.fields || null;
            } else {
                params = data;
            }
        } catch (e) {}
    }

    // 如果已有数据包含自定义字段，只用已有字段（不混入模板字段）
    if (existingFields && existingFields.length > 0) {
        console.info('[模板] 使用已有字段:', existingFields);
        const fixedFields = ['封装', '类型', '制造商', '单价', 'LC编号', '描述'];
        fields = existingFields.filter(function(f) {
            return !fixedFields.includes(f);
        });
    } else {
        console.info('[模板] 使用模板字段:', fields);
        const fixedFields = ['封装', '类型', '制造商', '单价', 'LC编号', '描述'];
        fields = fields.filter(function(field) {
            return !fixedFields.includes(field);
        });
    }
    
    // 常用单位列表
    const commonUnits = {
        '阻值': ['Ω', 'kΩ', 'MΩ', 'GΩ', 'mΩ'],
        '功率': ['W', 'mW', 'kW', 'dBm'],
        '精度': ['%', 'ppm'],
        '耐压': ['kV', 'V', 'mV', 'μV', 'nV', 'pV'],
        '电压': ['kV', 'V', 'mV', 'μV', 'nV', 'pV'],
        '电流': ['A', 'mA', 'μA', 'nA', 'pA'],
        '电容': ['F', 'μF', 'nF', 'pF'],
        '电感': ['H', 'mH', 'μH', 'nH'],
        '频率': ['GHz', 'MHz', 'kHz', 'Hz'],
        '温度': ['℃', '℉'],
        '温度系数': ['ppm/℃', 'ppm/℉'],
        '灵敏度': ['dBm', 'dB'],
        '发射功率': ['dBm', 'dB', 'W', 'mW'],
        '默认': ['dBm', 'GHz', 'MHz', 'kHz', 'Hz', 'kΩ', 'MΩ', 'GΩ', 'Ω', 'mΩ', 'kW', 'W', 'mW', 'kV', 'V', 'mV', 'μV', 'A', 'mA', 'μA', 'nA', 'pA', 'F', 'μF', 'nF', 'pF', 'H', 'mH', 'μH', 'nH', '%', 'ppm', '℃', '℉']
    };
    
    // 收集所有已知单位（按长度降序排列，优先匹配长单位如 GHz > Hz）
    const allUnits = [];
    for (const key in commonUnits) {
        commonUnits[key].forEach(function(u) { if (u && !allUnits.includes(u)) allUnits.push(u); });
    }
    allUnits.sort(function(a, b) { return b.length - a.length; });

    // 从值中提取单位（如 "120mA" → "120" + "mA"，"3.3V" → "3.3" + "V"）
    function extractUnit(val) {
        if (!val || typeof val !== 'string') return { num: val, unit: '' };
        for (const u of allUnits) {
            if (val.endsWith(u)) {
                const num = val.slice(0, -u.length).trim();
                if (num && /^[\d.\-+~±≤≥＜＞]+$/.test(num)) {
                    return { num: num, unit: u };
                }
            }
        }
        return { num: val, unit: '' };
    }

    // 渲染参数字段
    let html = '<div class="row g-2">';
    fields.forEach(function(field) {
        // 解析值和单位
        let value = params[field] || '';
        let selectedUnit = existingUnits[field] || units[field] || '';

        // 获取该字段对应的单位列表
        const unitList = commonUnits[field] || commonUnits['默认'];

        // 如果没有值，设置缺省值00
        if (!value) {
            value = '00';
        }

        // 自动从值中提取单位
        if (!selectedUnit && value !== '00') {
            const extracted = extractUnit(value);
            if (extracted.unit) {
                value = extracted.num;
                selectedUnit = extracted.unit;
            }
        }
        
        // 生成单位下拉选项
        let unitOptions = '<option value="">无</option>';
        unitList.forEach(function(u) {
            const selected = (u === selectedUnit) ? ' selected' : '';
            unitOptions += '<option value="' + escapeHtml(u) + '"' + selected + '>' + escapeHtml(u) + '</option>';
        });
        
        html += '<div class="col-md-4">' +
            '<label class="form-label">' + escapeHtml(field) + '</label>' +
            '<div class="input-group input-group-sm">' +
            '<input type="text" class="form-control edit-param-value" data-param-name="' + escapeHtml(field) + '" value="' + escapeHtml(value) + '" placeholder="输入值">' +
            '<select class="form-select form-select-sm edit-param-unit" data-param-name="' + escapeHtml(field) + '" style="max-width: 80px;">' +
            unitOptions +
            '</select>' +
            '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

// 序列化编辑模态框的参数字段
function serializeEditParamFields() {
    const valueFields = document.querySelectorAll('#editParamTemplateFields .edit-param-value');
    const unitFields = document.querySelectorAll('#editParamTemplateFields .edit-param-unit');
    if (valueFields.length === 0) return '';
    
    const params = {};
    const units = {};
    
    valueFields.forEach(function(f) {
        const paramName = f.dataset.paramName;
        const value = f.value.trim();
        if (value) {
            params[paramName] = value;
        }
    });
    
    unitFields.forEach(function(f) {
        const paramName = f.dataset.paramName;
        const unit = f.value;
        if (unit) {
            units[paramName] = unit;
        }
    });
    
    // 返回包含字段和单位的JSON
    const result = {
        fields: Object.keys(params),
        values: params,
        units: units
    };
    
    return Object.keys(params).length > 0 ? JSON.stringify(result) : '';
}

// 保存编辑的器件信息
async function saveEditPart() {
    const partId = document.getElementById('editPartId').value;
    const formData = new FormData();

    formData.append('part_id', partId);
    formData.append('part_number', document.getElementById('editPartNumber').value || '');
    formData.append('name', document.getElementById('editPartName').value);
    formData.append('manufacturer', document.getElementById('editPartManufacturer').value);
    formData.append('package', document.getElementById('editPartPackage').value);
    formData.append('price', document.getElementById('editPartPrice').value || '');
    formData.append('lc_number', document.getElementById('editPartLcNumber').value || '');
    formData.append('description', document.getElementById('editPartDescription').value || '');
    formData.append('other', serializeEditParamFields());

    try {
        const response = await fetch('/api/inventory/update_part', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || '更新失败');
        }

        const partName = document.getElementById('editPartName').value;
        console.info('[库存] 零件更新成功: id=%s, name=%s', formData.get('part_id'), partName);
        alert('更新成功！');
        bootstrap.Modal.getInstance(document.getElementById('editPartModal')).hide();
        applyAdvancedFilter();
    } catch (error) {
        console.error('更新器件失败:', error);
        alert('更新器件时出错: ' + error.message);
    }
}

// 从编辑弹窗查询LC编号
async function queryLcFromEdit() {
    const lcNumber = document.getElementById('editPartLcNumber').value.trim();
    if (!lcNumber) {
        alert('请先输入LC编号');
        document.getElementById('editPartLcNumber').focus();
        return;
    }

    // 格式化LC编号
    let lcCode = lcNumber.toUpperCase();
    if (/^\d+$/.test(lcCode)) lcCode = 'C' + lcCode;
    if (!/^C\d+$/.test(lcCode)) {
        alert('LC编号格式错误，应为C+数字');
        return;
    }

    // 禁用查询按钮，显示加载提示
    const btn = document.querySelector('button[onclick="queryLcFromEdit()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> 正在加载中，请勿再次点击';
    }

    // 清除上一次查询结果
    const body = document.getElementById('lcscCompareBody');
    if (body) {
        body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">查询中...</span></div><p class="mt-2 text-muted">正在加载中，请勿再次点击...</p></div>';
    }
    window._lcscCompareData = null;

    // 确保弹窗可见
    const modalEl = document.getElementById('lcscCompareModal');
    if (modalEl && !modalEl.classList.contains('show')) {
        new bootstrap.Modal(modalEl).show();
    }

    try {
        console.info('[LCSC] 开始查询: %s', lcCode);
        const t0 = performance.now();
        const resp = await fetch(`/api/lcsc/query/${lcCode}`);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || '查询失败');
        }
        const data = await resp.json();
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        console.info('[LCSC] 查询成功: %s -> %s (%s), 耗时=%ss', lcCode, data.productModel || '?', data.brand || '?', elapsed);

        // 获取当前编辑表单的零件数据（含参数）
        const partId = document.getElementById('editPartId').value;
        let partData = {
            id: partId,
            name: document.getElementById('editPartName').value,
            manufacturer: document.getElementById('editPartManufacturer').value,
            package: document.getElementById('editPartPackage').value,
            description: document.getElementById('editPartDescription').value,
            lc_number: document.getElementById('editPartLcNumber').value,
            other: null
        };
        // 从 API 获取完整的 other 参数数据
        try {
            const partResp = await fetch('/api/inventory/get_part_by_id?part_id=' + partId);
            if (partResp.ok) {
                const fullPart = await partResp.json();
                partData.other = fullPart.other || null;
            }
        } catch (_) {}

        // 显示对比弹窗
        showLcscCompareModal(data, partData);

    } catch (e) {
        console.error('[LCSC] 查询失败:', e);
        const body = document.getElementById('lcscCompareBody');
        if (body) {
            body.innerHTML = '<div class="text-center py-4"><i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i><p class="text-danger">查询失败: ' + e.message + '</p></div>';
        }
    } finally {
        // 恢复按钮状态
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search me-1"></i> LC查询';
        }
    }
}

// 显示LCSC对比弹窗
function showLcscCompareModal(lcscData, partData) {
    const body = document.getElementById('lcscCompareBody');
    if (!body) return;

    const lcscParams = parseLcscParams(lcscData.params) || parseLcscRemarkPrefix(lcscData.remarkPrefix) || {};
    const parsed = parsePartParams(partData.other);
    const partParams = parsed ? (parsed.values || {}) : {};

    let html = '<div class="table-responsive"><table class="table table-sm table-bordered mb-0" style="font-size:0.85rem;">';
    html += '<thead class="table-light"><tr><th style="width:25%">字段</th><th style="width:37%">LCSC数据</th><th style="width:37%">库存数据</th></tr></thead><tbody>';
    html += '<tr><td>型号</td><td>' + escapeHtml(lcscData.productModel || '-') + '</td><td>' + escapeHtml(partData.name || '-') + '</td></tr>';
    html += '<tr><td>品牌</td><td>' + escapeHtml(lcscData.brand || '-') + '</td><td>' + escapeHtml(partData.manufacturer || '-') + '</td></tr>';
    html += '<tr><td>封装</td><td>' + escapeHtml(lcscData.pack || lcscData.package || '-') + '</td><td>' + escapeHtml(partData.package || '-') + '</td></tr>';
    html += '<tr><td>LC编号</td><td>' + escapeHtml(lcscData.lcCode || '-') + '</td><td>' + escapeHtml(partData.lc_number || '-') + '</td></tr>';
    html += '</tbody></table></div>';

    // 参数对比
    const allKeys = new Set([...Object.keys(lcscParams), ...Object.keys(partParams)]);
    if (allKeys.size > 0) {
        html += '<h6 class="mt-3 mb-2 text-muted">参数对比</h6>';
        html += '<div class="table-responsive"><table class="table table-sm table-bordered mb-0" style="font-size:0.85rem;"><thead class="table-light"><tr><th>参数</th><th>LCSC</th><th>库存</th></tr></thead><tbody>';
        for (const key of allKeys) {
            const lcscVal = lcscParams[key] || '-';
            const partVal = partParams[key] || '-';
            const cls = (!partParams[key] && lcscParams[key]) ? ' class="table-warning"' : (lcscVal !== partVal ? ' class="table-danger"' : '');
            html += '<tr' + cls + '><td>' + escapeHtml(key) + '</td><td>' + escapeHtml(String(lcscVal)) + '</td><td>' + escapeHtml(String(partVal)) + '</td></tr>';
        }
        html += '</tbody></table></div>';
    }

    // 操作按钮
    html += '<div class="mt-3 d-flex gap-2">';
    html += '<button class="btn btn-warning flex-fill" onclick="applyLcscToEditForm()"><i class="fas fa-sync me-1"></i> 应用LCSC数据到编辑表单</button>';
    html += '</div>';

    body.innerHTML = html;

    // 保存LCSC数据供后续使用
    window._lcscCompareData = lcscData;

    // 显示弹窗
    new bootstrap.Modal(document.getElementById('lcscCompareModal')).show();
}

// 将库存 other 字段统一解析为 {key: value} 格式
function normalizeOtherParams(other) {
    if (!other || typeof other !== 'object') return null;
    if (other.fields && other.values) {
        const result = {};
        for (const f of other.fields) {
            if (other.values[f] !== undefined && other.values[f] !== '') {
                result[f] = other.values[f];
            }
        }
        return Object.keys(result).length > 0 ? result : null;
    }
    const result = {};
    for (const [k, v] of Object.entries(other)) {
        if (v !== undefined && v !== '' && v !== null) result[k] = String(v);
    }
    return Object.keys(result).length > 0 ? result : null;
}

// 将LCSC数据直接保存到库存零件
async function applyLcscToEditForm() {
    const data = window._lcscCompareData;
    if (!data) return;

    const partId = document.getElementById('editPartId').value;
    if (!partId) { showToast('未找到零件ID', 'danger'); return; }

    const lcscParams = parseLcscParams(data.params) || parseLcscRemarkPrefix(data.remarkPrefix) || {};

    // 获取现有参数并合并
    let existingOther = {};
    try {
        const resp = await fetch(`/api/inventory/get_part_by_id?part_id=${partId}`);
        const partData = await resp.json();
        if (partData.other) existingOther = JSON.parse(partData.other) || {};
    } catch (e) {}

    const existingValues = normalizeOtherParams(existingOther) || {};
    const mergedValues = { ...existingValues, ...lcscParams };

    const formData = new FormData();
    formData.append('part_id', partId);
    if (data.productModel) formData.append('name', data.productModel);
    if (data.brand) formData.append('manufacturer', data.brand);
    if (data.pack || data.package) formData.append('package', data.pack || data.package);
    if (data.lcCode) formData.append('lc_number', data.lcCode);
    if (data.description) formData.append('description', data.description);
    if (Object.keys(mergedValues).length > 0) {
        formData.append('other', JSON.stringify({ fields: Object.keys(mergedValues), values: mergedValues, units: {} }));
    }

    // 显示加载状态
    const btn = document.querySelector('#lcscCompareBody .btn-warning');
    const origText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> 保存中...'; }

    try {
        const resp = await fetch('/api/inventory/update_part', { method: 'POST', body: formData });
        if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.detail || '保存失败'); }

        // 关闭对比弹窗
        const modal = bootstrap.Modal.getInstance(document.getElementById('lcscCompareModal'));
        if (modal) modal.hide();

        // 重新加载编辑表单的参数字段（不关闭编辑弹窗）
        try {
            const reloadResp = await fetch('/api/inventory/get_part_by_id?part_id=' + partId);
            if (reloadResp.ok) {
                const freshData = await reloadResp.json();
                // 更新编辑表单的基本字段
                if (data.productModel) document.getElementById('editPartName').value = data.productModel;
                if (data.brand) document.getElementById('editPartManufacturer').value = data.brand;
                if (data.pack || data.package) document.getElementById('editPartPackage').value = data.pack || data.package;
                if (data.lcCode) document.getElementById('editPartLcNumber').value = data.lcCode;
                // 重新加载参数模板（含最新保存的参数值）
                loadEditParamTemplate(freshData.category_id, freshData.subcategory_id, freshData.other);
            }
        } catch (_) {}

        showToast('LCSC数据已保存到库存零件！', 'success');
        applyAdvancedFilter(); // 刷新列表
    } catch (e) {
        showToast('保存失败: ' + e.message, 'danger');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    }
}

// 解析LCSC params字段
function parseLcscParams(params) {
    if (!params) return null;
    if (typeof params === 'string') {
        const result = {};
        const lines = params.split(';');
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const match = trimmed.match(/^(.+?)[：:]\s*(.+)$/);
            if (match) {
                const key = match[1].trim();
                const val = match[2].trim();
                if (key && val && val !== '-') result[key] = val;
            }
        }
        return Object.keys(result).length > 0 ? result : null;
    }
    return null;
}

// 解析LCSC remarkPrefix字段
function parseLcscRemarkPrefix(rp) {
    if (!rp || typeof rp !== 'string') return null;
    const params = {};
    const lines = rp.split(/<\/br>|\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^(.+?)[：:]\s*(.+)$/);
        if (match) {
            const key = match[1].trim();
            const val = match[2].trim();
            if (key && val && val !== '-') params[key] = val;
        }
    }
    return Object.keys(params).length > 0 ? params : null;
}

// 解析器件参数
function parsePartParams(otherJson) {
    if (!otherJson) return null;
    try {
        const data = JSON.parse(otherJson);
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            // 检查是否是新格式（包含fields、values、units）
            if (data.fields && data.values) {
                return {
                    values: data.values,
                    units: data.units || {},
                    isNewFormat: true
                };
            }
            // 旧格式（直接是键值对）
            return {
                values: data,
                units: {},
                isNewFormat: false
            };
        }
        return null;
    } catch (e) {
        console.error('解析参数失败:', e);
        return null;
    }
}

// 填充参数表格
function populateParamsTable(params, catId, subcatId) {
    const tbody = document.getElementById('detailParamsBody');
    const card = document.getElementById('detailParamsCard');

    // 检查DOM元素是否存在
    if (!tbody || !card) {
        console.error('populateParamsTable: DOM元素不存在');
        return;
    }

    // 如果没有参数数据，尝试从模板获取字段定义
    if (!params || !params.values || Object.keys(params.values).length === 0) {
        // 尝试从参数模板获取字段定义
        try {
            let templates = [];
            if (subcatId) {
                templates = getTemplatesForSubcategory(subcatId);
            }
            if (templates.length === 0 && catId) {
                templates = getTemplatesForCategory(catId);
            }
            if (templates.length > 0) {
                const def = JSON.parse(templates[0].definition_json || '{}');
                const fields = def.fields || [];
                const units = def.units || {};
                
                // 过滤掉固定字段
                const fixedFields = ['封装', '类型', '制造商', '单价', 'LC编号', '描述'];
                const filteredFields = fields.filter(f => !fixedFields.includes(f));
                
                if (filteredFields.length > 0) {
                    // 显示参数卡片，使用默认值
                    card.style.display = 'block';
                    tbody.innerHTML = '';
                    
                    for (const field of filteredFields) {
                        const unit = units[field] || '';
                        const unitHtml = unit ? ' <span class="badge bg-secondary">' + escapeHtml(unit) + '</span>' : '';
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><strong>${escapeHtml(field)}</strong></td>
                            <td>${escapeHtml('-')}${unitHtml}</td>
                        `;
                        tbody.appendChild(row);
                    }
                    return;
                }
            }
        } catch (e) {
            // 忽略错误
        }
        
        // 如果没有模板或模板为空，隐藏参数卡片
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    tbody.innerHTML = '';

    // 获取单位信息
    let units = params.units || {};
    
    // 如果是旧格式，尝试从模板获取单位
    if (!params.isNewFormat && Object.keys(units).length === 0) {
        try {
            let templates = [];
            if (subcatId) {
                templates = getTemplatesForSubcategory(subcatId);
            }
            if (templates.length === 0 && catId) {
                templates = getTemplatesForCategory(catId);
            }
            if (templates.length > 0) {
                const def = JSON.parse(templates[0].definition_json || '{}');
                units = def.units || {};
            }
        } catch (e) {
            // 忽略错误
        }
    }

    for (const [key, value] of Object.entries(params.values)) {
        const unit = units[key] || '';
        const unitHtml = unit ? ' <span class="badge bg-secondary">' + escapeHtml(unit) + '</span>' : '';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(key)}</strong></td>
            <td>${escapeHtml(String(value))}${unitHtml}</td>
        `;
        tbody.appendChild(row);
    }
}

// 导出到全局
window.currentSort = currentSort;
window.currentPartsData = currentPartsData;
window.bindSortEvents = bindSortEvents;
window.handleSort = handleSort;
window.updateSortHeaders = updateSortHeaders;
window.updateTable = updateTable;
window.viewDetails = viewDetails;
window.editPart = editPart;
window.saveEditPart = saveEditPart;
window.loadComponentDetails = loadComponentDetails;
window.populateModal = populateModal;
window.updateDetailOperationHint = updateDetailOperationHint;
window.updateDetailQuantity = updateDetailQuantity;
window.viewDetailHistory = viewDetailHistory;
window.exportDetailDetails = exportDetailDetails;
window.deleteDetailPart = deleteDetailPart;
window.parsePartParams = parsePartParams;
window.populateParamsTable = populateParamsTable;
window.queryLcFromEdit = queryLcFromEdit;
window.applyLcscToEditForm = applyLcscToEditForm;
window.populateEditCategorySelect = populateEditCategorySelect;
window.populateEditSubcategorySelect = populateEditSubcategorySelect;
window.loadEditParamTemplate = loadEditParamTemplate;
window.serializeEditParamFields = serializeEditParamFields;
