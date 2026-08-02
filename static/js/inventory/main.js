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
    const searchKey = searchInput ? searchInput.value.trim() : '';

    const filterData = {
        search_key: searchKey || null,
        page: 1,
        page_size: Math.min(parseInt(localStorage.getItem('pageSize')) || 100, 500)
    };

    // 合并侧栏筛选条件
    if (typeof getSidebarFilter === 'function') {
        var sidebarFilter = getSidebarFilter();
        if (sidebarFilter.category_id) filterData.category_id = sidebarFilter.category_id;
        if (sidebarFilter.subcategory_id) filterData.subcategory_id = sidebarFilter.subcategory_id;
        if (sidebarFilter.param_filters) filterData.param_filters = sidebarFilter.param_filters;
    }
    
    // 构建排序参数
    let queryParams = '';
    if (currentSort.field) {
        queryParams = `?sort_field=${currentSort.field}&sort_direction=${currentSort.direction}`;
    }
    
    // 显示加载状态
    const tbody = document.getElementById('parts-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
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
        
        // 保存筛选状态到URL和localStorage
        if (typeof saveFilterStateToURL === 'function') {
            saveFilterStateToURL();
        }
        if (typeof saveToLocalStorage === 'function') {
            saveToLocalStorage();
        }
    })
    .catch(error => {
        console.error('Search failed:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">加载失败，请重试</td></tr>';
        }
    });
}

// 跳转到指定页
function goToPage(page) {
    if (!currentSearchFilter) return;
    
    const searchInput = document.getElementById('searchInput');
    const searchKey = searchInput ? searchInput.value.trim() : '';

    const filterData = {
        ...currentSearchFilter,
        page: page,
        search_key: searchKey || null
    };

    // 构建排序参数
    let queryParams = '';
    if (currentSort.field) {
        queryParams = `?sort_field=${currentSort.field}&sort_direction=${currentSort.direction}`;
    }

    // 显示加载状态
    const tbody = document.getElementById('parts-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
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
        
        // 保存筛选状态到URL和localStorage
        if (typeof saveFilterStateToURL === 'function') {
            saveFilterStateToURL();
        }
        if (typeof saveToLocalStorage === 'function') {
            saveToLocalStorage();
        }
    })
    .catch(error => {
        console.error('Page navigation failed:', error);
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">加载失败，请重试</td></tr>';
        }
    });
}

// 清除筛选
function clearAdvancedFilter() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    // 重置侧栏筛选
    if (typeof sidebarState !== 'undefined') {
        sidebarState.selectedCategoryId = null;
        sidebarState.selectedSubcategoryId = null;
        sidebarState.paramFilters = {};
        sidebarState.appliedParamFilters = {};
        if (typeof renderCategoryList === 'function') renderCategoryList();
        var subEl = document.getElementById('sidebarSubcategories');
        if (subEl) subEl.innerHTML = '<div class="sidebar-empty">选择类别后显示</div>';
        var paramEl = document.getElementById('sidebarParams');
        if (paramEl) paramEl.innerHTML = '<div class="sidebar-empty">选择类别后显示</div>';
    }
    
    // 重置排序
    currentSort = { field: null, direction: 'asc' };
    updateSortHeaders();

    applyAdvancedFilter();
}

// 加载所有零件
function loadAllParts() {
    applyAdvancedFilter();
}

// ==================== 详情模态框事件绑定 ====================

// 绑定详情模态框内按钮事件
function bindDetailModalEvents() {
    const updateQtyBtn = document.getElementById('detailUpdateQuantityBtn');
    if (updateQtyBtn) updateQtyBtn.addEventListener('click', updateDetailQuantity);

    const operationMode = document.getElementById('detailOperationMode');
    if (operationMode) operationMode.addEventListener('change', updateDetailOperationHint);

    const viewHistoryBtn = document.getElementById('detailViewHistoryBtn');
    if (viewHistoryBtn) viewHistoryBtn.addEventListener('click', viewDetailHistory);

    const exportBtn = document.getElementById('detailExportDetailsBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportDetailDetails);

    const deleteBtn = document.getElementById('detailDeletePartBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteDetailPart);
}

// 绑定编辑零件表单
function bindEditPartForm() {
    const editForm = document.getElementById('editPartForm');
    if (!editForm) return;
    
    editForm.addEventListener('submit', function(event) {
        event.preventDefault();
        saveEditPart();
    });
}

// ==================== 表单处理 ====================

// 绑定导入模式切换警告
function bindImportModeWarning() {
    const overwriteRadio = document.getElementById('importModeOverwrite');
    const appendRadio = document.getElementById('importModeAppend');
    const warning = document.getElementById('overwriteWarning');
    
    if (overwriteRadio && warning) {
        overwriteRadio.addEventListener('change', function() {
            warning.style.display = this.checked ? 'block' : 'none';
        });
    }
    if (appendRadio && warning) {
        appendRadio.addEventListener('change', function() {
            warning.style.display = 'none';
        });
    }
}

// 绑定文件导入表单
function bindImportForm() {
    const importForm = document.getElementById('importOrderForm');
    if (!importForm) return;
    
    // 绑定导入模式警告
    bindImportModeWarning();
    
    importForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('orderFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showToast('请选择文件', 'danger');
            return;
        }
        
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
        
        // 显示进度条
        const progressContainer = document.getElementById('importProgressContainer');
        const progressBar = document.getElementById('importProgressBar');
        const progressText = document.getElementById('importProgressText');
        const submitBtn = this.querySelector('button[type="submit"]');
        
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
        }
        if (progressText) progressText.textContent = '正在导入...';
        if (submitBtn) submitBtn.disabled = true;
        
        // 模拟进度
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 10;
                const currentProgress = Math.min(progress, 90);
                if (progressBar) {
                    progressBar.style.width = currentProgress + '%';
                    progressBar.textContent = Math.round(currentProgress) + '%';
                }
            }
        }, 200);
        
        fetch(apiEndpoint, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            clearInterval(progressInterval);
            if (response.ok) {
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                    progressBar.classList.add('bg-success');
                }
                if (progressText) progressText.textContent = '导入完成！';
                
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addComponentOrderModal'));
                    modal.hide();
                    // 重置进度条
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (progressBar) {
                        progressBar.style.width = '0%';
                        progressBar.classList.remove('bg-success');
                        progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
                    }
                    if (submitBtn) submitBtn.disabled = false;
                    
                    showToast('文件导入成功', 'success');
                    applyAdvancedFilter();
                    this.reset();
                }, 1000);
            } else {
                // 尝试解析后端返回的详细错误信息
                response.json().then(data => {
                    const detail = data.detail || '导入失败，请重试';
                    showToast('导入失败: ' + detail, 'danger');
                }).catch(() => {
                    showToast('导入失败，请重试', 'danger');
                });
                
                // 重置进度条
                if (progressContainer) progressContainer.style.display = 'none';
                if (progressBar) {
                    progressBar.style.width = '0%';
                    progressBar.classList.remove('bg-success');
                    progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
                }
                if (submitBtn) submitBtn.disabled = false;
            }
        })
        .catch(error => {
            clearInterval(progressInterval);
            console.error('Error:', error);
            showToast('发生错误: ' + error.message, 'danger');
            
            // 重置进度条
            if (progressContainer) progressContainer.style.display = 'none';
            if (progressBar) {
                progressBar.style.width = '0%';
                progressBar.classList.remove('bg-success');
                progressBar.classList.add('progress-bar-striped', 'progress-bar-animated');
            }
            if (submitBtn) submitBtn.disabled = false;
        });
    });
}

