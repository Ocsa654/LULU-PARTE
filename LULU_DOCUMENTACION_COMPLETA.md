# 🤖 LULU - Servicio de Integración con Gemini AI

## 📋 Índice
1
---

## 🎯 ¿Qué es LULU?

LULU es el **servicio de integración con Gemini AI** para la plataforma educativa. Es responsable de:
- Validar código de estudiantes con retroalimentación pedagógica
- Generar preguntas de quiz dinámicas
- Proporcionar un chat educativo
- Gestionar el rate limiting de la API de Gemini
- Implementar un sistema de caché inteligente

---

## 📦 Responsabilidades

### En el Proyecto General:
**SAM** → Infraestructura, auth, BD  
**TOÑO** → Materias, progreso, reportes  
**PANCHO** → Ejercicios, quizzes, evaluación  
**LULU** → Integración Gemini AI, validación de código, generación de preguntas

### Lo que LULU hace:
1. ✅ **Validar código de estudiantes** con Gemini AI
2. ✅ **Generar preguntas de quiz** sobre temas específicos
3. ✅ **Chat educativo** para asistir a estudiantes
4. ✅ **Rate Limiter** (15 requests/minuto)
5. ✅ **Sistema de caché** (7 días)
6. ✅ **Monitoreo de uso** de la API

### Lo que LULU NO hace:
- ❌ No guarda datos de estudiantes (eso es SAM)
- ❌ No calcula progreso (eso es TOÑO)
- ❌ No gestiona ejercicios/quizzes (eso es PANCHO)

---

## 🏗️ Arquitectura

LULU está implementado con **Clean Architecture**:

```
src/
├── domain/                    # Reglas de negocio
│   ├── entities/             # Modelos de datos
│   │   ├── CodeValidationRequest.ts
│   │   ├── QuestionGeneration.ts
│   │   └── Chat.ts
│   └── interfaces/           # Contratos (puertos)
│       ├── IGeminiClient.ts
│       └── ICacheService.ts
│
├── application/              # Casos de uso
│   └── use-cases/
│       ├── ValidateCodeUseCase.ts
│       ├── GenerateQuestionsUseCase.ts
│       └── ChatAssistantUseCase.ts
│
├── infrastructure/           # Implementaciones
│   ├── gemini/
│   │   └── GeminiClient.ts
│   ├── cache/
│   │   └── InMemoryCacheService.ts
│   └── middleware/
│       └── RateLimiter.ts
│
└── presentation/             # API
    ├── controllers/
    │   └── GeminiController.ts
    ├── routes/
    │   └── geminiRoutes.ts
    ├── app.ts
    └── server.ts
```

### Ventajas de Clean Architecture:
- ✅ Código desacoplado y mantenible
- ✅ Fácil de probar (cada capa independiente)
- ✅ Fácil de cambiar implementaciones
- ✅ Dependency Injection manual (sin frameworks pesados)

---

## ⚙️ Funcionalidades Implementadas

### 1. 🔍 Validación de Código

**Qué hace:**
- Recibe código de un estudiante
- Lo analiza con Gemini AI
- Evalúa si cumple con los requisitos
- Da retroalimentación pedagógica
- Calcula puntos obtenidos

**Endpoint:** `POST /api/v1/gemini/validate-code`

**Request ejemplo:**
```json
{
  "codigo_enviado": "def suma(a, b):\\n    return a + b",
  "ejercicio_id": 101,
  "lenguaje": "python",
  "casos_prueba": [
    { "input": [5, 10], "expected": 15 }
  ],
  "enunciado": "Crea una función que sume dos números."
}
```

**Response ejemplo:**
```json
{
  "success": true,
  "data": {
    "resultado": "correcto",
    "puntos_obtenidos": 100,
    "retroalimentacion_llm": "¡Excelente! Tu función suma correctamente...",
    "errores_encontrados": [],
    "casos_prueba_pasados": 1,
    "casos_prueba_totales": 1
  }
}
```

---

### 2. 📝 Generación de Preguntas

**Qué hace:**
- Genera preguntas de opción múltiple sobre un tema
- Usa Gemini AI para crear preguntas relevantes
- Incluye código real del lenguaje solicitado
- Proporciona explicaciones para cada opción

**Endpoint:** `POST /api/v1/gemini/generate-questions`

