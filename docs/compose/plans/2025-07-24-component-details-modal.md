# 器件详情弹窗实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将器件详情页面改为弹出式模态框，提升用户体验

**Architecture:** 使用 Bootstrap 5 Modal 组件，在 inventory.html 中添加模态框结构，修改 table.js 中的 viewDetails 函数实现弹窗逻辑

**Tech Stack:** Bootstrap 5, JavaScript, HTML

## Global Constraints

- 保持与现有代码风格一致
- 复用现有 API 接口
- 保持现有功能完整性
- 无需新增依赖

---

### Task 1: 添加模态框 HTML 结构

**Covers:** S3.1

**Files:**
- Modify: `templates/inventory.html`

**Interfaces:**
- Produces: 模态框 HTML 结构，供后续 JavaScript 使用

- [ ] **Step 1: 在 inventory.html 中添加模态框**

在 `<!-- 库存历史记录模态框 -->` 之前添加以下代码：

```html
<!-- 器件详情模态框 -->
<div class="modal fade" id="componentDetailModal" tabindex="-1" aria-labelledby="componentDetailModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title" id="detailPartName">器件名称</h5>
          <small class="text-muted" id="detailPartManufacturer">制造商</small>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
      </div>
      <div class="modal-body">
        <!-- 基本信息卡片 -->
        <div class="card mb-3">
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <strong>零件ID:</strong> <span id="detailPartId"></span><br>
                <strong>类型:</strong> <span id="detailPartType"></span><br>
                <strong>封装:</strong> <span id="detailPartPackage"></span><br>
                <strong>LC编号:</strong> <span id="detailPartLcNumber">-</span>
              </div>
              <div class="col-md-6">
                <strong>数量:</strong> <span id="detailPartQuantity"></span><br>
                <strong>有库存:</strong> <span id="detailInStockStatus">是</span><br>
                <strong>单价:</strong> <span id="detailPartPrice">-</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 描述卡片 -->
        <div class="card mb-3">
          <div class="card-header bg-light"><strong>描述</strong></div>
          <div class="card-body">
            <p id="detailPartDescription" class="mb-0 text-muted">暂无描述</p>
          </div>
        </div>
        
        <!-- 操作选项卡片 -->
        <div class="card">
          <div class="card-header bg-light"><strong>零件选项</strong></div>
          <div class="card-body">
            <!-- 更新数量 -->
            <div class="mb-3">
              <h6 class="fw-bold">更新数量</h6>
              <div class="input-group input-group-sm mb-2">
                <select class="form-select" id="detailOperationMode" style="max-width: 120px;">
                  <option value="set">直接设置</option>
                  <option value="add">增加</option>
                  <option value="subtract">减少</option>
                </select>
                <input type="number" id="detailUpdateQuantity" class="form-control" placeholder="输入数量">
                <button class="btn btn-primary" id="detailUpdateQuantityBtn">更新</button>
              </div>
              <small class="text-muted" id="detailOperationHint">将数量直接设置为输入值</small>
            </div>
            
            <!-- 其他操作按钮 -->
            <hr>
            <div class="d-flex gap-2">
              <button class="btn btn-info btn-sm" id="detailViewHistoryBtn">
                <i class="fas fa-history"></i> 查看使用历史
              </button>
              <button class="btn btn-success btn-sm" id="detailExportDetailsBtn">
                <i class="fas fa-download"></i> 导出详情
              </button>
              <button class="btn btn-danger btn-sm" id="detailDeletePartBtn">
                <i class="fas fa-trash"></i> 删除零件
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 验证模态框结构**

在浏览器中打开 inventory 页面，检查模态框 HTML 是否正确添加（此时还无法打开）。

- [ ] **Step 3: 提交更改**

```bash
git add templates/inventory.html
git commit -m "feat: 添加器件详情模态框 HTML 结构"
```

---

### Task 2: 修改 viewDetails 函数

**Covers:** S3.2.1

**Files:**
- Modify: `static/js/inventory/table.js`

**Interfaces:**
- Consumes: 模态框 HTML 结构（Task 1）
- Produces: viewDetails 函数，打开模态框而非跳转页面

- [ ] **Step 1: 修改 viewDetails 函数**

将 `static/js/inventory/table.js` 中的 `viewDetails` 函数替换为：

```javascript
// 查看器件详情（改为弹窗）
function viewDetails(id) {
  // 显示模态框
  const modal = new bootstrap.Modal(document.getElementById('componentDetailModal'));
  modal.show();
  
  // 加载器件数据
  loadComponentDetails(id);
}

