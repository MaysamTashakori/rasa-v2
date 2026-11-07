# AGENTS.md — قواعد عملیاتی رسا ۲ (برای ایجنت‌ها و آدم‌ها)

## اجرا و بیلد
- بیلد: `node apps/site/build.mjs` (خروجی `dist/site` تک‌فایلی؛ `dist/` کامیت می‌شود چون دیپلوی آن را mount می‌کند)
- سرور: `node server/index.mjs` — Node ≥ ۲۲.۵ لازم است (`node:sqlite`)
- سرور محلی: `PORT=8080 FIRST_USER_FOUNDER=1 node server/index.mjs`

## قواعد محصول (نقض‌ناپذیر)
1. **راست‌گویی:** هیچ عدد ساختگی در UI؛ آمار فقط از دیتابیس زنده (`/api/network` stats). محصول/ایستگاه پولی بدون محتوای واقعی (`steps`) ارائه نمی‌شود — گارد در `server/index.mjs` است.
2. **گام کوچک:** واحد یادگیری «سفر» است (۱۰-۱۵ دقیقه)؛ «دورهٔ جامع» ممنوع.
3. **قیمت:** تومانِ صحیح در کل سیستم؛ ریال فقط در مرز زرین‌پال (`pay.mjs`).
4. `APP_URL` فقط از env — هرگز از request origin.
5. مهر بلدی مادام‌العمر است؛ `stamps.stamped` فقط ۰→۱ می‌رود هرگز برنمی‌گردد.

## محتوا
- ساختار خطوط/ایستگاه‌ها: `content/metro/lines.json` (مختصات اُکتولینئار، `viewBox` چهارتایی [x,y,w,h])
- کارت تعاملی: `content/metro/cards/<line>/<station>.json` — گام‌ها: `say|ask|input|order|match`
- بانک سؤال: `content/quiz/{dabestan,mote1}.json` — هر سؤال `st` (ایستگاه) دارد
- تغییر محتوا = بیلد لازم نیست (سرور می‌خواند) ولی کامیت هست.

## دیپلوی
- سرور S1: `root@5.9.89.137` · `/opt/rasa-v2` · پورت **۸۷۴۲** · دیتا: `/opt/rasa-v2-data` · env: `/etc/rasa-v2.env`
- دیپلوی: `ssh root@5.9.89.137 'cd /opt/rasa-v2 && RASA2_PORT=8742 bash deploy/deploy.sh'`
- **cutover انجام شد (۱۴۰۵/۰۸/۱۶):** nginx ‏rasa-prompt.ir → ۱۲۷.۰.0.۱:۸۷۴۲. بکاپ پیکربندی قبلی در `/root/rasa-prompt.nginx.bak.*`؛ نسل ۱ هنوز روی ۸۷۴۰ اجراست (بازگشت فوری: sed معکوس + reload).
- دامنهٔ تست: `edu2.5-9-89-137.sslip.io` (HTTP → ۸۷۴۲).
- بیلد dist فقط محلی قبل از push — روی سرور بیلد نمی‌کنیم (working tree تمیز بماند).

## ربات‌ها
- webhookها: `POST /api/bots/{telegram|bale}` با هدر/کوئری `WEBHOOK_SECRET` — setWebhook دستی.
- سکوت شبانه ۲۱ تا ۷ (Asia/Tehran)؛ صف `outbox` با dedup.

## برند و زبان
- نام: «رسا» · شعار: «درس، ایستگاه‌به‌ایستگاه.» · واژه‌نامه در `docs/00-manifest.md` — واژه‌ها همه‌جا یکسان.
- فارسی درست، ارقام فارسی، نیم‌فاصله (ZWNJ)، RTL بومی، وزیرمتن.

## کامیت
- پیام کامیت کوتاه انگلیسی؛ trailer مربوطه طبق عرف ریپوهای رسا.
