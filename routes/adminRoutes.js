import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  adminLogoutDevice,
  analytics,
  deleteUser,
  getScanResultPolicy,
  listLoginDevices,
  listUsers,
  updateScanResultPolicy,
  updateUserStatus
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/users', asyncHandler(listUsers));
router.patch('/users/:userId/status', asyncHandler(updateUserStatus));
router.delete('/users/:userId', asyncHandler(deleteUser));
router.get('/analytics', asyncHandler(analytics));
router.get('/login-devices', asyncHandler(listLoginDevices));
router.delete('/login-devices/:deviceId', asyncHandler(adminLogoutDevice));
router.get('/scan-policy', asyncHandler(getScanResultPolicy));
router.patch('/scan-policy', asyncHandler(updateScanResultPolicy));

export default router;
