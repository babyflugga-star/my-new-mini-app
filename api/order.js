export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Метод не разрешен' });
    }

    const { userId, username, product } = req.body;
    const botToken = process.env.BOT_TOKEN;
    const shopId = process.env.YOKASSA_SHOP_ID;
    const secretKey = process.env.YOKASSA_SECRET_KEY;

    if (!botToken || !shopId || !secretKey) {
        return res.status(500).json({ message: 'Ошибка: не хватает ключей в Vercel' });
    }

    try {
        // Формируем ссылку на оплату через ЮKassa (упрощенный формат)
        const paymentUrl = `https://yoomoney.ru/quickpay/confirm?receiver=${shopId}&quickpay-form=shop&targets=${encodeURIComponent(product)}&sum=1990`;

        const message = `✅ Заказ оформлен!\n\nТовар: ${product}\n\nДля получения товара оплатите по ссылке:`;

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId,
                text: message,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "💳 Оплатить", url: paymentUrl }]
                    ]
                }
            })
        });

        return res.status(200).json({ message: 'Ссылка на оплату отправлена!' });
    } catch (error) {
        return res.status(500).json({ message: 'Ошибка при создании платежа' });
    }
}
