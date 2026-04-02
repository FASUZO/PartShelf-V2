/**
 * 库存管理系统 - 历史记录模块
 * 显示库存操作历史
 */

let currentHistoryPage = 1;

// 显示库存历史模态框
function showInventoryHistory() {
    const modal = new bootstrap.Modal(document.getElementById('inventoryHistoryModal'));
    modal.show();
    loadInventoryHistory(1);
}

// 加载库存历史
function loadInventoryHistory(page) {
    currentHistoryPage = page;
    const operationType = document.getElementById('historyOperationFilter')?.value || '';
    
    let url = `/api/inventory/inventory_history?page=${page}&page_size=20`;
    if (operationType) {
        url += `&operation_type=${operationType}`;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateHistoryTable(data.data || []);
            updateHistoryPagination(data.pagination || { page: 1, total_pages: 1, total_count: 0 });
        })
        .catch(error => {
            console.error('加载历史记录失败:', error);
            document.getElementById('inventoryHistoryBody').innerHTML = 
                `<tr><td colspan="7" class="text-center text-danger">加载失败: ${error.message}</td></tr>`;
        });
}

// 更新历史表格
function updateHistoryTable(historyList) {
    const tbody = document.getElementById('inventoryHistoryBody');
    if (!tbody) return;

    if (historyList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">暂无历史记录</td></tr>';
        return;
    }

    tbody.innerHTML = historyList.map(h => {
        const typeBadge = {
            'in': '<span class="badge bg-success">入库</span>',
            'out': '<span class="badge bg-danger">出库</span>',
            'adjust': '<span class="badge bg-warning text-dark">调整</span>'
        }[h.operation_type] || '<span class="badge bg-secondary">未知</span>';

        const changeColor = h.quantity_change > 0 ? 'text-success' : (h.quantity_change < 0 ? 'text-danger' : 'text-muted');
        const changeSign = h.quantity_change > 0 ? '+' : '';

        return `
            <tr>
                <td>${formatDateTime(h.created_at)}</td>
                <td>${escapeHtml(h.part_name)}</td>
                <td>${typeBadge}</td>
                <td class="${changeColor} fw-bold">${changeSign}${h.quantity_change}</td>
                <td>${h.quantity_before}</td>
                <td>${h.quantity_after}</td>
                <td>${escapeHtml(h.remark) || '-'}</td>
            </tr>
        `;
    }).join('');
}

// 更新历史分页
function updateHistoryPagination(pagination) {
    const info = document.getElementById('historyCountInfo');
    if (info) {
        info.textContent = `共 ${pagination.total_count} 条记录`;
    }

    const ul = document.getElementById('historyPagination');
    if (!ul) return;

    let html = '';
    const totalPages = pagination.total_pages;
    const currentPage = pagination.page;

    // 上一页
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadInventoryHistory(${currentPage - 1}); return false;">上一页</a>
    </li>`;

    // 页码
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadInventoryHistory(1); return false;">1</a></li>`;
        if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="loadInventoryHistory(${i}); return false;">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        html += `<li class="page-item"><a class="page-link" href="#" onclick="loadInventoryHistory(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // 下一页
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="loadInventoryHistory(${currentPage + 1}); return false;">下一页</a>
    </li>`;

    ul.innerHTML = html;
}

// 导出到全局
window.currentHistoryPage = currentHistoryPage;
window.showInventoryHistory = showInventoryHistory;
window.loadInventoryHistory = loadInventoryHistory;
