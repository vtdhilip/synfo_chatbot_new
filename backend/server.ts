import express, { Express } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import clientRoutes from './routes/clients';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI || 'mongodb://YOUR_AWS_SERVER_IP:27017/adminPanelDB';

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully...'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/clients', clientRoutes);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
