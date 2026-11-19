// A starting point for each built-in pair. External artwork stays on the source site.
const pick = (title, meta, cue, url, action, artwork) => ({title, meta, cue, url, action, artwork});
const art = (image, source, label, alt = '', focus = 'center') => ({image, source, label, alt, focus});
// A centered frame fits the square better than the title-heavy default thumbnail.
const frames = {
  XaWb01I0O8k:'maxres1', '8Lgy05JHojc':'maxres2', 'Lv_ge-93xn0':'maxres3', r7Mug7A7RGI:'maxres2', FdlVSh6lzuQ:'maxres1',
  XXeMGuo17Qk:'maxres3', f9WzBY3NEI4:'maxres2', vUnDHTmZDQU:'oar2', 'U7-dxzp6Jvs':'maxres2',
  sHILe97zR2I:'maxres2', BB87nZ2Wldg:'maxres3', '8VBDi_p_sf8':'maxres1', OeYtKIATqcw:'maxres3',
};
const video = (id, title, time, cue, action = 'Дивитися випуск', thumbnail = 'maxresdefault', focus = 'center') => {
  const url = `https://www.youtube.com/watch?v=${id}`;
  return pick(title, `YouTube${time ? ` · ${time}` : ''}`, cue, url, action,
    art(`https://i.ytimg.com/vi/${id}/${frames[id] || thumbnail}.jpg`, url, 'Прев’ю на YouTube', title, focus));
};
const steam = (id, title, cue, image) => {
  const url = `https://store.steampowered.com/app/${id}/`;
  return pick(title, 'Гра · Steam', cue, url, 'Відкрити гру в Steam', art(image, url, 'Скриншот зі Steam'));
};

