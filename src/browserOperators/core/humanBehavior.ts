/**
 * HumanBehavior — Simula comportamiento humano realista en el navegador.
 * Movimientos de mouse con curvas de Bézier, scroll natural, typing humano.
 */
/** Pausa aleatoria entre min y max ms (distribución ligeramente sesgada) */
export const humanDelay = async (minMs: number, maxMs: number): Promise<void> => {
  const range = maxMs - minMs;
  // Sesgar hacia valores más bajos (humano promedio)
  const skewed = Math.pow(Math.random(), 1.5);
  const delay = minMs + range * skewed;
  await new Promise((r) => setTimeout(r, Math.round(delay)));
};

// Minimal Page interface for dynamic Playwright loading
interface Page {
  locator: (sel: string) => {
    first: () => {
      fill: (value: string) => Promise<unknown>;
      press: (key: string) => Promise<unknown>;
    };
  };
  mouse: {
    move: (x: number, y: number) => Promise<unknown>;
    wheel: (dx: number, dy: number) => Promise<unknown>;
  };
  viewportSize: () => { width: number; height: number } | null;
}

/** Curva de Bézier cuadrática para movimiento de mouse */
function quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
  const invT = 1 - t;
  return invT * invT * p0 + 2 * invT * t * p1 + t * t * p2;
}

/** Genera puntos de control aleatorios para una curva de Bézier entre dos puntos */
function generateControlPoint(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number } {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  // Offset aleatorio perpendicular a la línea directa
  const offset = 30 + Math.random() * 80;
  const angle = Math.atan2(end.y - start.y, end.x - start.x) + Math.PI / 2;
  const sign = Math.random() > 0.5 ? 1 : -1;
  return {
    x: midX + Math.cos(angle) * offset * sign,
    y: midY + Math.sin(angle) * offset * sign,
  };
}

/** Mueve el mouse desde la posición actual hasta el destino con curva de Bézier */
export const humanMouseMove = async (
  page: Page,
  targetBox: { x: number; y: number; width: number; height: number },
): Promise<void> => {
  // Obtener posición actual del mouse (aproximada: centro de la página)
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  const startX = viewport.width / 2 + (Math.random() - 0.5) * 200;
  const startY = viewport.height / 2 + (Math.random() - 0.5) * 200;

  const destX = targetBox.x + targetBox.width * (0.3 + Math.random() * 0.4);
  const destY = targetBox.y + targetBox.height * (0.3 + Math.random() * 0.4);

  const control = generateControlPoint({ x: startX, y: startY }, { x: destX, y: destY });

  const steps = 15 + Math.floor(Math.random() * 15);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = quadraticBezier(startX, control.x, destX, t);
    const y = quadraticBezier(startY, control.y, destY, t);
    await page.mouse.move(x, y);
    // Velocidad variable: más lento al principio y al final
    const speedFactor = Math.sin(t * Math.PI); // 0 → 1 → 0
    const delay = 8 + (1 - speedFactor) * 20 + Math.random() * 10;
    await new Promise((r) => setTimeout(r, Math.round(delay)));
  }
};

/** Scroll humano con aceleración/deceleración y overscroll ocasional */
export const humanScroll = async (page: Page, direction: 'up' | 'down', amount: number): Promise<void> => {
  const steps = 5 + Math.floor(Math.random() * 5);
  const perStep = amount / steps;
  const dir = direction === 'down' ? 1 : -1;

  for (let i = 0; i < steps; i++) {
    const progress = i / steps;
    // Aceleración/deceleración
    const speedFactor = Math.sin(progress * Math.PI);
    const stepAmount = perStep * (0.8 + speedFactor * 0.4);
    await page.mouse.wheel(0, stepAmount * dir);
    await humanDelay(80, 250);
  }

  // Overscroll ocasional (10% de probabilidad)
  if (Math.random() < 0.1) {
    await page.mouse.wheel(0, 30 * dir);
    await humanDelay(200, 400);
    await page.mouse.wheel(0, -30 * dir);
  }
};

/** Typea texto con velocidad variable y typos ocasionales */
export const humanType = async (page: Page, selector: string, text: string, typoRate: number = 0.02): Promise<void> => {
  const el = page.locator(selector).first();
  await el.fill(''); // Limpiar primero
  await humanDelay(100, 300);

  let i = 0;
  while (i < text.length) {
    const char = text[i]!;

    // Typo ocasional
    if (Math.random() < typoRate && i > 0 && char !== ' ') {
      const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      await el.press(wrongChar);
      await humanDelay(50, 150);
      await el.press('Backspace');
      await humanDelay(100, 250);
    }

    await el.press(char);
    i++;

    // Pausa para "pensar" después de puntuación o espacio
    if (['.', '!', '?', ',', ' '].includes(char)) {
      await humanDelay(150, 400);
    } else {
      // Velocidad variable: 80-180 WPM ≈ 300-700ms por palabra de 5 chars
      await humanDelay(40, 120);
    }
  }
};

/** Simula "lectura" — pausa antes de interactuar */
export const humanReadingPause = async (minMs: number = 1500, maxMs: number = 8000): Promise<void> => {
  await humanDelay(minMs, maxMs);
};

/** Sesión con períodos de inactividad */
export const humanIdle = async (minMs: number = 30000, maxMs: number = 180000): Promise<void> => {
  await humanDelay(minMs, maxMs);
};
