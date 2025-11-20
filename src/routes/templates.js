/**
 * Templates Routes
 * Quick Add Templates API - Save and reuse favorite meals and workouts
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../lib/auth');
const { supabaseAdmin } = require('../lib/supabaseServer');
const { validateTemplate, validateTemplateUpdate } = require('../validation/templates');
const logger = require('../lib/logger');
const { createTemplateLimiter } = require('../lib/rateLimit');

const templateLimiter = createTemplateLimiter();

// GET /v1/templates - Get all templates for authenticated user
router.get('/v1/templates', authenticateJWT, async (req, res) => {
  try {
    const userId = req.userId;

    logger.info('Get templates requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
    });

    // Query templates, sorted by usage_count descending (most used first)
    const { data: templates, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    logger.info('Templates fetched successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      count: templates?.length || 0,
    });

    res.json({
      ok: true,
      data: {
        templates: templates || [],
        count: templates?.length || 0
      }
    });
  } catch (error) {
    logger.error('Get templates error', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_TEMPLATES_FETCH_FAILED',
      message: 'Failed to fetch templates'
    });
  }
});

// GET /v1/templates/:type - Get templates by type
router.get('/v1/templates/:type', authenticateJWT, async (req, res) => {
  try {
    const userId = req.userId;
    const { type } = req.params;

    logger.info('Get templates by type requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      type,
    });

    // Validate type
    const validTypes = ['meal_breakfast', 'meal_lunch', 'meal_dinner', 'meal_snack', 'workout'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_INVALID_TYPE',
        message: 'Invalid template type'
      });
    }

    const { data: templates, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('usage_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    logger.info('Templates by type fetched successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      type,
      count: templates?.length || 0,
    });

    res.json({
      ok: true,
      data: {
        templates: templates || [],
        count: templates?.length || 0
      }
    });
  } catch (error) {
    logger.error('Get templates by type error', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      type: req.params.type,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_TEMPLATES_FETCH_FAILED',
      message: 'Failed to fetch templates'
    });
  }
});

// POST /v1/templates - Create new template
router.post('/v1/templates', authenticateJWT, templateLimiter, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, type, data } = req.body;

    logger.info('Create template requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      type,
      dataSize: Buffer.byteLength(JSON.stringify(data), 'utf8'),
    });

    // Validate input
    const validation = validateTemplate({ name, type, data });
    if (!validation.valid) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_VALIDATION_FAILED',
        message: validation.error
      });
    }

    // Check for duplicate name (case-insensitive)
    const { data: existing } = await supabaseAdmin
      .from('templates')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', name);

    if (existing && existing.length > 0) {
      return res.status(409).json({
        ok: false,
        code: 'ERR_DUPLICATE_NAME',
        message: 'A template with this name already exists'
      });
    }

    // Create template
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .insert({
        user_id: userId,
        name: name.trim(),
        type,
        data,
        usage_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Template created successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      templateId: template.id,
      type: template.type,
    });

    res.status(201).json({
      ok: true,
      data: {
        template
      }
    });
  } catch (error) {
    logger.error('Create template error', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_TEMPLATE_CREATE_FAILED',
      message: 'Failed to create template'
    });
  }
});

// PUT /v1/templates/:id - Update template
router.put('/v1/templates/:id', authenticateJWT, templateLimiter, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updates = req.body;

    logger.info('Update template requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      templateId: id,
      dataSize: updates.data ? Buffer.byteLength(JSON.stringify(updates.data), 'utf8') : undefined,
    });

    // Validate input
    const validation = validateTemplateUpdate(updates);
    if (!validation.valid) {
      return res.status(400).json({
        ok: false,
        code: 'ERR_VALIDATION_FAILED',
        message: validation.error
      });
    }

    // If updating name, check for duplicates (excluding current template)
    if (updates.name) {
      const { data: existing } = await supabaseAdmin
        .from('templates')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', updates.name)
        .neq('id', id);

      if (existing && existing.length > 0) {
        return res.status(409).json({
          ok: false,
          code: 'ERR_DUPLICATE_NAME',
          message: 'A template with this name already exists'
        });
      }
    }

    // Build update object
    const updateData = {};
    if (updates.name) updateData.name = updates.name.trim();
    if (updates.data) updateData.data = updates.data;

    // Update template (RLS ensures user can only update their own)
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116' || !template) {
        return res.status(404).json({
          ok: false,
          code: 'ERR_TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        });
      }
      throw error;
    }

    if (!template) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_TEMPLATE_NOT_FOUND',
        message: 'Template not found'
      });
    }

    logger.info('Template updated successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      templateId: id,
    });

    res.json({
      ok: true,
      data: {
        template
      }
    });
  } catch (error) {
    logger.error('Update template error', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      templateId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_TEMPLATE_UPDATE_FAILED',
      message: 'Failed to update template'
    });
  }
});

// DELETE /v1/templates/:id - Delete template
router.delete('/v1/templates/:id', authenticateJWT, templateLimiter, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    logger.info('Delete template requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      templateId: id,
    });

    // First check if template exists and belongs to user
    const { data: existing } = await supabaseAdmin
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_TEMPLATE_NOT_FOUND',
        message: 'Template not found'
      });
    }

    // Delete template
    const { error } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    logger.info('Template deleted successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      templateId: id,
    });

    res.json({
      ok: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Delete template error', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      templateId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_TEMPLATE_DELETE_FAILED',
      message: 'Failed to delete template'
    });
  }
});

// POST /v1/templates/:id/use - Use template (increment usage count)
router.post('/v1/templates/:id/use', authenticateJWT, templateLimiter, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    logger.info('Use template requested', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      templateId: id,
    });

    // First get current template to increment usage_count
    const { data: currentTemplate } = await supabaseAdmin
      .from('templates')
      .select('usage_count')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!currentTemplate) {
      return res.status(404).json({
        ok: false,
        code: 'ERR_TEMPLATE_NOT_FOUND',
        message: 'Template not found'
      });
    }

    // Increment usage_count and update last_used_at
    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .update({
        usage_count: currentTemplate.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    logger.info('Template used successfully', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(userId),
      templateId: id,
      newUsageCount: template.usage_count,
    });

    res.json({
      ok: true,
      data: {
        template
      }
    });
  } catch (error) {
    logger.error('Use template error', {
      requestId: req.requestId,
      userIdMasked: logger.maskUserId(req.userId),
      templateId: req.params.id,
      error: error.message,
    });

    res.status(500).json({
      ok: false,
      code: 'ERR_TEMPLATE_USE_FAILED',
      message: 'Failed to use template'
    });
  }
});

module.exports = router;
