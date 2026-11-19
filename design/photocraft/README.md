# Піктограми «Поважайте своє»

У [editable](editable) відкрий `.pcraft` у PhotoCraft. Деталі лежать на окремих шарах фігур: у касети можна пересунути котушку, у фотоапарата змінити колір корпусу. Файли `ui-*` містять контури для меню й кнопок.

Застосунок бере готові PNG з `app/assets/ink/`. Одноколірні значки використовують альфа-маску з `app/icon-masks.mjs`, тому в активній вкладці та сама форма має інший колір. Папка з редагованими проєктами не входить у застосунок.

Для повторного експорту потрібні PhotoCraft 0.16.0, Python з `fonttools` і Node. З кореня репозиторію:

```sh
python design/photocraft/build.py "/path/to/photocraft-cli"
```

Скрипт створює шари через команду PhotoCraft `shape.create`, зберігає `.pcraft` і експортує з нього PNG. Після експорту виконай `npm run build:ui`.

Для картки SadSvit відкрий [постер «Касета»](editable/sadsvit-kaseta.pcraft). Застосунок показує його без мережі або якщо [обкладинка релізу на Bandcamp](https://sadsvit.bandcamp.com/track/--2) не завантажилась. Щоб відтворити постер і експортувати його в `app/assets/covers/`, виконай `python design/photocraft/build_kaseta.py "/path/to/photocraft-cli"`.

Квадратні обкладинки каталогу лежать у `app/assets/covers/`. Генератор відтворює їх у PhotoCraft:

```sh
python design/photocraft/build_covers.py "/path/to/photocraft-cli"
python design/photocraft/build_covers.py "/path/to/photocraft-cli" yt-1 --editable
```

Друга команда також зберігає шари обраної обкладинки у `editable/cover-yt-1.pcraft`.

«Буквопад» і добірка «Ілюстрації» у «Відкрий кадр» використовують 48 квадратних малюнків з `app/assets/arcade/`. Щоб перегенерувати їх або зберегти шари одного малюнка:

```sh
python design/photocraft/build_arcade.py "/path/to/photocraft-cli"
python design/photocraft/build_arcade.py "/path/to/photocraft-cli" hedgehog --editable
```

Для шести карток «Обери свій напрям» відкрий `editable/direction-*.pcraft`. Наприклад, у `direction-music.pcraft` можна пересунути тонарм або змінити колір платівки. Щоб відтворити ці проєкти й експортувати квадратні WebP у `app/assets/directions/`:

```sh
python design/photocraft/build_directions.py "/path/to/photocraft-cli"
```
