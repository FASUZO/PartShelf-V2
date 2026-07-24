# PartShelf-V2 代码库与 Agent.md 一致性审查

> 目标：对齐 `D:\\Repository\\PartShelf-V2\\Agent.md` 与仓库现状，区分“现状实现”与“历史/规划/参考”。

---

## 一、分类与参数体系（参考/历史设计）

### 1.1 34 类行业标准分类

参照《研发电子物料管理规范》构建完整的元器件分类体系，覆盖电阻、电容、电感、变压器、磁珠、三极管、FET/IGBT、二极管、LED、集成电路、电源芯片、存储芯片、传感器芯片、处理器、晶振、开关、保险丝、滤波器、模块、连接器、天线、放大器、扬声器、麦克风、摄像头、连接线、电芯、换能器、内存卡、液晶、光电器件、光学元件等。

| 分类 key | 中文名 | 位号前缀 |
|----------|--------|----------|
| resistor | 电阻 | R |
| capacitor | 电容 | C |
| inductor | 电感 | L |
| transformer | 变压器 | T |
| bead | 磁珠 | B |
| transistor | 三极管 | Q |
| mosfet | FET/IGBT | Q |
| diode | 二极管 | D |
| led | LED | D |
| ic | 集成电路 | U |
| powerChip | 电源芯片 | U |
| memoryChip | 存储芯片 | U |
| sensorChip | 传感器芯片 | U |
| processor | 处理器 | U |
| crystal | 晶振 | X |
| switch | 开关 | S |
| fuse | 保险丝 | F |
| filter | 滤波器 | Z |
| module | 模块 | M |
| connector | 连接器 | J |
| amplifier | 放大器 | U |
| speaker | 扬声器 | K |
| microphone | 麦克风 | I |
| camera | 摄像头 | A |
| cable | 连接线 | W |
| battery | 电芯 | E |
| other | 其他 | O |


**可借鉴点**：分类体系不是随意设计，而是参照实际行业规范文档，确保与工程实践一致。



### 1.2 位号前缀自动分配

每个分类绑定标准位号前缀（R=电阻、C=电容、U=IC、D=二极管、Q=三极管等），存放位置自动格式化为 `R001`、`C003`、`U015`（前缀+3位编号），支持自动编号去重。

**可借鉴点**：位号前缀是 PCB 设计和 BOM 管理的通用规范，将物理世界的编号规则映射到库存管理系统中。

### 1.3 分化参数模板

不同品类有不同的参数维度：
- **Group A（参数驱动）**：电阻（阻值+功率）、电容（容值+耐压）、电感（电感量+电流）、晶振（频率+负载电容）
- **Group B（型号驱动）**：IC（内核/Flash/SRAM/主频/IO数）、二极管（反向电压+整流电流+正向压降+恢复时间）
- **Group C（描述驱动）**：开关、LED、其他

子类别可关联独立参数模板，如 IC/单片机显示内核框架、Flash、SRAM、主频、IO数，而 IC/LDO 则显示输入电压、输出电压、输出电流。

**可借鉴点**：按品类分组设计参数表单，避免一刀切的通用字段，提升数据录入的专业性和筛选精度。


---

## 二、搜索与匹配（现状快照）

### 2.1 多维度实时搜索

- 库存页支持搜索/筛选/排序/分页，前端通过 `/api/inventory/parts_list` 获取数据。
- 批量入库/出库支持 CSV 上传、预览与执行；但“多维实时搜索/单位换算/9级置信度/品类感知匹配”的详细能力需与当前代码核实后保留。
- 单位等价搜索：`1k` = `1000`、`1uf` = `1000000pf`，自动标准化后对比



### 2.2 BOM/批量匹配能力现状

当前实现侧重“CSV/Excel 导入 + 型号/数量匹配”，并提供批量入库/出库预览；文档中的 9 级置信度与 LCSC 专用匹配流程需与代码核实后再保留。

| 优先级 | 匹配规则 | 置信度 |
|---|---|---|
| 1 | LCSC 料号精确匹配 | 1.0 |
| 2 | 厂商型号精确匹配 | 0.95 |
| 3 | 名称+型号精确匹配 | 0.95 |
| 4 | 类别+主参数精确匹配 | 0.88 |
| 5 | 型号模糊匹配 | 0.85 |
| 6 | 名称+型号组合匹配 | 0.75 |
| 7 | 规格值+类别匹配 | 0.75 |
| 8 | 语义相似度匹配 | 0.55 |
| 9 | 类别兜底匹配 | 0.35 |

**可借鉴点**：分级匹配策略，高优先级精确匹配快速命中，低优先级模糊匹配兜底，每级有明确的置信度评分，结果可排序。

