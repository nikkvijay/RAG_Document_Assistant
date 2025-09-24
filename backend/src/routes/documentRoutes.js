import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import ragService from '../services/ragService.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../', config.uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed', 400));
    }
  }
});

// Upload document endpoint
router.post('/upload', upload.single('document'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Get mode from request body (default: 'replace')
    const mode = req.body.mode || 'replace'; // 'replace' or 'append'

    logger.info(`File uploaded: ${req.file.filename} (mode: ${mode})`);

    // Validate mode
    if (!['replace', 'append'].includes(mode)) {
      throw new AppError('Invalid mode. Use "replace" or "append"', 400);
    }

    // Process the document with specified mode
    const result = await ragService.processDocument(req.file.path, { mode });

    res.json({
      ...result,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
});

// Get system status
router.get('/status', async (req, res, next) => {
  try {
    const status = await ragService.getStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    next(error);
  }
});

// Get documents list
router.get('/', async (req, res, next) => {
  try {
    const result = await ragService.getDocuments();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Reset system
router.post('/reset', async (req, res, next) => {
  try {
    const result = await ragService.reset();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;