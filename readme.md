# WB Tariffs Sync Service

Сервис делает две вещи:

1. Раз в час забирает тарифы WB по коробам и пишет их в PostgreSQL.
2. Раз в час обновляет актуальные данные в Google Sheets по `spreadsheetId`.

Источник WB: `GET https://common-api.wildberries.ru/api/v1/tariffs/box`

## Что внутри

- Node.js 20
- TypeScript
- PostgreSQL
- `knex`
- Google Sheets API
- Docker Compose

Код разложен на `domain`, `application`, `infrastructure`.

## Как хранятся данные

- `wb_box_tariff_snapshots` — одна запись на день.
- `wb_box_tariff_warehouses` — тарифы по складам за день.
- `spreadsheets` — список таблиц и статус последней выгрузки.

Повторный запрос в тот же день обновляет запись за день, а не создаёт новую.

## Настройка

В репозитории есть шаблон `.env.example`.

```bash
cp .env.example .env
```

Обязательные переменные:

- `WB_API_TOKEN`
- `GOOGLE_SPREADSHEET_IDS`
- `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64`

Полезные переменные:

- `APP_TIMEZONE=Europe/Moscow`
- `FETCH_INTERVAL_MINUTES=60`
- `GOOGLE_SHEET_NAME=stocks_coefs`
- `SORT_BY_COEFFICIENT=box_delivery_coef_expr`

Поддерживаемые значения `SORT_BY_COEFFICIENT`:

- `box_delivery_coef_expr`
- `box_delivery_marketplace_coef_expr`
- `box_storage_coef_expr`

Для `APP_TIMEZONE` нужны IANA-имена, например `Europe/Moscow` или `Asia/Yekaterinburg`.
Значения вида `GMT+0300` не подойдут.

Параметры БД по условию уже зафиксированы:

- база: `postgres`
- пользователь: `postgres`
- пароль: `postgres`

## Google service account

Нужен JSON-ключ сервисного аккаунта, закодированный в base64.

macOS:

```bash
base64 -i service-account.json | tr -d '\n'
```

Linux:

```bash
base64 -w 0 service-account.json
```

Важно:

- таблицы должны быть расшарены на `client_email` из этого JSON;
- в `GOOGLE_SPREADSHEET_IDS` нужен именно `spreadsheetId`;
- лист `stocks_coefs` создаётся автоматически.

## Запуск

После заполнения `.env` достаточно:

```bash
docker compose up
```

На старте приложение:

- поднимает PostgreSQL;
- применяет миграции;
- сразу делает первый цикл;
- дальше работает по расписанию.

Если нет `WB_API_TOKEN` или Google credentials, контейнер стартует, но нужный этап будет пропущен.

## Проверка

Проверить compose:

```bash
docker compose config
```

Проверить health:

```bash
curl http://localhost:3000/health
```

Посмотреть логи:

```bash
docker compose logs -f app
```

Проверить данные в БД:

```bash
docker compose exec postgres psql -U postgres -d postgres
```

Примеры запросов:

```sql
select * from wb_box_tariff_snapshots order by tariff_date desc;
select * from wb_box_tariff_warehouses order by tariff_date desc, box_delivery_coef_expr asc;
select * from spreadsheets order by spreadsheet_id;
```

## Локальный запуск

```bash
npm ci
npm run build
npm run start
```

Нужны доступный PostgreSQL и заполненный `.env`.

## Тесты

```bash
npm test
```

Тесты лежат рядом с кодом: `src/**/*.test.ts`.