const starts = {
  'yt-1': video('XaWb01I0O8k', 'Огляд «Довбуша»', '14:48', 'Послухай, як Тайлер Андерсон оцінює український пригодницький фільм.'),
  'yt-2': pick('«До ворожки не ходи»: НЛО', 'Науковий подкаст', 'Послухай, як у «Куншті» перевіряють розповіді про НЛО.', 'https://www.kunsht.com.ua/podcasts/do-vorozhki-ne-xodi-nlo', 'Слухати випуск',
    art('https://www.kunsht.com.ua/storage/media/shares/cache/article_images/podcasts/main_image_podkast_73_cache.webp', 'https://www.kunsht.com.ua/podcasts/do-vorozhki-ne-xodi-nlo', 'Обкладинка випуску · Куншт', 'Летючі тарілки на обкладинці подкасту')),
  'yt-3': video('PSeZKch-Im0', 'Навіщо ліжники кладуть у річку', '1:28', 'Подивись, як вода допомагає обробляти вовняні ковдри. Відео англійською.'),
  'yt-4': video('8Lgy05JHojc', 'Pixel 9 Pro XL чи Galaxy S24 Ultra?', '24:18', 'Зупини відео на порівнянні камер і роздивися деталі на фото.'),
  'yt-5': video('Lv_ge-93xn0', 'Богдан Хмельницький', '16:11', 'Послухай, на чому історик будує свою оцінку рішень гетьмана.'),
  'yt-6': video('r7Mug7A7RGI', 'Звідки береться молоко?', '2:51', 'Простеж за схемою в українському озвученні анімації MinuteEarth.'),
  'yt-7': video('FdlVSh6lzuQ', 'Розмова з підприємцем із ПАР у Києві', '18:24', 'Послухай, як співрозмовник описує Україну англійською.'),
  'yt-8': video('Ajl5fHz1_co', 'Як замовити каву українською', '5:56', 'Після діалогу спробуй замовити свій напій без підказки.', 'Слухати урок'),

  'sh-1': video('xGWT6j6oO-E', '«Підкати» з Дімкою Носовим', '36:07', 'Почни з підкату: учасник має вигадати репліку для знайомства.', 'Дивитися «Підкати»'),
  'sh-2': video('ETv5Y4YdkXY', 'Хореографія Віолетти Матюшенко', '6:18', 'Повтори першу танцювальну зв’язку перед дзеркалом.', 'Дивитися хореографію', 'maxres2'),
  'sh-3': video('XXeMGuo17Qk', 'Сирники: солодкі й солоні', '3:55', 'Поглянь, якої густини тісто перед смаженням.', 'Дивитися рецепт'),
  'sh-4': video('zlQH7OAnE5I', '«Концерт №7»', '', 'Послухай перший жарт і зверни увагу на паузу перед кінцівкою.', 'Дивитися стендап', 'maxres2', 'right'),
  'sh-5': video('f9WzBY3NEI4', '«Межиріччя №2»: Харків нульових', '', 'Олег Сердюк згадує харківську сцену й гурт Lюk.', 'Дивитися розмову'),
  'sh-6': video('FNTGmaxhVOw', 'Клуб рятівників UAnimals', '0:30', 'Подивись, як волонтери пояснюють, навіщо створили клуб.', 'Дивитися ролик'),
  'sh-7': video('KQQBiDS5DdY', 'Light Balance Classics Mashup', '5:39', 'Стеж за смугами на костюмах: світло змінює силуети танцівників.', 'Дивитися номер'),
  'sh-8': video('vUnDHTmZDQU', 'Скорочення в англійських переписках', '', 'Зупини ролик і спробуй розшифрувати скорочення.', 'Дивитися короткий урок'),

  'mu-2': video('5rtBK7C1E-g', '«Пекло»', '3:31', 'Прислухайся, на які склади OTOY ставить наголос.', 'Слухати «Пекло»'),
  'mu-3': video('hsNKSbTNd5I', 'Tiny Desk Concert', '13:57', 'У першій пісні простеж, як музиканти підхоплюють один одного.', 'Слухати концерт'),
  'mu-4': video('U7-dxzp6Jvs', '«Шум»', '3:08', 'Послухай, як Go_A поєднує веснянку з електронним бітом.', 'Слухати «Шум»'),
  'mu-5': video('NDAcwxEuojY', '«М’ята»', '4:47', 'Прислухайся, як голос Олександри Зарицької звучить у приспіві.', 'Слухати «М’яту»'),
  'mu-6': video('Yfe6By3noxQ', '«Прірва» наживо', '3:05', 'Почуй голос Юлії Саніної в акустичній версії.', 'Слухати «Прірву»'),
  'mu-7': video('IBs7k7Jfi_A', 'I’m the Mountain', '13:02', 'Послухай, як музиканти переходять від тихого вступу до важкого рифу.', 'Слухати трек'),
  'mu-8': video('wNECV2h-y58', '«1944»', '3:24', 'У приспіві прислухайся до кримськотатарських рядків.', 'Слухати «1944»'),

  'in-1': pick('Тренування Даші Квіткової', 'Instagram · Reels', 'Почни з роликів, у яких Даша показує рухи під час тренування.', 'https://www.instagram.com/kvittkova/reels/', 'Відкрити Reels',
    art('https://insider.ua/wp-content/uploads/2024/05/kvitkova.jpg', 'https://insider.ua/dasha-kvitkova-provela-rekordne-kvitkove-trenuvannya-u-kievi/', 'Фото пресслужби · INSIDER.UA', 'Даша Квіткова на благодійному тренуванні')),
  'in-2': pick('Ukrainian Railroad Ladies', 'Фотосерія', 'Роздивися, як чергові облаштували свої будки біля колій.', 'https://railroadladies.com/', 'Гортати фотосерію',
    art('https://railroadladies.com/img/tetyana.jpg', 'https://railroadladies.com/', 'Фото Саші Маслова', 'Чергову видно у вікні між двома шторами')),
  'in-3': pick('Кого вважати жителем Києва?', 'Стаття «Хмарочоса»', 'Порівняй, кого в проєкті міського статуту називають «жителем», а кого «мешканцем».', 'https://hmarochos.kiev.ua/2026/11/12/novyj-statut-kyyeva-proponuye-nadaty-rizni-prava-zhytelyam-i-meshkanczyam/', 'Читати статтю',
    art('https://hmarochos.kiev.ua/wp-content/uploads/2026/11/eugene-chystiakov-xxpp4mpkxvg-unsplash.jpg', 'https://hmarochos.kiev.ua/2026/11/12/novyj-statut-kyyeva-proponuye-nadaty-rizni-prava-zhytelyam-i-meshkanczyam/', 'Фото Eugene Chystiakov · «Хмарочос»', 'Київ крізь круглу лінзу')),
  'in-4': pick('Фотоальбом «2025»', 'Фотопроєкт UAPP', 'Розгорни альбом і вибери одну серію. Хто її зняв і що помічав від кадру до кадру?', 'https://www.ukrainianphotographers.com/uni-story/fotoalbom-2025', 'Гортати фотоальбом',
    art('https://cdn.prod.website-files.com/65c35f5de9e48164ef4cee06/69d9056f0d0d96bc9e916188_uapp_microgrant_book%2014.jpg', 'https://www.ukrainianphotographers.com/uni-story/fotoalbom-2025', 'Розворот фотоальбому · UAPP', 'Розгорнутий фотоальбом «2025»')),
  'in-5': pick('Куди падає наголос у слові «закладка»?', 'Картка Лепетуна', 'Вимов слово, перш ніж відкрити підказку.', 'https://ukr-mova.in.ua/library/nagolos/nagolos-u-slovi-zakladka', 'Відкрити картку',
    art('https://ukr-mova.in.ua/assets/uploads/images/Mova_520.png', 'https://ukr-mova.in.ua/library/nagolos/nagolos-u-slovi-zakladka', 'Ілюстрація Лепетуна')),
  'in-6': pick('Mamushka', 'Кулінарна книжка', 'Поглянь, як Оля Геркулес представляє українські рецепти англомовним читачам.', 'https://oliahercules.com/books/mamushka', 'Відкрити Mamushka',
    art('https://images.squarespace-cdn.com/content/v1/65c6001b17c67c6a4c2428a7/1710251192898-BZ72D9QEWRC3J3A4G5P8/mamushka_trans_NvBQzQNjv4Bqeo_i_u9APj8RuoebjoAHt0k9u7HhRJvuo-ZLenGRumA.jpg?format=750w', 'https://oliahercules.com/books/mamushka', 'Обкладинка із сайту Олі Геркулес', 'Синя обкладинка Mamushka із золотим орнаментом', 'top')),
  'in-7': pick('Сережки-колоски BEVZA', 'Прикраси', 'Роздивися, як майстри повторюють форму зерен у металевому колоску.', 'https://bevza.com/products/spikelet-short-earrings-gold', 'Роздивитися сережки',
    art('https://bevza.com/cdn/shop/files/2B125DB6-BBA9-424D-8365-6577FDAEC5C0.jpg?v=1763502234&width=750', 'https://bevza.com/products/spikelet-short-earrings-gold', 'Фото з колекції BEVZA', 'Сережка у формі колоска')),
  'in-8': pick('Розписані тарілки', 'Кераміка · GUNIA Project', 'Зістав мазки на двох тарілках схожої форми.', 'https://guniaproject.com/collections/tarilki', 'Роздивитися тарілки',
    art('https://guniaproject.com/cdn/shop/files/PL-008-FW26_0.jpg?v=1789478993&width=750', 'https://guniaproject.com/products/tarilka-krugla-druzi-24', 'Фото тарілки «Друзі» · GUNIA Project', 'Двоє коней на розписаній тарілці')),

  'ar-1': pick('Як льодовики змінювали історію людства', 'Розмова «Без брому»', 'Послухай, як Богдан Рідуш пояснює зв’язок клімату й людських поселень.', 'https://localhistory.org.ua/videos/bez-bromu/iak-lodoviki-zminiuvali-istoriiu-liudstva-bogdan-ridush/', 'Дивитися розмову',
    art('https://i.ytimg.com/vi/xXvFDwjembI/maxres1.jpg', 'https://www.youtube.com/watch?v=xXvFDwjembI', 'Кадр із «Без брому»', 'Богдан Рідуш у студії «Локальної історії»', 'left')),
  'ar-2': video('izQA8C3emt4', '«Мавка. Лісова пісня»', '2:27', 'Роздивися, як Animagrad зобразила ліс із драми Лесі Українки.', 'Дивитися трейлер'),
  'ar-3': pick('«Ті, що мають крила»', 'Мальопис · Vovkulaka', 'Почни з обкладинки: як художники вписали крила в силует героїні?', 'https://vovkulaka.net/ti-shcho-maiut-kryla/', 'Переглянути мальопис',
    art('https://vovkulaka.net/wp-content/uploads/2026/10/tsmks.webp', 'https://vovkulaka.net/ti-shcho-maiut-kryla/', 'Обкладинка видавництва Vovkulaka', 'Обкладинка мальопису «Ті, що мають крила»', 'top')),
  'ar-4': pick('«Типографія» Інни Смучок', 'Книжка про шрифт', 'Поглянь, як форма літер змінює настрій заголовка.', 'https://www.arthuss.com.ua/shop/inna-smuchok-typohrafiya', 'Переглянути книжку',
    art('https://www.arthuss.com.ua/image/catalog/books/inna-smuchok-typohrafiya/Typography-wh-700x1000.png', 'https://www.arthuss.com.ua/shop/inna-smuchok-typohrafiya', 'Обкладинка видавництва ArtHuss', 'Червона книжка з білими літерами назви')),
  'ar-5': pick('«Земля» Олександра Довженка', 'Кіноархів', 'Почни з опису німого фільму й роздивися кадри.', 'https://dovzhenkocentre.org/distributor/zemlya/', 'Відкрити картку фільму',
    art('https://dovzhenkocentre.org/wp-content/uploads/2021/07/2.2.jpeg', 'https://dovzhenkocentre.org/distributor/zemlya/', 'Кадр з архіву Довженко-Центру', 'Чорно-білий кадр із фільму «Земля»')),
  'ar-6': pick('Як у Європі заохочують дітей читати', 'Стаття · англійською', 'Подивись, яку роль у читанні можуть зіграти футбол і реп.', 'https://chytomo.com/en/from-football-clubs-to-rap-european-study-explores-new-ways-to-get-children-reading/', 'Читати статтю',
    art('https://chytomo.com/wp-content/uploads/2026/11/pexels-gustavo-fring-4894725.jpg', 'https://chytomo.com/en/from-football-clubs-to-rap-european-study-explores-new-ways-to-get-children-reading/', 'Фото Gustavo Fring · Читомо', 'Діти з розгорнутою книжкою')),
  'ar-7': pick('«Голосно, тихо, пошепки»', 'Книжка в малюнках', 'Спробуй визначити гучність за формою плям і розміром літер.', 'https://agrafkastudio.com/loudly-softly-in-a-whisper', 'Гортати сторінки',
    art('https://cdn.myportfolio.com/7fef38626e8430657b34c32383b423ca/88bd2806-2793-41a4-8938-d28a73f64d03_car_1x1.jpg?h=e8bdedce317c6c2c0d4b338822fb0066', 'https://agrafkastudio.com/loudly-softly-in-a-whisper', 'Обкладинка з портфоліо «Аґрафки»')),
  'ar-8': pick('Future Generation Art Prize 2024', 'Архів виставки', 'Роздивися роботи фіналістів разом із простором, у якому їх виставили.', 'https://pinchukartcentre.org/en/exhibitions/exhibition-of-21-shortlisted-artists-for-the-future-generation-art-prize-2024-06-29', 'Дивитися виставку',
    art('https://pinchukartcentre.org/wp-content/uploads/2025/07/66df2cec447788a05da3e0c5_optimized_1520-1-1.webp', 'https://pinchukartcentre.org/en/exhibitions/exhibition-of-21-shortlisted-artists-for-the-future-generation-art-prize-2024-06-29', 'Фото з архіву PinchukArtCentre')),

  'gm-1': video('sHILe97zR2I', 'Щоденник BLAST Austin Major', '18:57', 'Петрик розбирає промах s1mple в Counter-Strike 2.', 'Дивитися розбір'),
  'gm-2': video('BB87nZ2Wldg', 'S.T.A.L.K.E.R. 2: Come to Me', '2:30', 'Роздивися, як GSC Game World показує Чорнобильську зону.', 'Дивитися трейлер'),
  'gm-3': video('8VBDi_p_sf8', 'Огляд S.T.A.L.K.E.R. 2', '36:33', 'Подивись уривки гри в огляді, перш ніж вирішити, чи хочеш грати.', 'Дивитися огляд'),
  'gm-4': pick('Що змінив патч 7.42 у Dota 2', 'Новини PlayUA', 'Почни зі змін у правилах появи Рошана й економіці.', 'https://playua.net/valve-vypustyla-patch-7-42-dlya-dota-2-zi-zminamy-roshana-muchytelya-ta-igrovoyi-ekonomiky/', 'Читати про оновлення',
    art('https://playua.net/wp-content/uploads/2024/09/p.ua_.kez-dota-2.playua-og.jpg', 'https://playua.net/valve-vypustyla-patch-7-42-dlya-dota-2-zi-zminamy-roshana-muchytelya-ta-igrovoyi-ekonomiky/', 'Ілюстрація до новини · PlayUA', 'Kez із Dota 2')),
  'gm-5': video('OeYtKIATqcw', 'MOUZ проти Spirit: фінал BLAST Open', '', 'Послухай, як українські коментатори підсумовують один раунд.', 'Дивитися запис'),
  'gm-6': steam(1318740, 'Farlanders', 'Поглянь, як розміщення води впливає на план марсіанської колонії.', 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1318740/ss_4808865ee22648df0eb3f3b9e1c98395029114af.1920x1080.jpg'),
  'gm-7': steam(1802190, 'Puzzles For Clef', 'Роздивися, де на небесному острові сховали важелі й ключі.', 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1802190/ss_a95d4f98d2d80ae26e8899c09c055ef9d9f50cae.1920x1080.jpg'),
  'gm-8': steam(1137300, 'Sherlock Holmes Chapter One', 'Роздивися острів Кордона, де молодий Шерлок опитує свідків.', 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1137300/ss_2e203d79cdca27b3553461cc7d789842853ff189.1920x1080.jpg'),
};

export function withRecommendation(pair) {
  if (pair.preview) return pair;
  const start = starts[pair.id];
  if (!start) throw new Error(`Missing catalog recommendation: ${pair.id}`);
  return {...pair, preview: {...start, cover:`${pair.id}.webp`}};
}
