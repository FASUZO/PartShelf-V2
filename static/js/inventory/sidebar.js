/**
 * 左侧筛选栏 - 类别/子类别/参数三级筛选
 */

var sidebarState = {
    selectedCategoryId: null,
    selectedSubcategoryId: null,
    paramFilters: {},       // 用户界面上的筛选值（未提交）
    appliedParamFilters: {}, // 已应用的筛选值
    collapsed: false
};

function initSidebar() {
    renderCategoryList();
    var toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }
}

// === 渲染类别列表 ===
function renderCategoryList() {
    var container = document.getElementById('sidebarCategories');
    if (!container) return;
    if (!configState.loaded) {
        container.innerHTML = '<div class="text-muted small p-2">配置未加载</div>';
        return;
    }
    var categories = getCategories();
    var html = '<div class="sidebar-item' + (!sidebarState.selectedCategoryId ? ' active' : '') + '" onclick="selectCategory(null)">' +
        '<i class="fas fa-border-all me-1"></i> 全部</div>';
    categories.forEach(function(cat) {
        html += '<div class="sidebar-item' + (sidebarState.selectedCategoryId === cat.id ? ' active' : '') +
            '" onclick="selectCategory(' + cat.id + ')">' +
            '<span class="sidebar-item-prefix">' + (cat.location_prefix || '') + '</span> ' +
            escapeHtml(cat.name) + '</div>';
    });
    container.innerHTML = html;
}

// === 选择类别 ===
function selectCategory(catId) {
    sidebarState.selectedCategoryId = catId;
    sidebarState.selectedSubcategoryId = null;
    sidebarState.paramFilters = {};
    sidebarState.appliedParamFilters = {};
    renderCategoryList();
    renderSubcategoryList(catId);
    loadAndRenderParamFilters(catId);
    applyAdvancedFilter();
}

// === 渲染子类别列表 ===
function renderSubcategoryList(catId) {
    var container = document.getElementById('sidebarSubcategories');
    if (!container) return;
    if (!catId) {
        container.innerHTML = '<div class="sidebar-empty">选择类别后显示</div>';
        return;
    }
    var subcats = getSubcategoriesByCategoryId(catId);
    if (subcats.length === 0) {
        container.innerHTML = '<div class="sidebar-empty">该类别无子类别</div>';
        return;
    }
    var html = '<div class="sidebar-item' + (!sidebarState.selectedSubcategoryId ? ' active' : '') +
        '" onclick="selectSubcategory(null)"><i class="fas fa-folder-open me-1"></i> 全部</div>';
    subcats.forEach(function(sub) {
        html += '<div class="sidebar-item' + (sidebarState.selectedSubcategoryId === sub.id ? ' active' : '') +
            '" onclick="selectSubcategory(' + sub.id + ')">' +
            '<span class="sidebar-item-letter">' + (sub.letter || '') + '</span> ' +
            escapeHtml(sub.name) + '</div>';
    });
    container.innerHTML = html;
}

// === 选择子类别 ===
function selectSubcategory(subId) {
    sidebarState.selectedSubcategoryId = subId;
    renderSubcategoryList(sidebarState.selectedCategoryId);
    applyAdvancedFilter();
}

// 全局参数字段（所有类别共享）
var GLOBAL_FILTER_FIELDS = ['封装'];

// === 加载并渲染参数筛选 ===
function loadAndRenderParamFilters(catId) {
    var container = document.getElementById('sidebarParams');
    if (!container) return;
    if (!catId) {
        container.innerHTML = '<div class="sidebar-empty">选择类别后显示</div>';
        return;
    }

    var templates = getTemplatesForCategory(catId);
    var templateFields = GLOBAL_FILTER_FIELDS.slice(); // 全局字段始终存在
    templates.forEach(function(tpl) {
        try {
            var def = JSON.parse(tpl.definition_json || '{}');
            (def.fields || []).forEach(function(f) {
                if (templateFields.indexOf(f) === -1) templateFields.push(f);
            });
        } catch (e) {}
    });

    fetch('/api/inventory/category_param_values?category_id=' + catId)
        .then(function(r) { return r.json(); })
        .then(function(paramValues) {
            renderParamFilterFields(container, templateFields, paramValues);
        })
        .catch(function() {
            renderParamFilterFields(container, templateFields, {});
        });
}

