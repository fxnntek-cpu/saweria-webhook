const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || 'hanyatemanparty2025';

let donationQueue = [];

// ─────────────────────────────────────────
//  BAGIBAGI / SAWERIA WEBHOOK
//  Daftarkan URL ini di BagiBagi:
//  https://domain-railway-kamu.up.railway.app/webhook
// ─────────────────────────────────────────
app.post('/webhook', (req, res) => {
    const body = req.body;

    console.log('[Webhook] Incoming:', JSON.stringify(body));

    // Support format BagiBagi & Saweria
    const donatorUsername = body.donator_name
        || body.donatorUsername
        || body.username
        || body.name
        || 'Anonymous';

    const amount = parseInt(body.amount) || 0;
    const message = body.message || body.donator_comment || body.note || '';

    if (amount < 10000) {
        console.log('[Webhook] Ignored - amount too low:', amount);
        return res.status(200).json({ status: 'ignored', reason: 'amount too low' });
    }

    const donation = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        donatorUsername: donatorUsername,
        donatorName: donatorUsername,
        amount: amount,
        message: message,
        timestamp: Date.now()
    };

    donationQueue.push(donation);

    // Jaga queue max 200 item
    if (donationQueue.length > 200) {
        donationQueue = donationQueue.slice(-200);
    }

    console.log(`[Donation] ${donation.donatorUsername} - Rp${donation.amount} - Queue: ${donationQueue.length}`);
    res.status(200).json({ status: 'ok', queued: donationQueue.length });
});

// ─────────────────────────────────────────
//  ROBLOX POLLING ENDPOINT
//  Roblox script GET ke sini tiap 5 detik
//  Header: x-api-key: <API_SECRET>
// ─────────────────────────────────────────
app.get('/poll', (req, res) => {
    const key = req.headers['x-api-key'];

    if (key !== API_SECRET) {
        console.warn('[Poll] Unauthorized attempt');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const pending = [...donationQueue];
    donationQueue = []; // Clear setelah diambil

    console.log(`[Poll] Roblox fetched ${pending.length} donations`);
    res.json({ donations: pending });
});

// ─────────────────────────────────────────
//  TEST DONATION (untuk coba-coba manual)
//  POST /test dengan body JSON
//  Header: x-api-key: <API_SECRET>
// ─────────────────────────────────────────
app.post('/test', (req, res) => {
    const key = req.headers['x-api-key'];

    if (key !== API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body;
    const donation = {
        id: 'test_' + Date.now(),
        donatorUsername: body.donatorUsername || 'TestDonor',
        donatorName: body.donatorName || body.donatorUsername || 'TestDonor',
        amount: parseInt(body.amount) || 50000,
        message: body.message || 'Test donation from admin!',
        timestamp: Date.now()
    };

    donationQueue.push(donation);
    console.log(`[Test] Queued test donation: ${donation.donatorUsername} Rp${donation.amount}`);

    res.json({ status: 'ok', donation: donation, queueSize: donationQueue.length });
});

// ─────────────────────────────────────────
//  STATUS PAGE
// ─────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'HanyaTemanParty Saweria Webhook',
        queueSize: donationQueue.length,
        uptime: Math.floor(process.uptime()) + 's',
        endpoints: {
            webhook: 'POST /webhook  (dari BagiBagi)',
            poll:    'GET  /poll     (dari Roblox, butuh x-api-key)',
            test:    'POST /test     (test manual, butuh x-api-key)',
        }
    });
});

app.listen(PORT, () => {
    console.log(`[Server] HanyaTemanParty Webhook running on port ${PORT}`);
    console.log(`[Server] API Secret: ${API_SECRET}`);
});