// 加载器件详情数据
async function loadComponentDetails(partId) {
  try {
    const response = await fetch(`/api/inventory/get_part_by_id?part_id=${partId}`);
    if (!response.ok) throw new Error('加载失败');
    
    const data = await response.json();
    populateModal(data);
  } catch (error) {
    console.error('加载器件详情失败:', error);
    alert('加载器件详情失败: ' + error.message);
  }
}

// 填充模态框数据
function populateModal(data) {
  document.getElementById('detailPartId').textContent = data.id;
  document.getElementById('detailPartName').textContent = data.name || '未知';
  document.getElementById('detailPartManufacturer').textContent = data.manufacturer || '未知';
  document.getElementById('detailPartType').textContent = data.part_type || '未知';
  document.getElementById('detailPartPackage').textContent = data.package || '未知';
  document.getElementById('detailPartQuantity').textContent = data.quantity ?? '0';
  document.getElementById('detailPartDescription').textContent = data.description || '暂无描述';
  document.getElementById('detailPartLcNumber').textContent = data.lc_number || '-';
  
  // 单价
  document.getElementById('detailPartPrice').textContent = data.price ? `¥${data.price}` : '-';
  
  // 库存状态
  const inStockSpan = document.getElementById('detailInStockStatus');
  if (data.quantity > 0) {
    inStockSpan.textContent = '是';
    inStockSpan.className = 'text-success';
  } else {
    inStockSpan.textContent = '否';
    inStockSpan.className = 'text-danger';
  }
  
  // 保存当前零件ID用于后续操作
  document.getElementById('componentDetailModal').dataset.partId = data.id;
}
```

- [ ] **Step 2: 更新导出函数**

在 `static/js/inventory/table.js` 的导出部分添加新函数：

```javascript
window.loadComponentDetails = loadComponentDetails;
window.populateModal = populateModal;
```

- [ ] **Step 3: 测试弹窗功能**

在浏览器中点击"查看详情"按钮，验证：
1. 弹窗是否正确打开
2. 器件信息是否正确显示
3. 关闭弹窗是否正常

- [ ] **Step 4: 提交更改**

```bash
git add static/js/inventory/table.js
git commit -m "feat: 修改 viewDetails 函数实现弹窗功能"
```

---

### Task 3: 实现更新数量功能

**Covers:** S3.2.2

**Files:**
- Modify: `static/js/inventory/table.js`

**Interfaces:**
- Consumes: 模态框 HTML 结构（Task 1），loadComponentDetails 函数（Task 2）
- Produces: updateDetailQuantity 函数

- [ ] **Step 1: 添加更新数量函数**

在 `static/js/inventory/table.js` 中添加以下函数：

```javascript
// 更新数量（模态框内）
async function updateDetailQuantity() {
  const modal = document.getElementById('componentDetailModal');
  const partId = modal.dataset.partId;
  const newQuantity = document.getElementById('detailUpdateQuantity').value.trim();
  const operationMode = document.getElementById('detailOperationMode').value;
  
  if (!newQuantity || isNaN(newQuantity)) {
    alert('请输入有效数量');
    return;
  }
  
  // 计算数量变化
  let quantityChange;
  if (operationMode === 'add') {
    quantityChange = parseInt(newQuantity);
  } else if (operationMode === 'subtract') {
    quantityChange = -parseInt(newQuantity);
  } else {
    const currentQty = parseInt(document.getElementById('detailPartQuantity').textContent) || 0;
    quantityChange = parseInt(newQuantity) - currentQty;
  }
  
  try {
    const formData = new FormData();
    formData.append('part_id', partId);
    formData.append('quantity_change', quantityChange);
    formData.append('remark', '详情页更新');
    
    const response = await fetch('/api/inventory/update_quantity', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || '更新失败');
    }
    
    alert('数量更新成功！');
    // 重新加载器件详情
    loadComponentDetails(partId);
    // 刷新主表格
    applyAdvancedFilter();
  } catch (error) {
    console.error('更新数量失败:', error);
    alert('更新数量时出错: ' + error.message);
  }
}

