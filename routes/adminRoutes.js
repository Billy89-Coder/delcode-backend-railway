import { Router } from 'express';
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
router.get('/users', listUsers);
router.patch('/users/:userId/status', updateUserStatus);
router.delete('/users/:userId', deleteUser);
router.get('/analytics', analytics);
router.get('/login-devices', listLoginDevices);
router.delete('/login-devices/:deviceId', adminLogoutDevice);
router.get('/scan-policy', getScanResultPolicy);
router.patch('/scan-policy', updateScanResultPolicy);

export default router;
