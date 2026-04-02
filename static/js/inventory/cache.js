/**
 * 库存管理系统 - 数据缓存模块
 * 管理筛选选项数据的缓存，减少重复请求
 */

// 缓存对象
const dataCache = {
    manufacturers: null,
    packages: null,
    types: null,
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
    dataCache.manufacturers = null;
    dataCache.packages = null;
    dataCache.types = null;
    dataCache.timestamps = {};
}

// 加载筛选选项（带缓存）
function loadFilterOptions() {
    // 加载制造商
    if (isCacheValid('manufacturers')) {
        populateSelect('manufacturerFilter', dataCache.manufacturers);
    } else {
        fetch('/api/inventory/manufacturers')
            .then(response => response.json())
            .then(manufacturers => {
                dataCache.manufacturers = manufacturers;
                dataCache.timestamps.manufacturers = Date.now();
                populateSelect('manufacturerFilter', manufacturers);
            })
            .catch(error => console.error('加载制造商失败:', error));
    }
    
    // 加载封装
    if (isCacheValid('packages')) {
        populateSelect('packageFilter', dataCache.packages);
    } else {
        fetch('/api/inventory/packages')
            .then(response => response.json())
            .then(packages => {
                dataCache.packages = packages;
                dataCache.timestamps.packages = Date.now();
                populateSelect('packageFilter', packages);
            })
            .catch(error => console.error('加载封装失败:', error));
    }
    
    // 加载类型
    if (isCacheValid('types')) {
        populateSelect('partTypeFilter', dataCache.types);
    } else {
        fetch('/api/inventory/types')
            .then(response => response.json())
            .then(types => {
                dataCache.types = types;
                dataCache.timestamps.types = Date.now();
                populateSelect('partTypeFilter', types);
            })
            .catch(error => console.error('加载类型失败:', error));
    }
}

// 填充下拉选择框
function populateSelect(selectId, items) {
    const select = document.getElementById(selectId);
    if (!select || !items) return;
    
    // 清空现有选项（保留第一个"所有"选项）
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        select.appendChild(option);
    });
    
    // 保存到筛选选项数据缓存
    if (window.filterOptionsData && window.filterOptionsData[selectId]) {
        const allOption = select.querySelector('option[value=""]');
        window.filterOptionsData[selectId] = [
            { value: '', text: allOption ? allOption.textContent : '所有' },
            ...items.map(item => ({ value: item.name, text: item.name }))
        ];
    }
}

// 导出到全局
window.dataCache = dataCache;
window.isCacheValid = isCacheValid;
window.clearDataCache = clearDataCache;
window.loadFilterOptions = loadFilterOptions;
window.populateSelect = populateSelect;