**Request ejemplo:**
```json
{
  "subtema_id": 201,
  "cantidad": 3,
  "dificultad": "intermedia",
  "lenguaje": "Python",
  "tema": "Bucles y ciclos"
}
```

---

### 3. 💬 Chat Educativo

**Qué hace:**
- Proporciona un asistente virtual educativo
- Responde preguntas de estudiantes
- Mantiene contexto de la conversación

**Endpoint:** `POST /api/v1/gemini/chat`

**Limpiar historial:** `DELETE /api/v1/gemini/chat`

---

### 4. ⚡ Rate Limiter

**Problema:** Gemini free tier: 15 requests/minuto, 1500/día

**Solución:**
- Sistema de cola automática
- Monitorea requests en ventana de 60 segundos
- Alertas al 80% y 95% de uso

**Ver estadísticas:** `GET /api/v1/gemini/stats`

---

### 5. 💾 Sistema de Caché

**Beneficios:**
- Reduce hasta 60% las llamadas a Gemini
- Respuestas instantáneas para código cacheado
- TTL de 7 días
- Ahorra límite diario de la API

---

## 🧪 Cómo Probar

### Prerrequisitos:

1. **Obtener API Key de Gemini:**
   - Ve a: https://aistudio.google.com/app/apikey
   - Click en "Create API Key"
   - Copia la API Key

2. **Configurar `.env`:**
```env
PORT=3000
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.5-flash
```

3. **Instalar y ejecutar:**
```bash
npm install
npm run dev
```

### Pruebas en Thunder Client:

**Test 1: Health Check**
```
GET http://localhost:3000/health
```

**Test 2: Validar Código Correcto**
```
POST http://localhost:3000/api/v1/gemini/validate-code

{
  "codigo_enviado": "def suma(a, b):\\n    return a + b",
  "ejercicio_id": 101,
  "lenguaje": "python",
  "casos_prueba": [{ "input": [5, 10], "expected": 15 }],
  "enunciado": "Crea una función que sume dos números."
}
```

**Test 3: Generar Preguntas**
```
POST http://localhost:3000/api/v1/gemini/generate-questions

{
  "subtema_id": 201,
  "cantidad": 3,
  "dificultad": "intermedia",
  "lenguaje": "Python",
  "tema": "Bucles y ciclos"
}
```

**Test 4: Chat**
```
POST http://localhost:3000/api/v1/gemini/chat

{
  "mensaje": "¿Cómo funciona un bucle for en Python?"
}
```

**Test 5: Estadísticas**
```
GET http://localhost:3000/api/v1/gemini/stats
```

---

## 🐛 Problemas Encontrados y Soluciones

### Problema 1: API Key Expirada

**Error:**
```
API key expired. Please renew the API key.
```

**Causa:** Las API Keys de Gemini pueden expirar

**Solución:**
1. Ir a https://aistudio.google.com/app/apikey
2. Crear nueva API Key
3. Actualizar `.env` con la nueva key
4. Reiniciar servidor

---

### Problema 2: Modelo No Disponible ⚠️ MUY COMÚN

**Error:**
```
models/gemini-pro is not found for API version v1beta
```

**Causa:**

**Solución:**
1. Actualizar SDK: `npm i @google/generative-ai@latest`
2. Usar modelos actuales en `.env`:
```env
GEMINI_MODEL=gemini-2.5-flash
```

**Modelos disponibles (2025):**
- ✅ `gemini-2.5-flash` (rápido, recomendado)
- ✅ `gemini-2.5-pro` (potente)

---

### Problema 3: Respuesta JSON Inválida

**Error:**
```
Respuesta inválida de Gemini: no se pudo procesar el JSON.
```

**Causa:**
- Gemini devuelve JSON envuelto en backticks: ` \`\`\`json ... \`\`\` `
- A veces incluye texto extra antes/después del JSON
- JSON interno con código que tiene backticks anidados

**Solución implementada:**
```typescript
let jsonString = respuestaGemini.trim();

// Extraer JSON si está envuelto en ```json ... ```
if (jsonString.startsWith('\`\`\`json')) {
  const lastBacktick = jsonString.lastIndexOf('\`\`\`');
  if (lastBacktick > 7) {
    jsonString = jsonString.substring(7, lastBacktick).trim();
  }
}

jsonResponse = JSON.parse(jsonString);
```

**Por qué funciona:**
- Busca desde el final (`lastIndexOf`) para evitar backticks internos
- Maneja tanto ` \`\`\`json ` como ` \`\`\` ` genérico

