// Token Management Module for PAPI Kostick Assessment
// Handles token creation, batch generation, validation, usage tracking, and admin authentication

const STORAGE_KEYS = {
    TOKENS: 'papi_assessment_tokens',
    ADMIN_PIN: 'papi_admin_pin',
    ACTIVE_SESSION_TOKEN: 'papi_session_token'
};

const DEFAULT_ADMIN_PIN = 'admin123';

const DEFAULT_SEED_TOKENS = [
    {
        code: 'PAPI-DEMO-2026',
        label: 'Token Demo Bawaan',
        type: 'multi',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        isUsed: false,
        usedAt: null,
        usedBy: null,
        status: 'active'
    },
    {
        code: 'PAPI-RECRUIT-01',
        label: 'Kandidat HR',
        type: 'single',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        isUsed: false,
        usedAt: null,
        usedBy: null,
        status: 'active'
    }
];

export function getAdminPin() {
    try {
        return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || DEFAULT_ADMIN_PIN;
    } catch {
        return DEFAULT_ADMIN_PIN;
    }
}

export function setAdminPin(newPin) {
    if (!newPin || newPin.trim().length < 4) {
        return { success: false, message: 'PIN minimal harus 4 karakter!' };
    }
    try {
        localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, newPin.trim());
        return { success: true, message: 'PIN admin berhasil diperbarui!' };
    } catch (e) {
        return { success: false, message: 'Gagal menyimpan PIN baru: ' + e.message };
    }
}

export function verifyAdminPin(inputPin) {
    const currentPin = getAdminPin();
    return String(inputPin).trim() === String(currentPin).trim();
}

export function getAllTokens() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.TOKENS);
        if (!raw) {
            saveAllTokens(DEFAULT_SEED_TOKENS);
            return DEFAULT_SEED_TOKENS;
        }
        const tokens = JSON.parse(raw);
        if (!Array.isArray(tokens)) {
            saveAllTokens(DEFAULT_SEED_TOKENS);
            return DEFAULT_SEED_TOKENS;
        }
        return tokens;
    } catch {
        return DEFAULT_SEED_TOKENS;
    }
}

export function saveAllTokens(tokens) {
    try {
        localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
        return true;
    } catch (e) {
        console.error('Failed to save tokens to localStorage', e);
        return false;
    }
}

// Generate random uppercase alphanumeric token string: e.g. PAPI-7K2X-9M4Q
export function createRandomTokenCode(prefix = 'PAPI') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous 0, O, 1, I
    const randomChunk = (len) => {
        let res = '';
        for (let i = 0; i < len; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
    };
    const cleanPrefix = (prefix || 'PAPI').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `${cleanPrefix}-${randomChunk(4)}-${randomChunk(4)}`;
}

export function addSingleToken({ code, label = 'Peserta Asesmen', type = 'single', expiryDays = 0 }) {
    const tokens = getAllTokens();
    const cleanCode = (code || createRandomTokenCode()).toUpperCase().trim();

    if (tokens.some(t => t.code === cleanCode)) {
        return { success: false, message: `Token "${cleanCode}" sudah ada!` };
    }

    let expiresAt = null;
    if (expiryDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + Number(expiryDays));
        expiresAt = d.toISOString();
    }

    const newToken = {
        code: cleanCode,
        label: label.trim() || 'Peserta Asesmen',
        type: type === 'multi' ? 'multi' : 'single',
        createdAt: new Date().toISOString(),
        expiresAt,
        isUsed: false,
        usedAt: null,
        usedBy: null,
        status: 'active'
    };

    tokens.unshift(newToken);
    saveAllTokens(tokens);
    return { success: true, token: newToken, message: `Token ${cleanCode} berhasil dibuat!` };
}

export function batchGenerateTokens({ count = 5, prefix = 'PAPI', label = 'Batch Kandidat', type = 'single', expiryDays = 0 }) {
    const tokens = getAllTokens();
    const generated = [];
    const num = Math.min(Math.max(1, Number(count) || 5), 100); // safety 1 - 100

    let expiresAt = null;
    if (expiryDays > 0) {
        const d = new Date();
        d.setDate(d.getDate() + Number(expiryDays));
        expiresAt = d.toISOString();
    }

    for (let i = 0; i < num; i++) {
        let code = createRandomTokenCode(prefix);
        while (tokens.some(t => t.code === code) || generated.some(t => t.code === code)) {
            code = createRandomTokenCode(prefix);
        }

        const t = {
            code,
            label: `${label.trim()} #${i + 1}`,
            type: type === 'multi' ? 'multi' : 'single',
            createdAt: new Date().toISOString(),
            expiresAt,
            isUsed: false,
            usedAt: null,
            usedBy: null,
            status: 'active'
        };
        generated.push(t);
    }

    const updated = [...generated, ...tokens];
    saveAllTokens(updated);
    return { success: true, count: generated.length, tokens: generated };
}

