import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// List all active suppliers
router.get('/', supplierController.getAll);

// Create new supplier
router.post('/', supplierController.create);

export default router;
