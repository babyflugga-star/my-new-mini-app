export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Метод не разрешен' });
    }

    const { object } = req.body;
    const botToken = process.env.BOT_TOKEN;

    if (object.status === 'succeeded') {
        const userId = object.metadata?.user_id;
        const product = object.description.replace('Оплата товара: ', '');

        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId,
                text: `✅ Оплата прошла успешно!\nТовар: ${product}\nСсылка на скачивание будет отправлена в ближайшее время.`
            })
        });
    }

    return res.status(200).json({ message: 'Уведомление получено' });
}
