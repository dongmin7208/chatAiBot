const apiKey = require('apiKey').apiKey;
const DEEPL_API_KEY = require('apiKey').DEEPL_API_KEY;
const NEWS_API_KEY = require('apiKey').NEWS_API_KEY;
const NEW_OPENAI_API_KEY = require('apiKey').NEW_OPENAI_API_KEY;
const STOCK_API_KEY = require('apiKey').STOCK_API_KEY;
const EXCHANGE_RATE_API_KEY = require('apiKey').EXCHANGE_RATE_API_KEY;
const RAPIDAPI_KEY = require('apiKey').RAPIDAPI_KEY;

function fetchArticlesTitlesFromDaum() {
  var url =
    'https://cafe.daum.net/_c21_/bbs_list?grpid=sT2&fldid=VUD&_referer=V7kfJwkeLEGMZxGlgqZEmTb-RRw1Et9U';

  try {
    var response = org.jsoup.Jsoup.connect(url)
      .header(
        'Accept',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
      )
      .header('Accept-Encoding', 'gzip, deflate, br, zstd')
      .header('Accept-Language', 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6')
      .header('Cookie', '__T_=1; __T_SECURE=1; ...')
      .header('Referer', 'https://cafe.daum.net/japantokyo/VUD')
      .header(
        'User-Agent',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      )
      .ignoreContentType(true)
      .get();

    var html = response.body().html();

    // 정규표현식을 사용하여 articles.push 안의 타이틀을 추출
    var titleRegex = /articles\.push\(\{[^}]*title:\s*'([^']*)'/g;
    var titles = [];
    var match;
    var count = 1;

    while ((match = titleRegex.exec(html)) !== null) {
      var decodedTitle = decodeUnicodeAndHtmlEntities(match[1]);
      titles.push(count + '. ' + decodedTitle);
      count++;
    }

    // 타이틀 리스트를 반환
    return titles.join('\n');
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

function decodeUnicodeAndHtmlEntities(encodedStr) {
  // 유니코드 시퀀스 디코딩
  var unicodeDecodedStr = encodedStr.replace(
    /\\u[\dA-F]{4}/gi,
    function (match) {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    }
  );

  // HTML 엔티티 디코딩
  var htmlDecodedStr = unicodeDecodedStr.replace(
    /&#(\d+);/g,
    function (match, dec) {
      return String.fromCharCode(dec);
    }
  );

  return htmlDecodedStr;
}

function fetchYenExchangeRateFromAPI() {
  var url = 'https://finance.daum.net/api/exchanges/summaries';

  try {
    // API 요청을 보냅니다.
    var response = org.jsoup.Jsoup.connect(url)
      .header('Accept', 'application/json, text/javascript, */*; q=0.01')
      .header('Accept-Encoding', 'gzip, deflate, br, zstd')
      .header('Accept-Language', 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6')
      .header(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      )
      .header('Referer', 'https://finance.daum.net/exchanges')
      .ignoreContentType(true)
      .get();

    // JSON 응답을 파싱합니다.
    var jsonResponse = JSON.parse(response.body().text());

    // 엔화에 해당하는 데이터를 찾습니다.
    var yenData = jsonResponse.data.find(function (item) {
      return item.currencyCode === 'JPY';
    });

    if (yenData) {
      // 필요한 정보를 문자열로 반환합니다.
      return (
        '엔화(100엔)\n' +
        '매매기준율: ' +
        yenData.basePrice.toString() +
        '\n' +
        '전일비: ' +
        (yenData.change === 'FALL' ? '-' : '+') +
        yenData.changePrice.toString() +
        '\n' +
        '미화환산율: ' +
        yenData.usDollarRate.toString()
      );
    } else {
      return 'Error: JPY data not found.';
    }
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

function getYenExchangeInfoFromAPI() {
  var yenToKrw = fetchYenExchangeRateFromAPI();
  return yenToKrw;
}

function fetchStockPriceTwelveData(companySymbol) {
  var url =
    'https://api.twelvedata.com/price?symbol=' +
    encodeURIComponent(companySymbol) +
    '&apikey=' +
    STOCK_API_KEY;

  try {
    var response = org.jsoup.Jsoup.connect(url)
      .ignoreContentType(true)
      .execute()
      .body();

    var jsonResponse = JSON.parse(response);

    // 가격 정보가 있는지 확인
    if (jsonResponse && jsonResponse.price) {
      return jsonResponse.price;
    } else {
      // 에러 메시지를 반환하여 문제 확인
      return 'Error: ' + JSON.stringify(jsonResponse);
    }
  } catch (e) {
    return 'Error: ' + e.message;
  }
}
function getStockSymbolFromMessage(msg) {
  const stockMap = require('stockMap').stockMap;
  for (var company in stockMap) {
    if (
      (msg.includes(company) && msg.includes('주식')) ||
      msg.includes('얼마쓰')
    ) {
      return stockMap[company];
    }
  }

  return null;
}

// 일본어 포함 여부 확인
function containsJapanese(text) {
  const japanesePattern = /[\u3040-\u30FF\u4E00-\u9FFF]/;
  return japanesePattern.test(text);
}

function convertHiraganaToKoreanPronunciation(hiraganaText) {
  const pronunciationMap = require('pronunciationMap').pronunciationMap;

  let koreanPronunciation = '';

  for (let i = 0; i < hiraganaText.length; i++) {
    let currentChar = hiraganaText[i];
    let nextChar = hiraganaText[i + 1] || '';

    if (pronunciationMap[currentChar + nextChar]) {
      koreanPronunciation += pronunciationMap[currentChar + nextChar];
      i++; // skip next character
    } else {
      koreanPronunciation += pronunciationMap[currentChar] || currentChar;
    }
  }

  return koreanPronunciation;
}
function translateToHiragana(text) {
  let url =
    'https://jisho.org/api/v1/search/words?keyword=' + encodeURIComponent(text);

  try {
    let response = org.jsoup.Jsoup.connect(url)
      .ignoreContentType(true)
      .execute()
      .body();

    let jsonResponse = JSON.parse(response);
    if (jsonResponse.data && jsonResponse.data.length > 0) {
      return jsonResponse.data[0].japanese[0].reading;
    } else {
      return 'Error translating text to hiragana.';
    }
  } catch (e) {
    return 'Error: ' + e.message;
  }
}

// 뉴스 기사 가져오기
function fetchNewsArticle(url, queryParams) {
  return org.jsoup.Jsoup.connect(url)
    .data(queryParams)
    .ignoreContentType(true)
    .execute()
    .body();
}

// 뉴스 기사 분석 및 정리
function parseAndCleanNewsArticle(response, unwantedText) {
  const articleDoc = org.jsoup.Jsoup.parse(response);
  const articleText = articleDoc.select('p').text();
  return articleText.replace(unwantedText, '');
}

// 일본어 포함 여부 확인
function containsJapanese(text) {
  let hasJapanese = false;
  const chars = text.split('');
  chars.forEach(function (char) {
    const charCode = char.charCodeAt(0);
    if (
      (charCode >= 0x3040 && charCode <= 0x309f) || // 히라가나
      (charCode >= 0x30a0 && charCode <= 0x30ff) || // 가타카나
      (charCode >= 0x4e00 && charCode <= 0x9faf) // 한자
    ) {
      hasJapanese = true;
    }
  });
  return hasJapanese;
}

// "쳐내"로 끝나는지 확인
function endsWithChyeonae(text) {
  if (
    text.endsWith('쳐내') ||
    text.endsWith('쳐내!') ||
    text.endsWith('쳐내~') ||
    text.endsWith('쳐내~!')
  ) {
    return true;
  }
  return null;
}

// 닉네임 접미사 결정
function getSuffix(nickname) {
  const groupSan = [
    '튜브',
    '나나',
    '디비전요원',
    '라멘진',
    '랑고',
    '마크',
    '모토대딩',
    '와퍼',
    '초심',
    '호우',
    '紅の豚',
    '흑우오카',
    'ドージ',
    'SMac!?',
    '즌다몽',
    '감자',
    '음머',
  ];
  const groupChan = ['Null ', '밍', '미즈에'];
  const groupWhat = ['핑챈지'];
  const groupWhat2 = ['도움이간절한샛병아리'];
  const groupWhat3 = ['도움이필요한오징어'];
  const groupYach = [
    '🥔',
    '🌽',
    '강냉이',
    '🥩',
    '강냉',
    '강 냉',
    '강　냉',
    '강냉　',
    '강냉　　',
    '강냉　　　',
    '　강냉',
    '　　강냉',
    '　　　강냉',
  ];
  const groupPark = ['일생남'];
  const groupYubu = ['🍠', '네오'];
  const groupSingi = ['신~지다이'];
  const groupWhat4 = ['ハチワレ/建設'];
  const groupWhat5 = ['데부'];
  const groupWhat6 = ['하바네로', 'ハバネロ'];
  const groupWhat7 = ['名無し'];
  const groupWhat8 = ['카리무'];

  if (groupSan.includes(nickname)) {
    return nickname + '様';
  } else if (groupChan.includes(nickname)) {
    return nickname + '씨';
  } else if (groupWhat.includes(nickname)) {
    return '챙지핑';
  } else if (groupWhat2.includes(nickname)) {
    return '병아리';
  } else if (groupWhat3.includes(nickname)) {
    return '오징어';
  } else if (groupPark.includes(nickname)) {
    return '박상';
  } else if (groupYubu.includes(nickname)) {
    return '유부남';
  } else if (groupSingi.includes(nickname)) {
    return '신~다지이';
  } else if (
    groupYach.includes(nickname) ||
    nickname.startsWith('강냉') ||
    nickname.includes('강냉')
  ) {
    return '중고거래';
  } else if (groupWhat4.includes(nickname)) {
    return '귀여운하치와레';
  } else if (groupWhat5.includes(nickname)) {
    return '그런 깜찍류';
  } else if (groupWhat6.includes(nickname)) {
    return '해영대';
  } else if (groupWhat7.includes(nickname)) {
    return '엔박사';
  } else if (groupWhat8.includes(nickname)) {
    return '해줘';
  }
  return nickname + 'さん'; // 해당되지 않는 경우
}

// 지진 정보 가져오기
function fetchEarthquakeInfo(index) {
  const url = 'https://api.p2pquake.net/v2/jma/quake';
  try {
    const response = org.jsoup.Jsoup.connect(url)
      .ignoreContentType(true)
      .execute()
      .body();
    const jsonResponse = JSON.parse(response);
    if (jsonResponse.length > index) {
      const quake = jsonResponse[index];
      const earthquake = quake.earthquake;
      const location = earthquake.hypocenter.name;
      const translatedLocation = translateText('KO', location);
      const latitude = earthquake.hypocenter.latitude;
      const longitude = earthquake.hypocenter.longitude;
      const magnitude = earthquake.hypocenter.magnitude;
      const depth = earthquake.hypocenter.depth;
      const time = new Date(earthquake.time);
      const currentTime = new Date();
      const domesticTsunami = earthquake.domesticTsunami;
      const foreignTsunami = earthquake.foreignTsunami;

      const timeDifference = Math.abs(currentTime - time) / (1000 * 60);

      if (timeDifference < 5) {
        return '일생쓰';
      }

      const googleMapUrl =
        'https://www.google.com/maps/search/?api=1&query=' +
        latitude +
        ',' +
        longitude;
      return (
        '‼️지진 정보‼️\n' +
        '지역: ' +
        translatedLocation +
        ' (' +
        location +
        ')\n' +
        '진도: ' +
        magnitude +
        '도\n' +
        '깊이: ' +
        depth +
        'km\n' +
        '시간: ' +
        earthquake.time +
        '\n' +
        '국내 쓰나미 여부: ' +
        domesticTsunami +
        '\n' +
        '해외 쓰나미 여부: ' +
        foreignTsunami +
        '\n' +
        '진원지: ' +
        googleMapUrl
      );
    } else {
      return 'No more earthquake data available.';
    }
  } catch (e) {
    return 'Error fetching earthquake information: ' + e.message;
  }
}

// 메인 응답 함수
function response(
  room,
  msg,
  sender,
  isGroupChat,
  replier,
  imageDB,
  packageName
) {
  if (msg) {
    let nicknameRegex = /^([^/]+)/;
    let match = sender.match(nicknameRegex);
    let nickname = match ? match[1] : sender;
    let suffix = getSuffix(nickname);
    var stockSymbol = getStockSymbolFromMessage(msg);

    if (stockSymbol) {
      var stockPrice = fetchStockPriceTwelveData(stockSymbol);
      replier.reply(stockSymbol + ': ' + stockPrice);
      return;
    }

    if (msg.startsWith('일생쓰 엔화')) {
      var yenInfo = getYenExchangeInfoFromAPI();
      replier.reply(yenInfo);
      return;
    }
    // fetchArticlesTitlesFromDaum
    if (msg === '일생쓰 동유모 무료나눔') {
      let articles = fetchArticlesTitlesFromDaum();
      replier.reply(articles);
      return;
    }

    if (msg.startsWith('히라가나')) {
      let textToTranslate = msg.replace('히라가나 ', '');
      if (!containsJapanese(textToTranslate)) {
        replier.reply('일본어만..');
      } else {
        let hiraganaText = translateToHiragana(textToTranslate);
        replier.reply(hiraganaText);
      }
    } else if (msg.startsWith('한국어')) {
      let textToTranslate = msg.replace('한국어 ', '').replace('한국어', '');
      if (!containsJapanese(textToTranslate)) {
        replier.reply('일본어만..');
      } else {
        let hiraganaText = translateToHiragana(textToTranslate);
        let koreanPronunciation =
          convertHiraganaToKoreanPronunciation(hiraganaText);
        replier.reply(koreanPronunciation);
      }
    } else if (containsJapanese(msg)) {
      if (nickname.startsWith('ハチワレ')) {
        replier.reply('귀여운하치와레: ' + translateText('KO', msg, 'JA'));
      } else {
        let translatedText = translateText('KO', msg, 'JA');
        replier.reply(suffix + ': ' + translatedText);
      }
    }

    if (
      nickname === 'ドージ' &&
      [
        '부방장',
        '#부방장',
        '# 부방장',
        '# 비트코인 시세 1일',
        '# 비트코인',
        '# 도지코인 시세 1일',
        '# 도지코인 시세 1주일',
        '# 비트코인 시세 1주일',
        '# 도지코인 시세 전망',
        '# 비트코인 시세 전망',
        '#도지코인 시세 1일',
        '#비트코인 시세 1주일',
        '#도지코인 시세 전망',
        '도지코인 시세 1일',
        '도지코인 시세 1주일',
        '도지코인 시세 전망',
        '샵검색: #부방장',
        '샵검색: #도지코인 시세 1일',
        '샵검색: #도지코인 시세 1주일',
        '샵검색: #도지코인 시세 전망',
        '부방장',
        '도지',
        '도지코인',
        '비트코인',
        '샵검색: #도지',
        '샵검색: #비트',
        '샵검색: #가즈아',
        '가즈아',
        '화성',
      ].some((keyword) => msg.startsWith(keyword))
    ) {
      replier.reply('ドージ 쳐내');
    }

    if (endsWithChyeonae(msg)) {
      replier.reply('쳐내~!');
    }
  }

  if (msg.startsWith('지진')) {
    replier.reply(fetchEarthquakeInfo(0));
  } else if (msg.startsWith('지지진')) {
    replier.reply(fetchEarthquakeInfo(1));
  } else if (msg.startsWith('지지지진')) {
    replier.reply(fetchEarthquakeInfo(2));
  } else if (msg.startsWith('지지지지진')) {
    replier.reply(fetchEarthquakeInfo(3));
  } else if (
    msg === '일생쓰 야후뉴스 톱푸~' ||
    msg === '일생쓰 야후뉴스 메인~' ||
    msg === '일생쓰 야후뉴스 칸코쿠~'
  ) {
    try {
      let url;
      if (msg.endsWith('톱푸~')) {
        url = 'https://news.yahoo.co.jp/rss/topics/top-picks.xml';
      } else if (msg.endsWith('메인~')) {
        url = 'https://news.yahoo.co.jp/rss/categories/domestic.xml';
      } else if (msg.endsWith('칸코쿠~')) {
        url = 'https://news.yahoo.co.jp/rss/categories/world.xml';
      }

      const response = org.jsoup.Jsoup.connect(url)
        .ignoreContentType(true)
        .execute()
        .body();
      const xmlDoc = org.jsoup.Jsoup.parse(
        response,
        '',
        org.jsoup.parser.Parser.xmlParser()
      );
      const items = xmlDoc.select('item');

      if (items && items.size() > 0) {
        let newsList = '';
        for (let i = 0; i < items.size(); i++) {
          let newsTitle = items.get(i).select('title').text();
          let newsLink = items.get(i).select('link').text();
          if (msg.endsWith('칸코쿠~') && !newsTitle.includes('韓国')) {
            continue;
          }

          let translatedTitle = translateText('KO', newsTitle);

          newsList +=
            '제목: ' + translatedTitle + '\n' + '링크: ' + newsLink + '\n\n';
          break;
        }

        if (newsList === '') {
          replier.reply('한국과 관련된 뉴스가 없습니다.');
        } else {
          replier.reply(newsList);
        }
      } else {
        replier.reply('Error: Could not retrieve news.');
      }
    } catch (e) {
      replier.reply('Error: ' + e.message);
    }
  } else if (msg.startsWith('일생쓰')) {
    let cmd = msg.substr(4);
    let translateRegex = /^번역(일어|영어|한국어|중국어): (.+)/;
    let translateMatch = cmd.match(translateRegex);
    if (cmd === '명령어') {
      let helpMessage = '일생쓰 명령어:\n';
      helpMessage += '1. 일생쓰 번역(일어|영어|한국어|중국어): [text]\n';
      helpMessage += '2. 일생쓰 [도시명]날씨\n';
      helpMessage += '3. 일생쓰 야후뉴스 메인~\n';
      helpMessage += '4. 일생쓰 야후뉴스 톱푸~\n';
      helpMessage += '5. 일생쓰 야후뉴스 칸코쿠~\n';
      helpMessage += '6. 일생쓰 동유모 무료나눔\n';
      helpMessage += '7. 일생쓰 엔화\n';
      helpMessage += '8. 오늘몇월몇일?\n';
      helpMessage += '9. /네이버 [검색어]\n';
      helpMessage += '10. /구글 [검색어]\n';
      helpMessage += '11. /야후 [검색어]\n';
      replier.reply(helpMessage);
    } else if (translateMatch) {
      let targetLang;
      switch (translateMatch[1]) {
        case '일어':
          targetLang = 'JA';
          break;
        case '영어':
          targetLang = 'EN';
          break;
        case '한국어':
          targetLang = 'KO';
          break;
        case '중국어':
          targetLang = 'ZH';
          break;
        default:
          replier.reply('지원하지 않는 언어입니다.');
          return;
      }

      let textToTranslate = translateMatch[2];
      let translatedText = translateText(targetLang, textToTranslate);
      replier.reply(translatedText);
    } else {
      const weatherRegex =
        /^(도쿄|카와사키|오사카|교토|홋카이도|사이타마|나고야|후쿠오카|요코하마|사카타|고베|오카야마|시즈오카|토야마|후쿠시마|아오모리|아이치|이와테|이바라키|이시카와|이와키|이시노미야|이시가키|가고시마|가나자와|센다이|하코타테|히로시마|삿포로|아사히카와|키타키우시|서울|부산|인천|대구|광주|인천|창원|보은|고양|니코타마|항저우)날씨$/;
      const weatherMatch = cmd.replace(/\s+/g, '').match(weatherRegex);

      if (weatherMatch) {
        const cityNameMap = require('cityNameMap').cityNameMap;
        const cityData = cityNameMap[weatherMatch[1]];
        replier.reply(getWeather(cityData));
      } else if (
        cmd.startsWith('오늘몇월몇일?') ||
        cmd.startsWith('오늘언제?') ||
        cmd.startsWith('오늘무슨날?') ||
        cmd.startsWith('오늘의날짜?') ||
        cmd.startsWith('오늘이언제?') ||
        cmd.startsWith('오늘은?') ||
        cmd.startsWith('오늘?') ||
        cmd.startsWith('현재날짜?')
      ) {
        replier.reply(getCurrentDate());
      } else {
        if (msg === '일생쓰') {
          let nicknameRegex = /^([^/]+)/;
          let match = sender.match(nicknameRegex);
          let nickname = match ? match[1] : sender;
          let suffix = getSuffix(nickname);
          replier.reply(suffix + ' 넹? 말씀을하세용');
        } else {
          replier.reply(getResponse(cmd));
        }
      }
    }
  }

  if (msg.startsWith('/네이버 ')) {
    let query = msg.replace('/네이버 ', '');
    replier.reply(
      'https://m.search.naver.com/search.naver?query=' +
        encodeURIComponent(query)
    );
  }
  if (msg.startsWith('/구글 ')) {
    let query = msg.replace('/구글 ', '');
    replier.reply(
      'https://www.google.com/search?q=' + encodeURIComponent(query)
    );
  }
  if (msg.startsWith('/야후 ')) {
    let query = msg.replace('/야후 ', '');
    replier.reply(
      'https://search.yahoo.co.jp/search?p=' + encodeURIComponent(query)
    );
  }
}

function translateText(targetLang, text, sourceLang) {
  const deeplUrl = 'https://api-free.deepl.com/v2/translate';
  let data = {
    text: text,
    target_lang: targetLang,
  };

  if (sourceLang) {
    data.source_lang = sourceLang;
  }

  try {
    let response = org.jsoup.Jsoup.connect(deeplUrl)
      .header('Authorization', 'DeepL-Auth-Key ' + DEEPL_API_KEY)
      .data(data)
      .method(org.jsoup.Connection.Method.POST)
      .ignoreContentType(true)
      .execute()
      .body();

    let jsonResponse = JSON.parse(response);
    return jsonResponse.translations[0].text;
  } catch (e) {
    return 'Error translating text.';
  }
}

function getCurrentDate() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][
    currentDate.getDay()
  ];
  const dateString =
    year + '년 ' + month + '월 ' + day + '일 ' + dayOfWeek + '요일';
  return dateString;
}

function getWeather(cityData) {
  let weatherResponse;
  let cityName = cityData[0];
  let lat = cityData[1];
  let lon = cityData[2];
  try {
    const url =
      'https://api.openweathermap.org/data/2.5/weather?q=' +
      cityName +
      '&appid=' +
      apiKey +
      '&units=metric&lang=kr';
    weatherResponse = org.jsoup.Jsoup.connect(url)
      .ignoreContentType(true)
      .execute()
      .body();
    weatherResponse = JSON.parse(weatherResponse);
    const pollutionUrl =
      'https://api.openweathermap.org/data/2.5/air_pollution?' +
      'lat=' +
      lat +
      '&lon=' +
      lon +
      '&appid=' +
      apiKey;
    const pollutionResponse = org.jsoup.Jsoup.connect(pollutionUrl)
      .ignoreContentType(true)
      .execute()
      .body();
    weatherResponse.precipitation = JSON.parse(pollutionResponse);
  } catch (e) {
    return 'Error fetching weather information.';
  }

  if (weatherResponse.cod === 200) {
    const main = weatherResponse.main;
    const wind = weatherResponse.wind;
    const clouds = weatherResponse.clouds;
    const rain = weatherResponse.rain || {};
    const description = weatherResponse.weather[0].description;
    const rain1h = rain['1h'] || 0;
    const rain3h = rain['3h'] || 0;
    let pollution = weatherResponse.precipitation.list[0].main.aqi;
    if (pollution === 1) {
      pollution += ' 좋음';
    } else if (pollution === 2) {
      pollution += ' 보통';
    } else if (pollution === 3) {
      pollution += ' 나쁨';
    } else if (pollution === 4) {
      pollution += ' 매우나쁨';
    } else {
      pollution += ' 장난아님';
    }
    const temperature = main.temp;
    const humidity = main.humidity;
    const windSpeed = wind.speed;
    const minTemperature = main.temp_min;
    const highTemperature = main.temp_max;
    const temperatureFeelsLike = main.feels_like;
    let result2 = getCurrentDate() + '(' + description + ')' + '\n';
    result2 += '天気の子☀️: ' + cityName + '\n';
    result2 += '체감 온도: ' + temperatureFeelsLike + '°C\n';
    result2 += '현재 온도: ' + temperature + '°C\n';
    result2 += '최저 기온: ' + minTemperature + '°C\n';
    result2 += '최고 기온: ' + highTemperature + '°C\n';
    result2 += '습도: ' + humidity + '%\n';
    result2 += '풍속: ' + windSpeed + ' m/s\n';
    result2 += '구름: ' + clouds.all + '%\n';
    result2 += '강수량 (1시간): ' + rain1h + 'mm\n';
    result2 += '강수량 (3시간): ' + rain3h + 'mm\n';
    result2 += '대기오염도: ' + pollution + '\n';
    return result2;
  } else {
    console.log(
      'Failed to retrieve weather data. Response status: ' + weatherResponse.cod
    );
    return 'Error fetching weather information.';
  }
}
function getResponse(msg) {
  let result;
  let responseBody;
  let data = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content:
          '모든 답변은 한국어로 간결하고 센스있게 핵심만 대답하세요. 명령:' +
          msg,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  try {
    let response = org.jsoup.Jsoup.connect(
      'https://api.openai.com/v1/chat/completions'
    )
      .header('Content-Type', 'application/json')
      .header('Authorization', 'Bearer ' + NEW_OPENAI_API_KEY)
      .requestBody(JSON.stringify(data))
      .ignoreContentType(true)
      .ignoreHttpErrors(true)
      .timeout(200000)
      .post();

    result1 = JSON.parse(response.text());
    result = result1.choices[0].message.content;
  } catch (e) {
    result = '일생쓰';
  }

  return result;
}
