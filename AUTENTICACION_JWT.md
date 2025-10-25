# 🔐 Sistema de Autenticación JWT en LULU

## 📋 Resumen

LULU ahora implementa **autenticación JWT** para identificar usuarios y proteger los endpoints. Esto permite:
- ✅ Saber qué usuario está haciendo cada request
- ✅ Proteger endpoints de acceso no autorizado
- ✅ Integrarse con el sistema de autenticación de SAM

---

## ⚙️ Configuración

### 1. Variables de Entorno

Actualiza tu archivo `.env` con el JWT_SECRET (debe ser el **mismo** que usa SAM):

```env
# JWT Authentication
JWT_SECRET=tu_secreto_super_seguro_para_access_token_12345
```

⚠️ **IMPORTANTE:** El `JWT_SECRET` debe ser exactamente el mismo que usa SAM para que los tokens sean válidos.

---

## 🔒 Endpoints Protegidos

Todos los endpoints principales de LULU ahora requieren autenticación:

| Endpoint | Autenticación |
|----------|---------------|
| `POST /api/v1/gemini/validate-code` | 🔒 Requerida |
| `POST /api/v1/gemini/generate-questions` | 🔒 Requerida |
| `POST /api/v1/gemini/chat` | 🔒 Requerida |
| `DELETE /api/v1/gemini/chat` | 🔒 Requerida |
| `GET /api/v1/gemini/stats` | 📊 Pública |

---

## 🧪 Cómo Probar con Thunder Client

### Paso 1: Obtener un Token

Primero, debes autenticarte con el servicio de SAM:

```http
POST http://localhost:4000/api/v1/auth/login
Content-Type: application/json

{
  "email": "estudiante@example.com",
  "contraseña": "password123"
}
```

**Respuesta:**
```json
{
  "usuario": {
    "id": 1,
    "email": "estudiante@example.com",
    "nombre": "Juan",
    "rol": "estudiante"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Copia el `accessToken`** para usarlo en los siguientes pasos.

---

### Paso 2: Usar el Token en LULU

Ahora puedes hacer requests a LULU incluyendo el token en el header `Authorization`:

#### Ejemplo: Validar Código

```http
POST http://localhost:3000/api/v1/gemini/validate-code
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "codigo_enviado": "def suma(a, b):\n    return a + b",
  "ejercicio_id": 101,
  "lenguaje": "python",
  "casos_prueba": [
    { "input": [5, 10], "expected": 15 }
  ],
  "enunciado": "Crea una función que sume dos números."
}
```

#### Ejemplo: Generar Preguntas

```http
POST http://localhost:3000/api/v1/gemini/generate-questions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "subtema_id": 201,
  "cantidad": 3,
  "dificultad": "intermedia",
  "lenguaje": "Python",
  "tema": "Bucles y ciclos"
}
```

#### Ejemplo: Chat

```http
POST http://localhost:3000/api/v1/gemini/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "mensaje": "¿Cómo funciona un bucle for en Python?"
}
```

---

## ❌ Errores Comunes

### Error 1: "No se proporcionó token de autenticación"

```json
{
  "success": false,
  "error": "No autorizado",
  "message": "No se proporcionó token de autenticación"
}
```

**Solución:** Incluir el header `Authorization: Bearer <token>`

---

### Error 2: "Formato de token inválido"

```json
{
  "success": false,
  "error": "No autorizado",
  "message": "Formato de token inválido. Use: Bearer <token>"
}
```

**Solución:** Asegurarse de usar el formato correcto: `Bearer <token>` (con espacio)

---

### Error 3: "Token inválido"

```json
{
  "success": false,
  "error": "No autorizado",
  "message": "Token inválido"
}
```

**Causas posibles:**
- Token malformado
- JWT_SECRET diferente entre SAM y LULU
- Token manipulado

**Solución:** Verificar que `JWT_SECRET` sea el mismo en SAM y LULU

---

### Error 4: "Token expirado"

```json
{
  "success": false,
  "error": "Token expirado",
  "message": "El token ha expirado. Por favor, inicie sesión nuevamente"
}
```

**Solución:** 
1. Hacer login nuevamente en SAM
2. O usar el `refreshToken` para obtener un nuevo `accessToken`

---

## 🔗 Integración con PANCHO

Cuando PANCHO llame a LULU, debe incluir el token del usuario autenticado:

```typescript
// Ejemplo en PANCHO
async evaluarCodigo(req: Request, res: Response) {
  // El token viene del usuario autenticado en PANCHO
  const token = req.headers.authorization;
  
  // Llamar a LULU pasando el token
  const response = await fetch('http://localhost:3000/api/v1/gemini/validate-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token  // ✅ Pasar el token del usuario
    },
    body: JSON.stringify({
      codigo_enviado: req.body.codigo,
      ejercicio_id: req.body.ejercicio_id,
      lenguaje: 'python',
      casos_prueba: ejercicio.casos_prueba,
      enunciado: ejercicio.enunciado
    })
  });
  
  const resultado = await response.json();
  // ...
}
```

---

## 📊 Beneficios de la Autenticación

1. **Seguridad:** Solo usuarios autenticados pueden usar LULU
2. **Trazabilidad:** Sabemos qué usuario hizo cada request
3. **Rate Limiting por usuario:** Podemos limitar uso por usuario individual
4. **Personalización:** Chat mantiene historial por usuario
5. **Auditoría:** Logs muestran qué usuario validó qué código

---

## 🧩 Arquitectura del Sistema

```
Usuario → SAM (Login) → Token JWT
                           ↓
Usuario → PANCHO → LULU (con token)
                     ↓
            Middleware verifica token
                     ↓
            Controlador recibe usuario_id
                     ↓
            Use Case procesa con usuario_id
```

---

## 📝 Estructura del Token JWT

El token contiene:

```json
{
  "userId": 1,
  "email": "estudiante@example.com",
  "rol": "estudiante",
  "iat": 1698345678,  // Fecha de emisión
  "exp": 1698349278   // Fecha de expiración (1 hora)
}
```

Esta información está disponible en `req.userId`, `req.userEmail`, `req.userRole` después del middleware.

---

## ✅ Checklist de Implementación

- [x] Middleware de autenticación creado
- [x] Rutas protegidas con middleware
- [x] Controladores actualizados para usar `req.userId`
- [x] Variables de entorno configuradas
- [x] Documentación completa

---

## 🚀 Próximos Pasos

1. **Configurar JWT_SECRET** en `.env` (usar el mismo de SAM)

