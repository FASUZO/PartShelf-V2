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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">暂无数据</td></tr>';
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
            <td>${item.id}</td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.manufacturer)}</td>
            <td><span class="badge bg-secondary">${escapeHtml(item.part_type)}</span></td>
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

// 查看零件详情
function viewDetails(id) {
    window.location.href = `/component_details?id=${id}`;
}

// 导出到全局
window.currentSort = currentSort;
window.currentPartsData = currentPartsData;
window.bindSortEvents = bindSortEvents;
window.handleSort = handleSort;
window.updateSortHeaders = updateSortHeaders;
window.updateTable = updateTable;
window.viewDetails = viewDetails;
