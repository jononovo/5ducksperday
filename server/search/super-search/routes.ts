import { Router, Request, Response } from 'express';
import { CreditService } from '../../features/billing/credits/service';
import { CREDIT_COSTS } from '../../features/billing/credits/types';
import { search1Variant } from './search1';
import type { StreamEvent } from './shared/types';

const router = Router();

const variants: Record<string, typeof search1Variant> = {
  'v1': search1Variant,
};

router.post('/stream', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { query, variant = 'v1' } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  const selectedVariant = variants[variant];
  if (!selectedVariant) {
    return res.status(400).json({ error: `Unknown variant: ${variant}` });
  }

  try {
    const credits = await CreditService.getUserCredits(userId);
    const requiredCredits = CREDIT_COSTS['super_search'];
    
    if (credits.currentBalance < requiredCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: requiredCredits,
        current: credits.currentBalance
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    console.log(`[SuperSearch] SSE connection established for user ${userId}, variant: ${variant}`);

    const onEvent = (event: StreamEvent) => {
      const eventData = JSON.stringify(event);
      res.write(`data: ${eventData}\n\n`);
    };

    try {
      await selectedVariant.execute(query, onEvent);
      
      await CreditService.deductCredits(userId, 'super_search', true);
      console.log(`[SuperSearch] Deducted ${requiredCredits} credits from user ${userId}`);
    } catch (err) {
      console.error('[SuperSearch] Variant execution error:', err);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('[SuperSearch] Route error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', data: 'Internal server error' })}\n\n`);
      res.end();
    }
  }
});

export default router;
