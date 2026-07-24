/**
 * 配置加载器 - 从 /api/config/bundle 加载类别/子类别/参数模板配置
 * 提供全局缓存和辅助查询函数
 */

var configState = {
    raw: null,
    categoriesById: {},
    categoriesByKey: {},
    subcategoriesByCategoryId: {},
    templatesByCategoryId: {},
    templatesBySubcategoryId: {},
    loaded: false
};

async function loadConfigBundle() {
    try {
        var resp = await fetch('/api/config/bundle');
        if (!resp.ok) {
            console.warn('Config bundle load failed:', resp.status);
            return;
        }
        var data = await resp.json();
        configState.raw = data;

        // 构建类别索引
        (data.categories || []).forEach(function(cat) {
            configState.categoriesById[cat.id] = cat;
            configState.categoriesByKey[cat.key] = cat;
        });

        // 按 category_id 分组子类别
        (data.subcategories || []).forEach(function(sub) {
            var cid = sub.category_id;
            if (!configState.subcategoriesByCategoryId[cid]) {
                configState.subcategoriesByCategoryId[cid] = [];
            }
            configState.subcategoriesByCategoryId[cid].push(sub);
        });

        // 按 category_id 和 subcategory_id 分组参数模板
        (data.param_templates || []).forEach(function(tpl) {
            if (tpl.category_id) {
                if (!configState.templatesByCategoryId[tpl.category_id]) {
                    configState.templatesByCategoryId[tpl.category_id] = [];
                }
                configState.templatesByCategoryId[tpl.category_id].push(tpl);
            }
            if (tpl.subcategory_id) {
                if (!configState.templatesBySubcategoryId[tpl.subcategory_id]) {
                    configState.templatesBySubcategoryId[tpl.subcategory_id] = [];
                }
                configState.templatesBySubcategoryId[tpl.subcategory_id].push(tpl);
            }
        });

        configState.loaded = true;
    } catch (e) {
        console.warn('Config bundle load error:', e);
    }
}

function getCategories() {
    if (!configState.raw) return [];
    return configState.raw.categories || [];
}

function getSubcategoriesByCategoryId(catId) {
    return configState.subcategoriesByCategoryId[catId] || [];
}

function getTemplatesForCategory(catId) {
    return configState.templatesByCategoryId[catId] || [];
}

function getTemplatesForSubcategory(subCatId) {
    return configState.templatesBySubcategoryId[subCatId] || [];
}

// 全局导出
window.configState = configState;
window.loadConfigBundle = loadConfigBundle;
window.getCategories = getCategories;
window.getSubcategoriesByCategoryId = getSubcategoriesByCategoryId;
window.getTemplatesForCategory = getTemplatesForCategory;
window.getTemplatesForSubcategory = getTemplatesForSubcategory;
