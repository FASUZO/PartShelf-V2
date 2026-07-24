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
        
        row.innerHTML = `
            <td><code class="text-primary">${item.part_number || '-'}</code></td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td class="desc-cell" title="${escapeHtml(item.description || '')}">${escapeHtml(item.description || '-')}</td>
            <td>${escapeHtml(item.manufacturer)}</td>
            <td><span class="badge bg-secondary">${item.category_name ? escapeHtml(item.category_name) + (item.subcategory_name ? '/' + escapeHtml(item.subcategory_name) : '') : escapeHtml(item.part_type)}</span></td>
            <td>${escapeHtml(item.package)}</td>
            <td>
                <span class="badge quantity-badge ${quantityClass}">${item.quantity}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn action-btn action-btn-stock-in" data-part-id="${item.id}" 
                            data-bs-toggle="modal" data-bs-target="#stockInModal" title="入库">
                        <i class="fas fa-arrow-down"></i> 入库
                    </button>
                    <button class="btn action-btn action-btn-stock-out" data-part-id="${item.id}" 
                            data-bs-toggle="modal" data-bs-target="#stockOutModal" title="出库">
                        <i class="fas fa-arrow-up"></i> 出库
                    </button>
                    <button class="btn btn-sm btn-outline-info action-btn" onclick="viewDetails(${item.id})" title="详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning action-btn" onclick="editPart(${item.id})" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tbody.appendChild(fragment);
    
    // 更新分页信息
    updatePaginationInfo(data.pagination);
}

// 更新分页信息
function updatePaginationInfo(pagination) {
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo && pagination) {
        paginationInfo.textContent = `显示 ${pagination.page} / ${pagination.total_pages} 页 (共 ${pagination.total_count} 条)`;
    } else if (paginationInfo) {
        paginationInfo.textContent = '';
    }
}

// 查看器件详情（打开模态框）
function viewDetails(id) {
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
    const params = parsePartParams(data.other);
    populateParamsTable(params, data.category_id, data.subcategory_id);
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

// 查看使用历史（复用现有逻辑）
function viewDetailHistory() {
    const modal = document.getElementById('componentDetailModal');
    const partId = modal.dataset.partId;
    viewHistory(partId);
}

// 导出详情（复用现有逻辑）
function exportDetailDetails() {
    const modal = document.getElementById('componentDetailModal');
    const partId = modal.dataset.partId;
    exportDetails(partId);
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
    
    // 过滤掉已经作为固定字段的参数
    const fixedFields = ['封装', '类型', '制造商', '单价', 'LC编号', '描述'];
    fields = fields.filter(function(field) {
        return !fixedFields.includes(field);
    });
    
    // 解析已有参数
    let params = {};
    let existingUnits = {};
    if (existingParams) {
        try {
            const data = JSON.parse(existingParams);
            // 检查是否是新格式
            if (data.fields && data.values) {
                params = data.values || {};
                existingUnits = data.units || {};
            } else {
                // 旧格式
                params = data;
            }
        } catch (e) {
            // 忽略解析错误
        }
    }
    
    // 常用单位列表
    const commonUnits = {
        '阻值': ['Ω', 'kΩ', 'MΩ', 'mΩ'],
        '功率': ['W', 'mW', 'kW'],
        '精度': ['%', 'ppm'],
        '耐压': ['V', 'mV', 'kV'],
        '电流': ['A', 'mA', 'μA'],
        '电容': ['F', 'μF', 'nF', 'pF'],
        '电感': ['H', 'mH', 'μH', 'nH'],
        '频率': ['Hz', 'kHz', 'MHz', 'GHz'],
        '温度': ['℃', '℉'],
        '温度系数': ['ppm/℃', 'ppm/℉'],
        '默认': ['Ω', 'kΩ', 'MΩ', 'W', 'mW', 'V', 'A', 'mA', 'μF', 'nF', 'pF', 'Hz', 'MHz', '%', '℃']
    };
    
    // 渲染参数字段
    let html = '<div class="row g-2">';
    fields.forEach(function(field) {
        // 解析值和单位
        let value = params[field] || '';
        let selectedUnit = existingUnits[field] || units[field] || '';
        
        // 获取该字段对应的单位列表
        const unitList = commonUnits[field] || commonUnits['默认'];
        
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
        
        alert('更新成功！');
        bootstrap.Modal.getInstance(document.getElementById('editPartModal')).hide();
        applyAdvancedFilter();
    } catch (error) {
        console.error('更新器件失败:', error);
        alert('更新器件时出错: ' + error.message);
    }
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

    if (!params || !params.values || Object.keys(params.values).length === 0) {
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
window.populateEditCategorySelect = populateEditCategorySelect;
window.populateEditSubcategorySelect = populateEditSubcategorySelect;
window.loadEditParamTemplate = loadEditParamTemplate;
window.serializeEditParamFields = serializeEditParamFields;
