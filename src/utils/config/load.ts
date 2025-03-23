import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const env_path = path.resolve(process.cwd(), '.env');
console.log(`loading config from: ${env_path}`)
dotenv.config({ path: env_path });

