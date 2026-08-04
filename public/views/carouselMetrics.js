/**
 * Carousel Metrics Dashboard
 * Real-time engagement analytics + carousel management
 * Integrates with: /api/carousels, /api/analytics, /api/carousel/generate-complete
 */

let state = {
  userId: localStorage.getItem('userId') || 'demo-user',
  selectedCarousel: null,
  autoRefreshInterval: null,
};

const renderCarouselMetrics = async () => {
  const container = document.getElementById('view-container');
  container.innerHTML = `
    <div class="carousel-metrics-container">
      <!-- Header -->
      <div class="metrics-header">
        <div class="header-title">
          <h1>📊 Carousel Metrics</h1>
          <p>Real-time engagement analytics + carousel management</p>
        </div>
        <div class="header-actions">
          <button id="btn-generate-carousel" class="btn-primary">
            + Generate New Carousel
          </button>
          <button id="btn-refresh-metrics" class="btn-secondary">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="metrics-stats">
        <div class="stat-card">
          <div class="stat-value" id="stat-total-carousels">0</div>
          <div class="stat-label">Total Carousels</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-total-views">0</div>
          <div class="stat-label">Total Views</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-avg-engagement">0%</div>
          <div class="stat-label">Avg Engagement</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="stat-top-performer">—</div>
          <div class="stat-label">Top Performer</div>
        </div>
      </div>

      <!-- Carousels List -->
      <div class="metrics-section">
        <h2>Your Carousels</h2>
        <div id="carousels-list" class="carousels-list">
          <div class="loading">Loading carousels...</div>
        </div>
      </div>

      <!-- Carousel Detail -->
      <div id="carousel-detail" class="carousel-detail" style="display: none;">
        <div class="detail-close">✕</div>
        <h3 id="detail-title"></h3>

        <div class="detail-metrics">
          <div class="metric">
            <span class="metric-label">Views</span>
            <span class="metric-value" id="detail-views">0</span>
          </div>
          <div class="metric">
            <span class="metric-label">Engagement Rate</span>
            <span class="metric-value" id="detail-engagement">0%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Trend</span>
            <span class="metric-value" id="detail-trend">—</span>
          </div>
        </div>

        <div class="detail-breakdown">
          <h4>Engagement Breakdown</h4>
          <div id="detail-breakdown" class="breakdown-chart"></div>
        </div>

        <div class="detail-actions">
          <button class="btn-secondary" id="btn-edit-carousel">Edit</button>
          <button class="btn-secondary" id="btn-publish-carousel">Publish</button>
          <button class="btn-danger" id="btn-delete-carousel">Delete</button>
        </div>
      </div>

      <!-- Generation Modal -->
      <div id="generation-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-close">✕</div>
          <h3>Generate New Carousel</h3>

          <div class="form-group">
            <label>Category</label>
            <input type="text" id="gen-category" placeholder="e.g., Instagram Growth Tips" />
          </div>

          <div class="form-group">
            <label>Number of Slides</label>
            <input type="number" id="gen-slides" min="2" max="20" value="8" />
          </div>

          <div class="form-group">
            <label>Platform</label>
            <select id="gen-platform">
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div class="form-group">
            <label>
              <input type="checkbox" id="gen-quality-validation" checked />
              Enable Quality Validation
            </label>
          </div>

          <div id="gen-status" class="status-message" style="display: none;"></div>

          <div class="modal-actions">
            <button id="btn-generate-submit" class="btn-primary">Generate</button>
            <button id="btn-generate-cancel" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  attachListeners();
  await loadCarousels();
};

const loadCarousels = async () => {
  try {
    const response = await fetch(`/api/carousels/user/${state.userId}`);
    const carousels = await response.json();

    const listEl = document.getElementById('carousels-list');
    if (!carousels || carousels.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No carousels yet. Create one to get started!</div>';
      return;
    }

    document.getElementById('stat-total-carousels').textContent = carousels.length;

    listEl.innerHTML = carousels
      .map(
        (carousel) => `
      <div class="carousel-item" data-id="${carousel.id}">
        <div class="carousel-header">
          <h4>${carousel.title}</h4>
          <span class="badge">${carousel.metadata?.platform || carousel.platform || 'unknown'}</span>
        </div>
        <div class="carousel-meta">
          <span>${carousel.slides?.length || 0} slides</span>
          <span>Status: ${carousel.metadata?.status || 'draft'}</span>
        </div>
        <div class="carousel-metrics-mini">
          <span id="views-${carousel.id}">0 views</span>
          <span id="engagement-${carousel.id}">0% engagement</span>
        </div>
        <button class="btn-small" data-action="view" data-id="${carousel.id}">View Details</button>
      </div>
    `,
      )
      .join('');

    // Load metrics for each carousel
    for (const carousel of carousels) {
      loadCarouselMetrics(carousel.id);
    }
  } catch (error) {
    console.error('Failed to load carousels:', error);
    document.getElementById('carousels-list').innerHTML = `<div class="error">Failed to load carousels</div>`;
  }
};

const loadCarouselMetrics = async (carouselId) => {
  try {
    const response = await fetch(`/api/carousels/${carouselId}/metrics`);
    const metrics = await response.json();

    const viewsEl = document.getElementById(`views-${carouselId}`);
    const engagementEl = document.getElementById(`engagement-${carouselId}`);

    if (viewsEl) viewsEl.textContent = `${metrics.views || 0} views`;
    if (engagementEl) {
      const engagement =
        metrics.views > 0
          ? Math.round(((metrics.shares + metrics.saves + metrics.likes + metrics.clicks) / metrics.views) * 100)
          : 0;
      engagementEl.textContent = `${engagement}% engagement`;
    }
  } catch (error) {
    console.error(`Failed to load metrics for ${carouselId}:`, error);
  }
};

const showCarouselDetail = async (carouselId) => {
  try {
    const [carouselRes, metricsRes] = await Promise.all([
      fetch(`/api/carousels/${carouselId}`),
      fetch(`/api/carousels/${carouselId}/metrics`),
    ]);

    const carousel = await carouselRes.json();
    const metrics = await metricsRes.json();

    state.selectedCarousel = carousel;

    // Update detail view
    document.getElementById('detail-title').textContent = carousel.title;
    document.getElementById('detail-views').textContent = metrics.views || 0;
    document.getElementById('detail-engagement').textContent =
      `${Math.round(((metrics.shares + metrics.saves + metrics.likes + metrics.clicks) / (metrics.views || 1)) * 100)}%`;
    document.getElementById('detail-trend').textContent = metrics.trend || '—';

    // Breakdown chart
    const breakdown = `
      Shares: ${metrics.shares || 0} |
      Saves: ${metrics.saves || 0} |
      Likes: ${metrics.likes || 0} |
      Clicks: ${metrics.clicks || 0}
    `;
    document.getElementById('detail-breakdown').textContent = breakdown;

    // Show detail panel
    const detailEl = document.getElementById('carousel-detail');
    detailEl.style.display = 'block';
    detailEl.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Failed to load carousel detail:', error);
  }
};

const generateCarousel = async () => {
  const category = document.getElementById('gen-category').value;
  const slideCount = parseInt(document.getElementById('gen-slides').value);
  const platform = document.getElementById('gen-platform').value;
  const enableQuality = document.getElementById('gen-quality-validation').checked;

  if (!category) {
    alert('Please enter a category');
    return;
  }

  const statusEl = document.getElementById('gen-status');
  statusEl.textContent = 'Generating carousel...';
  statusEl.style.display = 'block';

  try {
    const response = await fetch('/api/carousel/generate-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.userId,
        category,
        slideCount,
        platform,
        enableQualityValidation: enableQuality,
      }),
    });

    const result = await response.json();

    if (result.status === 'success') {
      statusEl.textContent = '✅ Carousel generated! Reloading...';
      setTimeout(() => {
        document.getElementById('generation-modal').style.display = 'none';
        loadCarousels();
      }, 1500);
    } else {
      statusEl.textContent = `❌ ${result.error}`;
    }
  } catch (error) {
    statusEl.textContent = `❌ Failed: ${error.message}`;
  }
};

const attachListeners = () => {
  document.getElementById('btn-generate-carousel').addEventListener('click', () => {
    document.getElementById('generation-modal').style.display = 'flex';
  });

  document.getElementById('btn-generate-submit').addEventListener('click', () => {
    generateCarousel();
  });

  document.getElementById('btn-generate-cancel').addEventListener('click', () => {
    document.getElementById('generation-modal').style.display = 'none';
  });

  document.getElementById('btn-refresh-metrics').addEventListener('click', () => {
    loadCarousels();
  });

  document
    .getElementById('carousel-detail')
    .querySelector('.detail-close')
    .addEventListener('click', () => {
      document.getElementById('carousel-detail').style.display = 'none';
    });

  // Carousel item clicks
  document.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'view') {
      showCarouselDetail(e.target.dataset.id);
    }
  });
};

export { renderCarouselMetrics };
