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
        const count = data.data ? data.data.length : 0;
        const total = data.pagination ? data.pagination.total_count : count;
        console.info('[库存] 加载完成: %d/%d 条, 关键词="%s"', count, total, searchKey || '(全部)');
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
        console.error('[库存] 加载失败:', error);
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
        
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            apiEndpoint = '/api/inventory/import_order_excel_file';
        } else {
            showToast('不支持的文件格式。请选择Excel文件。', 'danger');
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
                response.json().then(report => {
                    if (progressBar) {
                        progressBar.style.width = '100%';
                        progressBar.textContent = '100%';
                        progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
                        progressBar.classList.add('bg-success');
                    }
                    if (progressText) progressText.textContent = '导入完成！';

                    const skipped = (report.skipped_empty||0) + (report.skipped_no_name||0) + (report.skipped_no_quantity||0) + (report.skipped_bad_quantity||0);
                    const errors = report.errors ? report.errors.length : 0;
                    console.info('[导入] 完成: 文件=%s, 总行=%d, 导入=%d, 跳过=%d, 错误=%d', file.name, report.total_rows, report.imported, skipped, errors);

                    // 保存报告数据供导出使用
                    window._lastImportReport = report;

                    const verifyPassed = report.verify_passed || 0;
                    const verifyIssues = report.verify_issues || 0;

                    // 生成报告HTML
                    let html = '<div class="d-flex justify-content-between align-items-center mb-2"><div><strong>总行数:</strong> ' + report.total_rows + ' &nbsp; <strong>导入:</strong> <span class="text-success">' + report.imported + '</span> &nbsp; <strong>跳过:</strong> ' + skipped + ' &nbsp; <strong>错误:</strong> ' + errors + (verifyIssues > 0 ? ' &nbsp; <strong class="text-warning">验证问题:</strong> <span class="text-warning">' + verifyIssues + '</span>' : '') + '</div><div class="btn-group btn-group-sm"><button class="btn btn-outline-success" onclick="exportImportReport(\'all\')"><i class="fas fa-file-excel me-1"></i> 导出全部报告</button>' + (verifyIssues > 0 ? '<button class="btn btn-outline-warning" onclick="exportImportReport(\'issues\')"><i class="fas fa-file-excel me-1"></i> 导出问题报告</button>' : '') + (errors > 0 ? '<button class="btn btn-outline-danger" onclick="exportImportReport(\'failed\')"><i class="fas fa-file-excel me-1"></i> 导出失败报告</button>' : '') + '</div></div>';
                    if (report.columns_detected && report.columns_detected.length > 0) {
                        html += '<div class="mb-2"><small class="text-muted">检测到列: ' + report.columns_detected.join(', ') + '</small></div>';
                    }
                    if (report.details && report.details.length > 0) {
                        html += '<div style="max-height:400px;overflow-y:auto;"><table class="table table-sm table-bordered" style="font-size:0.8rem;"><thead class="table-light"><tr><th>行</th><th>型号</th><th>数量</th><th>类型</th><th>导入状态</th><th>验证</th><th>验证问题</th></tr></thead><tbody>';
                        report.details.forEach(function(d) {
                            const cls = d.status === 'error' ? ' class="table-danger"' : (d.verify_status === '有问题' ? ' class="table-warning"' : '');
                            const statusText = d.status === 'ok' ? '成功' : (d.status === 'error' ? '错误' : '跳过');
                            const reason = d.status !== 'ok' ? (d.reason || '') : '';
                            const verifyText = d.verify_status || '-';
                            const verifyIssue = d.verify_issues || reason || '';
                            html += '<tr' + cls + '><td>' + d.row + '</td><td>' + (d.name||'-') + '</td><td>' + (d.quantity||'-') + '</td><td>' + (d.category||'-') + '</td><td>' + statusText + '</td><td>' + verifyText + '</td><td>' + verifyIssue + '</td></tr>';
                        });
                        html += '</tbody></table></div>';
                    }

                    // 显示报告（替换进度条区域）
                    if (progressContainer) {
                        progressContainer.innerHTML = html;
                        progressContainer.style.display = 'block';
                    }

                    showToast('导入完成: ' + report.imported + '条成功' + (errors > 0 ? ', ' + errors + '条错误' : ''), errors > 0 ? 'warning' : 'success');
                    applyAdvancedFilter();
                    if (submitBtn) submitBtn.disabled = false;
                });
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
                const partName = formData.get('name') || '?';
                const partPkg = formData.get('package') || '?';
                console.info('[库存] 零件添加成功: %s (%s)', partName, partPkg);
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
            console.error('[库存] 零件添加失败:', error);
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

    // 初始化二维码扫描
    if (typeof initQrScan === 'function') initQrScan();
    if (typeof bindQrStockInForm === 'function') bindQrStockInForm();
    
    // 绑定历史记录筛选
    const historyFilter = document.getElementById('historyOperationFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', () => loadInventoryHistory(1));
    }

    // 检查 MQTT 状态（导航栏指示器）
    updateNavMqttStatus();

    console.info('[库存] 页面初始化完成');
    
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

