import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../middlewares/async-handler.js';
import { validateQuery, validateBody } from '../middlewares/validation.js';
import { healthImageQuerySchema, healthImageUpdateSchema } from '../validators/schemas.js';
import { healthImagesRepository } from '../../db/repositories/health-images.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../../../data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const upload = multer({
  dest: path.join(DATA_DIR, 'tmp-uploads'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, PDF`));
    }
  },
});

function getExtension(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  return map[mimetype] || '.bin';
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export const healthImagesRouter = Router();

// POST /api/health-images - Upload images
healthImagesRouter.post(
  '/',
  upload.array('files', MAX_FILES),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: { message: 'No files uploaded' } });
      return;
    }

    const title = req.body.title || '';
    const memo = req.body.memo || '';
    const recordedAt = req.body.recorded_at || new Date().toISOString();

    const results = [];

    for (const file of files) {
      const now = new Date(recordedAt);
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const destDir = path.join(IMAGES_DIR, year, month);
      ensureDir(destDir);

      const uuid = crypto.randomUUID();
      const ext = getExtension(file.mimetype);
      const filename = `${uuid}${ext}`;
      const destPath = path.join(destDir, filename);

      fs.renameSync(file.path, destPath);

      const relativePath = path.relative(DATA_DIR, destPath);

      const record = healthImagesRepository.create({
        title: title || file.originalname,
        memo: memo || undefined,
        file_path: relativePath,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        recorded_at: recordedAt,
      });

      results.push(record);
    }

    res.status(201).json({ data: results });
  })
);

// GET /api/health-images - List images
healthImagesRouter.get(
  '/',
  validateQuery(healthImageQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as {
      start_date?: string;
      end_date?: string;
      limit: number;
      offset: number;
    };
    const result = healthImagesRepository.findAll(query);
    res.json(result);
  })
);

// GET /api/health-images/:id - Get image metadata
healthImagesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const record = healthImagesRepository.findById(id);
    if (!record) {
      res.status(404).json({ error: { message: 'Image not found' } });
      return;
    }
    res.json(record);
  })
);

// GET /api/health-images/:id/file - Serve image file
healthImagesRouter.get(
  '/:id/file',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const record = healthImagesRepository.findById(id);
    if (!record) {
      res.status(404).json({ error: { message: 'Image not found' } });
      return;
    }

    const filePath = path.join(DATA_DIR, record.file_path);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: { message: 'File not found on disk' } });
      return;
    }

    res.setHeader('Content-Type', record.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(record.original_filename)}"`);
    fs.createReadStream(filePath).pipe(res);
  })
);

// PUT /api/health-images/:id - Update image metadata
healthImagesRouter.put(
  '/:id',
  validateBody(healthImageUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = healthImagesRepository.findById(id);
    if (!existing) {
      res.status(404).json({ error: { message: 'Image not found' } });
      return;
    }

    const updated = healthImagesRepository.update(id, req.body);
    res.json(updated);
  })
);

// DELETE /api/health-images/:id - Delete image
healthImagesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const record = healthImagesRepository.findById(id);
    if (!record) {
      res.status(404).json({ error: { message: 'Image not found' } });
      return;
    }

    // Delete file from disk
    const filePath = path.join(DATA_DIR, record.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    healthImagesRepository.delete(id);
    res.status(204).send();
  })
);