### 2.3 品类感知匹配策略（建议核实再保留）

不同品类使用不同的匹配逻辑：
- **参数驱动型**（电阻/电容/电感）：提取 p1 主参数 + 单位换算精确对比，按封装过滤排序
- **型号驱动型**（IC/二极管/三极管）：精确型号名称匹配，封装排序辅助
- **描述驱动型**（开关/LED/其他）：描述性关键词匹配 + 品类兜底

**可借鉴点**：匹配策略按数据特征分组，而非统一处理，显著提升匹配准确率。

---

## 三、数据管理架构（现状 + 参考混合）

### 3.1 存储架构现状

当前为 FastAPI + SQLite，未发现 `data/components.json` 与 localStorage 双写；localStorage 仅用于 `pageSize`。建议删除 Node.js/双端同步描述，或改为“历史/规划”。

**可借鉴点**：渐进增强的存储策略，纯前端可用，有后端时自动同步，无需用户感知切换。

### 3.2 Excel 导入导出

- 导出：标准格式 Excel，包含所有关键字段
- 导入：自动检测 .xlsx/.xls 格式，按列头智能匹配（支持中英文列名）
- BOM 示例模板下载：提供通用导入模板（`.csv`），是否“LCSC 标准模板”需与代码核实。

**可借鉴点**：JSON 格式适合程序处理，Excel 格式适合人工批量编辑，两种格式并存满足不同场景。

### 3.3 操作撤回（当前未实现）

当前代码未发现 Ctrl+Z 与历史栈实现；如需保留该设计，应明确标注为“规划/参考”。

**可借鉴点**：将 Undo 机制引入库存管理场景，降低误操作成本。

### 3.4 图片缓存（当前未实现）

当前代码未发现 IndexedDB 图片缓存实现；以下为文档描述，需核实后再视为现状。
- 首次从 URL 保存后自动缓存到本地
- 后续可选择重新从 URL 获取（云端图片被删除时仍有本地缓存）
- 缓存管理按钮同步状态

**可借鉴点**：解决云端图片链接失效的问题，IndexedDB 作为大对象存储比 localStorage 更合适。

---

## 四、UI/UX（现状 + 参考混合）

### 4.1 UI 样式现状（建议改为“Bootstrap + custom.css”）

实际项目以 Bootstrap 5 + `static/css/custom.css` 为主，未发现 Tailwind 实现；如有深色变量体系，应写在 `custom.css` 中并在此补充文件路径。

**可借鉴点**：Bootstrap + 自定义 CSS 的混合方案同样可以兼顾全局主题控制与局部调整。

### 4.2-4.3 未实现的 UI 功能示例（建议删除或标注为“规划/参考”)

图片放大镜、侧边栏拖拽排序：文档中有描述，但当前代码库未找到实现。
---

#### 通信与集成（参考/历史）

##### 6.1 MQTT（当前未实现）

当前代码未发现 MQTT 实现；该能力如仍计划，应标注为“规划/参考”。

**可借鉴点**：将元器件管理系统与 IoT 生态打通，实现硬件实验室的数据互联。

---

#### 键盘快捷键（现状）

| 快捷键 | 功能 |
|---|---|
| `Ctrl+F` | 聚焦搜索框 |
| `Ctrl+A` | 打开添加元器件 |
| `Ctrl+B` | 打开 BOM 匹配 |
| `Ctrl+Z` | 撤回操作 |
| `Enter` | 快速保存 |
| `Escape` | 关闭弹窗 |

**可借鉴点**：为高频操作提供键盘快捷键，提升专业用户效率。


-----------

#### 运行与部署（现状）

- 运行命令（本地开发推荐）：
  1) `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`（本地开发）
  2) `python -m app.main`（备用）
- 仅本机开发时建议绑定 `127.0.0.1`，需要局域网/容器访问时再改为 `0.0.0.0`。
- 数据库路径与迁移：当前默认使用 SQLite（如 `db/partshelf.db`），结构变更时需兼容旧数据或提供迁移/重建说明。
- 启动时会自动执行 `Base.metadata.create_all(bind=engine)`，适合快速起步；如果后续引入 Alembic/迁移，请在本节补充迁移命令。

#### 关键约束

###### 文件编码
- **所有文件必须使用 UTF-8 无 BOM 编码**
- **禁止使用 PowerShell `Set-Content` 写入含中文的文件** — 会破坏中文字符，必须使用 `fs.writeFileSync()` 或 `[System.IO.File]::WriteAllText()`
- **注意 CRLF 换行符** — 部分文本文件可能使用 CRLF，字符串匹配前建议先 normalize。