// 导出导入报告为Excel(xlsx)
function exportImportReport(mode) {
    const report = window._lastImportReport;
    if (!report || !report.details || report.details.length === 0) {
        showToast('没有可导出的报告数据', 'warning');
        return;
    }

    let rows = report.details;
    let filename = '导入报告_全部';

    if (mode === 'failed') {
        rows = rows.filter(function(d) { return d.status !== 'ok'; });
        filename = '导入报告_失败';
    } else if (mode === 'issues') {
        rows = rows.filter(function(d) { return d.verify_status === '有问题' || d.status !== 'ok'; });
        filename = '导入报告_问题';
    }

    if (rows.length === 0) {
        showToast('没有符合条件的记录', 'info');
        return;
    }

    // 构建明细数据
    const data = [['行号', '型号', '数量', '类型', '导入状态', '验证结果', '问题说明', '已关联制造商', '已分配类别', '已分配子类别']];
    rows.forEach(function(d) {
        const statusText = d.status === 'ok' ? '成功' : (d.status === 'error' ? '失败' : '跳过');
        const reason = d.status !== 'ok' ? (d.reason || '') : (d.verify_issues || '');
        data.push([
            d.row,
            d.name || '-',
            d.quantity || '-',
            d.category || '-',
            statusText,
            d.verify_status || '-',
            reason,
            d.manufacturer_verified || '-',
            d.category_verified || '-',
            d.subcategory_verified || '-',
        ]);
    });

    // 汇总
    const skipped = (report.skipped_empty||0) + (report.skipped_no_name||0) + (report.skipped_no_quantity||0) + (report.skipped_bad_quantity||0);
    const errorCount = report.errors ? report.errors.length : 0;
    data.push([]);
    data.push(['汇总']);
    data.push(['总行数', report.total_rows]);
    data.push(['导入成功', report.imported]);
    data.push(['跳过', skipped]);
    data.push(['错误', errorCount]);
    data.push(['验证通过', report.verify_passed || 0]);
    data.push(['验证有问题', report.verify_issues || 0]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        { wch: 8 },  { wch: 30 }, { wch: 10 }, { wch: 20 },
        { wch: 10 }, { wch: 10 }, { wch: 40 },
        { wch: 20 }, { wch: 20 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入报告');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, filename + '_' + dateStr + '.xlsx');
    showToast('报告已导出: ' + filename + '_' + dateStr + '.xlsx', 'success');
}

// 导出到全局
window.currentSearchFilter = currentSearchFilter;
window.applyAdvancedFilter = applyAdvancedFilter;
window.clearAdvancedFilter = clearAdvancedFilter;
window.loadAllParts = loadAllParts;
window.goToPage = goToPage;
window.exportImportReport = exportImportReport;
