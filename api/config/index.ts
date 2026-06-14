import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  
  DATABASE_URL: z.string(),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  
  RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
  
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('neuro-data'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  SERVER_PORT: z.coerce.number().default(3001),
  SERVER_HOST: z.string().default('0.0.0.0'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  
  COMPUTE_ENGINE_URL: z.string().default('http://localhost:8001'),
  COMPUTE_TIMEOUT: z.coerce.number().default(3600000),
  
  RESIDUAL_THRESHOLD: z.coerce.number().default(10),
  SOURCE_OFFSET_THRESHOLD: z.coerce.number().default(5),
  PATIENT_DEVIATION_THRESHOLD: z.coerce.number().default(8),
  CONSECUTIVE_DEVIATION_COUNT: z.coerce.number().default(3),
  AUTO_SUSPEND_ENABLED: z.coerce.boolean().default(true),
  
  NAVIGATION_SYSTEM_URL: z.string().optional(),
  
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE: z.string().default('./logs/app.log'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ 环境变量配置错误:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isStaging = config.NODE_ENV === 'staging';

export default config;
