/**
 * 表单级联 - 添加元器件模态框中的类别→子类别→参数模板三级联动
 */

function initCategoryCascade() {
    var catSelect = document.getElementById('addPartCategory');
    var subcatSelect = document.getElementById('addPartSubcategory');
    var templateArea = document.getElementById('paramTemplateFields');
    var hiddenCatId = document.getElementById('addPartCategoryId');
    var hiddenSubcatId = document.getElementById('addPartSubcategoryId');

    if (!catSelect) return;

    // 填充类别下拉
    populateCategorySelect(catSelect);

    // 类别 onChange
    catSelect.addEventListener('change', function() {
        var catId = parseInt(this.value) || null;
        if (hiddenCatId) hiddenCatId.value = catId || '';
        populateSubcategorySelect(subcatSelect, catId);
        if (hiddenSubcatId) hiddenSubcatId.value = '';
        renderParamTemplateFields(templateArea, catId, null);
    });

    // 子类别 onChange
    if (subcatSelect) {
        subcatSelect.addEventListener('change', function() {
            var subcatId = parseInt(this.value) || null;
            if (hiddenSubcatId) hiddenSubcatId.value = subcatId || '';
            var catId = parseInt(catSelect.value) || null;
            renderParamTemplateFields(templateArea, catId, subcatId);
        });
    }
}

function populateCategorySelect(select) {
    if (!select) return;
    // 保留第一个 placeholder option
    var firstOpt = select.options[0];
    select.innerHTML = '';
    if (firstOpt) select.appendChild(firstOpt);

    var categories = getCategories();
    categories.forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });
}

function populateSubcategorySelect(select, catId) {
    if (!select) return;
    var firstOpt = select.options[0];
    select.innerHTML = '';
    if (firstOpt) select.appendChild(firstOpt);

    if (!catId) return;
    var subcats = getSubcategoriesByCategoryId(catId);
    subcats.forEach(function(sub) {
        var opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = sub.name;
        select.appendChild(opt);
    });
}

function renderParamTemplateFields(container, catId, subcatId) {
    if (!container) return;
    container.innerHTML = '';

    // 查找最匹配的模板：优先 subcategory 级，其次 category 级
    var templates = [];
    if (subcatId) {
        templates = getTemplatesForSubcategory(subcatId);
    }
    if (templates.length === 0 && catId) {
        templates = getTemplatesForCategory(catId);
    }
    if (templates.length === 0) return;

    var tpl = templates[0];
    var fields = [];
    try {
        var def = JSON.parse(tpl.definition_json || '{}');
        fields = def.fields || [];
    } catch (e) {
        return;
    }
    if (fields.length === 0) return;

    var html = '<div class="row g-2">';
    fields.forEach(function(field) {
        html += '<div class="col-md-4">' +
            '<label class="form-label">' + escapeHtml(field) + '</label>' +
            '<input type="text" class="form-control param-field" data-param-name="' + escapeHtml(field) + '" placeholder="' + escapeHtml(field) + '">' +
            '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function serializeParamFields() {
    var fields = document.querySelectorAll('#paramTemplateFields .param-field');
    if (fields.length === 0) return null;
    var params = {};
    fields.forEach(function(f) {
        if (f.value.trim()) {
            params[f.dataset.paramName] = f.value.trim();
        }
    });
    return Object.keys(params).length > 0 ? JSON.stringify(params) : null;
}

// 全局导出
window.initCategoryCascade = initCategoryCascade;
window.serializeParamFields = serializeParamFields;
