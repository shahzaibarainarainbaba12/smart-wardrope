import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { env } from './config/env.js';
import routes from './routes/index.js';

import { apiLimiter } from './middleware/rateLimit.middleware.js';
import {
  notFound,
  errorHandler
} from './middleware/error.middleware.js';

const app = express();

app.disable('x-powered-by');


/* ======================================================
   SECURITY
====================================================== */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);


/* ======================================================
   CORS
====================================================== */

const allowedOrigins = env.clientUrl
  .split(',')
  .map((value) =>
    value
      .trim()
      .replace(/\/$/, '')
  )
  .filter(Boolean);


app.use(
  cors({
    origin(origin, callback) {
      /*
       * Allow requests without Origin header:
       * Railway health checks
       * Postman
       * Server-to-server requests
       */
      if (!origin) {
        return callback(
          null,
          true
        );
      }


      const cleanOrigin =
        origin.replace(/\/$/, '');


      if (
        allowedOrigins.includes(
          cleanOrigin
        )
      ) {
        return callback(
          null,
          true
        );
      }


      console.log(
        'CORS blocked origin:',
        origin
      );


      return callback(
        new Error(
          `CORS blocked: ${origin}`
        )
      );
    },


    credentials: true,


    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],


    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ]
  })
);


/* ======================================================
   IMPORTANT

   Do NOT add:

   app.options('*', cors());

   Express 5 / path-to-regexp can crash on that wildcard.
   cors() middleware above already handles OPTIONS.
====================================================== */


/* ======================================================
   BODY PARSERS
====================================================== */

app.use(
  express.json({
    limit: '2mb'
  })
);


app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb'
  })
);


/* ======================================================
   LOGGING
====================================================== */

app.use(
  morgan(
    env.nodeEnv === 'production'
      ? 'combined'
      : 'dev'
  )
);


/* ======================================================
   STATIC UPLOADS
====================================================== */

app.use(
  '/uploads',
  express.static(
    path.resolve(
      env.uploadDir
    )
  )
);


/* ======================================================
   API
====================================================== */

app.use(
  '/api',
  apiLimiter,
  routes
);


/* ======================================================
   404
====================================================== */

app.use(
  notFound
);


/* ======================================================
   ERROR HANDLER
====================================================== */

app.use(
  errorHandler
);


export default app;