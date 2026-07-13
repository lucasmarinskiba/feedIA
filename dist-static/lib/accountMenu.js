/**
 * Account Menu — dropdown del brand-footer.
 *
 * Maneja: agregar cuenta IG, cambiar activa, cerrar sesión, cerrar cuenta usuario.
 * Auto-inyecta CSS. Wire al botón #account-menu-btn.
 */

const STYLES = `
.account-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 8px;
  min-width: 280px;
  max-width: 320px;
  background: #1a1a1d;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,.6);
  padding: 8px;
  z-index: 1000;
  animation: account-menu-in .15s ease-out;
}
@keyframes account-menu-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.account-menu[hidden] { display: none; }
.brand-footer { position: relative; }

.account-menu-header {
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  margin-bottom: 8px;
}
.account-menu-email {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  word-break: break-all;
}
.account-menu-plan {
  font-size: 11px;
  color: #5865F2;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-top: 4px;
}

.account-menu-section { padding: 8px 12px; }
.account-menu-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: rgba(255,255,255,.5);
  margin-bottom: 6px;
}
.account-menu-brands {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}
.account-menu-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255,255,255,.8);
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  transition: background .1s;
}
.account-menu-brand:hover { background: rgba(255,255,255,.05); }
.account-menu-brand.active {
  background: rgba(88, 101, 242, .15);
  color: #fff;
}
.account-menu-brand-avatar {
  width: 24px; height: 24px;
  border-radius: 6px;
  background: linear-gradient(135deg, #f09433, #bc1888);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
}
.account-menu-brand .check {
  margin-left: auto;
  color: #5865F2;
  font-size: 14px;
}
.account-menu-limit {
  font-size: 11px;
  color: rgba(255,255,255,.5);
  text-align: center;
  padding: 4px 0;
}

.account-menu-divider {
  height: 1px;
  background: rgba(255,255,255,.06);
  margin: 4px 0;
}

.account-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(255,255,255,.85);
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  transition: background .1s;
}
.account-menu-item svg { width: 16px; height: 16px; flex-shrink: 0; }
.account-menu-item:hover { background: rgba(255,255,255,.05); }
.account-menu-item.warning { color: #f59e0b; }
.account-menu-item.warning:hover { background: rgba(245, 158, 11, .1); }
.account-menu-item.danger { color: #ef4444; }
.account-menu-item.danger:hover { background: rgba(239, 68, 68, .1); }

/* Modal overlay reusable */
.account-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.account-modal {
  background: #1a1a1d;
  border-radius: 16px;
  padding: 28px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 24px 60px rgba(0,0,0,.7);
}
.account-modal h2 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: #fff;
}
.account-modal p {
  color: rgba(255,255,255,.7);
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 16px 0;
}
.account-modal input {
  width: 100%;
  padding: 10px 12px;
  background: #0a0a0a;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  margin-bottom: 12px;
  font-family: inherit;
}
.account-modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}
.account-modal-btn {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
}
.account-modal-btn.cancel { background: rgba(255,255,255,.05); color: rgba(255,255,255,.7); }
.account-modal-btn.primary { background: #5865F2; color: #fff; }
.account-modal-btn.danger { background: #ef4444; color: #fff; }
`;

const injectStyles = () => {
  if (document.getElementById('account-menu-styles')) return;
  const style = document.createElement('style');
  style.id = 'account-menu-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
};

const $ = (sel) => document.querySelector(sel);

