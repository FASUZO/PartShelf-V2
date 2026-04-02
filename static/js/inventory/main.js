/**
 * 库存管理系统 - 主入口文件
 * 整合所有模块,初始化页面功能
 */

// 全局搜索筛选条件
let currentSearchFilter = null;

// ==================== 高级筛选 ====================

// 应用高级筛选
function applyAdvancedFilter() {
    const searchInput = document.getElementById('searchInput');
    const manufacturerFilter = document.getElementById('manufacturerFilter');
    const packageFilter = document.getElementById('packageFilter');
    const partTypeFilter = document.getElementById('partTypeFilter');

    const searchKey = searchInput ? searchInput.value.trim() : '';
    const manufacturer = manufacturerFilter ? manufacturerFilter.dataset.selectedValue || manufacturerFilter.value : '';
    const packageVal = packageFilter ? packageFilter.dataset.selectedValue || packageFilter.value : '';
    const partType = partTypeFilter ? partTypeFilter.dataset.selectedValue || partTypeFilter.value : '';
    
    const filterData = {
        search_key: searchKey || null,
        manufacturer: manufacturer || null,
        package: packageVal || null,
        part_type: partType || null,
        page: 1,
        page_size: Math.min(parseInt(localStorage.getItem('pageSize')) || 100, 500)
    };
    
    // 构建排序参数
    let queryParams = '';
    if (currentSort.field) {
        queryParams = `?sort_field=${currentSort.field}&sort_direction=${currentSort.direction}`;
    }
    
    // 显示加载状态
    const tbody = document.getElementById('parts-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
    }

    fetch('/api/inventory/advanced_search' + queryParams, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterData)
    })
    .then(response => response.json())
    .then(data => {
        currentSearchFilter = filterData;
        updateTable(data);
    })
    .catch(error => {
        console.error('Search failed:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载失败，请重试</td></tr>';
        }
    });
}

// 清除筛选
function clearAdvancedFilter() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const manufacturerFilter = document.getElementById('manufacturerFilter');
    if (manufacturerFilter) manufacturerFilter.value = '';
    
    const packageFilter = document.getElementById('packageFilter');
    if (packageFilter) packageFilter.value = '';
    
    const partTypeFilter = document.getElementById('partTypeFilter');
    if (partTypeFilter) partTypeFilter.value = '';
    
    // 重置排序
    currentSort = { field: null, direction: 'asc' };
    updateSortHeaders();

    applyAdvancedFilter();
}

// 加载所有零件
function loadAllParts() {
    applyAdvancedFilter();
}

// ==================== 表单处理 ====================

// 绑定文件导入表单
function bindImportForm() {
    const importForm = document.getElementById('importOrderForm');
    if (!importForm) return;
    
    importForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('orderFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showToast('请选择文件', 'danger');
            return;
        }
        
        // 根据文件扩展名选择API端点
        const fileExtension = file.name.split('.').pop().toLowerCase();
        let apiEndpoint;
        
        if (fileExtension === 'csv') {
            apiEndpoint = '/api/inventory/import_order_csv_file';
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            apiEndpoint = '/api/inventory/import_order_excel_file';
        } else {
            showToast('不支持的文件格式。请选择CSV或Excel文件。', 'danger');
            return;
        }
        
        const formData = new FormData(this);
        
        fetch(apiEndpoint, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addComponentOrderModal'));
                modal.hide();
                showToast('文件导入成功', 'success');
                applyAdvancedFilter();
                this.reset();
            } else {
                showToast('导入失败，请重试', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('发生错误: ' + error.message, 'danger');
        });
    });
}

// 绑定添加零件表单
function bindAddPartForm() {
    const addPartForm = document.querySelector('#addComponentModal form');
    if (!addPartForm) return;
    
    addPartForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        
        fetch('/api/inventory/add_part_to_inventory', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('addComponentModal'));
                modal.hide();
                showToast('零件添加成功', 'success');
                applyAdvancedFilter();
                this.reset();
            } else {
                showToast('添加失败', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('发生错误: ' + error.message, 'danger');
        });
    });
}

// ==================== 页面初始化 ====================

// 页面加载时初始化
document.addEventListener("DOMContentLoaded", function() {
    // 加载筛选选项
    loadFilterOptions();
    
    // 加载零件列表
    loadAllParts();
    
    // 绑定筛选按钮
    const applyBtn = document.getElementById('applyFilterButton');
    if (applyBtn) applyBtn.addEventListener('click', applyAdvancedFilter);
    
    const clearBtn = document.getElementById('clearFilterButton');
    if (clearBtn) clearBtn.addEventListener('click', clearAdvancedFilter);
    
    const searchBtn = document.getElementById('searchButton');
    if (searchBtn) searchBtn.addEventListener('click', applyAdvancedFilter);

    // 绑定筛选下拉框搜索
    bindFilterSearch('manufacturerFilterInput', 'manufacturerFilter');
    bindFilterSearch('packageFilterInput', 'packageFilter');
    bindFilterSearch('partTypeFilterInput', 'partTypeFilter');

    // 绑定表头排序
    bindSortEvents();
    
    // 绑定表单提交
    bindImportForm();
    bindAddPartForm();
    
    // 绑定库存操作
    bindStockInForm();
    bindStockOutForm();
    bindStockInModal();
    bindStockOutModal();
    
    // 绑定批量操作
    bindBatchStockOutEvents();
    bindBatchStockInEvents();
    
    // 绑定历史记录筛选
    const historyFilter = document.getElementById('historyOperationFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', () => loadInventoryHistory(1));
    }
    
    // 绑定分页设置模态框
    const pageSettingsModal = document.getElementById('pageSettingsModal');
    if (pageSettingsModal) {
        pageSettingsModal.addEventListener('show.bs.modal', function() {
            const storedSize = localStorage.getItem('pageSize') || 100;
            const select = document.getElementById('pageSizeInput');
            if (select) select.value = storedSize;
        });
    }
});

// 导出到全局
window.currentSearchFilter = currentSearchFilter;
window.applyAdvancedFilter = applyAdvancedFilter;
window.clearAdvancedFilter = clearAdvancedFilter;
window.loadAllParts = loadAllParts;
