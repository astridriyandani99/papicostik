// Database Helper for Vercel KV / Upstash Redis
import { Redis } from '@upstash/redis';

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

let redisClient = null;

export function getDb() {
    if (redisClient) return redisClient;

    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (url && token) {
        try {
            redisClient = new Redis({ url, token });
            return redisClient;
        } catch (e) {
            console.error('Failed to initialize Redis client:', e);
            return null;
        }
    }
    return null;
}

// In-memory fallback if database credentials are not yet linked
let memoryTokens = [...DEFAULT_SEED_TOKENS];
let memoryPin = DEFAULT_ADMIN_PIN;
let memorySubmissions = [];

export async function getAdminPin() {
    const db = getDb();
    if (db) {
        try {
            const pin = await db.get('papi:admin_pin');
            return pin || DEFAULT_ADMIN_PIN;
        } catch (e) {
            console.error('Error fetching admin PIN from Redis:', e);
            return memoryPin;
        }
    }
    return memoryPin;
}

export async function setAdminPin(newPin) {
    const cleanPin = String(newPin).trim();
    const db = getDb();
    if (db) {
        try {
            await db.set('papi:admin_pin', cleanPin);
        } catch (e) {
            console.error('Error saving admin PIN to Redis:', e);
        }
    }
    memoryPin = cleanPin;
    return true;
}

export async function getAllTokens() {
    const db = getDb();
    if (db) {
        try {
            const tokens = await db.get('papi:tokens');
            if (Array.isArray(tokens)) return tokens;
            if (typeof tokens === 'string') return JSON.parse(tokens);
            // Seed initial tokens if empty
            await db.set('papi:tokens', JSON.stringify(DEFAULT_SEED_TOKENS));
            return DEFAULT_SEED_TOKENS;
        } catch (e) {
            console.error('Error getting tokens from Redis:', e);
            return memoryTokens;
        }
    }
    return memoryTokens;
}

export async function saveAllTokens(tokens) {
    const db = getDb();
    if (db) {
        try {
            await db.set('papi:tokens', JSON.stringify(tokens));
        } catch (e) {
            console.error('Error saving tokens to Redis:', e);
        }
    }
    memoryTokens = tokens;
    return true;
}

export async function getAllSubmissions() {
    const db = getDb();
    if (db) {
        try {
            const submissions = await db.get('papi:submissions');
            if (Array.isArray(submissions)) return submissions;
            if (typeof submissions === 'string') return JSON.parse(submissions);
            return [];
        } catch (e) {
            console.error('Error getting submissions from Redis:', e);
            return memorySubmissions;
        }
    }
    return memorySubmissions;
}

export async function saveSubmission(submission) {
    const submissions = await getAllSubmissions();
    submissions.unshift(submission);
    
    const db = getDb();
    if (db) {
        try {
            await db.set('papi:submissions', JSON.stringify(submissions));
        } catch (e) {
            console.error('Error saving submission to Redis:', e);
        }
    }
    memorySubmissions = submissions;
    return true;
}
