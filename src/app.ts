import express from 'express';
const app = express();
import cors from 'cors';
import globalErrorHandler from './middleware/globalErrorHandler';
import routeNotFound from './middleware/routeNotFound';
import Routes from './routes';

// middleWares
app.use(express.json());
// app.use(cors());
app.use(
  cors({
    origin: ['*', 'http://localhost:5173'],
    methods: 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  }),
);

app.get('/', (req, res) => {
  res.send('Welcome to Mr. Amin Lawyer server..!');
});

// Routes
app.use('/api/v1', Routes);

// route not found
app.use(routeNotFound);

// global error handler
app.use(globalErrorHandler);

export default app;
