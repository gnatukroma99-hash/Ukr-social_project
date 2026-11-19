export const DEFAULT_LEVEL = 'normal';
export const LEVELS = {
  easy: {
    name:'Легко',
    side:{lives:5, time:9000, step:300},
    letters:{lives:5, time:6200, step:350, lanes:2},
    frames:{grid:2, open:[0,3], choices:2},
  },
  normal: {
    name:'Середньо',
    side:{lives:3, time:6500, step:360},
    letters:{lives:3, time:4300, step:260, lanes:3},
    frames:{grid:3, open:[4], choices:3},
  },
  hard: {
    name:'Складно',
    side:{lives:2, time:5400, step:330},
    letters:{lives:2, time:3600, step:250, lanes:4},
    frames:{grid:4, open:[5], choices:4},
  },
};
export const GAMES=['side','letters','frames','ladder'];
export const FRAME_ALBUMS={catalog:'Каталог',art:'Ілюстрації'};
export const DEFAULT_ALBUM='catalog';
export const isLevel=level=>Object.prototype.hasOwnProperty.call(LEVELS,level);
export const isAlbum=album=>Object.prototype.hasOwnProperty.call(FRAME_ALBUMS,album);
export const sideDuration=(level,index)=>LEVELS[level].side.time-Math.min(index,8)*LEVELS[level].side.step;
