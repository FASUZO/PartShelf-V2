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

    // 判断哪些字段是离散值（有少量可选值），哪些是范围值
    var discreteFields = [];
    var rangeFields = [];
    allFields.forEach(function(field) {
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

    // 范围值字段 - 双输入框
    rangeFields.forEach(function(field) {
        var range = (typeof sidebarState.paramFilters[field] === 'object') ? sidebarState.paramFilters[field] : {};
        html += '<div class="param-filter-group">' +
            '<label class="param-filter-label"><i class="fas fa-arrows-alt-h me-1" style="font-size:0.6rem;opacity:0.6"></i>' + escapeHtml(field) + '</label>' +
            '<div class="input-group input-group-sm">' +
            '<input type="text" class="form-control param-filter-range" data-field="' + escapeHtml(field) + '" data-bound="min" placeholder="最小" value="' + escapeHtml(range.min || '') + '">' +
            '<span class="input-group-text">~</span>' +
            '<input type="text" class="form-control param-filter-range" data-field="' + escapeHtml(field) + '" data-bound="max" placeholder="最大" value="' + escapeHtml(range.max || '') + '">' +
            '</div></div>';
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
            if (!newFilters[field]) newFilters[field] = {};
            if (typeof newFilters[field] !== 'object') newFilters[field] = {};
            newFilters[field][bound] = value;
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

// 全局导出
window.sidebarState = sidebarState;
window.initSidebar = initSidebar;
window.selectCategory = selectCategory;
window.selectSubcategory = selectSubcategory;
window.applyParamFilters = applyParamFilters;
window.resetParamFilters = resetParamFilters;
window.toggleSidebar = toggleSidebar;
window.getSidebarFilter = getSidebarFilter;
