-- Forge IA: histórico de intentos por cuenta
-- Almacena entrada → estrategia → pieza → predicción para análisis delta

CREATE TABLE IF NOT EXISTS forge_attempts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,

  -- Entrada: parámetros iniciales
  tema TEXT NOT NULL,
  formato TEXT NOT NULL,
  plataforma TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  nicho TEXT NOT NULL,
  voz TEXT NOT NULL,

  -- Estrategia: hooks + plan
  hooks_json TEXT NOT NULL, -- JSON array of {hook, score, category}
  plan_json TEXT NOT NULL, -- JSON {rutaFundacion, ctaEscalera, etc}

  -- Pieza: generada
  hook TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags_json TEXT NOT NULL, -- JSON array
  portada TEXT, -- URL si existe

  -- Predicción: veredicto + scores
  prediccion_json TEXT NOT NULL, -- {veredicto, recomendaciones, factores}
  contenido_score INTEGER, -- 0-100
  hook_score INTEGER, -- 0-100
  cuenta_score INTEGER, -- 0-100
  score_total INTEGER, -- 0-100 (45/35/20 ponderado)

  -- Auditoría
  status TEXT DEFAULT 'completed', -- completed, draft, error
  error_message TEXT,

  -- FK
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_account_created (account_id, created_at DESC),
  INDEX idx_status (status)
);

-- Tabla de mejoras aplicadas (tracking qué cambió entre intentos)
CREATE TABLE IF NOT EXISTS forge_improvements (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  previous_attempt_id TEXT, -- NULL si es primer intento

  -- Delta de scores
  contenido_delta INTEGER, -- puntos ganados/perdidos
  hook_delta INTEGER,
  cuenta_delta INTEGER,
  score_total_delta INTEGER,

  -- Cambios aplicados (tracking qué el usuario modificó)
  changes_json TEXT NOT NULL, -- JSON {field, before, after}

  created_at TEXT NOT NULL,

  FOREIGN KEY (attempt_id) REFERENCES forge_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (previous_attempt_id) REFERENCES forge_attempts(id) ON DELETE SET NULL,
  INDEX idx_attempt (attempt_id)
);