// 绑定添加零件表单
function bindAddPartForm() {
    const addPartForm = document.querySelector('#addComponentModal form');
    if (!addPartForm) return;
    
    // 模态框打开时重置联动状态
    var addModal = document.getElementById('addComponentModal');
    if (addModal) {
        addModal.addEventListener('show.bs.modal', function() {
            var subcatSelect = document.getElementById('addPartSubcategory');
            if (subcatSelect) subcatSelect.innerHTML = '<option value="">-- 无 --</option>';
            var templateArea = document.getElementById('paramTemplateFields');
            if (templateArea) templateArea.innerHTML = '';
            var hiddenSubcatId = document.getElementById('addPartSubcategoryId');
            if (hiddenSubcatId) hiddenSubcatId.value = '';
        });
    }

    addPartForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // 同步 part_type 隐藏字段（兼容旧 types 表）
        var catIdEl = document.getElementById('addPartCategoryId');
        if (catIdEl && catIdEl.value) {
            var catId = parseInt(catIdEl.value);
            var catName = (window.configState && configState.categoriesById[catId])
                ? configState.categoriesById[catId].name : '';
            document.getElementById('partType').value = catName;
        }

        // 序列化参数模板字段到 other 字段
        var paramJson = serializeParamFields();
        if (paramJson) {
            var otherEl = document.querySelector('#addPartForm [name="other"]');
            if (otherEl) otherEl.value = paramJson;
        }

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

document.addEventListener("DOMContentLoaded", async function() {
    // 先加载配置 bundle
    await loadConfigBundle();

    // 加载筛选选项
    loadFilterOptions();

    // 加载零件列表
    loadAllParts();

    // 初始化类别联动
    initCategoryCascade();

    // 初始化侧栏
    if (typeof initSidebar === 'function') initSidebar();
    
    // 绑定搜索按钮
    const searchBtn = document.getElementById('searchButton');
    if (searchBtn) searchBtn.addEventListener('click', applyAdvancedFilter);

    // 回车搜索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') applyAdvancedFilter();
    });

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

    // 绑定详情模态框事件
    bindDetailModalEvents();
    
    // 绑定编辑零件表单
    bindEditPartForm();
    
    // 绑定历史记录筛选
    const historyFilter = document.getElementById('historyOperationFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', () => loadInventoryHistory(1));
    }

    // 检查 MQTT 状态（导航栏指示器）
    updateNavMqttStatus();
    
    // 恢复页面筛选状态
    if (typeof restoreFilterStateFromURL === 'function') {
        restoreFilterStateFromURL();
    }
});

// MQTT 状态指示器
function updateNavMqttStatus() {
    var icon = document.getElementById('navMqttIcon');
    if (!icon) return;
    fetch('/api/config/mqtt/status')
        .then(function(r) { return r.json(); })
        .then(function(s) {
            if (s.enabled && s.connected) {
                icon.style.opacity = '1';
                icon.style.color = '#3fb950';
                icon.parentElement.title = 'MQTT 已连接';
            } else if (s.enabled) {
                icon.style.opacity = '0.8';
                icon.style.color = '#d29922';
                icon.parentElement.title = 'MQTT 已启用（未连接）';
            } else {
                icon.style.opacity = '0.3';
                icon.style.color = '';
                icon.parentElement.title = 'MQTT 未启用';
            }
        })
        .catch(function() {});
}

// 导出到全局
window.currentSearchFilter = currentSearchFilter;
window.applyAdvancedFilter = applyAdvancedFilter;
window.clearAdvancedFilter = clearAdvancedFilter;
window.loadAllParts = loadAllParts;
window.goToPage = goToPage;
