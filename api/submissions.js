import { getAllSubmissions, getAdminPin } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const { pin } = req.query;
        const adminPin = await getAdminPin();
        if (String(pin).trim() !== String(adminPin).trim()) {
            return res.status(401).json({ success: false, message: 'PIN Admin tidak valid' });
        }

        const submissions = await getAllSubmissions();
        return res.status(200).json({ success: true, submissions });
    } catch (e) {
        console.error('Submissions API error:', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
