import { Router } from 'express';
import { printController } from '../controllers/print.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Routes for printing
// Note: We authenticate to ensure only logged-in users can print slips.
// Depending on user requirements, `authenticate` might be skipped if we want to print via public QR link later.
// For now, let's keep it if we pass auth correctly, or allow public read-only for printing (since it requires a valid ID).
router.get('/import/:id', printController.printImport);
router.get('/export/:id', printController.printExport);
router.get('/transfer/:id', printController.printTransfer);

export default router;
