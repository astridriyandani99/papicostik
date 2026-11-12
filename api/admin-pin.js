import { getAdminPin, setAdminPin } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { currentPin, newPin, action } = req.body || {};
        const savedPin = await getAdminPin();

        if (action === 'verify') {
            const isValid = String(currentPin).trim() === String(savedPin).trim();
            return res.status(200).json({ success: isValid });
        }

        if (action === 'change') {
            if (String(currentPin).trim() !== String(savedPin).trim()) {
                return res.status(401).json({ success: false, message: 'PIN saat ini salah!' });
            }
            if (!newPin || newPin.trim().length < 4) {
                return res.status(400).json({ success: false, message: 'PIN baru minimal 4 karakter.' });
            }
            await setAdminPin(newPin);
            return res.status(200).json({ success: true, message: 'PIN admin berhasil diubah!' });
        }

        return res.status(400).json({ success: false, message: 'Aksi tidak dikenali' });
    } catch (e) {
        console.error('Admin PIN API error:', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
