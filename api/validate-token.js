import { getAllTokens, saveAllTokens } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ valid: false, message: 'Method Not Allowed' });
    }

    try {
        const { code } = req.body || {};
        if (!code || !code.trim()) {
            return res.status(400).json({ valid: false, message: 'Kode token tidak boleh kosong.' });
        }

        const cleanCode = code.trim().toUpperCase();
        const tokens = await getAllTokens();
        const token = tokens.find(t => t.code === cleanCode);

        if (!token) {
            return res.status(200).json({ valid: false, message: 'Token tidak ditemukan atau tidak valid.' });
        }

        // Check expiration
        if (token.expiresAt) {
            if (Date.now() > new Date(token.expiresAt).getTime()) {
                token.status = 'expired';
                await saveAllTokens(tokens);
                return res.status(200).json({
                    valid: false,
                    message: 'Token sudah kedaluwarsa pada ' + new Date(token.expiresAt).toLocaleDateString('id-ID')
                });
            }
        }

        // Check single use
        if (token.type === 'single' && token.isUsed) {
            return res.status(200).json({
                valid: false,
                message: `Token ini sudah pernah digunakan oleh "${token.usedBy || 'Peserta lain'}" pada ${token.usedAt ? new Date(token.usedAt).toLocaleString('id-ID') : '-'}.`
            });
        }

        return res.status(200).json({
            valid: true,
            token: {
                code: token.code,
                label: token.label,
                type: token.type,
                expiresAt: token.expiresAt
            }
        });
    } catch (e) {
        console.error('Validate token error:', e);
        return res.status(500).json({ valid: false, message: 'Terjadi kesalahan pada server database.' });
    }
}