export function deleteToken(code) {
    const tokens = getAllTokens();
    const filtered = tokens.filter(t => t.code !== code);
    saveAllTokens(filtered);
    return { success: true };
}

export function validateToken(inputCode) {
    if (!inputCode) return { valid: false, message: 'Masukkan token asesmen Anda.' };
    const code = inputCode.trim().toUpperCase();
    const tokens = getAllTokens();

    const token = tokens.find(t => t.code === code);
    if (!token) {
        return { valid: false, message: 'Token tidak ditemukan atau tidak valid. Silakan periksa kembali atau hubungi penguji.' };
    }

    // Check expiry
    if (token.expiresAt) {
        const expTime = new Date(token.expiresAt).getTime();
        if (Date.now() > expTime) {
            token.status = 'expired';
            saveAllTokens(tokens);
            return { valid: false, message: 'Token sudah kedaluwarsa pada ' + new Date(token.expiresAt).toLocaleDateString('id-ID') + '.' };
        }
    }

    // Check single-use
    if (token.type === 'single' && token.isUsed) {
        return { valid: false, message: `Token ini sudah pernah digunakan oleh "${token.usedBy || 'Peserta lain'}" pada ${token.usedAt ? new Date(token.usedAt).toLocaleString('id-ID') : '-'}.` };
    }

    return { valid: true, token };
}

export function markTokenUsed(inputCode, participantName = 'Peserta') {
    const code = inputCode.trim().toUpperCase();
    const tokens = getAllTokens();
    const token = tokens.find(t => t.code === code);

    if (token) {
        token.isUsed = true;
        token.usedAt = new Date().toISOString();
        token.usedBy = participantName || 'Peserta';
        if (token.type === 'single') {
            token.status = 'used';
        }
        saveAllTokens(tokens);
    }
}

export function getActiveSessionToken() {
    try {
        return sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_TOKEN) || null;
    } catch {
        return null;
    }
}

export function setActiveSessionToken(code) {
    try {
        if (code) {
            sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_TOKEN, code.toUpperCase().trim());
        } else {
            sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_TOKEN);
        }
    } catch (e) {
        console.error('Session storage error', e);
    }
}

export function exportTokensToCSV() {
    const tokens = getAllTokens();
    const rows = [];

    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    rows.push([escapeCSV('DAFTAR TOKEN ASESMEN PAPI KOSTICK')]);
    rows.push([escapeCSV('Tanggal Unduh'), escapeCSV(new Date().toLocaleString('id-ID'))]);
    rows.push([escapeCSV('Total Token'), escapeCSV(tokens.length)]);
    rows.push([]);

    rows.push([
        escapeCSV('No'),
        escapeCSV('Kode Token'),
        escapeCSV('Label / Deskripsi'),
        escapeCSV('Tipe Penggunaan'),
        escapeCSV('Status'),
        escapeCSV('Tanggal Dibuat'),
        escapeCSV('Batas Kedaluwarsa'),
        escapeCSV('Sudah Digunakan?'),
        escapeCSV('Digunakan Oleh'),
        escapeCSV('Waktu Digunakan')
    ]);

    tokens.forEach((t, i) => {
        rows.push([
            escapeCSV(i + 1),
            escapeCSV(t.code),
            escapeCSV(t.label || '-'),
            escapeCSV(t.type === 'multi' ? 'Bisa Berulang (Multi-use)' : 'Sekali Pakai (Single-use)'),
            escapeCSV(t.isUsed && t.type === 'single' ? 'Sudah Digunakan' : (t.status === 'expired' ? 'Kedaluwarsa' : 'Aktif')),
            escapeCSV(t.createdAt ? new Date(t.createdAt).toLocaleString('id-ID') : '-'),
            escapeCSV(t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('id-ID') : 'Tidak Ada (Selamanya)'),
            escapeCSV(t.isUsed ? 'Ya' : 'Belum'),
            escapeCSV(t.usedBy || '-'),
            escapeCSV(t.usedAt ? new Date(t.usedAt).toLocaleString('id-ID') : '-')
        ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `PAPI_Kostick_Tokens_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
