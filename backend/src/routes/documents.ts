import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';
import { processAndStoreDocument } from '../services/rag.service';
import { DocumentChunk } from '../models/MongoModels';
import { logger } from '../utils/logger';

const router = Router();

// Setup Multer memory storage and file rules
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const isMimeValid = ['application/pdf', 'text/plain'].includes(file.mimetype);
    const isExtValid = /\.(pdf|txt)$/i.test(file.originalname);
    if (isMimeValid && isExtValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and TXT documents are allowed.'));
    }
  }
});

// Upload and ingest document chunks into vector store (Admin-only)
router.post(
  '/upload',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  uploadLimiter,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' }
      });
    }

    const documentId = Math.random().toString(36).substring(7);
    const fileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); // Safe filename sanitization

    try {
      logger.info(`Starting ingestion for file: ${fileName} (${req.file.mimetype})`);
      const chunksCount = await processAndStoreDocument(
        documentId,
        fileName,
        req.file.buffer,
        req.file.mimetype
      );

      res.status(201).json({
        success: true,
        data: {
          documentId,
          fileName,
          chunksCount,
          message: 'Document successfully ingested and embedded.'
        }
      });
    } catch (error: any) {
      logger.error(`Document Ingestion Failure: ${error.message}`);
      res.status(500).json({
        success: false,
        error: { code: 'INGESTION_FAILED', message: error.message || 'Failed to process document' }
      });
    }
  }
);

// Get list of all uploaded RAG documents in the knowledge base
router.get(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const documentsList = await DocumentChunk.aggregate([
        {
          $group: {
            _id: '$documentId',
            fileName: { $first: '$fileName' },
            chunksCount: { $sum: 1 },
            createdAt: { $first: '$createdAt' }
          }
        },
        { $sort: { createdAt: -1 } }
      ]);

      const formattedDocs = documentsList.map((doc) => ({
        documentId: doc._id,
        fileName: doc.fileName,
        chunksCount: doc.chunksCount,
        createdAt: doc.createdAt
      }));

      res.status(200).json({
        success: true,
        data: formattedDocs
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete an ingested document and its vector chunks (Admin-only)
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const documentId = req.params.id;

    try {
      const deleteResult = await DocumentChunk.deleteMany({ documentId });
      
      if (deleteResult.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DOC_NOT_FOUND', message: 'Document not found' }
        });
      }

      logger.info(`Deleted document ${documentId}. Removed ${deleteResult.deletedCount} chunks.`);

      res.status(200).json({
        success: true,
        data: {
          message: `Successfully deleted document and removed ${deleteResult.deletedCount} chunks.`
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
