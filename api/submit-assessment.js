import { getAllTokens, saveAllTokens, saveSubmission } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { tokenCode, participant, scores, durationStr, answers } = req.body || {};

        // 1. Mark token as used
        if (tokenCode) {
            const cleanCode = tokenCode.trim().toUpperCase();
            const tokens = await getAllTokens();
            const token = tokens.find(t => t.code === cleanCode);
            if (token) {
                token.isUsed = true;
                token.usedAt = new Date().toISOString();
                token.usedBy = (participant && participant.name) || 'Peserta';
                if (token.type === 'single') {
                    token.status = 'used';
                }
                await saveAllTokens(tokens);
            }
        }

        // 2. Save full submission to database
        const submission = {
            id: 'SUB-' + Date.now(),
            tokenCode: tokenCode || '-',
            participant: participant || {},
            scores: scores || {},
            durationStr: durationStr || '-',
            submittedAt: new Date().toISOString()
        };
        await saveSubmission(submission);

        return res.status(200).json({ success: true, submissionId: submission.id });
    } catch (e) {
        console.error('Submit assessment error:', e);
        return res.status(500).json({ success: false, message: 'Gagal menyimpan hasil asesmen ke database.' });
    }
}
