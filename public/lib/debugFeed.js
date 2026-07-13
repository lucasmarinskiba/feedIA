/**
 * Debug script — inyectar en console para verificar Feed visibility
 * Ejecutar en DevTools: copy/paste este script en console
 */

(() => {
  console.log('=== FEED DEBUG ===');

  // 1. Buscar elemento Feed
  const feedBtn = document.querySelector('[data-route="feed"]');
  if (!feedBtn) {
    console.error('❌ Feed button NO ENCONTRADO en DOM');
    return;
  }
  console.log('✓ Feed button encontrado:', feedBtn);

  // 2. Computed style
  const computed = window.getComputedStyle(feedBtn);
  console.log('Display:', computed.display);
  console.log('Visibility:', computed.visibility);
  console.log('Opacity:', computed.opacity);
  console.log('Width:', computed.width);
  console.log('Height:', computed.height);
  console.log('Overflow:', computed.overflow);
  console.log('Max-height:', computed.maxHeight);
  console.log('Pointer-events:', computed.pointerEvents);

  // 3. Inline style
  console.log('Inline style.display:', feedBtn.style.display);
  console.log('Inline style.visibility:', feedBtn.style.visibility);

  // 4. Classes
  console.log('Classes:', feedBtn.className);

  // 5. Parent visibility
  let parent = feedBtn.parentElement;
  let depth = 0;
  while (parent && depth < 5) {
    const pStyle = window.getComputedStyle(parent);
    console.log(`Parent[${depth}] (${parent.tagName}.${parent.className}):`, {
      display: pStyle.display,
      visibility: pStyle.visibility,
    });
    parent = parent.parentElement;
    depth++;
  }

  // 6. Group label check
  const studioLabel = Array.from(document.querySelectorAll('.nav-group-label')).find(
    (el) => el.textContent.includes('Studio'),
  );
  if (studioLabel) {
    const studioStyle = window.getComputedStyle(studioLabel);
    console.log('Studio label display:', studioStyle.display);
  } else {
    console.warn('Studio label not found');
  }

  // 7. Platform current
  try {
    const { getPlatform } = await import('./platform.js');
    console.log('Current platform:', getPlatform());
  } catch (e) {
    console.log('Platform module: import failed (expected, might be main thread)');
  }

  // 8. Position
  const rect = feedBtn.getBoundingClientRect();
  console.log('Position:', {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    visible: rect.width > 0 && rect.height > 0 && rect.top >= -100 && rect.top < window.innerHeight,
  });

  console.log('=== END DEBUG ===');
})();
