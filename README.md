# رسا ۲ — متروی دانش 🚇

درس، ایستگاه‌به‌ایستگاه. هر فصل کتاب یک **ایستگاه**، هر جلسهٔ ۱۵ دقیقه‌ای یک **سفر**، هر تسلط یک **مهرِ بلدی** — و جمعه‌ها نامهٔ پیشرفت برای خانواده در بله/تلگرام.

نسل دومِ رasa-prompt.ir — بازسازی کامل از صفر با مفهوم جدید. فلسفهٔ کامل: `docs/00-manifest.md`

## معماری

- **صفر وابستگی.** Node ≥ ۲۲.۵ + `node:sqlite` + Vanilla JS. هیچ npm‌ای نصب نمی‌شود.
- `server/` — API: auth (scrypt + نشست ۶۰ روزه)، شبکهٔ مترو، سفر و مهر، اشتراک زرین‌پال، ربات‌ها، مرکز فرمان.
- `apps/site/` — تک‌صفحه (SPA) با نقشه‌کش SVG اُکتولینئار؛ بیلد تک‌فایلی با فونت درون‌گذری + سرویس‌ورکر نسخه‌دار.
- `content/` — خطوط/ایستگاه‌ها، کارت‌های تعاملی ۱۳ ایستگاه، بانک ۶۵ سؤال، تعرفهٔ اشتراک.

## اجرا

```bash
node apps/site/build.mjs          # بیلد dist/site
PORT=8080 FIRST_USER_FOUNDER=1 node server/index.mjs
```

اولین حسابِ ساخته‌شده با `FIRST_USER_FOUNDER=1` نقش founder می‌گیرد (مرکز فرمان `/admin`).

## استقرار

```bash
ssh root@5.9.89.137 'cd /opt/rasa-v2 && RASA2_PORT=8742 bash deploy/deploy.sh'
```

داکر `node:24-alpine`، کد read-only، دیتا در volume جدا. nginx جلوتر می‌نشیند.

## متغیرهای محیطی

`PORT` `DATA_DIR` `APP_URL` `ZARINPAL_MERCHANT` `ZARINPAL_SANDBOX` `TELEGRAM_BOT_TOKEN` `TELEGRAM_BOT_NAME` `BALE_BOT_TOKEN` `BALE_BOT_NAME` `WEBHOOK_SECRET` `FOUNDER_LOGINS` `FIRST_USER_FOUNDER` — بیلد: `SITE_URL`

## قواعد ثابت

تومانِ صحیح (ریال فقط در درگاه) · بدون عدد ساختگی — آمار فقط از دیتابیس زنده · هیچ ایستگاهِ پولی بدون کارتِ واقعی live نمی‌شود · RTL/فارسی/ZWNJ درست · فونت وزیرمتن (OFL)
