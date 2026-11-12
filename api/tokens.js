import { getAllTokens, saveAllTokens, getAdminPin } from './_db.js';

function createRandomCode(prefix = 'PAPI') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    const cleanPrefix = (prefix || 'PAPI').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `${cleanPrefix}-${p1}-${p2}`;
}

export default async function handler(req, res) {
    try {
        const adminPin = await getAdminPin();

        // 1. GET: List tokens
        if (req.method === 'GET') {
            const { pin } = req.query;
            if (String(pin).trim() !== String(adminPin).trim()) {
                return res.status(401).json({ success: false, message: 'PIN Admin tidak valid' });
            }
            const tokens = await getAllTokens();
            return res.status(200).json({ success: true, tokens });
        }

        // 2. POST: Generate tokens (single or batch)
        if (req.method === 'POST') {
            const { pin, action, count, prefix, label, type, expiryDays } = req.body || {};
            if (String(pin).trim() !== String(adminPin).trim()) {
                return res.status(401).json({ success: false, message: 'PIN Admin tidak valid' });
            }

            const tokens = await getAllTokens();
            let expiresAt = null;
            if (Number(expiryDays) > 0) {
                const d = new Date();
                d.setDate(d.getDate() + Number(expiryDays));
                expiresAt = d.toISOString();
            }

            if (action === 'batch') {
                const num = Math.min(Math.max(1, Number(count) || 5), 100);
                const generated = [];

                for (let i = 0; i < num; i++) {
                    let code = createRandomCode(prefix);
                    while (tokens.some(t => t.code === code) || generated.some(t => t.code === code)) {
                        code = createRandomCode(prefix);
                    }
                    generated.push({
                        code,
                        label: `${(label || 'Batch Kandidat').trim()} #${i + 1}`,
                        type: type === 'multi' ? 'multi' : 'single',
                        createdAt: new Date().toISOString(),
                        expiresAt,
                        isUsed: false,
                        usedAt: null,
                        usedBy: null,
                        status: 'active'
                    });
                }

                const updated = [...generated, ...tokens];
                await saveAllTokens(updated);
                return res.status(200).json({ success: true, count: generated.length, tokens: generated });
            } else {
                let code = req.body.code ? req.body.code.trim().toUpperCase() : createRandomCode(prefix);
                if (tokens.some(t => t.code === code)) {
                    return res.status(400).json({ success: false, message: `Token ${code} sudah ada!` });
                }

                const newToken = {
                    code,
                    label: (label || 'Peserta Asesmen').trim(),
                    type: type === 'multi' ? 'multi' : 'single',
                    createdAt: new Date().toISOString(),
                    expiresAt,
                    isUsed: false,
                    usedAt: null,
                    usedBy: null,
                    status: 'active'
                };

                tokens.unshift(newToken);
                await saveAllTokens(tokens);
                return res.status(200).json({ success: true, token: newToken, tokens: [newToken] });
            }
        }

        // 3. DELETE: Revoke/delete token
        if (req.method === 'DELETE') {
            const { pin, code } = req.body || {};
            if (String(pin).trim() !== String(adminPin).trim()) {
                return res.status(401).json({ success: false, message: 'PIN Admin tidak valid' });
            }

            const tokens = await getAllTokens();
            const filtered = tokens.filter(t => t.code !== code);
            await saveAllTokens(filtered);
            return res.status(200).json({ success: true, message: `Token ${code} berhasil dihapus.` });
        }

        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    } catch (e) {
        console.error('Tokens API error:', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