function renderParamFilterFields(container, templateFields, paramValues) {
    var allFields = templateFields.slice();
    Object.keys(paramValues).forEach(function(k) {
        if (allFields.indexOf(k) === -1) allFields.push(k);
    });

    if (allFields.length === 0) {
        container.innerHTML = '<div class="sidebar-empty">该类别无参数筛选</div>';
        return;
    }

    sidebarState.paramFilters = JSON.parse(JSON.stringify(sidebarState.appliedParamFilters));

    // 强制作为离散值的字段
    var forceDiscreteFields = ['封装', '类型', '制造商'];

    // 判断哪些字段是离散值（有少量可选值），哪些是范围值
    var discreteFields = [];
    var rangeFields = [];
    allFields.forEach(function(field) {
        // 强制离散值字段
        if (forceDiscreteFields.indexOf(field) !== -1) {
            discreteFields.push(field);
            return;
        }
        var values = paramValues[field] || [];
        if (values.length > 0 && values.length <= 30) {
            // 检查是否看起来像数值范围（如阻值 100, 1K, 10K）
            var numericCount = 0;
            values.forEach(function(v) { if (/^[0-9.]/.test(v)) numericCount++; });
            if (numericCount > values.length * 0.5 && values.length > 8) {
                rangeFields.push(field);
            } else {
                discreteFields.push(field);
            }
        } else {
            rangeFields.push(field);
        }
    });

    var html = '';

    // 离散值字段 - 下拉选择
    discreteFields.forEach(function(field) {
        var values = paramValues[field] || [];
        var currentVal = sidebarState.paramFilters[field] || '';
        html += '<div class="param-filter-group">' +
            '<label class="param-filter-label"><i class="fas fa-list-ul me-1" style="font-size:0.6rem;opacity:0.6"></i>' + escapeHtml(field) + '</label>' +
            '<select class="form-select form-select-sm param-filter-select" data-field="' + escapeHtml(field) + '">' +
            '<option value="">全部</option>';
        values.forEach(function(v) {
            html += '<option value="' + escapeHtml(v) + '"' + (currentVal === v ? ' selected' : '') + '>' + escapeHtml(v) + '</option>';
        });
        html += '</select></div>';
    });

    // 范围值字段 - 双输入框 + 更多按钮
    rangeFields.forEach(function(field) {
        var range = (typeof sidebarState.paramFilters[field] === 'object') ? sidebarState.paramFilters[field] : {};
        var values = paramValues[field] || [];
        html += '<div class="param-filter-group">' +
            '<label class="param-filter-label"><i class="fas fa-arrows-alt-h me-1" style="font-size:0.6rem;opacity:0.6"></i>' + escapeHtml(field) + '</label>' +
            '<div class="input-group input-group-sm">' +
            '<input type="text" class="form-control param-filter-range" data-field="' + escapeHtml(field) + '" data-bound="min" placeholder="最小" value="' + escapeHtml(range.min || '') + '">' +
            '<span class="input-group-text">~</span>' +
            '<input type="text" class="form-control param-filter-range" data-field="' + escapeHtml(field) + '" data-bound="max" placeholder="最大" value="' + escapeHtml(range.max || '') + '">' +
            '<button class="btn btn-outline-secondary btn-sm" type="button" onclick="showMultiSelectModal(\'' + escapeHtml(field) + '\')" title="查看所有值"><i class="fas fa-list"></i></button>' +
            '</div></div>';
        // 存储所有值供多选弹窗使用
        if (!window._paramValuesCache) window._paramValuesCache = {};
        window._paramValuesCache[field] = values;
    });

    html += '<div class="param-filter-actions">' +
        '<button class="btn-apply" onclick="applyParamFilters()"><i class="fas fa-check me-1"></i>应用筛选</button>' +
        '<button class="btn-reset" onclick="resetParamFilters()"><i class="fas fa-undo me-1"></i>重置</button>' +
        '</div>';

    container.innerHTML = html;
}

