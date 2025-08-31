# Бэкенд часть маркетплейса ВИЭ оборудования со встроенным конфигуратором автоматического подбора товаров

* Бэкенд: 
  * Основной сервис: Nest.js
  * Модуль расчётов: Express
* База данных: PostgreSQL
* Развертывание: Docker Compose

### Требования к системе

* Установленный [Docker](https://www.docker.com/products/docker-desktop/)

### Запуск

#### Локальная сборка
```
docker-compose --env-file .env.development up --build -d
```

#### Продовая сборки

```
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
```

* Перед каждым запуском приложения происходит очистка бд и затем заполнение моковыми данными
