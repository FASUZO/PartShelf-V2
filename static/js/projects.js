document.addEventListener('DOMContentLoaded', function() {
  loadProjectsList();
  
  // Handle Create Project Form (if it exists)
  const createProjectForm = document.getElementById('createProjectForm');
  if (createProjectForm) {
      createProjectForm.addEventListener('submit', handleCreateProject);
  }
});

// 加载项目列表
async function loadProjectsList() {
  const projectsList = document.getElementById('projectsList');
  if (!projectsList) return;
  
  // Show loading spinner
  projectsList.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">加载中...</span>
        </div>
        <p class="mt-2 text-muted">正在加载项目列表...</p>
      </div>
  `;

  try {
    const response = await fetch('/api/project/get_projects');
    const data = await response.json();
    
    if (data.projects && data.projects.length > 0) {
      let html = '';
      
      data.projects.forEach((project, index) => {
        // Stagger animation
        const delay = index * 0.1;
        
        html += `
          <div class="col-md-6 col-lg-4 mb-4 animate-fade-in" style="animation-delay: ${delay}s">
            <div class="card h-100 project-card">
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title text-primary mb-0">
                        <i class="fas fa-folder me-2"></i>${project.name}
                    </h5>
                    <span class="badge bg-light text-dark border">${project.id}</span>
                </div>
                <p class="card-text text-muted flex-grow-1">${project.description || '暂无描述'}</p>
                <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                  <span class="text-muted small"><i class="fas fa-microchip"></i> 器件种类: ${project.part_count}</span>
                  <a href="/project_details?project_id=${project.id}" class="btn btn-outline-primary btn-sm">
                    查看详情 <i class="fas fa-arrow-right ms-1"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      
      // Add "New Project" card
      html += `
        <div class="col-md-6 col-lg-4 mb-4 animate-fade-in" style="animation-delay: ${(data.projects.length * 0.1)}s">
            <div class="card h-100 border-dashed d-flex align-items-center justify-content-center bg-light" style="border: 2px dashed #dee2e6; cursor: pointer;" onclick="openCreateProjectModal()">
                <div class="text-center p-5">
                    <i class="fas fa-plus-circle fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">创建新项目</h5>
                </div>
            </div>
        </div>
      `;
      
      projectsList.innerHTML = html;
    } else {
      projectsList.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="mb-4">
            <i class="fas fa-folder-open fa-4x text-muted"></i>
          </div>
          <h5 class="text-muted mb-3">暂无项目数据</h5>
          <button class="btn btn-primary" onclick="openCreateProjectModal()">
            <i class="fas fa-plus"></i> 创建第一个项目
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error('加载项目列表失败:', error);
    projectsList.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
        <p class="text-danger">加载项目列表失败，请刷新页面重试</p>
        <button class="btn btn-outline-secondary btn-sm" onclick="loadProjectsList()">重试</button>
      </div>
    `;
  }
}

function openCreateProjectModal() {
    const modalElement = document.getElementById('createProjectModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

function handleCreateProject(event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('projectName');
    const descInput = document.getElementById('projectDesc');
    
    const projectData = {
        name: nameInput.value,
        description: descInput.value
    };
    
    fetch('/api/project/create_project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
    })
    .then(response => {
        if (response.ok) {
            // Close modal
            const modalElement = document.getElementById('createProjectModal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
            
            // Clear form
            document.getElementById('createProjectForm').reset();
            
            // Reload list
            loadProjectsList();
        } else {
            alert('创建项目失败');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('发生错误: ' + error.message);
    });
}