#### 项目实际技术栈（现状）

- **后端**: Python + FastAPI + Uvicorn
- **ORM/DB**: SQLAlchemy（默认 SQLite，可按 DATABASE_URL 切换）
- **模板/前端**: Jinja2 + Bootstrap 5 + 原生 JS（模块化：static/js/inventory/...）
- **数据处理**: pandas / openpyxl（导入导出）
- **部署**: Dockerfile + docker-compose.yml（可选）
##### 当前实际技术栈状态（补充）
- UI 框架：Bootstrap 5（未使用 Tailwind）
- 无 ECharts/Anime.js/XLSX CDN、无 MQTT、无 IndexedDB 图片缓存
- localStorage 仅用于 `pageSize`，无 `customCategories/subCategorySettings/paramDefinitions/componentIdPrefixMap`
- 未实现 Ctrl+Z 50 步撤回历史栈（代码库未发现）





##### 当前实际数据结构（数据库层/快照）
```text
parts(id, name, description, manufacturer_id, package_id, type_id, price, lc_number, other)
inventories(part_id PK, quantity_available)
inventory_history(id, part_id, operation_type, quantity_change, quantity_before, quantity_after, remark, created_at)
projects(id, name, description)
project_parts(id, project_id, part_id, quantity_needed)
file_templates(... 模板列映射)
```

> 注：当前代码库中未发现 `customCategories/subCategorySettings/paramDefinitions/componentIdPrefixMap`、以及文档中的 JS `Core data model` 对应实现。原“核心数据模型”更适合标注为“参考/历史设计”。

#### 当前已实现功能（最近更新）

- **器件详情弹窗**（2025-07-24）：将原来的页面跳转改为弹出式模态框，提升用户体验
  - 使用 Bootstrap 5 Modal 组件
  - 支持查看器件详情、更新数量、查看历史、导出详情、删除零件
  - 文件修改：`templates/inventory.html`、`static/js/inventory/table.js`、`static/js/inventory/main.js`

#### 当前未实现功能（需逐项落地）

- 本地图片缓存（IndexedDB）
- 操作撤回（Undo）
- CSS 变量主题体系
- 品类感知匹配/9级置信度/LCSC 模板
- 自定义类别/子类别/参数模板/位号前缀（Phase A 已实现：后端数据模型 + /api/config/bundle + 默认种子；下一步前端联动）
- 双端同步（不建议，保留轻量偏好即可）
- MQTT（Phase C 已实现可选 service + 库存事件发布，需配置 MQTT_ENABLED 等环境变量）；图片放大镜/侧栏拖拽排序（可选增强）

#### 实施路线图（基于现有技术栈）

- P1：先做主题变量、图片缓存、Undo（前端优先，避免大改后端）
- P2：再做匹配能力（需要先定义品类元数据与评分规则）
- P3：最后做可配置化扩展（子类别/参数模板/位号前缀/插件化）

#### P0-可配置化 & MQTT：规划实现（基于现有技术栈）

> 目标：在不破坏现有 FastAPI + SQLite + Bootstrap 5 + 原生 JS 的前提下，引入“可配置化元数据”和“可选 MQTT 模块”。

##### 1) 可配置化（类别/子类别/参数模板/位号前缀）

