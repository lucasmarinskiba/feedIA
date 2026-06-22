const d={info:"\u2139\uFE0F",ok:"\u2705",warn:"\u26A0\uFE0F",crit:"\u26D4"},p={success:"ok",error:"crit",danger:"crit",warning:"warn"},u={info:4200,ok:4200,warn:6e3,crit:8e3};let f=!1;const x=()=>{if(!f){if(f=!0,!document.querySelector("#toast-stack")){const e=document.createElement("div");e.id="toast-stack",e.setAttribute("role","status"),e.setAttribute("aria-live","polite"),document.body.appendChild(e)}if(!document.querySelector("#toast-style")){const e=document.createElement("style");e.id="toast-style",e.textContent=`
      #toast-stack{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:10050;
        display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:none;width:max-content;max-width:92vw;}
      .toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;min-width:260px;max-width:440px;
        background:#17171f;color:#eef;border:1px solid #2c2c38;border-left:3px solid #5b9bff;
        border-radius:12px;padding:13px 14px 13px 15px;box-shadow:0 14px 40px rgba(0,0,0,.5);
        font-size:14px;line-height:1.45;position:relative;overflow:hidden;
        animation:tin .26s cubic-bezier(.2,.8,.2,1);}
      @keyframes tin{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
      .toast.tout{animation:tout .22s ease forwards}
      @keyframes tout{to{transform:translateY(10px);opacity:0}}
      .toast.ok{border-left-color:#4ade80}.toast.warn{border-left-color:#fbbf24}
      .toast.crit{border-left-color:#f87171}.toast.info{border-left-color:#5b9bff}
      .toast .t-ic{font-size:15px;line-height:1.3;flex-shrink:0;}
      .toast .t-tx{flex:1;min-width:0;word-break:break-word;}
      .toast .t-x{background:none;border:0;color:#8a8a98;cursor:pointer;font-size:15px;
        line-height:1;padding:2px 4px;border-radius:6px;flex-shrink:0;}
      .toast .t-x:hover{color:#fff;background:rgba(255,255,255,.08);}
      .toast .t-act{background:none;border:0;color:#cbb6f5;font-weight:700;cursor:pointer;
        font-size:13px;padding:4px 0;margin-top:4px;text-align:left;}
      .toast .t-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;
        background:linear-gradient(90deg,#e1306c,#a855f7);transform-origin:left;animation:tbar linear forwards;}
      .toast:hover .t-bar{animation-play-state:paused;}
      @keyframes tbar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
      @media (prefers-reduced-motion:reduce){.toast,.toast .t-bar{animation:none!important}}`,document.head.appendChild(e)}}};export const toast=(e,c="info",o={})=>{x();const s=p[c]||c,r=document.querySelector("#toast-stack");if(!r)return;for(;r.children.length>=4;)r.firstElementChild?.remove();const l=o.duration??u[s]??4200,t=document.createElement("div");t.className=`toast ${s}`;const m=String(e);if(t.innerHTML=`
    <span class="t-ic">${d[s]||d.info}</span>
    <div class="t-tx"></div>
    <button class="t-x" aria-label="Cerrar">\u2715</button>
    <span class="t-bar" style="animation-duration:${l}ms"></span>`,t.querySelector(".t-tx").textContent=m,o.action&&typeof o.action.onClick=="function"){const i=document.createElement("button");i.className="t-act",i.textContent=o.action.label||"Ver",i.addEventListener("click",()=>{try{o.action.onClick()}finally{a()}}),t.querySelector(".t-tx").appendChild(document.createElement("br")),t.querySelector(".t-tx").appendChild(i)}let n=null;const a=()=>{clearTimeout(n),t.classList.add("tout"),setTimeout(()=>t.remove(),220)};return t.querySelector(".t-x").addEventListener("click",a),t.addEventListener("mouseenter",()=>clearTimeout(n)),t.addEventListener("mouseleave",()=>{n=setTimeout(a,1400)}),r.appendChild(t),n=setTimeout(a,l),a};
