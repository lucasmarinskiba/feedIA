/**
 * Sala Ejecutiva Enhanced Dashboard
 * Campaigns, Analytics, Influencers, Ads, Automation
 */

const renderSalaEjecutivaDashboard = () => {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <div class="sala-ejecutiva-container">
      <div class="dashboard-header">
        <h1>Sala Ejecutiva - Panel de Control</h1>
        <p>Gestión centralizada de campañas, analytics, influencers, publicidad y automatización</p>
      </div>

      <div class="dashboard-tabs">
        <button class="tab-btn active" data-tab="overview">Resumen General</button>
        <button class="tab-btn" data-tab="campaigns">Campañas</button>
        <button class="tab-btn" data-tab="analytics">Analytics</button>
        <button class="tab-btn" data-tab="influencers">Influencers</button>
        <button class="tab-btn" data-tab="ads">Publicidad</button>
        <button class="tab-btn" data-tab="automation">Automatización</button>
      </div>

      <!-- Overview Tab -->
      <div class="tab-content active" id="tab-overview">
        <div class="dashboard-grid">
          <div class="card campaigns-card">
            <h3>Campañas Activas</h3>
            <div class="loading">Cargando...</div>
          </div>
          <div class="card analytics-card">
            <h3>Analytics</h3>
            <div class="loading">Cargando...</div>
          </div>
          <div class="card influencers-card">
            <h3>Influencers</h3>
            <div class="loading">Cargando...</div>
          </div>
          <div class="card ads-card">
            <h3>Campañas de Ads</h3>
            <div class="loading">Cargando...</div>
          </div>
          <div class="card automation-card">
            <h3>Automatización</h3>
            <div class="loading">Cargando...</div>
          </div>
        </div>
      </div>

      <!-- Campaigns Tab -->
      <div class="tab-content" id="tab-campaigns">
        <div class="card">
          <h2>Gestión de Campañas</h2>
          <div class="campaigns-summary"></div>
          <div class="campaigns-list loading">Cargando campañas...</div>
        </div>
      </div>

      <!-- Analytics Tab -->
      <div class="tab-content" id="tab-analytics">
        <div class="card">
          <h2>Panel de Analytics</h2>
          <div class="analytics-summary"></div>
          <div class="analytics-details loading">Cargando datos...</div>
        </div>
      </div>

      <!-- Influencers Tab -->
      <div class="tab-content" id="tab-influencers">
        <div class="card">
          <h2>CRM de Influencers</h2>
          <div class="influencers-summary"></div>
          <div class="influencers-list loading">Cargando influencers...</div>
        </div>
      </div>

      <!-- Ads Tab -->
      <div class="tab-content" id="tab-ads">
        <div class="card">
          <h2>Desempeño de Publicidad</h2>
          <div class="ads-summary"></div>
          <div class="ads-list loading">Cargando campañas...</div>
        </div>
      </div>

      <!-- Automation Tab -->
      <div class="tab-content" id="tab-automation">
        <div class="card">
          <h2>Tareas Automatizadas</h2>
          <div class="automation-summary"></div>
          <div class="automation-list loading">Cargando tareas...</div>
        </div>
      </div>
    </div>

    <style>
      .sala-ejecutiva-container {
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .dashboard-header {
        margin-bottom: 30px;
        text-align: center;
      }

      .dashboard-header h1 {
        font-size: 32px;
        margin: 0 0 10px;
        color: #1a1a1a;
      }

      .dashboard-header p {
        color: #666;
        font-size: 16px;
      }

      .dashboard-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        border-bottom: 2px solid #e0e0e0;
      }

      .tab-btn {
        padding: 12px 20px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: #666;
        border-bottom: 3px solid transparent;
        transition: all 0.3s ease;
      }

      .tab-btn:hover {
        color: #d4af37;
      }

      .tab-btn.active {
        color: #d4af37;
        border-bottom-color: #d4af37;
      }

      .tab-content {
        display: none;
        animation: fadeIn 0.3s ease;
      }

      .tab-content.active {
        display: block;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }

      .card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transition: all 0.3s ease;
      }

      .card:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        transform: translateY(-2px);
      }

      .card h2 {
        font-size: 20px;
        margin: 0 0 15px;
        color: #1a1a1a;
      }

      .card h3 {
        font-size: 16px;
        margin: 0 0 10px;
        color: #333;
      }

      .loading {
        color: #999;
        text-align: center;
        padding: 20px;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .stat-label {
        font-weight: 600;
        color: #666;
      }

      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #d4af37;
      }

      .campaign-item, .influencer-item, .ad-item, .task-item {
        padding: 12px;
        border-left: 4px solid #d4af37;
        background: #f9f9f9;
        margin: 8px 0;
        border-radius: 4px;
      }

      .campaign-status, .influencer-status, .ad-status, .task-status {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        margin-top: 8px;
      }

      .status-active {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .status-scheduled {
        background: #fff3e0;
        color: #e65100;
      }

      .status-completed {
        background: #e0e0e0;
        color: #424242;
      }

      @media (max-width: 768px) {
        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .dashboard-tabs {
          flex-direction: column;
        }

        .tab-btn {
          width: 100%;
          text-align: left;
        }
      }
    </style>
  `;

  // Setup tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Load data
  loadDashboardData();
};

const switchTab = (tabName) => {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });

  // Remove active from all buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add('active');

  // Mark button as active
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
};

const loadDashboardData = async () => {
  try {
    // Load campaigns
    const campaignsRes = await fetch('/api/sala-ejecutiva/campaigns');
    const campaignsData = await campaignsRes.json();
    if (campaignsData.ok) {
      renderCampaignsSummary(campaignsData.summary);
    }

    // Load analytics
    const analyticsRes = await fetch('/api/sala-ejecutiva/analytics-summary');
    const analyticsData = await analyticsRes.json();
    if (analyticsData.ok) {
      renderAnalyticsSummary(analyticsData.summary);
    }

    // Load influencers
    const influencersRes = await fetch('/api/sala-ejecutiva/influencers');
    const influencersData = await influencersRes.json();
    if (influencersData.ok) {
      renderInfluencersSummary(influencersData.summary);
    }

    // Load ads
    const adsRes = await fetch('/api/sala-ejecutiva/ads');
    const adsData = await adsRes.json();
    if (adsData.ok) {
      renderAdsSummary(adsData.summary);
    }

    // Load automation
    const automationRes = await fetch('/api/sala-ejecutiva/automation');
    const automationData = await automationRes.json();
    if (automationData.ok) {
      renderAutomationSummary(automationData.summary);
    }
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
};

const renderCampaignsSummary = (summary) => {
  const card = document.querySelector('.campaigns-card');
  if (!card) return;

  card.innerHTML = `
    <h3>Campañas</h3>
    <div class="stat-row">
      <span class="stat-label">Total</span>
      <span class="stat-value">${summary.total}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Activas</span>
      <span class="stat-value">${summary.active}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Presupuesto Total</span>
      <span class="stat-value">$${summary.totalBudget.toLocaleString()}</span>
    </div>
  `;
};

const renderAnalyticsSummary = (summary) => {
  const card = document.querySelector('.analytics-card');
  if (!card) return;

  card.innerHTML = `
    <h3>Analytics</h3>
    <div class="stat-row">
      <span class="stat-label">Contenido</span>
      <span class="stat-value">${summary.contentCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Engagement</span>
      <span class="stat-value">${summary.engagementRate.toFixed(2)}%</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Crecimiento 30d</span>
      <span class="stat-value">${summary.growth.followerGrowth.toFixed(2)}%</span>
    </div>
  `;
};

const renderInfluencersSummary = (summary) => {
  const card = document.querySelector('.influencers-card');
  if (!card) return;

  card.innerHTML = `
    <h3>Influencers</h3>
    <div class="stat-row">
      <span class="stat-label">Partnerships</span>
      <span class="stat-value">${summary.totalPartnerships}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Prospects</span>
      <span class="stat-value">${summary.totalProspects}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Eng. Promedio</span>
      <span class="stat-value">${summary.averageEngagement.toFixed(2)}%</span>
    </div>
  `;
};

const renderAdsSummary = (summary) => {
  const card = document.querySelector('.ads-card');
  if (!card) return;

  card.innerHTML = `
    <h3>Publicidad</h3>
    <div class="stat-row">
      <span class="stat-label">Campañas Activas</span>
      <span class="stat-value">${summary.active}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Gasto Total</span>
      <span class="stat-value">$${summary.totalSpend.toLocaleString()}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">ROAS Promedio</span>
      <span class="stat-value">${summary.avgROAS.toFixed(2)}x</span>
    </div>
  `;
};

const renderAutomationSummary = (summary) => {
  const card = document.querySelector('.automation-card');
  if (!card) return;

  card.innerHTML = `
    <h3>Automatización</h3>
    <div class="stat-row">
      <span class="stat-label">Tareas Activas</span>
      <span class="stat-value">${summary.active}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Posts</span>
      <span class="stat-value">${summary.byType.post}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Engagement</span>
      <span class="stat-value">${summary.byType.engage}</span>
    </div>
  `;
};

// Export for HTML
window.renderSalaEjecutivaDashboard = renderSalaEjecutivaDashboard;
