/**
 * 库存管理系统 - 库存操作模块
 * 处理单个零件的入库、出库操作
 */

// 执行库存操作（入库/出库）
function performStockOperation(partId, quantity, type, remark) {
    const formData = new FormData();
    formData.append('part_id', partId);
    formData.append('quantity_change', quantity);
    formData.append('remark', remark);
    
    fetch('/api/inventory/update_quantity', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.detail || '操作失败'); });
        }
        return response.json();
    })
    .then(data => {
        // 关闭模态框
        const modalId = type === 'in' ? 'stockInModal' : 'stockOutModal';
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) modal.hide();
        
        // 显示成功消息
        const actionText = type === 'in' ? '入库' : '出库';
        showToast(`${actionText}成功！当前库存: ${data.new_quantity}`, 'success');
        
        // 刷新列表
        applyAdvancedFilter();
        
        // 清除缓存，确保数据新鲜
        clearDataCache();
    })
    .catch(error => {
        console.error('库存操作失败:', error);
        showToast('操作失败: ' + error.message, 'danger');
    });
}

// 绑定入库表单提交
function bindStockInForm() {
    const stockInForm = document.getElementById('stockInForm');
    if (!stockInForm) return;
    
    stockInForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const partId = document.getElementById('stockInPartId').value;
        const quantity = parseInt(document.getElementById('stockInQuantity').value);
        
        if (!partId || quantity <= 0) {
            showToast('请输入有效的数量', 'danger');
            return;
        }
        
        performStockOperation(partId, quantity, 'in', formData.get('remark') || '');
    });
}

// 绑定出库表单提交
function bindStockOutForm() {
    const stockOutForm = document.getElementById('stockOutForm');
    if (!stockOutForm) return;
    
    stockOutForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const partId = document.getElementById('stockOutPartId').value;
        const quantity = parseInt(document.getElementById('stockOutQuantity').value);
        const currentQty = parseInt(document.getElementById('stockOutCurrentQty').textContent);
        
        if (!partId || quantity <= 0) {
            showToast('请输入有效的数量', 'danger');
            return;
        }
        
        if (quantity > currentQty) {
            showToast('出库数量不能大于当前库存', 'danger');
            return;
        }
        
        performStockOperation(partId, -quantity, 'out', formData.get('remark') || '');
    });
}

// 绑定入库模态框显示事件
function bindStockInModal() {
    const stockInModal = document.getElementById('stockInModal');
    if (!stockInModal) return;
    
    stockInModal.addEventListener('show.bs.modal', function(event) {
        const button = event.relatedTarget;
        const partId = button.getAttribute('data-part-id');
        const partData = currentPartsData.find(p => p.id == partId);
        
        document.getElementById('stockInPartId').value = partId;
        document.getElementById('stockInQuantity').value = '';
        document.getElementById('stockInRemark').value = '';
        
        if (partData) {
            document.getElementById('stockInPartInfo').innerHTML = `
                <strong>${partData.name}</strong> - ${partData.manufacturer}<br>
                <small class="text-muted">当前库存: ${partData.quantity}</small>
            `;
        }
    });
}

// 绑定出库模态框显示事件
function bindStockOutModal() {
    const stockOutModal = document.getElementById('stockOutModal');
    if (!stockOutModal) return;
    
    stockOutModal.addEventListener('show.bs.modal', function(event) {
        const button = event.relatedTarget;
        const partId = button.getAttribute('data-part-id');
        const partData = currentPartsData.find(p => p.id == partId);
        
        document.getElementById('stockOutPartId').value = partId;
        document.getElementById('stockOutQuantity').value = '';
        document.getElementById('stockOutRemark').value = '';
        
        if (partData) {
            document.getElementById('stockOutPartInfo').innerHTML = `
                <strong>${partData.name}</strong> - ${partData.manufacturer}
            `;
            document.getElementById('stockOutCurrentQty').textContent = partData.quantity;
        }
    });
}

// 导出到全局
window.performStockOperation = performStockOperation;
window.bindStockInForm = bindStockInForm;
window.bindStockOutForm = bindStockOutForm;
window.bindStockInModal = bindStockInModal;
window.bindStockOutModal = bindStockOutModal;
