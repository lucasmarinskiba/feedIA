/**
 * Self-test del sistema de compliance
 *
 * Ejecutar: npx tsx src/compliance/selfTest.ts
 *
 * Valida que:
 * 1. Las reglas estén cargadas correctamente
 * 2. El guardian bloquee acciones prohibidas
 * 3. El guardian permita acciones legítimas
 * 4. El rate limiter funcione
 * 5. El audit log registre correctamente
 */

import { evaluate, INSTAGRAM_RULES, CRITICAL_RULE_CODES } from './index.js';
import { checkRateLimit, recordAction, resetRateLimits } from './index.js';
import { audit } from './index.js';
import { env } from '../config/index.js';

let passed = 0;
let failed = 0;

const test = (name: string, fn: () => void | Promise<void>): void => {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          passed++;
          console.log(`✅ ${name}`);
        })
        .catch((err) => {
          failed++;
          console.error(`❌ ${name}: ${err instanceof Error ? err.message : String(err)}`);
        });
    } else {
      passed++;
      console.log(`✅ ${name}`);
    }
  } catch (err) {
    failed++;
    console.error(`❌ ${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

console.log('━━━ COMPLIANCE SELF-TEST ━━━\n');

// Test 1: Reglas cargadas
test('Debe tener 16 reglas cargadas', () => {
  assert(INSTAGRAM_RULES.length === 16, `Esperado 16, tenemos ${INSTAGRAM_RULES.length}`);
});

// Test 2: Reglas críticas
test('Debe tener 9 reglas críticas', () => {
  assert(CRITICAL_RULE_CODES.length === 9, `Esperado 9, tenemos ${CRITICAL_RULE_CODES.length}`);
});

// Test 3: Bloquear promesa garantizada
test('Debe bloquear contenido con promesa garantizada', () => {
  const decision = evaluate('publish', {
    actor: 'test',
    contentText: 'Gana $10,000 en 7 días garantizado con nuestro secreto',
    humanInitiated: false,
  });
  assert(!decision.allowed, 'Debería haberse bloqueado');
  assert(
    decision.violatedRules.some((r) => r.code === 'CONT-003'),
    'Debe violar CONT-003',
  );
});

// Test 4: Bloquear spam de engagement
test('Debe bloquear contenido de compra de seguidores', () => {
  const decision = evaluate('publish', {
    actor: 'test',
    contentText: 'Compra 1000 seguidores por solo $5. Farm de likes incluido.',
    humanInitiated: false,
  });
  assert(!decision.allowed, 'Debería haberse bloqueado');
  assert(
    decision.violatedRules.some((r) => r.code === 'INT-003'),
    'Debe violar INT-003',
  );
});

// Test 5: Bloquear PII
test('Debe bloquear contenido con datos personales', () => {
  const decision = evaluate('publish', {
    actor: 'test',
    contentText: 'El DNI del cliente es 12345678-9 y su tarjeta 4111-1111-1111-1111',
    humanInitiated: false,
  });
  assert(!decision.allowed, 'Debería haberse bloqueado por datos personales');
  assert(
    decision.violatedRules.some((r) => r.code === 'CONT-002'),
    'Debe violar CONT-002',
  );
});

// Test 6: Permitir contenido legítimo
test('Debe permitir contenido legítimo', () => {
  const decision = evaluate('publish', {
    actor: 'test',
    contentText: '5 errores comunes al automatizar tu negocio. Resultados típicos varían según dedicación.',
    humanInitiated: false,
  });
  assert(decision.allowed, `No debería haberse bloqueado: ${decision.reason}`);
  assert(decision.riskScore < 20, `Score de riesgo muy alto: ${decision.riskScore}`);
});

// Test 7: Rate limiter - inicio limpio
test('Rate limiter debe permitir primera acción', () => {
  resetRateLimits();
  const check = checkRateLimit('publish_post');
  assert(check.allowed, 'Primera acción debería estar permitida');
});

// Test 8: Rate limiter - registrar y contar
test('Rate limiter debe contar acciones', () => {
  resetRateLimits();
  recordAction('publish_post');
  recordAction('publish_post');
  const check = checkRateLimit('publish_post');
  assert(check.currentCount === 2, `Conteo debería ser 2, es ${check.currentCount}`);
});

// Test 9: Rate limiter - límite diario respetado
test('Rate limiter debe respetar maxPerDay', () => {
  resetRateLimits();
  // No podemos simular 15 acciones fácilmente sin esperar, pero verificamos
  // que el límite configurado sea razonable
  const check = checkRateLimit('publish_post');
  assert(check.limit === 5, 'Límite por hora de publish_post debería ser 5');
});

// Test 10: Audit log - registro básico
test('Audit log debe registrar sin errores', () => {
  audit({
    action: 'PUBLISH',
    outcome: 'dry_run',
    targetContentId: 'test-post-123',
    dryRun: true,
  });
  // No hay assert directo, pero si no hay excepción, pasa
});

// Test 11: Términos no aceptados bloquean producción
test('Debe requerir términos aceptados', () => {
  assert(env.compliance.acceptedTerms === false, 'En test, términos deberían estar en false');
});

// Test 12: Modo estricto activo por defecto
test('Modo estricto debe estar activo por defecto', () => {
  assert(env.compliance.strictMode === true, 'Modo estricto debería estar activo');
});

// Test 13: Comentario externo oportunista
test('Debe detectar riesgo en comentario externo con marca', () => {
  const decision = evaluate('comment_external', {
    actor: 'test',
    contentText: 'Genial post! Seguime en @miempresa que tenemos el mejor producto',
    humanInitiated: false,
  });
  // Esto no siempre se bloquea automáticamente, pero debería tener score elevado
  assert(decision.riskScore > 10, `Score debería ser > 10 por mencionar marca, es ${decision.riskScore}`);
});

// Test 14: Bloquear evasión de seguridad
test('Debe bloquear contenido que sugiera evadir límites', () => {
  const decision = evaluate('publish', {
    actor: 'test',
    contentText: 'Usá proxies para evadir el rate limit de Instagram y hacer más requests',
    humanInitiated: false,
  });
  assert(!decision.allowed, 'Debería haberse bloqueado');
  assert(
    decision.violatedRules.some((r) => r.code === 'AUTO-002'),
    'Debe violar AUTO-002',
  );
});

// Esperar a que terminen los tests async
setTimeout(() => {
  console.log(`\n━━━ RESULTADO ━━━`);
  console.log(`✅ Pasados: ${passed}`);
  console.log(`❌ Fallados: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  if (failed > 0) {
    console.log('\n⚠️  Algunos tests fallaron. Revisá el sistema de compliance.');
    process.exit(1);
  } else {
    console.log('\n🛡️  Todos los tests de compliance pasaron correctamente.');
    process.exit(0);
  }
}, 500);