// 更新操作模式提示（模态框内）
function updateDetailOperationHint() {
  const mode = document.getElementById('detailOperationMode').value;
  const hint = document.getElementById('detailOperationHint');
  
  switch(mode) {
    case 'add':
      hint.textContent = '在当前数量基础上增加输入的数量';
      break;
    case 'subtract':
      hint.textContent = '在当前数量基础上减少输入的数量';
      break;
    case 'set':
    default:
      hint.textContent = '将数量直接设置为输入值';
      break;
  }
}
```

- [ ] **Step 2: 更新导出函数**

在 `static/js/inventory/table.js` 的导出部分添加新函数：

```javascript
window.updateDetailQuantity = updateDetailQuantity;
window.updateDetailOperationHint = updateDetailOperationHint;
```

- [ ] **Step 3: 测试更新数量功能**

在浏览器中：
1. 打开器件详情弹窗
2. 测试"直接设置"模式
3. 测试"增加"模式
4. 测试"减少"模式
5. 验证数量是否正确更新
6. 验证主表格是否刷新

- [ ] **Step 4: 提交更改**

```bash
git add static/js/inventory/table.js
git commit -m "feat: 实现弹窗内更新数量功能"
```

---

### Task 4: 实现其他操作功能

**Covers:** S3.2.3

**Files:**
- Modify: `static/js/inventory/table.js`

**Interfaces:**
- Consumes: 模态框 HTML 结构（Task 1），现有 history.js 和其他功能
- Produces: viewDetailHistory, exportDetailDetails, deleteDetailPart 函数

- [ ] **Step 1: 添加其他操作函数**

在 `static/js/inventory/table.js` 中添加以下函数：

```javascript
// 查看使用历史（模态框内）
function viewDetailHistory() {
  const modal = document.getElementById('componentDetailModal');
  const partId = modal.dataset.partId;
  // 调用现有的 viewHistory 函数
  viewHistory(partId);
}

