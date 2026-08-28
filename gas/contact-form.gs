/**
 * つなぐスタジオ お問い合わせフォーム 受信スクリプト
 *
 * サイトのお問い合わせフォームから送られた内容を
 * Googleスプレッドシートへ1行ずつ記録し、通知メールを送る。
 *
 * ------------------------------------------------------------------
 * 使う前の準備（GASの画面で1回だけ）
 * ------------------------------------------------------------------
 * 1. このファイルの内容を Apps Script のエディタへ貼り付けて保存する
 * 2. 左の歯車「プロジェクトの設定」→「スクリプト プロパティ」で次を追加する
 *      NOTIFY_EMAIL : 通知を受け取りたいメールアドレス
 *      FORM_TOKEN   : 当サイトからの送信だと分かる合言葉。site.js の FORM_TOKEN と同じ値にする
 *    （どちらもコードに書かないのは、このファイルをGitHubへ上げても
 *      通知先や合言葉が公開されないようにするため）
 * 3. エディタ上部の関数選択で「setup」を選んで実行する
 *    → 記録用スプレッドシートが自動で作られ、そのURLが実行ログに出る
 *    → 初回はGoogleの許可画面が出るので許可する
 * 4.「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      次のユーザーとして実行 : 自分
 *      アクセスできるユーザー : 全員
 *    → 発行された URL（/exec で終わるもの）をサイト側に設定する
 *
 * コードを直した後は、必ず「デプロイを管理」→ 鉛筆マーク →
 * バージョン「新バージョン」で再デプロイする。保存だけでは反映されない。
 * ------------------------------------------------------------------
 */

/** 記録用スプレッドシートの名前 */
var SPREADSHEET_NAME = 'つなぐスタジオ お問い合わせ記録';

/** 通常の受信を記録するシート名 */
var SHEET_NAME = 'お問い合わせ';

/** 迷惑送信と判定したものを記録するシート名 */
var BLOCKED_SHEET_NAME = 'ブロック';

/** 同じメールアドレスからの連続送信を止める秒数 */
var COOLDOWN_SECONDS = 60;

/** 同じメールアドレスから1時間に受け付ける上限件数 */
var HOURLY_LIMIT = 5;

/** 送信者を問わず、1時間／1日に受け付ける上限件数（大量送信でメール枠を使い切られるのを防ぐ） */
var GLOBAL_HOURLY_LIMIT = 30;
var GLOBAL_DAILY_LIMIT = 80;

/** 通知メールを送るのをやめて記録だけにする、1日の残り送信枠のしきい値 */
var MAIL_QUOTA_RESERVE = 20;

/** フォームを開いてから送信までに最低限必要なミリ秒（速すぎる＝機械とみなす） */
var MIN_ELAPSED_MS = 3000;

/** 入力欄ごとの文字数上限 */
var MAX_LENGTH = {
  name: 100,
  company: 100,
  email: 254,
  message: 4000
};

/** カテゴリーとして受け付ける値（サイト側の選択肢と揃えること） */
var ALLOWED_CATEGORIES = ['marketing', 'operations', 'customer', 'other'];

var CATEGORY_LABELS = {
  marketing: '集客・発信',
  operations: '事務・情報整理',
  customer: 'お客様対応',
  other: 'その他・まだ分からない'
};

var HEADERS = [
  '受信日時',
  'お名前',
  '会社名・屋号',
  'メールアドレス',
  'カテゴリー',
  '困りごとID',
  'ご相談内容',
  'プライバシー同意',
  '対応状況'
];

/**
 * 準備用。GASのエディタから手動で1回だけ実行する。
 * 記録用スプレッドシートを作り、そのIDを覚えさせる。
 */
function setup() {
  var props = PropertiesService.getScriptProperties();

  if (!props.getProperty('NOTIFY_EMAIL')) {
    throw new Error(
      'スクリプト プロパティ NOTIFY_EMAIL が未設定です。' +
      '「プロジェクトの設定」→「スクリプト プロパティ」で通知先メールアドレスを登録してから、もう一度実行してください。'
    );
  }

  if (!props.getProperty('FORM_TOKEN')) {
    Logger.log(
      '【注意】スクリプト プロパティ FORM_TOKEN が未設定です。合言葉チェックは無効のままです。' +
      'site.js の FORM_TOKEN と同じ値を設定すると、無差別なbot送信を弾けます。'
    );
  }

  var sheet = getSheet_();
  var url = sheet.getParent().getUrl();
  Logger.log('記録用スプレッドシートの準備ができました:\n' + url);
  return url;
}

