import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getTestAnalytics,
  pauseTest,
  resumeTest,
  completeTest,
  deleteTest,
  getDashboardStats
} from '../controllers/test-analytics';
import {
  triggerManualRotation,
  getSchedulerStatus
} from '../lib/scheduler-fixed';

const router = Router();

// Dashboard stats
router.get('/dashboard/stats', requireAuth, getDashboardStats);

// Test analytics with rotation logs
router.get('/tests/:testId/analytics', requireAuth, getTestAnalytics);

// Test actions
router.post('/tests/:testId/pause', requireAuth, pauseTest);
router.post('/tests/:testId/resume', requireAuth, resumeTest);
router.post('/tests/:testId/complete', requireAuth, completeTest);
router.post('/tests/:testId/delete', requireAuth, deleteTest);

// Debug endpoints (remove in production)
router.post('/tests/:testId/rotate', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    await triggerManualRotation(testId);
    res.json({ success: true, message: 'Manual rotation triggered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger rotation' });
  }
});

router.get('/scheduler/status', requireAuth, (req, res) => {
  const status = getSchedulerStatus();
  res.json(status);
});

export default router;