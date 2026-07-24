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

    // 单价
    document.getElementById('detailPartPrice').textContent = data.price ? `¥${data.price}` : '-';

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

// 导出到全局
window.currentSort = currentSort;
window.currentPartsData = currentPartsData;
window.bindSortEvents = bindSortEvents;
window.handleSort = handleSort;
window.updateSortHeaders = updateSortHeaders;
window.updateTable = updateTable;
window.viewDetails = viewDetails;
window.loadComponentDetails = loadComponentDetails;
window.populateModal = populateModal;
window.updateDetailOperationHint = updateDetailOperationHint;
window.updateDetailQuantity = updateDetailQuantity;
window.viewDetailHistory = viewDetailHistory;
window.exportDetailDetails = exportDetailDetails;
window.deleteDetailPart = deleteDetailPart;
