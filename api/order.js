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

    if (!botToken) {
        return res.status(500).json({ message: 'Токен бота не найден в настройках Vercel' });
    }

    try {
        const message = `✅ Новый заказ!\n\nПокупатель: @${username || userId}\nТовар: ${product}`;

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: 5721182448,
                text: message
            })
        });

        return res.status(200).json({ message: 'Заказ отправлен боту!' });
    } catch (error) {
        return res.status(500).json({ message: 'Ошибка отправки в Telegram' });
    }
}