/**
 * ブラウザからの送信を受け取る入口。
 *
 * サイト側は Content-Type: text/plain で本文にJSON文字列を送ってくる。
 * application/json にすると、ブラウザが送信前に確認用のリクエスト
 * （プリフライト）を投げるが、GASのウェブアプリはそれに応答できないため。
 */
function doPost(e) {
  try {
    var payload = parsePayload_(e);
    var data = validate_(payload);

    // 当サイトの合言葉が無い／違うPOSTは、/exec を無差別に叩く機械とみなす。
    // 判定条件を教えないよう、エラーは返さずブロックシートへ記録するだけにする。
    if (!tokenOk_(payload)) {
      data.blockedReason = data.blockedReason || '合言葉が一致しない';
    }

    // 機械とみなしたものは、通知せずブロックシートへ記録するだけにする。
    // 送信側にはエラーを返さない（機械に判定条件を教えないため）。
    // 万一ふつうの利用者を巻き込んでも、内容はシートに残るので取り戻せる。
    if (data.blockedReason) {
      appendBlocked_(data);
      return jsonResponse_({ ok: true });
    }

    var limited = checkRateLimit_(data.email) || checkGlobalLimit_();
    if (limited) {
      return jsonResponse_({ ok: false, error: limited });
    }

    appendRow_(data);
    notify_(data);

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    var message = error instanceof ValidationError
      ? error.message
      : '送信処理でエラーが発生しました。時間をおいて試すか、直接メールでご連絡ください。';
    return jsonResponse_({ ok: false, error: message });
  }
}

/**
 * ブラウザでURLを直接開いたときの表示。
 * デプロイが生きているかの確認用で、情報は何も返さない。
 */
function doGet() {
  return jsonResponse_({ ok: true, message: 'contact form endpoint' });
}

/** 独自のエラー型。利用者にそのまま見せてよい文言だけを載せる。 */
function ValidationError(message) {
  this.name = 'ValidationError';
  this.message = message;
}
ValidationError.prototype = Object.create(Error.prototype);

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new ValidationError('送信内容を受け取れませんでした。もう一度お試しください。');
  }
  try {
    var parsed = JSON.parse(e.postData.contents);
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    return parsed;
  } catch (error) {
    throw new ValidationError('送信内容を読み取れませんでした。もう一度お試しください。');
  }
}

function text_(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validate_(payload) {
  var data = {
    name: text_(payload.name),
    company: text_(payload.company),
    email: text_(payload.email),
    category: text_(payload.category),
    concern: text_(payload.concern),
    message: text_(payload.message),
    privacyAgreement: payload.privacy_agreement === true,
    blockedReason: ''
  };

  if (!data.name) throw new ValidationError('お名前が入力されていません。');
  if (!data.email) throw new ValidationError('メールアドレスが入力されていません。');
  if (!data.message) throw new ValidationError('ご相談内容が入力されていません。');
  if (!data.privacyAgreement) {
    throw new ValidationError('プライバシーポリシーへの同意が確認できませんでした。');
  }

  Object.keys(MAX_LENGTH).forEach(function (key) {
    if (data[key].length > MAX_LENGTH[key]) {
      throw new ValidationError('入力が長すぎます。文字数を減らしてもう一度お試しください。');
    }
  });

  if (!/^[^\s@]+@[^\s@,]+\.[^\s@,]+$/.test(data.email)) {
    throw new ValidationError('メールアドレスの形式をご確認ください。');
  }
  if (ALLOWED_CATEGORIES.indexOf(data.category) === -1) {
    throw new ValidationError('カテゴリーを選んでください。');
  }
  if (data.concern && !/^[1-3]-[1-5]$/.test(data.concern)) {
    throw new ValidationError('選択された困りごとを確認できませんでした。');
  }

  // 迷惑送信の判定。人が普通に使うかぎり、どちらにも該当しない。
  if (text_(payload.contact_reference)) {
    data.blockedReason = '見えない入力欄が埋まっている';
  } else if (!(Number(payload.elapsed) >= MIN_ELAPSED_MS)) {
    data.blockedReason = '表示から送信までが短すぎる（' + payload.elapsed + 'ミリ秒）';
  }

  return data;
}

/**
 * 同じメールアドレスからの短時間の連投を止める。
 * サイト側でも待ち時間を設けているが、そちらは迂回できるためここでも見る。
 */
function checkRateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var key = 'rate_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email.toLowerCase())
  );

  if (cache.get(key + '_recent')) {
    return '連続で送信されています。1分ほどおいてからお試しください。';
  }

  var count = Number(cache.get(key + '_hour') || 0);
  if (count >= HOURLY_LIMIT) {
    return '短時間に多くの送信がありました。しばらくおいてからお試しください。';
  }

  cache.put(key + '_recent', '1', COOLDOWN_SECONDS);
  cache.put(key + '_hour', String(count + 1), 3600);
  return '';
}

