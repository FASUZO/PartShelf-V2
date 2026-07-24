# 器件详情弹窗设计文档

## [S1] 问题描述

当前点击"查看详情"按钮会跳转到新页面 (`/component_details?id={id}`)，用户体验不够流畅。需要改为弹出式模态框，在当前页面直接显示器件详情。

## [S2] 解决方案概述

使用 Bootstrap 5 Modal 组件实现器件详情弹窗，复用现有 API 接口，保持与项目风格一致。

## [S3] 详细设计

### 3.1 模态框结构

```html
<!-- 器件详情模态框 -->
<div class="modal fade" id="componentDetailModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <!-- 头部：器件名称和制造商 -->
      <div class="modal-header">
        <div>
          <h5 class="modal-title" id="detailPartName">器件名称</h5>
          <small class="text-muted" id="detailPartManufacturer">制造商</small>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      
      <!-- 内容区域 -->
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

### 3.2 JavaScript 逻辑

#### 3.2.1 打开模态框函数

```javascript
// 查看器件详情（替换原有跳转逻辑）
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

#### 3.2.2 更新数量功能

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
```

#### 3.2.3 其他操作函数

```javascript
// 查看使用历史（复用现有逻辑）
function viewDetailHistory() {
  const modal = document.getElementById('componentDetailModal');
  const partId = modal.dataset.partId;
  // 调用现有的 viewHistory 函数，传入 partId
  viewHistory(partId);
}

// 导出详情（复用现有逻辑）
function exportDetailDetails() {
  const modal = document.getElementById('componentDetailModal');
  const partId = modal.dataset.partId;
  // 调用现有的 exportDetails 函数
  exportDetails(partId);
}

// 删除零件（复用现有逻辑）
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

### 3.3 事件绑定

```javascript
// 绑定模态框内按钮事件
document.getElementById('detailUpdateQuantityBtn').addEventListener('click', updateDetailQuantity);
document.getElementById('detailOperationMode').addEventListener('change', updateOperationHint);
document.getElementById('detailViewHistoryBtn').addEventListener('click', viewDetailHistory);
document.getElementById('detailExportDetailsBtn').addEventListener('click', exportDetailDetails);
document.getElementById('detailDeletePartBtn').addEventListener('click', deleteDetailPart);

// 更新操作模式提示
function updateOperationHint() {
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

## [S4] 实现步骤

1. **添加模态框HTML**：在 `inventory.html` 中添加器件详情模态框结构
2. **修改 viewDetails 函数**：将跳转逻辑改为打开模态框
3. **实现数据加载**：添加 `loadComponentDetails` 和 `populateModal` 函数
4. **实现操作功能**：更新数量、查看历史、导出、删除等功能
5. **绑定事件**：绑定模态框内按钮事件
6. **测试验证**：确保所有功能正常工作

## [S5] 注意事项

1. **复用现有代码**：尽量复用 `component_details.html` 中的逻辑
2. **保持一致性**：与现有模态框风格保持一致
3. **错误处理**：添加适当的错误处理和用户提示
4. **性能优化**：避免重复加载数据

## [S6] 验收标准

1. 点击"查看详情"按钮弹出模态框，而非跳转页面
2. 模态框正确显示器件所有信息
3. 更新数量功能正常工作
4. 查看历史、导出详情、删除零件功能正常
5. 操作后主表格自动刷新
