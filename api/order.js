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

    const { userId, username, product, price, category } = req.body;

    if (!userId || !product || price === undefined || price === null) {
        return res.status(400).json({ message: 'Отсутствуют обязательные поля: userId, product, price' });
    }

    const botToken = process.env.BOT_TOKEN;
    const shopId = process.env.YOKASSA_SHOP_ID;
    const secretKey = process.env.YOKASSA_SECRET_KEY;

    if (!botToken || !shopId || !secretKey) {
        console.error('Missing environment variables:', { botToken: !!botToken, shopId: !!shopId, secretKey: !!secretKey });
        return res.status(500).json({ message: 'Ошибка конфигурации: не хватает ключей в Vercel' });
    }

    try {
        const amount = Number(price).toFixed(2);
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

        if (!response.ok) {
            console.error('Ошибка ЮKassa:', data);
            throw new Error(data.description || 'Ошибка создания платежа в ЮKassa');
        }

        const paymentUrl = data.confirmation.confirmation_url;
        let message = `✅ Новый заказ!\n\n`;
        if (category) {
            message += `Категория: ${category}\n`;
        }
        message += `Товар: ${product}\nСумма: ${amount} ₽\n\nОплатите по ссылке:`;

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const telegramResponse = await fetch(telegramUrl, {
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

        if (!telegramResponse.ok) {
            const tgError = await telegramResponse.text();
            console.error('Ошибка отправки в Telegram:', tgError);
            throw new Error(`Ошибка Telegram: ${tgError}`);
        }

        return res.status(200).json({ message: 'Ссылка на оплату отправлена!' });
    } catch (error) {
        console.error('Ошибка в API:', error.message);
        return res.status(500).json({ message: 'Ошибка: ' + error.message });
    }
}