/**
 * 当サイトの合言葉が付いているか。
 * FORM_TOKEN が未設定のときは、うっかり全ブロックしないよう素通りさせる（後方互換）。
 */
function tokenOk_(payload) {
  var expected = PropertiesService.getScriptProperties().getProperty('FORM_TOKEN');
  if (!expected) return true;
  return text_(payload.form_token) === expected;
}

/**
 * 送信者を問わない全体の受付上限。1通1通は別のメールアドレスでも、
 * 全体で急増したら断る。加算の取りこぼしを防ぐためロックを取る。
 */
function checkGlobalLimit_() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (error) {
    return ''; // ロックが取れないときは通す（正規利用者を止めない）
  }
  try {
    var cache = CacheService.getScriptCache();
    var hour = Number(cache.get('global_hour') || 0);
    var day = Number(cache.get('global_day') || 0);
    if (hour >= GLOBAL_HOURLY_LIMIT || day >= GLOBAL_DAILY_LIMIT) {
      return 'ただいま多くのお問い合わせをいただいています。時間をおいてから、または直接メールでご連絡ください。';
    }
    cache.put('global_hour', String(hour + 1), 3600);
    cache.put('global_day', String(day + 1), 86400);
    return '';
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');

  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (error) {
      // 削除された・権限が変わったなどで開けない場合は作り直す
      console.warn('記録用スプレッドシートを開けなかったため作り直します: ' + error);
    }
  }

  var created = SpreadsheetApp.create(SPREADSHEET_NAME);
  props.setProperty('SPREADSHEET_ID', created.getId());
  return created;
}

function getSheet_() {
  return prepareSheet_(getSpreadsheet_(), SHEET_NAME, HEADERS);
}

function prepareSheet_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    // 新規作成直後の既定シート（シート1）があれば、それを使い回す
    var first = spreadsheet.getSheets()[0];
    if (spreadsheet.getSheets().length === 1 && first.getLastRow() === 0) {
      sheet = first.setName(name);
    } else {
      sheet = spreadsheet.insertSheet(name);
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * スプレッドシートのセルは = で始まる文字列を数式として解釈する。
 * 送られた文字がそのまま数式にならないよう、先頭に ' を付けて無効にする。
 */
function safeCell_(value) {
  var text = String(value == null ? '' : value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function concernLabel_(id) {
  return id ? id : '（選択なし）';
}

function appendRow_(data) {
  getSheet_().appendRow([
    new Date(),
    safeCell_(data.name),
    safeCell_(data.company),
    safeCell_(data.email),
    safeCell_(CATEGORY_LABELS[data.category] || data.category),
    safeCell_(concernLabel_(data.concern)),
    safeCell_(data.message),
    '同意あり',
    '未対応'
  ]);
}

function appendBlocked_(data) {
  var sheet = prepareSheet_(
    getSpreadsheet_(),
    BLOCKED_SHEET_NAME,
    ['受信日時', '理由', 'お名前', 'メールアドレス', 'ご相談内容']
  );
  sheet.appendRow([
    new Date(),
    safeCell_(data.blockedReason),
    safeCell_(data.name),
    safeCell_(data.email),
    safeCell_(data.message)
  ]);
}

function notify_(data) {
  var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!to) {
    console.warn('NOTIFY_EMAIL が未設定のため通知メールを送りませんでした。');
    return;
  }

  // 大量送信でメール枠を使い切られても、記録は残るようにする。
  // 残り枠が少ないときは通知メールを止めて、ログだけ残す。
  if (MailApp.getRemainingDailyQuota() <= MAIL_QUOTA_RESERVE) {
    console.warn('メール送信枠の残りが少ないため、通知メールを送りませんでした。記録シートを確認してください。');
    return;
  }

  var lines = [
    'お問い合わせが届きました。',
    '',
    'お名前　　　: ' + data.name,
    '会社名・屋号: ' + (data.company || '（未入力）'),
    'メール　　　: ' + data.email,
    'カテゴリー　: ' + (CATEGORY_LABELS[data.category] || data.category),
    '困りごとID　: ' + concernLabel_(data.concern),
    '',
    'ご相談内容:',
    data.message,
    '',
    '---',
    '記録先: ' + getSpreadsheet_().getUrl()
  ];

  MailApp.sendEmail({
    to: to,
    subject: '【お問い合わせ】' + data.name + ' 様（' +
      (CATEGORY_LABELS[data.category] || data.category) + '）',
    body: lines.join('\n'),
    name: 'つなぐスタジオ お問い合わせフォーム',
    replyTo: data.email
  });
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