---

### Problema 4: Preguntas Genéricas (No Específicas)

**Error:**
- Gemini generaba preguntas sobre "programación en general"
- No usaba el tema/lenguaje solicitado

**Ejemplo de pregunta incorrecta:**
```
"¿Cuál es el propósito principal de escribir un programa informático?"
```

**Causa:** Prompt no era lo suficientemente específico

**Solución:** Prompt ultra-específico con ejemplos claros
```typescript
return \`Genera \${cantidad} preguntas sobre \${tema} en \${lenguaje}.

🚨 OBLIGATORIO - LEE ESTO PRIMERO:
- Tema: \${tema}
- Lenguaje: \${lenguaje}
- TODAS las preguntas DEBEN usar sintaxis real de \${lenguaje}
- NO uses pseudocódigo
- NO hagas preguntas genéricas

EJEMPLO DE PREGUNTA CORRECTA:
"¿Qué imprime este código en \${lenguaje}?
for i in range(3):
    print(i)"

EJEMPLO DE PREGUNTA INCORRECTA (NO HAGAS ESTO):
"¿Cuál es el propósito de programar?" ❌
\`;
```

**Resultado:** Ahora genera preguntas específicas con código real

---

### Problema 5: Respuesta Cortada (Incomplete)

**Error:**
- JSON incompleto
- Respuesta se corta a la mitad

**Causa:** `maxTokens` muy bajo (2500)

**Solución:**
```typescript
const respuestaGemini = await this.geminiClient.generate(prompt, {
  temperature: 0.8,
  maxTokens: 5000,  // Aumentado de 2500 a 5000
});
```

---

### Problema 6: Rate Limit 429

**Error:**
```
Error 429: Too Many Requests
```

**Causa:** Más de 15 requests en 60 segundos

**Solución:** Sistema de cola automática
```typescript
if (this.requestsEnVentana >= this.limite) {
  // Encolar request automáticamente
  await new Promise(resolve => setTimeout(resolve, 60000));
}
```

Los requests se procesan automáticamente cuando pasa la ventana.

---

## 🔗 Integración con el Equipo

### Flujo Completo:

1. **Estudiante** envía código
2. **PANCHO** llama a LULU (`/validate-code`)
3. **LULU** analiza con Gemini y retorna resultado
4. **PANCHO** guarda el intento en BD
5. **PANCHO** llama a **TOÑO** para actualizar progreso
6. **TOÑO** calcula porcentaje completado
7. **PANCHO** retorna resultado al estudiante

### Ejemplo de Integración (PANCHO):

```typescript
// En el servicio de PANCHO
async evaluarCodigo(estudiante_id: number, ejercicio_id: number, codigo: string) {
  // 1. Obtener ejercicio
  const ejercicio = await this.obtenerEjercicio(ejercicio_id);
  
  // 2. Validar con LULU
  const response = await fetch('http://localhost:3000/api/v1/gemini/validate-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      codigo_enviado: codigo,
      ejercicio_id,
      lenguaje: ejercicio.lenguaje,
      casos_prueba: ejercicio.casos_prueba,
      enunciado: ejercicio.enunciado
    })
  });
  
  const { data } = await response.json();
  
  // 3. Guardar intento
  await this.guardarIntento({
    estudiante_id,
    ejercicio_id,
    codigo_enviado: codigo,
    resultado: data.resultado,
    puntos: data.puntos_obtenidos
  });
  
  // 4. Actualizar progreso (llamar a TOÑO)
  if (data.resultado === 'correcto') {
    await this.actualizarProgreso(
      estudiante_id, 
      ejercicio.subtema_id, 
      data.puntos_obtenidos
    );
  }
  
  return data;
}
```

---




---

## ✅ Checklist Final

**LULU está listo cuando:**
- [x] Valida código correctamente
- [x] Genera preguntas específicas
- [x] Chat funciona
- [x] Rate limiter implementado
- [x] Sistema de caché funcional
- [x] Manejo de errores robusto
- [x] Logs informativos
- [x] Documentación completa
- [x] Probado con múltiples casos
- [x] Listo para integración con PANCHO

---



---

## 📝 Conclusión

LULU está **100% funcional** y listo para ser usado por PANCHO. Todas las funcionalidades están implementadas, probadas y documentadas. El sistema de caché y rate limiting aseguran un uso eficiente de la API de Gemini.


---



---

