/**
 * URL状态管理 - 保存和恢复页面筛选状态
 */

// 保存筛选状态到URL
function saveFilterStateToURL() {
    const params = new URLSearchParams();
    
    // 保存搜索关键字
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim()) {
        params.set('search', searchInput.value.trim());
    }
    
    // 保存侧栏筛选状态
    if (typeof sidebarState !== 'undefined') {
        if (sidebarState.selectedCategoryId) {
            params.set('category', sidebarState.selectedCategoryId);
        }
        if (sidebarState.selectedSubcategoryId) {
            params.set('subcategory', sidebarState.selectedSubcategoryId);
        }
        if (Object.keys(sidebarState.appliedParamFilters).length > 0) {
            params.set('filters', JSON.stringify(sidebarState.appliedParamFilters));
        }
    }
    
    // 保存排序状态
    if (typeof currentSort !== 'undefined' && currentSort.field) {
        params.set('sort', currentSort.field);
        params.set('order', currentSort.direction);
    }
    
    // 保存侧栏折叠状态
    if (typeof sidebarState !== 'undefined' && sidebarState.collapsed) {
        params.set('collapsed', '1');
    }
    
    // 更新URL（不刷新页面）
    const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newURL);
}

// 从URL恢复筛选状态
function restoreFilterStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    // 恢复搜索关键字
    const searchKey = params.get('search');
    if (searchKey) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = searchKey;
        }
    }
    
    // 恢复类别选择
    const categoryId = params.get('category');
    if (categoryId && typeof selectCategory === 'function') {
        // 延迟执行，等待配置加载完成
        setTimeout(function() {
            selectCategory(parseInt(categoryId));
            
            // 恢复子类别选择
            const subcategoryId = params.get('subcategory');
            if (subcategoryId && typeof selectSubcategory === 'function') {
                setTimeout(function() {
                    selectSubcategory(parseInt(subcategoryId));
                }, 100);
            }
            
            // 恢复参数筛选
            const filtersJson = params.get('filters');
            if (filtersJson) {
                try {
                    const filters = JSON.parse(filtersJson);
                    if (typeof sidebarState !== 'undefined') {
                        sidebarState.appliedParamFilters = filters;
                        sidebarState.paramFilters = JSON.parse(JSON.stringify(filters));
                    }
                    // 延迟应用筛选
                    setTimeout(function() {
                        if (typeof applyAdvancedFilter === 'function') {
                            applyAdvancedFilter();
                        }
                    }, 300);
                } catch (e) {
                    console.error('解析筛选参数失败:', e);
                }
            }
        }, 200);
    }
    
    // 恢复排序状态
    const sortField = params.get('sort');
    const sortOrder = params.get('order');
    if (sortField && typeof currentSort !== 'undefined') {
        currentSort.field = sortField;
        currentSort.direction = sortOrder || 'asc';
        if (typeof updateSortHeaders === 'function') {
            updateSortHeaders();
        }
    }
    
    // 恢复侧栏折叠状态
    const collapsed = params.get('collapsed');
    if (collapsed === '1' && typeof sidebarState !== 'undefined') {
        sidebarState.collapsed = true;
        if (typeof toggleSidebar === 'function') {
            // 延迟执行，等待DOM加载完成
            setTimeout(function() {
                toggleSidebar();
            }, 100);
        }
    }
    
    // 如果没有URL参数，尝试从localStorage恢复
    if (!categoryId && !searchKey) {
        restoreFromLocalStorage();
    }
}

// 保存到localStorage（作为备份）
function saveToLocalStorage() {
    const state = {
        categoryId: sidebarState?.selectedCategoryId,
        subcategoryId: sidebarState?.selectedSubcategoryId,
        paramFilters: sidebarState?.appliedParamFilters,
        searchKey: document.getElementById('searchInput')?.value?.trim(),
        sortField: currentSort?.field,
        sortOrder: currentSort?.direction,
        collapsed: sidebarState?.collapsed,
        timestamp: Date.now()
    };
    
    // 只保存最近1小时的状态
    if (Date.now() - state.timestamp < 3600000) {
        localStorage.setItem('inventoryFilterState', JSON.stringify(state));
    }
}

// 从localStorage恢复
function restoreFromLocalStorage() {
    try {
        const saved = localStorage.getItem('inventoryFilterState');
        if (!saved) return;
        
        const state = JSON.parse(saved);
        
        // 检查是否过期（1小时）
        if (Date.now() - state.timestamp > 3600000) {
            localStorage.removeItem('inventoryFilterState');
            return;
        }
        
        // 恢复搜索关键字
        if (state.searchKey) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = state.searchKey;
            }
        }
        
        // 恢复类别选择
        if (state.categoryId && typeof selectCategory === 'function') {
            setTimeout(function() {
                selectCategory(state.categoryId);
                
                if (state.subcategoryId && typeof selectSubcategory === 'function') {
                    setTimeout(function() {
                        selectSubcategory(state.subcategoryId);
                    }, 100);
                }
                
                if (state.paramFilters && Object.keys(state.paramFilters).length > 0) {
                    if (typeof sidebarState !== 'undefined') {
                        sidebarState.appliedParamFilters = state.paramFilters;
                        sidebarState.paramFilters = JSON.parse(JSON.stringify(state.paramFilters));
                    }
                    setTimeout(function() {
                        if (typeof applyAdvancedFilter === 'function') {
                            applyAdvancedFilter();
                        }
                    }, 300);
                }
            }, 200);
        }
        
        // 恢复排序状态
        if (state.sortField && typeof currentSort !== 'undefined') {
            currentSort.field = state.sortField;
            currentSort.direction = state.sortOrder || 'asc';
            if (typeof updateSortHeaders === 'function') {
                updateSortHeaders();
            }
        }
    } catch (e) {
        console.error('从localStorage恢复状态失败:', e);
    }
}

// 监听页面卸载，保存状态
window.addEventListener('beforeunload', function() {
    saveFilterStateToURL();
    saveToLocalStorage();
});

// 监听URL变化（前进/后退按钮）
window.addEventListener('popstate', function() {
    restoreFilterStateFromURL();
});

// 导出函数
window.saveFilterStateToURL = saveFilterStateToURL;
window.restoreFilterStateFromURL = restoreFilterStateFromURL;
window.saveToLocalStorage = saveToLocalStorage;
window.restoreFromLocalStorage = restoreFromLocalStorage;
