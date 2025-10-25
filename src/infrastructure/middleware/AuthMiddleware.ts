import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Extender la interfaz Request de Express para incluir el usuario
 */
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userEmail?: string;
      userRole?: string;
    }
  }
}

/**
 * Interfaz del payload del JWT
 */
interface JwtPayload {
  userId: number;
  email: string;
  rol: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware de autenticación JWT
 * Verifica que el token sea válido y adjunta el usuario al request
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No autorizado',
        message: 'No se proporcionó token de autenticación'
      });
      return;
    }

    // 2. Verificar formato: "Bearer TOKEN"
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'No autorizado',
        message: 'Formato de token inválido. Use: Bearer <token>'
      });
      return;
    }

    const token = parts[1];

    // 3. Verificar y decodificar el token JWT
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET no está configurado en las variables de entorno');
      res.status(500).json({
        success: false,
        error: 'Error de configuración',
        message: 'El servidor no está configurado correctamente'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // 4. Adjuntar información del usuario al request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.rol;

    console.log(`✅ [Auth] Usuario autenticado: ${decoded.email} (ID: ${decoded.userId})`);

    // 5. Continuar con el siguiente middleware/controlador
    next();

  } catch (error) {
    // Manejar errores específicos de JWT
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'No autorizado',
        message: 'Token inválido'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expirado',
        message: 'El token ha expirado. Por favor, inicie sesión nuevamente'
      });
      return;
    }

    // Error genérico
    console.error('❌ [Auth] Error en authMiddleware:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno',
      message: 'Error al verificar autenticación'
    });
  }
};

/**
 * Middleware opcional de autenticación
 * Adjunta el usuario si hay token válido, pero no bloquea si no hay token
 * Útil para endpoints que funcionan con o sin autenticación
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No hay token, pero no es un error
      next();
      return;
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      next();
      return;
    }

    const token = parts[1];
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Adjuntar información del usuario
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.rol;

    console.log(`✅ [Auth] Usuario autenticado (opcional): ${decoded.email}`);

    next();

  } catch (error) {
    // Si hay error, simplemente continúa sin usuario
    next();
  }
};