// === 应用参数筛选 ===
function applyParamFilters() {
    // 收集当前界面上的筛选值
    var newFilters = {};

    document.querySelectorAll('#sidebarParams .param-filter-select').forEach(function(sel) {
        if (sel.value) {
            newFilters[sel.dataset.field] = sel.value;
        }
    });

    document.querySelectorAll('#sidebarParams .param-filter-range').forEach(function(input) {
        var field = input.dataset.field;
        var bound = input.dataset.bound;
        var value = input.value.trim();
        if (value) {
            // 如果已经是数组（多选值），则保留
            if (Array.isArray(sidebarState.paramFilters[field])) {
                newFilters[field] = sidebarState.paramFilters[field];
            } else {
                if (!newFilters[field]) newFilters[field] = {};
                if (typeof newFilters[field] !== 'object' || Array.isArray(newFilters[field])) newFilters[field] = {};
                newFilters[field][bound] = value;
            }
        }
    });

    // 保留通过多选弹窗设置的数组值
    Object.keys(sidebarState.paramFilters).forEach(function(field) {
        if (Array.isArray(sidebarState.paramFilters[field]) && !newFilters[field]) {
            newFilters[field] = sidebarState.paramFilters[field];
        }
    });

    sidebarState.paramFilters = newFilters;
    sidebarState.appliedParamFilters = JSON.parse(JSON.stringify(newFilters));
    applyAdvancedFilter();

    // 按钮反馈
    var btn = document.querySelector('#sidebarParams .btn-apply');
    if (btn) {
        var orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check me-1"></i>已应用';
        btn.style.background = '#2ea043';
        setTimeout(function() {
            btn.innerHTML = orig;
            btn.style.background = '';
        }, 1000);
    }
}

// === 重置参数筛选 ===
function resetParamFilters() {
    sidebarState.paramFilters = {};
    sidebarState.appliedParamFilters = {};

    // 清空所有输入控件
    document.querySelectorAll('#sidebarParams .param-filter-select').forEach(function(sel) {
        sel.value = '';
    });
    document.querySelectorAll('#sidebarParams .param-filter-range').forEach(function(input) {
        input.value = '';
    });

    applyAdvancedFilter();
}

// === 折叠/展开 ===
function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebarState.collapsed = !sidebarState.collapsed;
    sidebar.classList.toggle('collapsed', sidebarState.collapsed);
    var content = document.getElementById('mainContent');
    if (content) {
        content.className = sidebarState.collapsed ? 'col' : 'col-md-9 col-lg-10';
    }
    // 更新按钮图标
    var icon = document.querySelector('#sidebarToggle i');
    if (icon) {
        icon.className = sidebarState.collapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    }
}

// === 获取当前筛选状态（供 main.js 调用）===
function getSidebarFilter() {
    var filter = {};
    if (sidebarState.selectedCategoryId) {
        filter.category_id = sidebarState.selectedCategoryId;
    }
    if (sidebarState.selectedSubcategoryId) {
        filter.subcategory_id = sidebarState.selectedSubcategoryId;
    }
    if (Object.keys(sidebarState.appliedParamFilters).length > 0) {
        filter.param_filters = sidebarState.appliedParamFilters;
    }
    return filter;
}

// === 多选筛选弹窗 ===
var _currentMultiSelectField = null;

