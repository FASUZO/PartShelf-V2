/**
 * 库存管理系统 - 工具函数模块
 * 提供通用的工具函数：防抖、节流、HTML转义、Toast提示等
 */

// ==================== 防抖函数 ====================
// 用于优化频繁触发的事件（如输入框搜索）
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== 节流函数 ====================
// 用于优化滚动等高频事件
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== HTML转义 ====================
// 防止XSS攻击
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Toast提示 ====================
// 显示操作反馈消息
function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = toastHtml;
    const toastElement = div.firstElementChild;
    toastContainer.appendChild(toastElement);
    
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// ==================== 日期时间格式化 ====================
// 将ISO格式转换为本地时间显示
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== 类型显示辅助 ====================
function getDisplayType(item) {
    if (item.category_name) {
        return item.subcategory_name
            ? item.category_name + '/' + item.subcategory_name
            : item.category_name;
    }
    return item.part_type || '-';
}

// ==================== Modal 关闭辅助 ====================
// 安全关闭 Bootstrap Modal 并清理残留遮罩
function closeModal(modalId) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    // 强制清理残留遮罩
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
}

// ==================== 通用工具导出 ====================
// 使函数在全局可用
window.debounce = debounce;
window.throttle = throttle;
window.escapeHtml = escapeHtml;
window.showToast = showToast;
window.formatDateTime = formatDateTime;
window.getDisplayType = getDisplayType;
window.closeModal = closeModal;
