export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Метод не разрешен' });

    const { userId, username, product, price } = req.body;
    const botToken = process.env.BOT_TOKEN;
    const shopId = process.env.YOKASSA_SHOP_ID;
    const secretKey = process.env.YOKASSA_SECRET_KEY;

    if (!botToken || !shopId || !secretKey) {
        return res.status(500).json({ message: 'Ошибка: не хватает ключей в Vercel' });
    }

    try {
        const amount = price.toFixed(2);
        const yooKassaUrl = 'https://api.yookassa.ru/v3/payments';
        const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const idempotenceKey = `order_${userId}_${Date.now()}`;

        const paymentData = {
            amount: { value: amount, currency: 'RUB' },
            confirmation: { type: 'redirect', return_url: 'https://t.me/FLUGGA_STORE_BOT' },
            capture: true,
            description: `Заказ: ${product} (${amount}₽) от @${username || userId}`
        };

        const response = await fetch(yooKassaUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
                'Idempotence-Key': idempotenceKey
            },
            body: JSON.stringify(paymentData)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.description || 'Ошибка создания платежа');

        const paymentUrl = data.confirmation.confirmation_url;
        const message = `✅ Заказ оформлен!\n\nТовар: ${product}\nСумма: ${amount} ₽\n\nОплатите по ссылке:`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId,
                text: message,
                reply_markup: {
                    inline_keyboard: [[{ text: "💳 Перейти к оплате", url: paymentUrl }]]
                }
            })
        });

        return res.status(200).json({ message: 'Ссылка на оплату отправлена!' });
    } catch (error) {
        return res.status(500).json({ message: 'Ошибка оплаты: ' + error.message });
    }
}
