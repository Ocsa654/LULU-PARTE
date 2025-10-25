import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Infrastructure
import { GeminiClient } from '../infrastructure/gemini/GeminiClient';
import { InMemoryCacheService } from '../infrastructure/cache/InMemoryCacheService';

// Use Cases
import { ValidateCodeUseCase } from '../application/use-cases/ValidateCodeUseCase';
import { GenerateQuestionsUseCase } from '../application/use-cases/GenerateQuestionsUseCase';
import { ChatAssistantUseCase } from '../application/use-cases/ChatAssistantUseCase';

// Presentation
import { GeminiController } from './controllers/GeminiController';
import { createGeminiRoutes } from './routes/gemini.routes';

dotenv.config();

export class App {
  public app: Application;
  private cacheService: InMemoryCacheService;

  constructor() {
    this.app = express();
    this.cacheService = new InMemoryCacheService();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializePeriodicTasks();
  }

  private initializeMiddlewares(): void {
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logger
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`📥 ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'lulu-gemini-service',
        timestamp: new Date().toISOString()
      });
    });

    // Dependency Injection (Clean Architecture)
    const geminiClient = new GeminiClient();
    
    const validateCodeUseCase = new ValidateCodeUseCase(
      geminiClient,
      this.cacheService
    );
    
    const generateQuestionsUseCase = new GenerateQuestionsUseCase(
      geminiClient,
      this.cacheService
    );
    
    const chatAssistantUseCase = new ChatAssistantUseCase(
      geminiClient
    );

    // Controller
    const geminiController = new GeminiController(
      validateCodeUseCase,
      generateQuestionsUseCase,
      chatAssistantUseCase
    );

    // Routes
    this.app.use('/api/v1/gemini', createGeminiRoutes(geminiController));

    // 404 Handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint no encontrado',
        path: req.path
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ [Error]:', err);
      
      res.status(500).json({
        error: 'Error interno del servidor',
        mensaje: err.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  private initializePeriodicTasks(): void {
    // Limpieza de caché cada 24 horas
    setInterval(() => {
      console.log('🧹 Ejecutando limpieza de caché...');
      this.cacheService.limpiarCacheAntiguo();
    }, 24 * 60 * 60 * 1000);
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log('');
      console.log('🚀 ================================================');
      console.log('🚀  LULU - Gemini AI Service (Clean Architecture)');
      console.log('🚀 ================================================');
      console.log(`🚀  Puerto: ${port}`);
      console.log(`🚀  URL: http://localhost:${port}`);
      console.log(`🚀  Health: http://localhost:${port}/health`);
      console.log(`🚀  API: http://localhost:${port}/api/v1/gemini`);
      console.log('🚀 ================================================');
      console.log('');
      console.log('📝 Endpoints disponibles:');
      console.log('   POST /api/v1/gemini/validate-code');
      console.log('   POST /api/v1/gemini/generate-questions');
      console.log('   POST /api/v1/gemini/chat');
      console.log('   DELETE /api/v1/gemini/chat');
      console.log('   GET /api/v1/gemini/stats');
      console.log('');
      console.log('✅ Servidor listo para recibir peticiones');
      console.log('');
    });
  }
}
