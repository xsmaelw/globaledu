# GlobalEdu.uz

Сайт центра GlobalEdu.uz (только узбекский язык). Vite + GSAP (ScrollTrigger, SplitText) + Lenis + three.js.

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # сборка в dist/
npm run preview  # просмотр собранной версии
```

Деплой — Vercel (`vercel.json`: `npm ci` → `npm run build` → `dist/`).

## Структура

| Путь | Что там |
| --- | --- |
| `index.html` | Вся разметка и тексты, мета-теги, JSON-LD |
| `src/css/main.css` | Дизайн-система и стили секций |
| `src/js/sections.js` | Анимации секций (стопка направлений, горизонтальные результаты, маски текста) |
| `src/js/globe3d.js` | 3D-глобус «Toshkentdan dunyoga» (карта суши — `land-mask.js`) |
| `src/js/gradient.js` | Движущиеся шейдерные фоны цветных секций: у каждой свой узор (пиксели, волны, изолинии, пузыри, полутон, шёлк). Шёлк — порт ShaderGradient (MIT) без React |
| `src/js/tilted-grid.js` | Изогнутая лента карточек в hero (порт идеи Tilted Grid Hero на чистый JS) |
| `src/js/form.js` | Форма: заявки уходят на почту через formsubmit.co |
| `public/` | Статика: фото, иконки, `og.jpg` |
| `scripts/gen-land-mask.mjs` | Разовая генерация карты суши для глобуса |

## Главный экран

Изогнутая лента с карточками стран (без России): `src/js/tilted-grid.js` (чистый JS + CSS 3D, без зависимостей) и карточки `public/img/countries/*.webp`. Список стран и параметры (скорость, кривизна, высота) — в `src/main.js`, блок `initTiltedGrid`. Карточки сделаны по шаблону: код страны, название, города и наклонный флаг.

## Что править чаще всего

- **Контакты** — в `index.html` (поиск по `globaleduc@gmail.com` и `+998 91 347 81 79`) и `FORM_EMAIL` в `src/js/form.js`.
- **Фото команды** — `public/img/alisher.webp`, `public/img/asrorbek.webp` (формат 4:5, ~512×640).
- **Цвета и узор фона секции** — атрибуты `data-gradient="основной,светлый,глубокий"` и `data-gradient-type="pixel|ripples|lines|bubbles|halftone|silk"` у секции в `index.html`.
- **Города на глобусе** — массив `CITIES` в `src/js/globe3d.js`.

## Доступность

Учтены `prefers-reduced-motion` (все анимации и 3D отключаются), `prefers-reduced-transparency`,
`prefers-contrast`, ссылка «перейти к содержимому», фокус с клавиатуры, управление меню/политикой с клавиатуры.

## Благодарности

- Градиенты: шейдер и идея [ShaderGradient](https://github.com/ruucm/shadergradient) (MIT, © ruucm).
- Стеклянная шапка: внешний вид (матовое стекло, блик кромки) по мотивам [liquid-glass-js](https://github.com/dashersw/liquid-glass-js) (MIT, © Armagan Amcalar), реализован на чистом CSS.