// 导出详情（模态框内）
function exportDetailDetails() {
  const modal = document.getElementById('componentDetailModal');
  const partId = modal.dataset.partId;
  
  // 获取当前器件数据
  const partData = {
    id: document.getElementById('detailPartId').textContent,
    name: document.getElementById('detailPartName').textContent,
    manufacturer: document.getElementById('detailPartManufacturer').textContent,
    type: document.getElementById('detailPartType').textContent,
    package: document.getElementById('detailPartPackage').textContent,
    quantity: document.getElementById('detailPartQuantity').textContent,
    price: document.getElementById('detailPartPrice').textContent,
    lc_number: document.getElementById('detailPartLcNumber').textContent,
    description: document.getElementById('detailPartDescription').textContent
  };
  
  const csvContent = [
    ['字段', '值'],
    ['ID', partData.id],
    ['名称', partData.name],
    ['制造商', partData.manufacturer],
    ['类型', partData.type],
    ['封装', partData.package],
    ['数量', partData.quantity],
    ['单价', partData.price],
    ['LC编号', partData.lc_number],
    ['描述', partData.description]
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `零件详情_${partData.name}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 删除零件（模态框内）
async function deleteDetailPart() {
  const modal = document.getElementById('componentDetailModal');
  const partId = modal.dataset.partId;
  
  if (!confirm('您确定要删除这个零件吗?')) return;
  
  try {
    const response = await fetch(`/api/inventory/delete_part?part_id=${partId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('删除失败');
    
    alert('删除成功！');
    // 关闭模态框
    bootstrap.Modal.getInstance(modal).hide();
    // 刷新主表格
    applyAdvancedFilter();
  } catch (error) {
    console.error('删除零件失败:', error);
    alert('删除零件时出错');
  }
}
```

- [ ] **Step 2: 更新导出函数**

在 `static/js/inventory/table.js` 的导出部分添加新函数：

```javascript
window.viewDetailHistory = viewDetailHistory;
window.exportDetailDetails = exportDetailDetails;
window.deleteDetailPart = deleteDetailPart;
```

- [ ] **Step 3: 测试其他操作功能**

在浏览器中：
1. 测试"查看使用历史"按钮
2. 测试"导出详情"按钮
3. 测试"删除零件"按钮（注意：删除后无法恢复）

- [ ] **Step 4: 提交更改**

```bash
git add static/js/inventory/table.js
git commit -m "feat: 实现弹窗内其他操作功能"
```

---

### Task 5: 绑定事件和最终测试

**Covers:** S3.3, S6

**Files:**
- Modify: `static/js/inventory/main.js`

**Interfaces:**
- Consumes: 所有前面任务实现的函数
- Produces: 完整的事件绑定和功能集成

- [ ] **Step 1: 在 main.js 中添加事件绑定**

在 `static/js/inventory/main.js` 中添加以下代码（在文件末尾）：

```javascript
// 绑定器件详情模态框事件
function bindComponentDetailEvents() {
  // 更新数量按钮
  const updateBtn = document.getElementById('detailUpdateQuantityBtn');
  if (updateBtn) {
    updateBtn.addEventListener('click', updateDetailQuantity);
  }
  
  // 操作模式变化
  const operationMode = document.getElementById('detailOperationMode');
  if (operationMode) {
    operationMode.addEventListener('change', updateDetailOperationHint);
  }
  
  // 查看历史按钮
  const historyBtn = document.getElementById('detailViewHistoryBtn');
  if (historyBtn) {
    historyBtn.addEventListener('click', viewDetailHistory);
  }
  
  // 导出详情按钮
  const exportBtn = document.getElementById('detailExportDetailsBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportDetailDetails);
  }
  
  // 删除零件按钮
  const deleteBtn = document.getElementById('detailDeletePartBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteDetailPart);
  }
}

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', function() {
  bindComponentDetailEvents();
});
```

- [ ] **Step 2: 完整功能测试**

在浏览器中进行完整测试：
1. 打开 inventory 页面
2. 点击任意器件的"查看详情"按钮
3. 验证弹窗是否正确显示
4. 测试更新数量功能（三种模式）
5. 测试查看使用历史功能
6. 测试导出详情功能
7. 测试删除零件功能
8. 验证主表格是否正确刷新
9. 关闭弹窗，验证是否正常

- [ ] **Step 3: 提交最终更改**

```bash
git add static/js/inventory/main.js
git commit -m "feat: 完成器件详情弹窗功能集成"
```

---

## 自检清单

1. **规范覆盖**：所有规范章节（S3.1, S3.2.1, S3.2.2, S3.2.3, S3.3, S6）都已覆盖
2. **无占位符**：所有步骤都包含完整的代码实现
3. **类型一致性**：函数名和参数在整个计划中保持一致
4. **文件路径准确**：所有文件路径都准确无误
5. **测试步骤完整**：每个任务都包含详细的测试步骤

## 执行交接

计划已保存到 `docs/compose/plans/2025-07-24-component-details-modal.md`

现在需要确定执行方式：
