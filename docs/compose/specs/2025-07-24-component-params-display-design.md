# 器件参数显示设计文档

## [S1] 问题描述

当前器件详情弹窗不显示器件参数信息。器件参数存储在 `parts` 表的 `other` 字段中，以 JSON 格式保存。需要在弹窗中添加参数显示功能。

## [S2] 解决方案概述

在器件详情弹窗中添加参数卡片，使用表格形式显示器件参数。参数数据从 `other` 字段解析 JSON 格式获取。

## [S3] 详细设计

### 3.1 数据结构

器件参数存储在 `parts` 表的 `other` 字段中，格式为 JSON 字符串：

```json
{
  "阻值": "10K",
  "功率": "0.25W",
  "精度": "1%",
  "封装": "0402"
}
```

### 3.2 模态框结构

在描述卡片后、操作选项卡片前添加参数卡片：

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

### 3.3 JavaScript 逻辑

#### 3.3.1 解析参数数据

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

#### 3.3.2 填充参数表格

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

#### 3.3.3 修改 populateModal 函数

在 `populateModal` 函数中添加参数解析和填充：

```javascript
// 在 populateModal 函数中添加
const params = parsePartParams(data.other);
populateParamsTable(params);
```

### 3.4 样式调整

参数表格使用 Bootstrap 的表格样式，与现有风格保持一致：
- `table-sm`：紧凑表格
- `table-bordered`：带边框
- `table-light`：表头背景色

## [S4] 实现步骤

1. **添加模态框 HTML**：在 inventory.html 中添加参数卡片结构
2. **添加 JavaScript 函数**：添加参数解析和填充函数
3. **修改 populateModal 函数**：集成参数显示功能
4. **测试验证**：确保参数正确显示

## [S5] 注意事项

1. **空值处理**：如果没有参数数据，隐藏参数卡片
2. **JSON 解析错误**：如果 JSON 格式错误，隐藏参数卡片
3. **XSS 防护**：使用 `escapeHtml` 函数防止 XSS 攻击
4. **响应式设计**：使用 `table-responsive` 包装表格

## [S6] 验收标准

1. 参数卡片在有参数数据时正确显示
2. 参数表格正确显示参数名和参数值
3. 没有参数数据时隐藏参数卡片
4. JSON 格式错误时隐藏参数卡片
5. 参数值正确转义，防止 XSS 攻击
