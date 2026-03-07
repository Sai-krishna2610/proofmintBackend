import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Document, DocumentFile, User } from '../models/index.js';

const router = Router();

// Rate limiting: max 20 requests per IP per 10 minutes (adjustable via env vars)
const verifyLimiter = rateLimit({
    windowMs: parseInt(process.env.VERIFY_RATE_LIMIT_WINDOW_MS) || 10 * 60 * 1000,
    max: parseInt(process.env.VERIFY_RATE_LIMIT_MAX) || 20,
    message: { message: 'Too many verification requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(verifyLimiter);

router.post('/', async (req, res, next) => {
    try {
        const { query_value, id } = req.body;
        const docId = query_value || id;

        if (!docId) {
            return res.status(400).json({ message: 'Document ID is required' });
        }

        const doc = await Document.findByPk(docId, {
            include: [
                { model: User, as: 'issuer', attributes: ['name', 'email'] },
                { model: DocumentFile, as: 'document_files' },
            ],
        });

        if (!doc) {
            return res.status(404).json({
                result: 'invalid',
                message: 'Document not found',
            });
        }

        let result = 'invalid';
        if (doc.status === 'issued') {
            if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) {
                result = 'expired';
            } else {
                result = 'valid';
            }
        } else if (doc.status === 'revoked') {
            result = 'revoked';
        } else {
            result = 'draft';
        }

        res.json({
            result,
            metadata: {
                id: doc.id,
                title: doc.title,
                recipient_name: doc.recipient_name,
                recipient_email: doc.recipient_email,
                issuer: doc.issuer?.name || doc.issuer?.email || 'ProofMint',
                issue_date: doc.issue_date,
                expiry_date: doc.expiry_date,
                revoke_reason: doc.status === 'revoked' ? doc.revoke_reason : undefined,
                download_url: `/verify/${doc.id}/download`
            },
        });
    } catch (err) {
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id, {
            include: [
                { model: User, as: 'issuer', attributes: ['name', 'email'] },
            ],
        });

        if (!doc) {
            return res.status(404).json({ result: 'invalid', message: 'Document not found' });
        }

        let result = 'invalid';
        if (doc.status === 'issued') {
            result = doc.expiry_date && new Date(doc.expiry_date) < new Date() ? 'expired' : 'valid';
        } else if (doc.status === 'revoked') {
            result = 'revoked';
        }

        res.json({
            result,
            metadata: {
                id: doc.id,
                title: doc.title,
                recipient_name: doc.recipient_name,
                recipient_email: doc.recipient_email,
                issuer: doc.issuer?.name || doc.issuer?.email || 'ProofMint',
                issue_date: doc.issue_date,
                expiry_date: doc.expiry_date,
                revoke_reason: doc.status === 'revoked' ? doc.revoke_reason : undefined,
                download_url: `/verify/${doc.id}/download`
            },
        });
    } catch (err) {
        next(err);
    }
});

import fs from 'fs';

router.get('/:id/download', async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id);

        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        let file = await DocumentFile.findOne({ where: { document_id: doc.id, kind: 'stamped' } });
        if (!file) {
            file = await DocumentFile.findOne({ where: { document_id: doc.id, kind: 'source' } });
        }

        if (!file || !fs.existsSync(file.storage_path)) {
            return res.status(404).json({ message: 'PDF file not found on server' });
        }

        const fileName = `${doc.title || 'verified_document'}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        fs.createReadStream(file.storage_path).pipe(res);
    } catch (err) {
        next(err);
    }
});

export default router;
