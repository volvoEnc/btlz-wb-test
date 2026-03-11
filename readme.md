# WB Tariffs Sync Service

Сервис решает 2 задачи:

1. Ежечасно получает тарифы WB для коробов и сохраняет их в PostgreSQL.
2. Ежечасно обновляет актуальные данные из PostgreSQL в произвольное количество Google Sheets по `spreadsheetId`.

Источник данных WB: `GET https://common-api.wildberries.ru/api/v1/tariffs/box`

Документация WB: https://dev.wildberries.ru/en/docs/openapi/wb-tariffs

## Что делает приложение

- При старте автоматически применяет миграции.
- Сразу выполняет первый цикл синхронизации.
- Затем запускает почасовой планировщик.
- Для каждого дня хранит один актуальный набор тарифов.
- Повторный запрос в течение того же дня обновляет данные за этот день, а не создаёт дубликаты.
- Синхронизирует данные в лист `stocks_coefs` у всех указанных Google-таблиц.
- Сортирует строки по возрастанию коэффициента.

По умолчанию сортировка выполняется по `box_delivery_coef_expr`.
Это можно изменить через `SORT_BY_COEFFICIENT`.

## Стек

- Node.js 20
- TypeScript
- PostgreSQL
- knex.js
- Google Sheets API
- Docker / Docker Compose

## Архитектура

Проект разложен по принципам Clean Architecture с доменной моделью в духе DDD:

- `src/domain`:
  сущности предметной области `DailyTariffSnapshot`, `WarehouseTariff`, `SpreadsheetTarget` и value object для поля сортировки.
- `src/application`:
  порты и use case'ы.
  Здесь описаны сценарии `SyncDailyWbTariffs`, `SyncCurrentTariffsToSpreadsheets`, `RunTariffSyncCycle`.
- `src/infrastructure`:
  адаптеры PostgreSQL, Wildberries API, Google Sheets, in-memory monitor и планировщик.
- `src/app.ts`:
  composition root, где только связываются зависимости.

Зависимости направлены внутрь:

- `infrastructure -> application -> domain`

Бизнес-логика не зависит от HTTP, PostgreSQL, Google Sheets и таймеров Node.js.

## Структура данных в PostgreSQL

Используются 3 таблицы:

- `spreadsheets`:
  хранит идентификаторы Google Sheets, имя листа, признак активности и статус последней синхронизации.
- `wb_box_tariff_snapshots`:
  одна запись на дату тарифа, содержит `dt_next_box`, `dt_till_max`, время загрузки и исходный payload WB.
- `wb_box_tariff_warehouses`:
  тарифы по складам за конкретную дату.

Такое разделение позволяет:

- хранить историю по дням;
- обновлять только текущий день при повторных почасовых запросах;
- не дублировать общие поля ответа WB по всем складам.

## Конфигурация

В репозитории есть шаблон: `.env.example`

Минимально:

```bash
cp .env.example .env
```

Заполните в `.env`:

- `WB_API_TOKEN`:
  токен Wildberries API.
- `GOOGLE_SPREADSHEET_IDS`:
  список spreadsheet ID через запятую.
- `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64`:
  base64 от JSON-ключа service account.

Остальные параметры уже имеют безопасные дефолты.

Параметры PostgreSQL фиксированы по условию:

- БД: `postgres`
- пользователь: `postgres`
- пароль: `postgres`

### Как получить `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64`

macOS:

```bash
base64 -i service-account.json | tr -d '\n'
```

Linux:

```bash
base64 -w 0 service-account.json
```

Важно:

- сервисный аккаунт должен иметь доступ к каждой таблице;
- лист создаётся автоматически, если `stocks_coefs` ещё нет.

## Запуск

После заполнения `.env` достаточно одной команды:

```bash
docker compose up --build
```

## Что происходит после старта

- поднимается PostgreSQL;
- приложение применяет миграции;
- выполняет первую загрузку тарифов WB;
- записывает/обновляет данные за текущую дату в БД;
- выгружает актуальные данные в Google Sheets;
- далее повторяет цикл каждый час.

Если токен WB или Google credentials не указаны, контейнер всё равно стартует, но соответствующий этап будет пропущен с понятным сообщением в логах.

## Проверка работы

### 1. Проверка compose-конфига

```bash
docker compose config
```

### 2. Проверка health endpoint

После старта сервиса:

```bash
curl http://localhost:3000/health
```

В ответе будет текущее состояние воркера:

- статус последней синхронизации WB;
- статус синхронизации Google Sheets;
- время следующего запуска;
- базовая конфигурация сервиса.

### 3. Проверка логов

```bash
docker compose logs -f app
```

### 4. Проверка данных в PostgreSQL

```bash
docker compose exec postgres psql -U postgres -d postgres
```

Примеры запросов:

```sql
select * from wb_box_tariff_snapshots order by tariff_date desc;
select * from wb_box_tariff_warehouses order by tariff_date desc, box_delivery_coef_expr asc;
select * from spreadsheets order by spreadsheet_id;
```

## Полезные переменные

- `APP_PORT=3000`
- `APP_TIMEZONE=Europe/Moscow`
- `FETCH_INTERVAL_MINUTES=60`
- `GOOGLE_SHEET_NAME=stocks_coefs`
- `SORT_BY_COEFFICIENT=box_delivery_coef_expr`

Поддерживаемые значения `SORT_BY_COEFFICIENT`:

- `box_delivery_coef_expr`
- `box_delivery_marketplace_coef_expr`
- `box_storage_coef_expr`

## Локальная проверка без Docker

```bash
npm ci
npm run build
npm run start
```

Для локального запуска нужен доступный PostgreSQL и заполненные переменные окружения.

## Unit tests

Запуск всех unit-тестов:

```bash
npm test
```

Тесты написаны на TypeScript и расположены рядом с исходными файлами в `src/**/*.test.ts`.

Тестами покрыты ключевые слои:

- application use case'ы;
- инфраструктурные адаптеры WB API и Google Sheets;
- scheduler и runtime monitor;
- health handler;
- date utilities.

## Что уже подготовлено в репозитории

- Dockerfile
- `compose.yaml`
- миграции knex
- конфигурационный шаблон `.env.example`
- сервис почасовой загрузки WB
- сервис выгрузки в Google Sheets
- health endpoint `/health`