- **数据层**：新增表 categories、subcategories、param_templates、location_prefixes（或等价配置 JSON）。
- **服务层**：提供 CRUD API /api/config/*；默认数据内置（种子脚本/迁移脚本）。
- **前端层**：设置页读取配置，库存页/导入页按配置渲染表单与匹配规则。
- **兼容性**：先只读配置 + 默认值；再开放编辑；老数据通过默认映射兼容。
- **验收标准**：
  - 新增/编辑类别后，表单字段自动变化；
  - 子类别切换后参数模板联动；
  - 位号前缀可配置，自动编号不冲突；
  - 导入/导出与配置一致。

##### 2) MQTT（可选模块）

- **架构**：独立 service 文件（pp/services/mqtt_service.py），不在核心路径强依赖。
- **配置**：环境变量 MQTT_ENABLED、MQTT_BROKER、MQTT_PORT、MQTT_USERNAME、MQTT_PASSWORD、MQTT_TOPIC_PREFIX。
- **事件**：库存变更（in/out/adjust）、项目BOM更新可发布消息；失败仅日志告警，不影响主流程。
- **验收标准**：
  - MQTT_ENABLED=false 时零影响；
  - 开启后可在 broker 收到事件消息；
  - 断线重连、异常不阻塞 API。

##### 阶段拆分（建议）

- Phase A：配置数据模型 + 只读 API + 前端默认配置加载
- Phase B：配置可编辑 + 参数模板联动 + 位号前缀联动
- Phase C：MQTT service + 事件发布 + 开关与监控日志
#### P0 执行清单（可直接跟进度）

- [ ] Phase A-1：配置数据模型（categories/subcategories/param_templates/location_prefixes）
- [ ] Phase A-2：只读 API（/api/config/*）+ 默认种子数据
- [ ] Phase A-3：前端默认配置加载（库存/导入表单联动）
- [ ] Phase B-1：配置可编辑（设置页 CRUD）
- [ ] Phase B-2：参数模板联动 + 位号前缀联动
- [ ] Phase B-3：导入导出与配置一致性验证
- [ ] Phase C-1：MQTT service（可选模块，开关控制）
- [ ] Phase C-2：库存事件发布 + 断线重连与日志
- [ ] Phase C-3：回归测试与部署文档

#### 未实现功能清单与实现优先级

| 优先级 | 功能点 | 现状 | 建议实现方式 | 预估收益 | 预估风险 |
|---|---|---|---|---|---|
| P1 | 图片本地缓存（IndexedDB） | 未实现 | 前端按 part_id 缓存图片 blob，提供重新从 URL 获取按钮 | 离线可用、减少外部依赖 | 存储膨胀、缓存失效策略 |
| P1 | 操作撤回（Undo） | 未实现 | 前端历史栈（入库/出库/删除/编辑）+ 服务层幂等接口 | 降低误操作成本 | 并发冲突、回滚复杂度 |
| P1 | 深色主题变量体系 | 未实现/部分 | custom.css 中定义 --color-*，逐步替换硬编码样式 | 主题一致性、可维护性 | 样式回归风险 |
| P2 | 品类感知匹配策略 | 未实现/待核 | 电阻/电容/电感先比主参数，IC 先比型号 | 提升批量匹配准确率 | 需品类元数据 |
| P2 | BOM 9级置信度匹配 | 未实现/待核 | 按优先级打分并排序候选 | 结果可解释、可排序 | 计算成本、阈值调优 |
| P2 | LCSC 标准 BOM 模板支持 | 未实现/待核 | 模板列映射到现有 schema | 用户导入体验提升 | 模板维护成本 |
| **P0** | 自定义类别/子类别/参数模板/位号前缀 | Phase A 已实现（后端） | 元数据可配置化（DB） | 灵活扩展 | 复杂度提升、迁移成本 |
| P3 | 双端同步 localStorage<->后端 | 未实现 | 仅保留 pageSize 等轻量偏好；业务数据不走双写 | 避免架构复杂化 | 一致性风险 |
| **P0** | MQTT 集成 | Phase C 已实现（可选 service） | 作为插件/可选模块，不耦合核心 | IoT 场景扩展 | 安全、稳定性 |
| P3 | 图片放大镜/侧栏拖拽排序 | 未实现 | 前端交互增强 | 体验提升 | 兼容性、实现成本 |

> 说明：当你说“P0 优先并开始规划实现可配置化与 MQTT”，我已将它们提升为 P0 并给出阶段拆分与验收标准，便于直接落地。实施时优先前端改动，后端保持向后兼容；所有新增接口需幂等并可回滚。
#### 建议继续补充（当前文档未覆盖）

- 运行命令与端口：本地推荐 `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`，生产/容器再 `0.0.0.0`。
- 数据库迁移策略：当前用 `Base.metadata.create_all`；后续若加字段/改表，建议补充迁移流程（例如 Alembic 或导出-重建-导入）。
已补充 `start.sh`（容器内默认 `APP_HOST=0.0.0.0`、`APP_PORT=8000`，可通过环境变量覆盖）。
- 前端 JS 规范：模块加载顺序在 `templates/inventory.html` 中（`cache.js -> filter.js -> table.js -> stock-operations.js -> batch-operations.js -> history.js -> utils.js -> main.js`），Agent.md 应记录避免乱序。
- 现有 localStorage 用法：仅存储 `pageSize`，不存在 `customCategories/subCategorySettings`；如仍想保留这两项，应标注为“历史/规划”。


#### 文档一致性与维护建议

- README 与 Agent.md 保持一致：README 已使用 FastAPI/SQLAlchemy/Bootstrap/SQLite/Docker，Agent.md 应避免重复描述与代码不符的前端栈与存储设计。
`start.sh` 已补充，`Dockerfile` 的 `CMD ["./start.sh"]` 可继续使用。
- 不要把未实现的功能写成现状描述；如果保留历史设计，应明确标注“规划/参考/历史”。
- 推荐补充：数据备份/恢复、异常处理规范、API 错误码、前端模块职责边界、批量操作幂等与回滚策略。