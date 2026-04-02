# 库存管理模块说明

## 模块结构

```
static/js/inventory/
├── utils.js              # 工具函数模块
├── cache.js              # 数据缓存模块
├── filter.js             # 筛选搜索模块
├── table.js              # 表格和排序模块
├── stock-operations.js   # 库存操作模块（单个零件入库/出库）
├── batch-operations.js   # 批量操作模块（批量入库/出库）
├── history.js            # 历史记录模块
└── main.js               # 主入口模块（整合所有功能）
```

## 模块说明

### 1. utils.js - 工具函数模块
提供通用的工具函数：
- `debounce()` - 防抖函数，优化频繁触发的事件
- `throttle()` - 节流函数，优化高频事件
- `escapeHtml()` - HTML转义，防止XSS攻击
- `showToast()` - 显示操作反馈消息
- `formatDateTime()` - 日期时间格式化
- `savePageSettings()` - 保存分页设置

### 2. cache.js - 数据缓存模块
管理筛选选项数据的缓存：
- `dataCache` - 缓存对象（制造商、封装、类型）
- `isCacheValid()` - 检查缓存是否有效
- `clearDataCache()` - 清除数据缓存
- `loadFilterOptions()` - 加载筛选选项（带缓存）
- `populateSelect()` - 填充下拉选择框

### 3. filter.js - 筛选搜索模块
实现筛选下拉框的输入搜索功能：
- `filterOptionsData` - 存储原始选项数据
- `bindFilterSearch()` - 绑定筛选下拉框搜索功能
- `filterAndShowDropdown()` - 筛选并显示下拉选项
- `clearFilterSelection()` - 清除筛选选择

### 4. table.js - 表格和排序模块
管理零件列表的显示、排序和更新：
- `currentSort` - 全局排序状态
- `currentPartsData` - 当前显示的零件数据
- `bindSortEvents()` - 绑定表头排序事件
- `handleSort()` - 处理排序逻辑
- `updateSortHeaders()` - 更新表头排序样式
- `updateTable()` - 更新表格显示
- `viewDetails()` - 查看零件详情

### 5. stock-operations.js - 库存操作模块
处理单个零件的入库、出库操作：
- `performStockOperation()` - 执行库存操作
- `bindStockInForm()` - 绑定入库表单提交
- `bindStockOutForm()` - 绑定出库表单提交
- `bindStockInModal()` - 绑定入库模态框显示事件
- `bindStockOutModal()` - 绑定出库模态框显示事件

### 6. batch-operations.js - 批量操作模块
处理批量入库和批量出库功能：
- `batchStockOutData` - 批量出库数据
- `batchStockInData` - 批量入库数据
- `bindBatchStockOutEvents()` - 绑定批量出库事件
- `previewBatchStockOut()` - 预览批量出库
- `matchBatchStockOutData()` - 匹配批量出库数据
- `renderBatchStockOutPreview()` - 渲染批量出库预览
- `selectPartForBatchOut()` - 选择批量出库零件
- `adjustStockForBatch()` - 调整批量出库库存
- `confirmBatchStockOut()` - 确认批量出库
- `downloadBatchStockOutTemplate()` - 下载批量出库模板
- 批量入库相关函数类似...
- `parseBatchFile()` - 解析批量文件（CSV）
- `downloadBatchTemplate()` - 下载批量模板

### 7. history.js - 历史记录模块
显示库存操作历史：
- `currentHistoryPage` - 当前历史页码
- `showInventoryHistory()` - 显示库存历史模态框
- `loadInventoryHistory()` - 加载库存历史
- `updateHistoryTable()` - 更新历史表格
- `updateHistoryPagination()` - 更新历史分页

### 8. main.js - 主入口模块
整合所有模块，初始化页面功能：
- `currentSearchFilter` - 全局搜索筛选条件
- `applyAdvancedFilter()` - 应用高级筛选
- `clearAdvancedFilter()` - 清除筛选
- `loadAllParts()` - 加载所有零件
- `bindImportForm()` - 绑定文件导入表单
- `bindAddPartForm()` - 绑定添加零件表单
- DOMContentLoaded事件处理

## 使用方式

在HTML中按顺序引入所有模块：

```html
<!-- 模块化JavaScript文件 -->
<script src="../static/js/inventory/utils.js"></script>
<script src="../static/js/inventory/cache.js"></script>
<script src="../static/js/inventory/filter.js"></script>
<script src="../static/js/inventory/table.js"></script>
<script src="../static/js/inventory/stock-operations.js"></script>
<script src="../static/js/inventory/batch-operations.js"></script>
<script src="../static/js/inventory/history.js"></script>
<script src="../static/js/inventory/main.js"></script>
```

## 优化要点

1. **模块化设计** - 每个模块职责单一，便于维护和测试
2. **代码复用** - 消除重复代码，提取公共函数
3. **清晰注释** - 所有关键函数都有中文注释说明
4. **全局导出** - 通过window对象导出函数，保持向后兼容
5. **性能优化** - 使用DocumentFragment、缓存机制、防抖节流等

## 后端优化

### inventory_api_routes.py
- 添加模块级文档字符串
- 按功能分组（零件管理、文件导入导出、基础数据、数据导出）
- 精简代码逻辑，使用元组赋值
- 为所有API端点添加清晰的中文注释

### inventory_service.py
- 添加模块级文档字符串
- 为所有公共方法添加详细的中文注释
- 优化代码结构，移除冗余注释
- 统一注释风格

## 维护建议

1. 修改功能时，定位到对应的模块文件
2. 添加新功能时，考虑是否可以独立成模块
3. 保持注释与代码同步更新
4. 遵循现有的命名规范和代码风格
