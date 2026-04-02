/**
 * 库存管理系统 - 筛选搜索模块
 * 实现筛选下拉框的输入搜索功能
 */

// 存储原始选项数据
const filterOptionsData = {
    manufacturerFilter: [],
    packageFilter: [],
    partTypeFilter: []
};

// 绑定筛选下拉框搜索功能
function bindFilterSearch(inputId, selectId) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    if (!input || !select) return;

    // 保存原始选项
    const saveOriginalOptions = () => {
        const options = Array.from(select.querySelectorAll('option'));
        if (options.length > 0 && filterOptionsData[selectId].length === 0) {
            filterOptionsData[selectId] = options.map(opt => ({
                value: opt.value,
                text: opt.textContent
            }));
        }
    };

    // 等待选项加载完成后保存
    setTimeout(saveOriginalOptions, 1000);

    // 输入框点击/聚焦时显示下拉
    const showDropdown = function() {
        if (filterOptionsData[selectId].length === 0) {
            saveOriginalOptions();
        }
        const currentValue = this.value.toLowerCase().trim();
        filterAndShowDropdown(selectId, currentValue);
    };

    input.addEventListener('click', showDropdown);
    input.addEventListener('focus', showDropdown);

    // 输入事件 - 实时筛选（带防抖）
    input.addEventListener('input', debounce(function() {
        const searchTerm = this.value.toLowerCase().trim();
        if (filterOptionsData[selectId].length === 0) {
            saveOriginalOptions();
        }
        filterAndShowDropdown(selectId, searchTerm);
    }, 200));

    // 选择事件
    select.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const selectedText = selectedOption.textContent;
        const selectedValue = selectedOption.value;
        
        if (selectedValue !== '') {
            input.value = selectedText;
            select.dataset.selectedValue = selectedValue;
        } else {
            input.value = '';
            select.dataset.selectedValue = '';
        }
        
        select.style.display = 'none';
    });

    // 点击外部隐藏下拉
    document.addEventListener('click', function(e) {
        const inputGroup = input.closest('.input-group');
        if (!inputGroup.contains(e.target) && !select.contains(e.target)) {
            select.style.display = 'none';
        }
    });
}

// 筛选并显示下拉选项
function filterAndShowDropdown(selectId, searchTerm) {
    const select = document.getElementById(selectId);
    if (!select || filterOptionsData[selectId].length === 0) return;
    
    // 清空当前选项
    select.innerHTML = '';
    
    // 添加"所有"选项
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = selectId === 'manufacturerFilter' ? '所有制造商' : 
                            selectId === 'packageFilter' ? '所有封装' : '所有类型';
    select.appendChild(allOption);
    
    // 过滤并添加匹配的选项
    let matchCount = 0;
    filterOptionsData[selectId].forEach(opt => {
        if (opt.value === '') return;
        
        if (searchTerm === '' || opt.text.toLowerCase().includes(searchTerm)) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
            matchCount++;
        }
    });
    
    // 显示下拉框
    if (matchCount > 0 || searchTerm === '') {
        select.style.display = 'block';
    }
}

// 清除筛选选择
function clearFilterSelection(selectId) {
    const inputId = selectId.replace('Filter', 'FilterInput');
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    
    if (input) input.value = '';
    if (select) {
        select.value = '';
        select.dataset.selectedValue = '';
        select.style.display = 'none';
    }
}

// 导出到全局
window.filterOptionsData = filterOptionsData;
window.bindFilterSearch = bindFilterSearch;
window.filterAndShowDropdown = filterAndShowDropdown;
window.clearFilterSelection = clearFilterSelection;
