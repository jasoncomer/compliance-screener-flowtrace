// Import all the dependencies
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv-safe';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import colors from 'colors';

// handle unhandled rejection error
import '@src/middlewares/errors/unhandledRejection';

// Import Routes
import path from 'path';
import api from '@src/api';

// Import Middleware
import { errorHandlerMiddleware, notFoundMiddleware } from '@src/middlewares';
// Import Api Docs
const swaggerDocument = YAML.load(`${process.cwd()}/swagger/swagger.yaml`);
// const swaggerDocument = YAML.load('./docs/swagger.yaml');

// Access Environment variables
dotenv.config();

colors.enable();

// Initialize app with express
const app: express.Application | undefined = express();

// Load App Middleware
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/swagger.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, '../swagger/swagger.yaml'));
});
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// Serve all static files inside public directory.
app.use('/static', express.static('public'));

// Routes which Should handle the requests
app.use('/api/v1', api);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export default app;
