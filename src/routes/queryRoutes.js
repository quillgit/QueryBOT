import { Router } from 'express';
import { runNow, createScheduledJob, listJobs, deleteJob, listLogs } from '../controllers/queryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/run', requireAuth, runNow);
router.post('/jobs', requireAuth, createScheduledJob);
router.get('/jobs', listJobs);
router.delete('/jobs/:id', requireAuth, deleteJob);
router.get('/logs', listLogs);

export default router;