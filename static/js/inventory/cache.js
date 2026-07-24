/**
 * 库存管理系统 - 数据缓存模块
 * 管理筛选选项数据的缓存，减少重复请求
 */

// 缓存对象
const dataCache = {
    cacheExpiry: 5 * 60 * 1000, // 5分钟缓存
    timestamps: {}
};

// 检查缓存是否有效
function isCacheValid(key) {
    const timestamp = dataCache.timestamps[key];
    if (!timestamp) return false;
    return (Date.now() - timestamp) < dataCache.cacheExpiry;
}

// 清除数据缓存
function clearDataCache() {
    dataCache.timestamps = {};
}

// 加载筛选选项（当前仅加载配置，旧筛选已移至侧栏）
function loadFilterOptions() {
    // 筛选功能已移至左侧栏，此处保留为空以兼容现有调用
}

// 填充下拉选择框
function populateSelect(selectId, items) {
    const select = document.getElementById(selectId);
    if (!select || !items) return;
    
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        select.appendChild(option);
    });
}

// 导出到全局
window.dataCache = dataCache;
window.isCacheValid = isCacheValid;
window.clearDataCache = clearDataCache;
window.loadFilterOptions = loadFilterOptions;
window.populateSelect = populateSelect;
