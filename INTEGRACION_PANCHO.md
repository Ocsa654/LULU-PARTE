# 🔗 Guía de Integración LULU ↔ PANCHO

## 📋 Resumen

Este documento especifica **exactamente** cómo PANCHO debe integrar y llamar a los servicios de LULU.

---

## 🎯 Funciones que PANCHO Llama

### 1. 🔍 Validar Código del Estudiante

**Cuándo:** Cuando un estudiante envía su solución a un ejercicio de programación.

**Endpoint:**
```
POST http://localhost:3000/api/v1/gemini/validate-code
```

**Headers Requeridos:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token_del_usuario>"
}
```

**Request Body:**
```typescript
{
  codigo_enviado: string;        // Código del estudiante
  ejercicio_id: number;          // ID del ejercicio
  lenguaje: string;              // 'python', 'javascript', 'java', etc.
  casos_prueba: Array<{          // Opcional
    input: any[];
    expected: any;
  }>;
  enunciado?: string;            // Opcional: descripción del ejercicio
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    resultado: 'correcto' | 'incorrecto' | 'error';
    puntos_obtenidos: number;    // 0-100
    retroalimentacion_llm: string;
    errores_encontrados: string[];
    casos_prueba_pasados: number;
    casos_prueba_totales: number;
  }
}
```

**Ejemplo de Integración en PANCHO:**
```typescript
// En PanchoService.ts o EjercicioController.ts

async evaluarEjercicio(req: Request, res: Response) {
  const { codigo, ejercicio_id } = req.body;
  const token = req.headers.authorization; // Token del usuario autenticado
  
  // 1. Obtener datos del ejercicio de la BD de PANCHO
  const ejercicio = await this.ejercicioRepository.findOne({
    where: { id: ejercicio_id }
  });
  
  // 2. Llamar a LULU para validar
  const luluResponse = await fetch('http://localhost:3000/api/v1/gemini/validate-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token  // ⚠️ IMPORTANTE: Pasar el token del usuario
    },
    body: JSON.stringify({
      codigo_enviado: codigo,
      ejercicio_id: ejercicio.id,
      lenguaje: ejercicio.lenguaje,
      casos_prueba: ejercicio.casos_prueba,
      enunciado: ejercicio.enunciado
    })
  });
  
  const validacion = await luluResponse.json();
  
  // 3. Guardar el intento en la BD de PANCHO
  await this.intentoEjercicioRepository.save({
    estudiante_id: req.userId,
    ejercicio_id: ejercicio.id,
    codigo_enviado: codigo,
    resultado: validacion.data.resultado,
    puntos_obtenidos: validacion.data.puntos_obtenidos,
    retroalimentacion: validacion.data.retroalimentacion_llm,
    fecha_intento: new Date()
  });
  
  // 4. Si es correcto, actualizar progreso (llamar a TOÑO)
  if (validacion.data.resultado === 'correcto') {
    await this.actualizarProgreso(
      req.userId,
      ejercicio.subtema_id,
      validacion.data.puntos_obtenidos
    );
  }
  
  // 5. Retornar al frontend
  return res.json({
    success: true,
    validacion: validacion.data
  });
}
```

---

### 2. 📝 Generar Preguntas de Quiz

**Cuándo:** Cuando PANCHO necesita crear un quiz sobre un subtema.

**Endpoint:**
```
POST http://localhost:3000/api/v1/gemini/generate-questions
```

**Headers Requeridos:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token_del_usuario>"
}
```

**Request Body:**
```typescript
{
  subtema_id: number;           // ID del subtema
  cantidad: number;             // Cantidad de preguntas (1-10)
  dificultad: 'básica' | 'intermedia' | 'avanzada';
  lenguaje?: string;            // Opcional: 'Python', 'JavaScript', etc.
  tema?: string;                // Opcional: 'Bucles', 'Funciones', etc.
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    preguntas: Array<{
      texto: string;                    // Pregunta con código
      opciones: Array<{
        texto: string;
        es_correcta: boolean;
        explicacion: string;
      }>;
      dificultad: string;
      retroalimentacion_correcta: string;
      retroalimentacion_incorrecta: string;
      concepto_clave: string;
    }>;
    subtema_id: number;
    cantidad_generada: number;
  }
}
```

