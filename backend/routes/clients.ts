import express, { Request, Response, Router } from 'express';
const router: Router = express.Router();
import Client from '../models/Client';

// @route   POST /api/clients/add
router.post('/add', async (req: Request, res: Response) => {
  try {
    const newClient = new Client(req.body);
    const client = await newClient.save();
    res.status(201).json({ message: 'Client added successfully', client });
  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/clients/:id
// @desc    Update an existing client
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true } // This option returns the updated document
    );
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json({ message: 'Client updated successfully', client });
  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/clients/:id
// @desc    Delete a client
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server Error');
  }
});

export default router;