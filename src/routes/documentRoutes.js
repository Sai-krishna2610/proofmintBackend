import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentFile, Stamp, User } from '../models/index.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { logAction } from '../services/auditService.js';
import { countPdfPages, createStampedPdf, createPreviewImage } from '../services/pdfService.js';

const router = Router();
router.use(authenticate);

// Configure file storage
const storageDir = path.resolve(process.cwd(), './storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: storageDir,
        filename: (req, file, cb) => cb(null, `${uuidv4()}_${Date.now()}${path.extname(file.originalname)}`)
    }),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

// GET /documents - List all documents
router.get('/', async (req, res, next) => {
    try {
        const where = req.user.role === 'admin' ? {} : { issuer_user_id: req.user.id };
        const docs = await Document.findAll({
            where,
            include: [{ model: User, as: 'issuer', attributes: ['id', 'name', 'email'] }],
            order: [['created_at', 'DESC']]
        });
        res.json(docs);
    } catch (err) { next(err); }
});

// GET /documents/stats - Get document statistics
router.get('/stats', async (req, res, next) => {
    try {
        const where = {};
        if (req.user.role === 'issuer') {
            where.issuer_user_id = req.user.id;
        }

        const total = await Document.count({ where });
        const issued = await Document.count({ where: { ...where, status: 'issued' } });
        const drafts = await Document.count({ where: { ...where, status: 'draft' } });
        const revoked = await Document.count({ where: { ...where, status: 'revoked' } });

        res.json({ total, issued, drafts, revoked });
    } catch (err) {
        next(err);
    }
});

// GET /documents/:id - Get a single document by ID
router.get('/:id', async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id, {
            include: [
                { model: DocumentFile, as: 'document_files' },
                { model: Stamp, as: 'stamps' },
                { model: User, as: 'issuer', attributes: ['id', 'email', 'name'] },
            ],
        });

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        if (req.user.role === 'issuer' && doc.issuer_user_id !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(doc);
    } catch (err) {
        next(err);
    }
});

// POST /documents - Create a new draft
router.post('/', authorize('admin', 'issuer'), async (req, res, next) => {
    try {
        const { title, recipient_name, recipient_email, description, expiry_date } = req.body;
        const doc = await Document.create({
            title, recipient_name, recipient_email, description,
            expiry_date: expiry_date || null,
            issuer_user_id: req.user.id,
            status: 'draft'
        });
        logAction(req.user.id, doc.id, 'create_document');
        res.status(201).json(doc);
    } catch (err) { next(err); }
});

// POST /documents/:id/upload - Upload the source PDF
router.post('/:id/upload', authorize('admin', 'issuer'), upload.single('file'), async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document not found' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const pageCount = await countPdfPages(req.file.path);

        await DocumentFile.create({
            document_id: doc.id,
            kind: 'source',
            storage_path: req.file.path,
            mime_type: req.file.mimetype,
            size_bytes: req.file.size,
            page_count: pageCount
        });

        res.json({ message: 'File uploaded successfully', pageCount });
    } catch (err) { next(err); }
});

// POST /documents/:id/stamps - Save stamp coordinates
router.post('/:id/stamps', authorize('admin', 'issuer'), async (req, res, next) => {
    try {
        const { stamps } = req.body;
        await Stamp.destroy({ where: { document_id: req.params.id } });

        const newStamps = stamps.map(s => ({ ...s, document_id: req.params.id }));
        await Stamp.bulkCreate(newStamps);

        logAction(req.user.id, req.params.id, 'save_stamps');
        res.json({ message: 'Stamps saved' });
    } catch (err) { next(err); }
});

// POST /documents/:id/render - Render the PDF with stamps and generate preview
router.post('/:id/render', authorize('admin', 'issuer'), async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        const sourceFile = await DocumentFile.findOne({ where: { document_id: doc.id, kind: 'source' } });
        if (!sourceFile) return res.status(400).json({ message: 'No source file uploaded. Please upload a PDF first.' });

        const stamps = await Stamp.findAll({ where: { document_id: doc.id } });

        const stampedPath = path.join(storageDir, `${doc.id}_stamped.pdf`);
        const previewPath = path.join(storageDir, `${doc.id}_preview.png`);

        await createStampedPdf(sourceFile.storage_path, stampedPath, stamps, doc);
        await createPreviewImage(stampedPath, previewPath);

        // Upsert stamped file record
        await DocumentFile.destroy({ where: { document_id: doc.id, kind: 'stamped' } });
        await DocumentFile.destroy({ where: { document_id: doc.id, kind: 'preview' } });
        await DocumentFile.create({ document_id: doc.id, kind: 'stamped', storage_path: stampedPath, mime_type: 'application/pdf', size_bytes: 0 });
        await DocumentFile.create({ document_id: doc.id, kind: 'preview', storage_path: previewPath, mime_type: 'image/png', size_bytes: 0 });

        logAction(req.user.id, doc.id, 'render');
        res.json({ message: 'Document rendered successfully' });
    } catch (err) { next(err); }
});

// GET /documents/:id/download - Stream the source PDF file
router.get('/:id/download', async (req, res, next) => {
    try {
        // Prefer stamped PDF if available, fallback to source
        let file = await DocumentFile.findOne({ where: { document_id: req.params.id, kind: 'stamped' } });
        if (!file) {
            file = await DocumentFile.findOne({ where: { document_id: req.params.id, kind: 'source' } });
        }

        if (!file || !fs.existsSync(file.storage_path)) {
            return res.status(404).json({ message: 'No PDF file found for this document.' });
        }

        const doc = await Document.findByPk(req.params.id);
        const fileName = doc ? `${doc.title || 'document'}.pdf` : 'document.pdf';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        fs.createReadStream(file.storage_path).pipe(res);
    } catch (err) { next(err); }
});

// GET /documents/:id/preview - Stream the preview image
router.get('/:id/preview', async (req, res, next) => {
    try {
        const previewFile = await DocumentFile.findOne({
            where: { document_id: req.params.id, kind: 'preview' }
        });

        if (!previewFile || !fs.existsSync(previewFile.storage_path)) {
            return res.status(404).json({ message: 'Preview not available. Please render the document first.' });
        }

        res.setHeader('Content-Type', 'image/png');
        fs.createReadStream(previewFile.storage_path).pipe(res);
    } catch (err) { next(err); }
});

// POST /documents/:id/issue - Finalize and Issue
router.post('/:id/issue', authorize('admin', 'issuer'), async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document not found' });

        const sourceFile = await DocumentFile.findOne({ where: { document_id: doc.id, kind: 'source' } });
        if (!sourceFile) return res.status(400).json({ message: 'No source file found' });

        const stamps = await Stamp.findAll({ where: { document_id: doc.id } });

        // Render stub
        const stampedPath = path.join(storageDir, `${doc.id}_stamped.pdf`);
        const previewPath = path.join(storageDir, `${doc.id}_preview.png`);

        await createStampedPdf(sourceFile.storage_path, stampedPath, stamps, doc);
        await createPreviewImage(stampedPath, previewPath);

        // Record stamped & preview files
        await DocumentFile.create({ document_id: doc.id, kind: 'stamped', storage_path: stampedPath, mime_type: 'application/pdf', size_bytes: 0 });
        await DocumentFile.create({ document_id: doc.id, kind: 'preview', storage_path: previewPath, mime_type: 'image/png', size_bytes: 0 });

        doc.status = 'issued';
        doc.issue_date = new Date();
        await doc.save();

        logAction(req.user.id, doc.id, 'issue');
        res.json({ message: 'Document issued successfully', doc });
    } catch (err) { next(err); }
});

export default router;