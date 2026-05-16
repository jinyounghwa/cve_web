import dotenv from 'dotenv';
import { startScheduler } from './scheduler';

dotenv.config();

startScheduler();

console.log('[CVE-Agent] 크롤러 서비스 실행 중... (CTRL+C로 종료)');
