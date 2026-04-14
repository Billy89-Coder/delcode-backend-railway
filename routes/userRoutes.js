import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getDevices, getMe, getScanOutcome, logoutDevice } from '../controllers/userController.js';

const router = Router();

router.use(requireAuth);
router.get('/me', getMe);
router.get('/devices', getDevices);
router.get('/scan-outcome', getScanOutcome);
router.delete('/devices/:deviceId', logoutDevice);

export default router;
