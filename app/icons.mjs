import masks from './icon-masks.mjs';

// Inline the alpha mask so it also works in the offline file:// desktop renderer.
export function icon(name, size=20) {
  const mask = masks[name] || masks.spark;
  return `<span class="ico ink-symbol" aria-hidden="true" style="width:${size}px;height:${size}px;--mask:url(data:image/png;base64,${mask})"></span>`;
}

const clues = {
  horizon:['Сонце над лінією пагорбів','ОБРУЧ − УЧ + РІЙ'],
  notches:['Зарубки на дереві','ЗА + РУБАТИ'],
  tiles:['Дві фігури однакової форми','К + ШТАБ − Б + ЛТ'],
  drop:['Крапля води','ЯК В_ДИ В Р_Т'],
  wave:['Гребінь хвилі','ХВИЛИНА − ИНА + Я'],
  cat:['Кіт з однією сльозою','ОДНА СЛЬОЗА'],
  knot:['Мотузка, стягнута вузлом','НЕ + ПЕРЕЛИВ + КИ'],
  cloud:['Просвіт у хмарах','ПРОЗА − ЗА + ГАЛИНА'],
  rainbow:['Три різнокольорові дуги','РАЙОН − ОН + ДУГА'],
  oven:['Розігріта піч','ПЕКТИ + РАКІВ'],
  leaf:['Листок із прожилками','ШЕЛЬФ − ЬФ + ЖЕСТ − Ж'],
  wind:['Потоки повітря','ВІТЕР + ПЕРЕЦЬ − ПЕР'],
  grass:['Трава на відкритому полі','СТЕЛЯ − ЛЯ + П'],
  bird:['Птах на гілці','ЛОВИТИ + ҐАВА − А В КІНЦІ'],
  dawn:['Сонце виходить з-за пагорбів','ЗАМОК − МОК + ГРА + ВА'],
  hive:['Будиночок для бджіл','ВУЛИЦЯ − ЦЯ + К'],
  sieve:['Вода витікає крізь решето','ВОДА + ОТВОРИ'],
  shelf:['Зуб лежить на полиці','ВЕЧЕРЯ НА ДВОХ: ПОРОЖНЬО'],
  fish:['Риба із закритим ротом','РИБА КАЖЕ: «…»'],
  pear:['Груша з листком','ДЕРЕВО: ВЕРБА'],
  shortcut:['Короткий шлях через двір','НАВ + ПРОСТІР − ІР + ЕЦЬ'],
  calendar:['Сторінка календаря зі стрілкою назад','ПОШУК: УЧОРА'],
  snail:['Равлик у мушлі','С + ПРО + КВОЛА'],
  needle:['Голка з ниткою','СІНО / Г_ЛК_ / СІНО'],
};
export function clueMarkup(key) {
  if (!Object.hasOwn(clues,key)) return '<div class="clue-caption">Скористайся підказкою у запитанні.</div>';
  const [alt,letters]=clues[key], art=key==='dawn'?'horizon':key;
  return `<figure class="ink-clue"><img src="./assets/ink/${art}.png" width="72" height="72" alt="${alt}"><figcaption><span class="small-label">Підказка</span><b>${letters}</b></figcaption></figure>`;
}
export const categoryArt = ['film','shorts','tape','photo','nib','pad'];