const fetchMe = async () => {
  try {
    const r = await fetch('/api/auth/me');
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

const fetchBrands = async () => {
  try {
    const r = await fetch('/api/users/brands');
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
};

const showModal = (innerHTML) => {
  const overlay = document.createElement('div');
  overlay.className = 'account-modal-overlay';
  overlay.innerHTML = `<div class="account-modal">${innerHTML}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
};

const promptAddBrand = async () => {
  const overlay = showModal(`
    <h2>Agregar Cuenta de Instagram</h2>
    <p>Conecta una nueva cuenta de Instagram a tu perfil de usuario.</p>
    <input type="text" id="add-brand-id" placeholder="ID interno (ej: mi-marca)" />
    <input type="text" id="add-brand-name" placeholder="Nombre de la marca/cuenta" />
    <input type="text" id="add-brand-handle" placeholder="@handle de Instagram (opcional)" />
    <input type="text" id="add-brand-niche" placeholder="Nicho/Industria (opcional)" />
    <div class="account-modal-actions">
      <button class="account-modal-btn cancel" id="add-brand-cancel">Cancelar</button>
      <button class="account-modal-btn primary" id="add-brand-confirm">Agregar</button>
    </div>
  `);

  overlay.querySelector('#add-brand-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#add-brand-confirm').onclick = async () => {
    const brandId = overlay.querySelector('#add-brand-id').value.trim().toLowerCase().replace(/\s+/g, '-');
    const name = overlay.querySelector('#add-brand-name').value.trim();
    const handle = overlay.querySelector('#add-brand-handle').value.trim().replace(/^@/, '');
    const niche = overlay.querySelector('#add-brand-niche').value.trim();

    if (!brandId || !name) {
      alert('ID y Nombre son obligatorios');
      return;
    }

    const r = await fetch('/api/users/brands/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId,
        profile: {
          id: brandId,
          name,
          handle: handle || undefined,
          niche: niche || 'general',
          industryCategory: niche || 'general',
        },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      alert(data.error ?? 'Error al agregar');
      return;
    }
    overlay.remove();
    location.reload();
  };
};

const confirmLogout = async () => {
  const overlay = showModal(`
    <h2>Cerrar Sesión</h2>
    <p>¿Seguro que querés cerrar tu sesión? Vas a tener que volver a iniciar sesión para acceder.</p>
    <div class="account-modal-actions">
      <button class="account-modal-btn cancel" id="logout-cancel">Cancelar</button>
      <button class="account-modal-btn primary" id="logout-confirm">Cerrar Sesión</button>
    </div>
  `);
  overlay.querySelector('#logout-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#logout-confirm').onclick = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/login.html';
  };
};

const confirmCloseAccount = async (userEmail) => {
  const overlay = showModal(`
    <h2 style="color:#ef4444">⚠ Cerrar Cuenta de Usuario</h2>
    <p>Esta acción es <strong>permanente</strong>. Tu cuenta de usuario y todas tus cuentas de Instagram asociadas serán desactivadas.</p>
    <p>Para confirmar, escribí tu email: <strong>${userEmail}</strong></p>
    <input type="text" id="close-confirm-email" placeholder="${userEmail}" autocomplete="off" />
    <div class="account-modal-actions">
      <button class="account-modal-btn cancel" id="close-cancel">Cancelar</button>
      <button class="account-modal-btn danger" id="close-confirm">Cerrar Cuenta</button>
    </div>
  `);
  overlay.querySelector('#close-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#close-confirm').onclick = async () => {
    const confirm = overlay.querySelector('#close-confirm-email').value.trim();
    if (confirm !== userEmail) {
      alert('Email no coincide');
      return;
    }
    const r = await fetch('/api/auth/close-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm }),
    });
    if (r.ok) location.href = '/login.html';
    else {
      const d = await r.json();
      alert(d.error ?? 'Error');
    }
  };
};

const promptUpgradePlan = async () => {
  const r = await fetch('/api/plans');
  const data = await r.json();
  const plans = data.plans ?? {};

  const overlay = showModal(`
    <h2>Cambiar Plan</h2>
    <p>Cada plan permite distinta cantidad de cuentas Instagram y features.</p>
    ${Object.entries(plans)
      .map(
        ([tier, limits]) => `
      <div style="border:1px solid rgba(255,255,255,.1); padding:12px; border-radius:8px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="text-transform:uppercase">${tier}</strong>
          <button class="account-modal-btn primary" data-plan="${tier}">Elegir</button>
        </div>
        <div style="font-size:12px; color:rgba(255,255,255,.6); margin-top:6px;">
          Máx ${limits.maxBrands === -1 ? '∞' : limits.maxBrands} cuentas IG · ${limits.maxPostsPerMonth === -1 ? 'Posts ilimitados' : limits.maxPostsPerMonth + ' posts/mes'}
        </div>
      </div>
    `,
      )
      .join('')}
    <div class="account-modal-actions">
      <button class="account-modal-btn cancel" id="plan-cancel">Cancelar</button>
    </div>
  `);
  overlay.querySelector('#plan-cancel').onclick = () => overlay.remove();
  overlay.querySelectorAll('[data-plan]').forEach((btn) => {
    btn.onclick = async () => {
      const plan = btn.getAttribute('data-plan');
      const res = await fetch('/api/auth/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        overlay.remove();
        location.reload();
      } else {
        const d = await res.json();
        alert(d.error ?? 'Error');
      }
    };
  });
};

const setActiveBrand = async (brandId) => {
  const r = await fetch('/api/users/brands/active', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandId }),
  });
  if (r.ok) location.reload();
  else {
    const d = await r.json();
    alert(d.error ?? 'Error');
  }
};

const renderBrandList = (container, brands, activeBrandId) => {
  container.innerHTML = '';
  if (!brands?.length) {
    container.innerHTML =
      '<div style="font-size:12px; color:rgba(255,255,255,.5); padding:8px;">No tenés cuentas IG. Agregá una.</div>';
    return;
  }
  for (const b of brands) {
    const isActive = b.id === activeBrandId;
    const btn = document.createElement('button');
    btn.className = 'account-menu-brand' + (isActive ? ' active' : '');
    const initial = (b.profile?.name ?? b.id).charAt(0).toUpperCase();
    btn.innerHTML = `
      <div class="account-menu-brand-avatar">${initial}</div>
      <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${b.profile?.name ?? b.id}
      </div>
      ${isActive ? '<span class="check">✓</span>' : ''}
    `;
    btn.onclick = () => {
      if (!isActive) setActiveBrand(b.id);
    };
    container.appendChild(btn);
  }
};

export const initAccountMenu = async () => {
  injectStyles();

  const menuBtn = $('#account-menu-btn');
  const menu = $('#account-menu');
  if (!menuBtn || !menu) return;

  // Toggle visibility
  const closeMenu = () => {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  };
  const openMenu = async () => {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    await refreshMenuData();
  };

  menuBtn.onclick = (e) => {
    e.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  };

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== menuBtn) closeMenu();
  });

  // Wire menu items
  $('#account-menu-add').onclick = () => {
    closeMenu();
    promptAddBrand();
  };
  $('#account-menu-settings').onclick = () => {
    closeMenu();
    location.hash = '#settings';
  };
  $('#account-menu-plan-upgrade').onclick = () => {
    closeMenu();
    promptUpgradePlan();
  };
  $('#account-menu-logout').onclick = () => {
    closeMenu();
    confirmLogout();
  };
  $('#account-menu-close-account').onclick = async () => {
    closeMenu();
    const me = await fetchMe();
    if (me?.user?.email) confirmCloseAccount(me.user.email);
  };

  const refreshMenuData = async () => {
    const me = await fetchMe();
    if (!me?.user) {
      // No autenticado → redirigir a login
      location.href = '/login.html';
      return;
    }
    $('#account-menu-email').textContent = me.user.email;
    $('#account-menu-plan').textContent = `Plan ${me.user.plan}`;

    const brands = await fetchBrands();
    if (brands) {
      renderBrandList($('#account-menu-brands'), brands.brands, brands.activeBrandId);
      $('#account-menu-limit').textContent = `${brands.current} / ${brands.max === -1 ? '∞' : brands.max} cuentas IG`;
    }
  };
};