function showMultiSelectModal(field) {
    _currentMultiSelectField = field;
    var values = (window._paramValuesCache && window._paramValuesCache[field]) || [];
    var title = document.getElementById('multiSelectFilterTitle');
    if (title) title.textContent = '选择 ' + field;

    // 获取当前已选中的值
    var currentValues = [];
    if (sidebarState.paramFilters[field]) {
        if (Array.isArray(sidebarState.paramFilters[field])) {
            currentValues = sidebarState.paramFilters[field];
        } else if (typeof sidebarState.paramFilters[field] === 'string') {
            currentValues = [sidebarState.paramFilters[field]];
        }
    }

    var listContainer = document.getElementById('multiSelectList');
    if (!listContainer) return;

    var html = '';
    values.forEach(function(v) {
        var checked = currentValues.indexOf(v) !== -1 ? ' checked' : '';
        html += '<div class="form-check">' +
            '<input class="form-check-input multi-select-item" type="checkbox" value="' + escapeHtml(v) + '" id="ms_' + escapeHtml(v) + '"' + checked + '>' +
            '<label class="form-check-label" for="ms_' + escapeHtml(v) + '">' + escapeHtml(v) + '</label>' +
            '</div>';
    });
    listContainer.innerHTML = html;

    // 清空搜索框
    var searchInput = document.getElementById('multiSelectSearch');
    if (searchInput) searchInput.value = '';

    // 显示弹窗
    var modal = new bootstrap.Modal(document.getElementById('multiSelectFilterModal'));
    modal.show();
}

function multiSelectAll() {
    document.querySelectorAll('#multiSelectList .multi-select-item').forEach(function(cb) {
        if (cb.parentElement.style.display !== 'none') {
            cb.checked = true;
        }
    });
}

function multiSelectNone() {
    document.querySelectorAll('#multiSelectList .multi-select-item').forEach(function(cb) {
        if (cb.parentElement.style.display !== 'none') {
            cb.checked = false;
        }
    });
}

function applyMultiSelectFilter() {
    if (!_currentMultiSelectField) return;
    var selectedValues = [];
    document.querySelectorAll('#multiSelectList .multi-select-item:checked').forEach(function(cb) {
        selectedValues.push(cb.value);
    });

    if (selectedValues.length > 0) {
        sidebarState.paramFilters[_currentMultiSelectField] = selectedValues;
    } else {
        delete sidebarState.paramFilters[_currentMultiSelectField];
    }
    sidebarState.appliedParamFilters = JSON.parse(JSON.stringify(sidebarState.paramFilters));

    // 关闭弹窗
    bootstrap.Modal.getInstance(document.getElementById('multiSelectFilterModal')).hide();

    // 更新界面上的范围输入框显示
    updateRangeInputDisplay(_currentMultiSelectField, selectedValues);

    // 应用筛选
    applyAdvancedFilter();
}

function updateRangeInputDisplay(field, selectedValues) {
    var minInput = document.querySelector('.param-filter-range[data-field="' + field + '"][data-bound="min"]');
    var maxInput = document.querySelector('.param-filter-range[data-field="' + field + '"][data-bound="max"]');
    if (minInput && maxInput) {
        if (selectedValues.length === 1) {
            minInput.value = selectedValues[0];
            maxInput.value = selectedValues[0];
        } else if (selectedValues.length > 1) {
            minInput.value = selectedValues.length + '个值已选';
            maxInput.value = '';
        } else {
            minInput.value = '';
            maxInput.value = '';
        }
    }
}

// 搜索过滤功能
document.addEventListener('DOMContentLoaded', function() {
    var searchInput = document.getElementById('multiSelectSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            var keyword = this.value.toLowerCase();
            document.querySelectorAll('#multiSelectList .form-check').forEach(function(item) {
                var label = item.querySelector('label');
                if (label) {
                    var text = label.textContent.toLowerCase();
                    item.style.display = text.indexOf(keyword) !== -1 ? '' : 'none';
                }
            });
        });
    }
});

// 全局导出
window.sidebarState = sidebarState;
window.initSidebar = initSidebar;
window.selectCategory = selectCategory;
window.selectSubcategory = selectSubcategory;
window.applyParamFilters = applyParamFilters;
window.resetParamFilters = resetParamFilters;
window.toggleSidebar = toggleSidebar;
window.getSidebarFilter = getSidebarFilter;
window.showMultiSelectModal = showMultiSelectModal;
window.multiSelectAll = multiSelectAll;
window.multiSelectNone = multiSelectNone;
window.applyMultiSelectFilter = applyMultiSelectFilter;
