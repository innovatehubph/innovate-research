import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest, optionalAuthMiddleware } from '../middleware/auth';
import { templates, getTemplate, getTemplatesForPlan } from '../templates';

const router = Router();

// Get all templates (filter by plan if authenticated)
router.get('/', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userPlan = req.user?.plan || 'FREE';
    const availableTemplates = getTemplatesForPlan(userPlan);
    
    // Return templates with availability flag
    const result = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      requiredPlan: t.plan,
      available: availableTemplates.some(at => at.id === t.id),
      sections: t.sections.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        required: s.required,
      })),
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template details
router.get('/:id', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const template = getTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const userPlan = req.user?.plan || 'FREE';
    const availableTemplates = getTemplatesForPlan(userPlan);
    const isAvailable = availableTemplates.some(t => t.id === template.id);

    res.json({
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      requiredPlan: template.plan,
      available: isAvailable,
      sections: template.sections,
      // Don't expose searchQueries and analysisPrompt to users
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get template search queries (internal use)
router.get('/:id/queries', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const template = getTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check if user has access to this template
    const availableTemplates = getTemplatesForPlan(req.user!.plan);
    if (!availableTemplates.some(t => t.id === template.id)) {
      return res.status(403).json({ error: 'Template not available for your plan' });
    }

    res.json({
      searchQueries: template.searchQueries,
      analysisPrompt: template.analysisPrompt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Preview available plans and their templates
router.get('/preview/plans', (req, res) => {
  const plans = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];
  
  const result = plans.map(plan => ({
    plan,
    templates: getTemplatesForPlan(plan).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
    })),
    templateCount: getTemplatesForPlan(plan).length,
  }));

  res.json(result);
});

export default router;
