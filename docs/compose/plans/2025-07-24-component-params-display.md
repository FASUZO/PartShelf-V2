# 器件参数显示实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在器件详情弹窗中添加参数显示功能，使用表格形式显示器件参数

**Architecture:** 在 inventory.html 中添加参数卡片结构，在 table.js 中添加参数解析和填充函数，修改 populateModal 函数集成参数显示

**Tech Stack:** Bootstrap 5, JavaScript, HTML

## Global Constraints

- 保持与现有代码风格一致
- 复用现有数据结构（other 字段）
- 保持现有功能完整性
- 无需新增依赖

---

### Task 1: 添加参数卡片 HTML 结构

**Covers:** S3.2

**Files:**
- Modify: `templates/inventory.html`

**Interfaces:**
- Produces: 参数卡片 HTML 结构，供后续 JavaScript 使用

- [ ] **Step 1: 在 inventory.html 中添加参数卡片**

在描述卡片后、操作选项卡片前添加以下代码：

```html
<!-- 参数卡片 -->
<div class="card mb-3" id="detailParamsCard" style="display: none;">
  <div class="card-header bg-light"><strong>器件参数</strong></div>
  <div class="card-body">
    <div class="table-responsive">
      <table class="table table-sm table-bordered mb-0">
        <thead class="table-light">
          <tr>
            <th>参数名</th>
            <th>参数值</th>
          </tr>
        </thead>
        <tbody id="detailParamsBody">
          <!-- 由 JavaScript 动态填充 -->
        </tbody>
      </table>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 验证参数卡片结构**

在浏览器中打开 inventory 页面，检查参数卡片 HTML 是否正确添加（此时还无法显示）。

- [ ] **Step 3: 提交更改**

```bash
git add templates/inventory.html
git commit -m "feat: 添加器件参数卡片 HTML 结构"
```

---

### Task 2: 添加参数解析和填充函数

**Covers:** S3.3

**Files:**
- Modify: `static/js/inventory/table.js`

**Interfaces:**
- Consumes: 参数卡片 HTML 结构（Task 1）
- Produces: parsePartParams 和 populateParamsTable 函数

- [ ] **Step 1: 添加参数解析函数**

在 `static/js/inventory/table.js` 中添加以下函数：

```javascript
// 解析器件参数
function parsePartParams(otherJson) {
  if (!otherJson) return null;
  try {
    const params = JSON.parse(otherJson);
    if (typeof params === 'object' && params !== null && !Array.isArray(params)) {
      return params;
    }
    return null;
  } catch (e) {
    console.error('解析参数失败:', e);
    return null;
  }
}
```

- [ ] **Step 2: 添加参数表格填充函数**

在 `static/js/inventory/table.js` 中添加以下函数：

```javascript
// 填充参数表格
function populateParamsTable(params) {
  const tbody = document.getElementById('detailParamsBody');
  const card = document.getElementById('detailParamsCard');
  
  if (!params || Object.keys(params).length === 0) {
    card.style.display = 'none';
    return;
  }
  
  card.style.display = 'block';
  tbody.innerHTML = '';
  
  for (const [key, value] of Object.entries(params)) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(key)}</strong></td>
      <td>${escapeHtml(String(value))}</td>
    `;
    tbody.appendChild(row);
  }
}
```

- [ ] **Step 3: 更新导出函数**

在 `static/js/inventory/table.js` 的导出部分添加新函数：

```javascript
window.parsePartParams = parsePartParams;
window.populateParamsTable = populateParamsTable;
```

- [ ] **Step 4: 提交更改**

```bash
git add static/js/inventory/table.js
git commit -m "feat: 添加参数解析和填充函数"
```

---

### Task 3: 修改 populateModal 函数

**Covers:** S3.3

**Files:**
- Modify: `static/js/inventory/table.js`

**Interfaces:**
- Consumes: parsePartParams 和 populateParamsTable 函数（Task 2）
- Produces: 集成参数显示的 populateModal 函数

- [ ] **Step 1: 修改 populateModal 函数**

在 `static/js/inventory/table.js` 中的 `populateModal` 函数末尾添加以下代码：

```javascript
// 解析并显示器件参数
const params = parsePartParams(data.other);
populateParamsTable(params);
```

- [ ] **Step 2: 测试参数显示功能**

在浏览器中：
1. 打开器件详情弹窗
2. 验证参数卡片是否正确显示
3. 验证参数表格是否正确填充
4. 测试没有参数数据的器件，验证参数卡片是否隐藏

- [ ] **Step 3: 提交更改**

```bash
git add static/js/inventory/table.js
git commit -m "feat: 在 populateModal 中集成参数显示功能"
```

---

### Task 4: 最终测试和验证

**Covers:** S6

**Files:**
- Modify: `static/js/inventory/table.js`

**Interfaces:**
- Consumes: 所有前面任务实现的函数
- Produces: 完整的参数显示功能

- [ ] **Step 1: 完整功能测试**

在浏览器中进行完整测试：
1. 打开 inventory 页面
2. 点击任意器件的"查看详情"按钮
3. 验证参数卡片是否正确显示（如果有参数数据）
4. 验证参数表格是否正确填充参数名和参数值
5. 测试没有参数数据的器件，验证参数卡片是否隐藏
6. 测试 JSON 格式错误的器件，验证参数卡片是否隐藏
7. 验证参数值是否正确转义，防止 XSS 攻击

- [ ] **Step 2: 提交最终更改**

```bash
git add static/js/inventory/table.js
git commit -m "feat: 完成器件参数显示功能"
```

---

## 自检清单

1. **规范覆盖**：所有规范章节（S3.2, S3.3, S6）都已覆盖
2. **无占位符**：所有步骤都包含完整的代码实现
3. **类型一致性**：函数名和参数在整个计划中保持一致
4. **文件路径准确**：所有文件路径都准确无误
5. **测试步骤完整**：每个任务都包含详细的测试步骤

## 执行交接

计划已保存到 `docs/compose/plans/2025-07-24-component-params-display.md`

现在需要确定执行方式：
