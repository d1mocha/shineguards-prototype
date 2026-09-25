# Shine Guards — прототип сайту

Прототип нового shineguards.com: усі сторінки для 4 міст (Відень, Грац, Мюнхен, Братислава), калькулятори для дому та бізнесу.

- `assets/data.js` — ціни, послуги, тексти.
- `assets/site.js` — рендер сторінок, калькулятори.
- `assets/site.css` — стилі.
- `_build.py` — генерує сторінки з тими ж URL, що й на сайті.

## Подивитися локально

```bash
python _build.py
python _serve.py
```

Потім відкрити http://localhost:5174/vienna/ua/

## Публікація

Netlify збирає сайт сам при кожному пуші в `main` (див. `netlify.toml`): команда `python3 _build.py --share`, папка `_share/site`. Сторінки закриті від індексації.
