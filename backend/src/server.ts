import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { getHandler    } from './routes/get';
import { putHandler    } from './routes/put';
import { postHandler   } from './routes/post';
import { deleteHandler } from './routes/delete';
import { createAppGivenPool } from './app'

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Load environment variables
dotenv.config();

createAppGivenPool(pool);