export default async function handler(req, res) {
  console.log('=== /api/order CALLED ===');
  console.log('METHOD:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const SHOP_ID = process.env.YOKASSA_SHOP_ID;
  const SECRET_KEY = process.env.YOKASSA_SECRET_KEY;

  console.log('ENV vars present:', {
    BOT_TOKEN: !!BOT_TOKEN,
    SHOP_ID: !!SHOP_ID,
    SECRET_KEY: !!SECRET_KEY,
  });

  if (!BOT_TOKEN || !SHOP_ID || !SECRET_KEY) {
    console.error('Missing env vars');
    return res.status(500).json({ error: 'Сервер не настроен' });
  }

  const { userId, username, product, price, category } = req.body;
  console.log('BODY:', { userId, username, product, price, category });

  if (!userId || !product || price === undefined || price === null) {
    return res.status(400).json({ error: 'Неверные данные заказа' });
  }

  const amount = Number(price);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Цена должна быть числом > 0' });
  }

  try {
    const idempotenceKey = `order_${userId}_${Date.now()}`;
    const auth = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

    const paymentData = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: 'https://t.me/FLUGGA_STORE_BOT',
      },
      capture: true,
      description: `Заказ: ${product} (${amount}₽) от @${username || userId}`,
    };

    console.log('Creating YooKassa payment...');
    const yooResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Idempotence-Key': idempotenceKey,
      },
      body: JSON.stringify(paymentData),
    });

    if (!yooResponse.ok) {
      const errorText = await yooResponse.text();
      console.error('ЮKassa error:', errorText);
      throw new Error(`ЮKassa вернула ошибку: ${yooResponse.status}`);
    }

    const yooData = await yooResponse.json();
    const paymentUrl = yooData?.confirmation?.confirmation_url;

    console.log('YOOKASSA PAYMENT CREATED:', yooData.id);
    console.log('PAYMENT URL:', paymentUrl);

    if (!paymentUrl) {
      throw new Error('ЮKassa не вернула ссылку на оплату');
    }

    const tgMessage = `✅ *Новый заказ!*\n\nКатегория: ${category || 'Не указана'}\nТовар: ${product}\nСумма: ${amount} ₽\n\nОплатите заказ по кнопке ниже:`;
    const tgKeyboard = {
      inline_keyboard: [
        [{ text: '💳 Перейти к оплате', url: paymentUrl }],
      ],
    };

    console.log('SENDING TELEGRAM MESSAGE TO:', userId);
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: tgMessage,
        parse_mode: 'Markdown',
        reply_markup: tgKeyboard,
      }),
    });

    console.log('TELEGRAM RESPONSE STATUS:', tgResponse.status);
    if (!tgResponse.ok) {
      const tgError = await tgResponse.text();
      console.error('Telegram error:', tgError);
    }

    return res.status(200).json({
      success: true,
      message: 'Заказ создан',
      paymentUrl: paymentUrl,
      paymentId: yooData.id,
    });

  } catch (error) {
    console.error('Ошибка в /api/order:', error);
    return res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
}
