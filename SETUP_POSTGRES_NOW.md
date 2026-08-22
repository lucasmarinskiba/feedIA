# Setup PostgreSQL en Railway — 5 Minutos

## PASO 1: Abrir Railway

**Ir a:**
```
https://railway.app/project/56f3ba0b-e6e0-4675-9645-e219b3629dab
```

Deberías ver:
- ✅ `web` service (Express app)
- Maybe `postgres_production` si ya existe

---

## PASO 2: Crear PostgreSQL

1. Click botón **"New"** (arriba a la derecha)
2. Click **"Database"**
3. Click **"PostgreSQL"**
4. **ESPERAR** ~1 min
   - Status cambia de `Building` → `Deploying` → `✅ Online`
   - Railway crea automáticamente `postgres_production` service

---

## PASO 3: Obtener DATABASE_URL

1. Click en el service **`postgres_production`** (la tarjeta de Postgres)
2. Click pestaña **"Connect"** (arriba)
3. Busca: **"Postgres Connection String"** o **"PostgreSQL"**
4. **COPIAR** la URL completa
   - Formato: `postgresql://user:password@host:port/dbname?sslmode=require`
5. **GUARDAR** en safe place (la necesitas en Paso 5)

---

## PASO 4: Ir a Web Service

1. Click en el service **`web`** (Express app)
2. Click pestaña **"Variables"** (arriba)

---

## PASO 5: Agregar DATABASE_URL

1. Click botón **"New Variable"** (abajo)
2. Nombre: `DATABASE_URL`
3. Valor: (PEGAR la URL de Paso 3)
4. Click **"Add"**

**Deberías ver:**
```
DATABASE_URL = postgresql://...
```

---

## PASO 6: Redeploy

1. Click en el service `web`
2. Click botón **"Deploy"** (arriba)
3. **ESPERAR** ~30 seg
   - Status: `Building` → `Deploying` → `✅ Online`

---

## PASO 7: Verificar Logs

1. Click en service `web`
2. Click pestaña **"Logs"**
3. Busca estos mensajes (significa que funcionó):
   ```
   ✅ Connected to PostgreSQL
   ✓ Running migrations
   ✓ Migration 001-init.sql completed
   ✓ Migration 002-indexes.sql completed
   [DB] Connected to PostgreSQL
   ```

Si ves `PostgreSQL connection failed`, revisa:
- ¿DATABASE_URL está en Variables?
- ¿Copiaste la URL completa (con password)?
- ¿El servicio postgres_production está `✅ Online`?

---

## PASO 8: Test Endpoint

En terminal (o Postman/Insomnia):

```bash
# Test 1: Health check
curl https://web-production-fa7b5.up.railway.app/health

# Expected: {"status":"ok",...}

# Test 2: Register user (tests Postgres)
curl -X POST https://web-production-fa7b5.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"SecurePass123"
  }'

# Expected: {"id":"...", "email":"test@example.com"}
# NOT: {"error":"Database failed"}
```

---

## ✅ Done!

Si ambos tests pasan, Postgres está correctamente configurado.

**Próximo:** Agregar Redis (5 min más)

---

## Si algo falla:

| Error | Causa | Fix |
|-------|-------|-----|
| `PostgreSQL connection failed` | DATABASE_URL no set | Paso 5: agregar variable |
| `invalid connection string` | URL incompleta o mal copiada | Paso 3: recopia URL exacta |
| `Connection refused` | Postgres service no corriendo | Verifica postgres_production status |
| Auth endpoint retorna 500 | DB query error | Espera más (migrations pueden tardar) |

---

## Commands para verificar (terminal)

```bash
# Ver logs en vivo
railway logs --follow

# Ver todas las variables
railway variable list

# Ver servicios
railway status
```
