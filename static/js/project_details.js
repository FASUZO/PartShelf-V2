// 获取URL参数
function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  var results = regex.exec(location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// 页面加载完成后获取项目详情和BOM表
document.addEventListener('DOMContentLoaded', function() {
  const projectId = getUrlParameter('project_id');
  
  if (projectId) {
    loadProjectDetails(projectId);
    loadProjectBom(projectId);
  } else {
    alert('未找到项目ID参数');
    window.location.href = '/projects';
  }
});

// 加载项目详情
async function loadProjectDetails(projectId) {
  try {
    const response = await fetch(`/api/project/get_project_details?project_id=${projectId}`);
    const data = await response.json();
    
    if (data) {
      const nameEl = document.getElementById('projectName');
      if (nameEl) nameEl.textContent = data.name;
      
      const nameTextEl = document.getElementById('projectNameText');
      if (nameTextEl) nameTextEl.textContent = data.name;
      
      const descEl = document.getElementById('projectDescription');
      if (descEl) descEl.textContent = data.description || '暂无描述';
      
      const countEl = document.getElementById('partCount');
      if (countEl) countEl.textContent = data.part_count;
      
      const idEl = document.getElementById('projectId');
      if (idEl) idEl.textContent = data.id;
    } else {
      alert('项目不存在');
      window.location.href = '/projects';
    }
  } catch (error) {
    console.error('加载项目详情失败:', error);
    // alert('加载项目详情失败，请刷新页面重试');
  }
}

// 加载项目BOM表
async function loadProjectBom(projectId) {
  const bomTableBody = document.getElementById('bomTableBody');
  const noBomData = document.getElementById('noBomData');
  
  try {
    const response = await fetch(`/api/project/get_project_bom?project_id=${projectId}`);
    const data = await response.json();
    
    if (data && data.bom && data.bom.length > 0) {
      let html = '';
      
      data.bom.forEach((item, index) => {
        html += `
          <tr class="animate-fade-in" style="animation-delay: ${index * 0.05}s">
            <td>${item.part_id}</td>
            <td><strong>${item.part_name}</strong></td>
            <td>${item.manufacturer}</td>
            <td><span class="badge bg-secondary">${item.part_type}</span></td>
            <td>${item.package}</td>
            <td><span class="badge bg-primary rounded-pill">${item.quantity_needed}</span></td>
            <td><span class="text-muted small">${item.description || '-'}</span></td>
          </tr>
        `;
      });
      
      if (bomTableBody) bomTableBody.innerHTML = html;
      if (noBomData) noBomData.style.display = 'none';
    } else {
      if (bomTableBody) bomTableBody.innerHTML = '';
      if (noBomData) noBomData.style.display = 'block';
    }
  } catch (error) {
    console.error('加载BOM表失败:', error);
    if (bomTableBody) {
        bomTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-danger">
              <i class="fas fa-exclamation-triangle"></i> 加载BOM表失败，请刷新页面重试
            </td>
          </tr>
        `;
    }
  }
}
