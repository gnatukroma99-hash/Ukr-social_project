// Publisher links, episode lengths and 600px show art checked against the
// public show feeds and Apple Podcasts directory. Asset paths exclude queries.
const suspilne='https://corp.suspilne.media/newsdetails/6296/';
const learned='https://vukhamy.vchysia.org.ua/';
const raw={
  vrodylo:['https://www.youtube.com/channel/UCbNaKxi1j-Q5jWZDpJZp56g',80,'221/v4/a1/b2/c2/a1b2c227-11c3-1f31-3adb-07bc31e60dd8/mza_12003998279651939718.jpg'],
  prostymy:['https://www.youtube.com/channel/UCFZQ7YeLZ-RF_XG6Goaw98A',61,'211/v4/e1/43/d1/e143d188-4d8c-92af-d21d-12c97472a3a4/mza_15438977364333495614.jpg'],
  'bez-viiny':['https://creators.spotify.com/pod/profile/bovmedia',39,'112/v4/bc/6f/d3/bc6fd325-16f3-9ffe-e1bc-ae53ca389d32/mza_12131657028663665076.jpg'],
  kosatky:['https://bude-tobi-nauka.simplecast.com/',23,'116/v4/58/76/0b/58760b66-8e9e-db3a-a6ae-bd53f029c81a/mza_9523129184780427755.jpg'],
  station451:['https://www.village.com.ua/village/life/podcast/314839-stantsiya-451-s2e4',100,'125/v4/8e/a3/22/8ea32287-5c7b-0e27-8cc5-5f9e7f2751dd/mza_8785579450558166826.jpg'],
  'learn-ua':[learned+'history_of_ukraine/',15,'126/v4/e4/1e/e4/e41ee4b8-2931-4e43-4aef-3909ee7d8f21/mza_16623967401635323282.jpg'],
  'post-pravdy':['https://post-pravdy.simplecast.com/',39,'221/v4/50/fd/95/50fd9544-c2c1-6401-4875-c78a2af9f574/mza_17591509097520149549.jpg'],
  'local-history':['https://localhistory.org.ua/videos/',41,'125/v4/14/f4/9d/14f49dbb-8f61-52c2-58a5-f3292ec80d0a/mza_13995257228077272352.jpg'],
  teoriia:[suspilne,8,'125/v4/1b/f2/83/1bf283d8-c3cf-4d02-8e5b-74e814cd6dd5/mza_8479131713271031452.jpg'],
  zapakh:['https://creators.spotify.com/pod/profile/hromadske/',56,'221/v4/1c/61/cf/1c61cf71-6096-8c44-0096-40d58074b966/mza_4884104469520587171.jpg'],
  dou:['https://dou.ua/lenta/tags/DOU%20Podcast/',30,'116/v4/44/41/95/444195ea-2bce-4dd7-223a-8d226c9ba7eb/mza_13773133342804223553.jpeg'],
  'learn-lit':[learned+'ukrainian_literature/',29,'126/v4/a0/b5/45/a0b5455f-acac-5967-f2db-d22a7baf5567/mza_4603340907073378325.jpg'],
  inshe:['https://inshe.simplecast.com/',57,'221/v4/30/86/79/30867950-0418-27f9-b785-71dcdbb86b07/mza_12865338056359868073.jpg'],
  kharkiv:['https://radio.nakypilo.ua/',39,'112/v4/95/50/27/95502770-d5aa-6f85-6038-a2b5e49ea7d1/mza_5166834510278608434.jpg'],
  wave:['https://hvilya-yde.simplecast.com/',55,'221/v4/f4/8f/33/f48f335e-5d0d-5631-360d-54e926d9766f/mza_2868250990518884976.jpg'],
  knyhoskhovyshche:[suspilne,40,'116/v4/d7/79/d8/d779d8cf-0c0f-1057-dedf-90c49a75b317/mza_15319085697828664150.jpg'],
  infodetox:['https://detector.media/',14,'221/v4/38/0b/e9/380be99e-75bd-82f9-1736-177fe81c00cc/mza_17024498284875640558.jpg'],
  'learn-world':[learned,26,'126/v4/08/76/5f/08765fa0-936a-80c7-7a2e-9c00edda83b6/mza_13389368427400994117.jpg'],
  rozumna:['https://castbox.fm/channel/id2721578',47,'125/v4/ad/a8/59/ada859b7-41fb-fa07-b792-1b23bac72f2d/mza_13084762300824853828.jpg'],
  borysthenes:[suspilne,16,'126/v4/75/d0/af/75d0af4d-b792-299b-8ffd-c8d7b2d1ca1b/mza_10033051722476490441.jpg'],
  vorozhky:['https://www.kunsht.com.ua/theme/do-vorozhki-ne-xodi',38,'116/v4/7c/d2/8b/7cd28b5d-9044-a39b-b99e-8cfadf0a0690/mza_3199482556108124672.jpg'],
  narazi:['https://theukrainians.org/',63,'112/v4/48/55/de/4855de20-a438-2e30-c871-f2d0e8495565/mza_371014889725034429.jpg'],
  mediumy:['https://mediums.captivate.fm/',35,'221/v4/ba/6b/d9/ba6bd99f-bf25-e102-606b-9521ac569fd4/mza_6696350521231901340.jpg'],
  'tech-basis':['https://creators.spotify.com/pod/profile/bogdan-golovchuk/',38,'122/v4/62/83/54/628354ad-3589-3d8e-770d-d89ec3e9c9e9/mza_1480472236208014294.jpg'],
  money:['https://podcasts.nv.ua/podcast/4-rahuyemo-chuzhi-groshi.html',29,'211/v4/b5/69/dd/b569dd53-ad63-fb8e-f8ed-362ed31015b3/mza_12994790104925532128.jpg'],
  svoboda:['https://www.radiosvoboda.org/istorychna',20,'211/v4/35/b7/65/35b765b4-d97a-4990-9ecc-0d5394c58948/mza_160875937524308290.png'],
  temperatura:['https://www.pravda.com.ua/podcasts/temperatura-normalna/',25,'125/v4/5f/05/eb/5f05eb03-b2a2-d0e1-b570-1cb8401253b6/mza_14912385962327780221.jpg'],
  skovoroda:['https://t.me/suspilne_podcasts',18,'112/v4/a4/2a/5e/a42a5ef9-43fc-e5dc-6e11-d19161937e09/mza_1430645187327949141.jpg'],
  besida:['https://www.youtube.com/channel/UCct2XkXyzc2Dh4RnKL-6fWw/',23,'211/v4/bc/f6/a7/bcf6a7aa-d7a8-1356-343d-f26c184def48/mza_4280306667987273378.jpg'],
  vyzhyly:[suspilne,64,'123/v4/32/ab/61/32ab61c8-6bae-0698-e5f7-0fcc6d4feff5/mza_7246720774293352371.jpg'],
  food:['https://yizha-dlya-rozdumiv.simplecast.com/',46,'126/v4/f6/77/ff/f677ff5c-b39a-00dc-7af6-ff741e9ff5ab/mza_15330907745013545991.jpg'],
};
export const podcastSources=Object.fromEntries(Object.entries(raw).map(([slug,[authorUrl,minutes,asset]])=>
  [slug,{authorUrl,minutes,image:`https://is1-ssl.mzstatic.com/image/thumb/Podcasts${asset}/600x600bb.jpg`}]));