**Ejemplo de Integración en PANCHO:**
```typescript
async crearQuiz(req: Request, res: Response) {
  const { subtema_id, cantidad, dificultad } = req.body;
  const token = req.headers.authorization;
  
  // 1. Obtener información del subtema de PANCHO
  const subtema = await this.subtemaRepository.findOne({
    where: { id: subtema_id },
    relations: ['tema']
  });
  
  // 2. Llamar a LULU para generar preguntas
  const luluResponse = await fetch('http://localhost:3000/api/v1/gemini/generate-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({
      subtema_id: subtema.id,
      cantidad: cantidad || 5,
      dificultad: dificultad || 'intermedia',
      lenguaje: subtema.lenguaje_programacion,
      tema: subtema.nombre
    })
  });
  
  const preguntasGeneradas = await luluResponse.json();
  
  // 3. LULU ya guardó las preguntas en la BD, PANCHO solo las referencia
  // Puedes crear un quiz que apunte a esas preguntas
  const quiz = await this.quizRepository.save({
    subtema_id: subtema.id,
    titulo: `Quiz de ${subtema.nombre}`,
    dificultad: dificultad,
    cantidad_preguntas: preguntasGeneradas.data.cantidad_generada
  });
  
  // 4. Retornar al frontend
  return res.json({
    success: true,
    quiz: {
      id: quiz.id,
      preguntas: preguntasGeneradas.data.preguntas
    }
  });
}
```

---

### 3. 💬 Chat Educativo (Opcional)

**Cuándo:** Si PANCHO quiere proporcionar un asistente en tiempo real.

**Endpoint:**
```
POST http://localhost:3000/api/v1/gemini/chat
```

**Request Body:**
```typescript
{
  mensaje: string;
  contexto?: {
    tema_actual?: string;
    subtema_actual?: string;
    ejercicio_actual?: number;
  };
}
```

---

## 🔄 Flujo Completo de Integración

```
┌─────────────┐
│  Estudiante │
└──────┬──────┘
       │
       │ 1. Envía código
       ▼
┌─────────────┐
│   PANCHO    │──────┐
└──────┬──────┘      │
       │             │ 2. Valida con LULU
       │             ▼
       │      ┌─────────────┐
       │      │    LULU     │
       │      └──────┬──────┘
       │             │
       │             │ 3. Retorna resultado
       │◄────────────┘
       │
       │ 4. Guarda intento en BD
       │
       │ 5. Actualiza progreso (TOÑO)
       │
       ▼
┌─────────────┐
│    TOÑO     │
└──────┬──────┘
       │
       │ 6. Calcula porcentaje
       │
       ▼
┌─────────────┐
│  Estudiante │ (Recibe retroalimentación)
└─────────────┘
```

---

## ⚠️ Puntos Críticos

### 1. **Siempre Pasar el Token JWT**
```typescript
// ✅ CORRECTO
headers: {
  'Authorization': req.headers.authorization
}

// ❌ INCORRECTO (no hardcodear)
headers: {
  'Authorization': 'Bearer abc123...'
}
```

### 2. **Manejar Errores de LULU**
```typescript
const luluResponse = await fetch('http://localhost:3000/api/v1/gemini/validate-code', {...});

if (!luluResponse.ok) {
  // LULU tuvo un error (500, 401, etc.)
  const error = await luluResponse.json();
  
  return res.status(luluResponse.status).json({
    error: 'Error al validar código',
    detalles: error
  });
}

const validacion = await luluResponse.json();

if (!validacion.success) {
  // LULU procesó pero falló
  return res.status(400).json({
    error: 'Validación fallida',
    detalles: validacion
  });
}

// ✅ Todo bien
const resultado = validacion.data;
```

### 3. **No Duplicar Lógica de BD**

LULU ya guarda:
- ✅ Retroalimentaciones en `retroalimentacion_llm`
- ✅ Preguntas en `preguntas_quiz`
- ✅ Opciones en `opciones_respuesta`

PANCHO debe guardar:
- ✅ Intentos de ejercicios
- ✅ Intentos de quizzes
- ✅ Referencia al quiz creado

**No es necesario que PANCHO duplique las preguntas.**

---

## 🧪 Cómo Probar la Integración

### 1. Arrancar Servicios
```bash
# Terminal 1: SAM (puerto 4000)
cd d:\SAMUEL\proyecto-asistente-AprendizajeProgramacion\backend
npm run dev

# Terminal 2: LULU (puerto 3000)
cd d:\LULUWEBSERVICES
npm run dev

# Terminal 3: PANCHO (puerto 5000)
cd d:\PANCHO\backend
npm run dev
```

### 2. Obtener Token de SAM
```bash
POST http://localhost:4000/api/v1/auth/login
{
  "email": "estudiante@example.com",
  "contraseña": "password123"
}

# Copiar el accessToken
```

