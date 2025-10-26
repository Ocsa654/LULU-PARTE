# ⚙️ Configuración Inicial de LULU

## 1. Configurar Variables de Entorno

Edita el archivo `.env` con las credenciales de tu base de datos PostgreSQL:

```env
# Puerto del servidor
PORT=3000

# Gemini AI Configuration
GEMINI_API_KEY=tu_api_key_de_gemini_aqui
GEMINI_MODEL=gemini-2.0-flash-exp

# Rate Limiter
GEMINI_RPM_LIMIT=15
GEMINI_DAILY_LIMIT=1500

# JWT Authentication (DEBE COINCIDIR CON SAM)
JWT_SECRET=pruebaproyecto

# Database Configuration (DEBE COINCIDIR CON SAM)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=asistente_programacion

# Environment
NODE_ENV=development
```

## 2. Variables Críticas

### 🔑 GEMINI_API_KEY
**¿Dónde obtenerla?**
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una API Key
3. Cópiala y pégala en `.env`

**⚠️ Sin esta API Key, LULU no funcionará.**

### 🔐 JWT_SECRET
**Debe ser EXACTAMENTE el mismo que SAM:**
- SAM usa: `pruebaproyecto`
- LULU debe usar: `pruebaproyecto`

Si no coinciden, los tokens de autenticación **no funcionarán**.

### 🗄️ Credenciales de PostgreSQL
**Deben apuntar a la MISMA base de datos que SAM:**
- `DB_HOST`: localhost (o donde esté tu PostgreSQL)
- `DB_PORT`: 5432 (puerto por defecto)
- `DB_USER`: tu usuario de PostgreSQL
- `DB_PASSWORD`: tu contraseña de PostgreSQL
- `DB_NAME`: `asistente_programacion` (misma BD de SAM)

## 3. Verificar PostgreSQL

Antes de continuar, asegúrate de que PostgreSQL esté corriendo:

**Windows:**
```powershell
# Ver servicios de PostgreSQL
Get-Service -Name "postgresql*"

# Si no está corriendo, iniciarlo
Start-Service postgresql-x64-14
```

## 4. Probar Conexión

Una vez configurado el `.env`, ejecuta:

```bash
npm run test:db
```

**Resultado esperado:**
```
✅ Conexión establecida correctamente
✅ Tabla 'usuarios' existe
✅ Tabla 'retroalimentacion_llm' existe
✅ Tabla 'preguntas_quiz' existe
✅ Tabla 'opciones_respuesta' existe
✅ Tabla 'subtemas' existe
```

## 5. Si Encuentras Errores

### Error: "ECONNREFUSED"
**Causa:** PostgreSQL no está corriendo
**Solución:**
```bash
# Iniciar servicio de PostgreSQL
Start-Service postgresql-x64-14
```

### Error: "password authentication failed"
**Causa:** Credenciales incorrectas
**Solución:**
1. Verifica `DB_USER` y `DB_PASSWORD` en `.env`
2. Prueba conectarte manualmente con `psql`:
   ```bash
   psql -U postgres -d asistente_programacion
   ```

### Error: "database does not exist"
**Causa:** La base de datos `asistente_programacion` no existe
**Solución:**
1. Conéctate a PostgreSQL:
   ```bash
   psql -U postgres
   ```
2. Crea la base de datos:
   ```sql
   CREATE DATABASE asistente_programacion;
   ```
3. Sal y ejecuta las migraciones de SAM primero

### Error: "relation ... does not exist"
**Causa:** Las tablas no existen en la base de datos
**Solución:**
1. Ve al proyecto SAM
2. Ejecuta las migraciones:
   ```bash
   cd d:\SAMUEL\proyecto-asistente-AprendizajeProgramacion\backend
   npm run migration:run
   ```

## 6. Iniciar Servidor

Una vez que `npm run test:db` pase exitosamente:

```bash
npm run dev
```

**Deberías ver:**
```
🔌 Conectando a PostgreSQL...
✅ [Database] Conexión a PostgreSQL establecida correctamente
🚀 ================================================
🚀  LULU - Gemini AI Service (Clean Architecture)
🚀 ================================================
🚀  Puerto: 3000
🚀  URL: http://localhost:3000
```

## 7. Verificar Endpoints

Prueba el endpoint de health:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "service": "lulu-gemini-service",
  "timestamp": "2025-01-26T05:00:00.000Z"
}
```

## ✅ Checklist de Configuración

- [ ] Archivo `.env` creado con credenciales correctas
- [ ] GEMINI_API_KEY configurada
- [ ] JWT_SECRET coincide con SAM
- [ ] PostgreSQL corriendo
- [ ] Base de datos `asistente_programacion` existe
- [ ] Tablas creadas (migraciones de SAM ejecutadas)
- [ ] `npm run test:db` pasa exitosamente
- [ ] Servidor arranca sin errores

## 🚀 Siguiente Paso

Una vez completada la configuración, consulta:
- `INTEGRACION_PANCHO.md` - Para integrar con PANCHO
- `AUTENTICACION_JWT.md` - Para entender el sistema de autenticación

---

**¿Problemas?** Revisa los logs detallados en la consola o contacta al equipo.
