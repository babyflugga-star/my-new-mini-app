const axios = require('axios');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Метод не разрешен' });
    }

    const { userId, username, product } = req.body;
    const botToken = process.env.BOT_TOKEN;
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;

    if (!botToken || !shopId || !secretKey) {
        return res.status(500).json({ message: 'Не хватает ключей в настройках Vercel' });
    }

    let price = 0;
    if (product === 'Logic Pro') price = 1990;
    else if (product === 'FL Studio') price = 1990;
    else if (product === 'Vocal Presets') price = 2490;

    try {
        const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const response = await axios.post(
            'https://api.yookassa.ru/v3/payments',
            {
                amount: { value: price, currency: 'RUB' },
                confirmation: {
                    type: 'redirect',
                    return_url: 'https://t.me/FLUGGA_STORE_BOT'
                },
                description: `Оплата товара: ${product}`
            },
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Idempotence-Key': `order_${userId}_${Date.now()}`
                }
            }
        );

        const paymentUrl = response.data.confirmation.confirmation_url;

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await axios.post(telegramUrl, {
            chat_id: userId,
            text: `🛒 Вы выбрали: ${product}\nДля оплаты по карте перейдите по ссылке:`,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "💳 Оплатить картой", url: paymentUrl }]
                ]
            }
        });

        return res.status(200).json({ message: 'Ссылка на оплату создана!' });
    } catch (error) {
        console.error(error.response?.data || error.message);
        return res.status(500).json({ message: 'Ошибка создания платежа ЮKassa' });
    }
}
