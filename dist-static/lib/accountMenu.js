const u=`
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
`,p=()=>{if(document.getElementById("account-menu-styles"))return;const n=document.createElement("style");n.id="account-menu-styles",n.textContent=u,document.head.appendChild(n)},i=n=>document.querySelector(n),s=async()=>{try{const n=await fetch("/api/auth/me");return n.ok?await n.json():null}catch{return null}},m=async()=>{try{const n=await fetch("/api/users/brands");return n.ok?await n.json():null}catch{return null}},d=n=>{const a=document.createElement("div");return a.className="account-modal-overlay",a.innerHTML=`<div class="account-modal">${n}</div>`,a.addEventListener("click",t=>{t.target===a&&a.remove()}),document.body.appendChild(a),a},g=async()=>{const n=d(`
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
  `);n.querySelector("#add-brand-cancel").onclick=()=>n.remove(),n.querySelector("#add-brand-confirm").onclick=async()=>{const a=n.querySelector("#add-brand-id").value.trim().toLowerCase().replace(/\s+/g,"-"),t=n.querySelector("#add-brand-name").value.trim(),o=n.querySelector("#add-brand-handle").value.trim().replace(/^@/,""),r=n.querySelector("#add-brand-niche").value.trim();if(!a||!t){alert("ID y Nombre son obligatorios");return}const e=await fetch("/api/users/brands/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brandId:a,profile:{id:a,name:t,handle:o||void 0,niche:r||"general",industryCategory:r||"general"}})}),c=await e.json();if(!e.ok){alert(c.error??"Error al agregar");return}n.remove(),location.reload()}},b=async()=>{const n=d(`
    <h2>Cerrar Sesi\xF3n</h2>
    <p>\xBFSeguro que quer\xE9s cerrar tu sesi\xF3n? Vas a tener que volver a iniciar sesi\xF3n para acceder.</p>
    <div class="account-modal-actions">
      <button class="account-modal-btn cancel" id="logout-cancel">Cancelar</button>
      <button class="account-modal-btn primary" id="logout-confirm">Cerrar Sesi\xF3n</button>
    </div>
  `);n.querySelector("#logout-cancel").onclick=()=>n.remove(),n.querySelector("#logout-confirm").onclick=async()=>{await fetch("/api/auth/logout",{method:"POST"}),location.href="/login.html"}},f=async n=>{const a=d(`
    <h2 style="color:#ef4444">\u26A0 Cerrar Cuenta de Usuario</h2>
    <p>Esta acci\xF3n es <strong>permanente</strong>. Tu cuenta de usuario y todas tus cuentas de Instagram asociadas ser\xE1n desactivadas.</p>
    <p>Para confirmar, escrib\xED tu email: <strong>${n}</strong></p>
    <input type="text" id="close-confirm-email" placeholder="${n}" autocomplete="off" />
    <div class="account-modal-actions">
      <button class="account-modal-btn cancel" id="close-cancel">Cancelar</button>
      <button class="account-modal-btn danger" id="close-confirm">Cerrar Cuenta</button>
    </div>
  `);a.querySelector("#close-cancel").onclick=()=>a.remove(),a.querySelector("#close-confirm").onclick=async()=>{const t=a.querySelector("#close-confirm-email").value.trim();if(t!==n){alert("Email no coincide");return}const o=await fetch("/api/auth/close-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:t})});if(o.ok)location.href="/login.html";else{const r=await o.json();alert(r.error??"Error")}}},x=async()=>{const t=(await(await fetch("/api/plans")).json()).plans??{},o=d(`
    <h2>Cambiar Plan</h2>
    <p>Cada plan permite distinta cantidad de cuentas Instagram y features.</p>
    ${Object.entries(t).map(([r,e])=>`
      <div style="border:1px solid rgba(255,255,255,.1); padding:12px; border-radius:8px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="text-transform:uppercase">${r}</strong>
          <button class="account-modal-btn primary" data-plan="${r}">Elegir</button>
        </div>
        <div style="font-size:12px; color:rgba(255,255,255,.6); margin-top:6px;">
          M\xE1x ${e.maxBrands===-1?"\u221E":e.maxBrands} cuentas IG \xB7 ${e.maxPostsPerMonth===-1?"Posts ilimitados":e.maxPostsPerMonth+" posts/mes"}
        </div>
      </div>
    `).join("")}
    <div class="account-modal-actions">
      <button class="account-modal-btn cancel" id="plan-cancel">Cancelar</button>
    </div>
  `);o.querySelector("#plan-cancel").onclick=()=>o.remove(),o.querySelectorAll("[data-plan]").forEach(r=>{r.onclick=async()=>{const e=r.getAttribute("data-plan"),c=await fetch("/api/auth/upgrade-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:e})});if(c.ok)o.remove(),location.reload();else{const l=await c.json();alert(l.error??"Error")}}})},h=async n=>{const a=await fetch("/api/users/brands/active",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brandId:n})});if(a.ok)location.reload();else{const t=await a.json();alert(t.error??"Error")}},y=(n,a,t)=>{if(n.innerHTML="",!a?.length){n.innerHTML='<div style="font-size:12px; color:rgba(255,255,255,.5); padding:8px;">No ten\xE9s cuentas IG. Agreg\xE1 una.</div>';return}for(const o of a){const r=o.id===t,e=document.createElement("button");e.className="account-menu-brand"+(r?" active":"");const c=(o.profile?.name??o.id).charAt(0).toUpperCase();e.innerHTML=`
      <div class="account-menu-brand-avatar">${c}</div>
      <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        ${o.profile?.name??o.id}
      </div>
      ${r?'<span class="check">\u2713</span>':""}
    `,e.onclick=()=>{r||h(o.id)},n.appendChild(e)}};export const initAccountMenu=async()=>{p();const n=i("#account-menu-btn"),a=i("#account-menu");if(!n||!a)return;const t=()=>{a.hidden=!0,n.setAttribute("aria-expanded","false")},o=async()=>{a.hidden=!1,n.setAttribute("aria-expanded","true"),await r()};n.onclick=e=>{e.stopPropagation(),a.hidden?o():t()},document.addEventListener("click",e=>{!a.contains(e.target)&&e.target!==n&&t()}),i("#account-menu-add").onclick=()=>{t(),g()},i("#account-menu-settings").onclick=()=>{t(),location.hash="#settings"},i("#account-menu-plan-upgrade").onclick=()=>{t(),x()},i("#account-menu-logout").onclick=()=>{t(),b()},i("#account-menu-close-account").onclick=async()=>{t();const e=await s();e?.user?.email&&f(e.user.email)};const r=async()=>{const e=await s();if(!e?.user){location.href="/login.html";return}i("#account-menu-email").textContent=e.user.email,i("#account-menu-plan").textContent=`Plan ${e.user.plan}`;const c=await m();c&&(y(i("#account-menu-brands"),c.brands,c.activeBrandId),i("#account-menu-limit").textContent=`${c.current} / ${c.max===-1?"\u221E":c.max} cuentas IG`)}};
