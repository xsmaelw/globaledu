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
| `public/video/ribbons.mp4` | Видео-цикл с лентами в hero |
| `src/js/globe3d.js` | 3D-глобус «Toshkentdan dunyoga» (карта суши — `land-mask.js`) |
| `src/js/form.js` | Форма: заявки уходят на почту через formsubmit.co |
| `public/` | Статика: фото, иконки, `og.jpg` |
| `scripts/gen-land-mask.mjs` | Разовая генерация карты суши для глобуса |

## Что править чаще всего

- **Контакты** — в `index.html` (поиск по `globaleduc@gmail.com` и `+998 91 347 81 79`) и `FORM_EMAIL` в `src/js/form.js`.
- **Фото команды** — `public/img/alisher.webp`, `public/img/asrorbek.webp` (формат 4:5, ~512×640).
- **Города на глобусе** — массив `CITIES` в `src/js/globe3d.js`.

## Доступность

Учтены `prefers-reduced-motion` (все анимации и 3D отключаются), `prefers-reduced-transparency`,
`prefers-contrast`, ссылка «перейти к содержимому», фокус с клавиатуры, управление меню/политикой с клавиатуры.
