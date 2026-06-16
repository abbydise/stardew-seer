import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
    throw new Error('Missing database url');
}

const connectionString : string = process.env.DATABASE_URL;
const sql = postgres(connectionString);

export default sql;
