import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getDevices, getMe, getScanOutcome, logoutDevice } from '../controllers/userController.js';

const router = Router();

router.use(requireAuth);
router.get('/me', asyncHandler(getMe));
router.get('/devices', asyncHandler(getDevices));
router.get('/scan-outcome', asyncHandler(getScanOutcome));
router.delete('/devices/:deviceId', asyncHandler(logoutDevice));

export default router;