### 3. Probar desde PANCHO
```bash
POST http://localhost:5000/api/v1/ejercicios/evaluar
Authorization: Bearer <token>
{
  "codigo": "def suma(a, b):\n    return a + b",
  "ejercicio_id": 1
}
```

---

## 📊 Estructura de Datos Esperada

### Ejercicio (en PANCHO)
```typescript
{
  id: number;
  subtema_id: number;
  enunciado: string;
  lenguaje: 'python' | 'javascript' | 'java';
  casos_prueba: Array<{
    input: any[];
    expected: any;
  }>;
  puntos_maximos: number;
}
```

### Quiz (en PANCHO)
```typescript
{
  id: number;
  subtema_id: number;
  titulo: string;
  dificultad: 'básica' | 'intermedia' | 'avanzada';
  // Las preguntas están en la BD compartida (preguntas_quiz)
}
```

---

## 🚀 Ejemplo Completo de Integración

```typescript
// PanchoEjercicioController.ts

import { Request, Response } from 'express';
import { IntentoEjercicioRepository } from '../repositories/IntentoEjercicioRepository';
import { EjercicioRepository } from '../repositories/EjercicioRepository';

export class EjercicioController {
  constructor(
    private intentoRepo: IntentoEjercicioRepository,
    private ejercicioRepo: EjercicioRepository
  ) {}

  async evaluar(req: Request, res: Response) {
    const { codigo_enviado, ejercicio_id } = req.body;
    const estudianteId = req.userId; // Del middleware de auth
    const token = req.headers.authorization;

    try {
      // 1. Obtener ejercicio
      const ejercicio = await this.ejercicioRepo.findOne({ where: { id: ejercicio_id } });
      
      if (!ejercicio) {
        return res.status(404).json({ error: 'Ejercicio no encontrado' });
      }

      // 2. Validar con LULU
      const luluResponse = await fetch('http://localhost:3000/api/v1/gemini/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token!
        },
        body: JSON.stringify({
          codigo_enviado,
          ejercicio_id: ejercicio.id,
          lenguaje: ejercicio.lenguaje,
          casos_prueba: ejercicio.casos_prueba,
          enunciado: ejercicio.enunciado
        })
      });

      if (!luluResponse.ok) {
        throw new Error('Error en servicio LULU');
      }

      const validacion = await luluResponse.json();

      // 3. Guardar intento
      const intento = await this.intentoRepo.save({
        estudiante_id: estudianteId,
        ejercicio_id: ejercicio.id,
        codigo_enviado,
        resultado: validacion.data.resultado,
        puntos_obtenidos: validacion.data.puntos_obtenidos,
        retroalimentacion: validacion.data.retroalimentacion_llm
      });

      // 4. Actualizar progreso (llamar a TOÑO)
      if (validacion.data.resultado === 'correcto') {
        await this.actualizarProgreso(estudianteId, ejercicio.subtema_id);
      }

      // 5. Retornar
      return res.json({
        success: true,
        intento: {
          id: intento.id,
          resultado: validacion.data.resultado,
          puntos: validacion.data.puntos_obtenidos,
          retroalimentacion: validacion.data.retroalimentacion_llm
        }
      });

    } catch (error: any) {
      console.error('Error al evaluar ejercicio:', error);
      return res.status(500).json({
        error: 'Error al evaluar ejercicio',
        mensaje: error.message
      });
    }
  }

  private async actualizarProgreso(estudianteId: number, subtemaId: number) {
    // Llamar a TOÑO para actualizar progreso
    await fetch('http://localhost:6000/api/v1/progreso/actualizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estudiante_id: estudianteId,
        subtema_id: subtemaId
      })
    });
  }
}
```

---

## ✅ Checklist de Integración

- [ ] PANCHO tiene acceso a la BD de SAM (mismo PostgreSQL)
- [ ] PANCHO puede obtener tokens JWT de SAM
- [ ] PANCHO llama a LULU con el token del usuario
- [ ] PANCHO guarda los intentos en su propia tabla
- [ ] PANCHO llama a TOÑO para actualizar progreso
- [ ] Manejo de errores implementado
- [ ] Logs de integración configurados

---

## 📞 Contacto

Para dudas sobre la integración, revisar:
- `LULU_DOCUMENTACION_COMPLETA.md` - Documentación completa de LULU
- `AUTENTICACION_JWT.md` - Sistema de autenticación

**Estado:** ✅ LISTO PARA INTEGRACIÓN
