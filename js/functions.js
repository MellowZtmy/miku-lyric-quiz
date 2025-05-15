// JSONデータを取得する関数
function getJsonData(jsonUrl) {
  return new Promise((resolve, reject) => {
    $.getJSON(jsonUrl, function (data) {
      resolve(data);
    }).fail(function () {
      reject('Failed to load JSON file');
    });
  });
}

// CSVデータを取得する関数（PapaParse使用）
async function fetchCsvData(fileName, skipRowCount = 0) {
  try {
    const response = await fetch(fileName);
    const csvText = await response.text();
    return parseCsvWithPapa(csvText, skipRowCount);
  } catch (error) {
    throw new Error('Failed to load CSV file: ' + fileName);
  }
}

// PapaParseを使ってCSVをパースする関数
function parseCsvWithPapa(csvText, skipRowCount) {
  const regx = new RegExp(appsettings.commaInString, 'g');

  const result = Papa.parse(csvText.trim(), {
    delimiter: ',', // ★ これを追加（警告回避のため）
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.error('CSV parsing error:', result.errors);
    throw new Error('CSV parsing failed');
  }

  // skipRowCount行をスキップし、置換処理を行う
  return result.data
    .slice(skipRowCount)
    .map((row) => row.map((value) => value.replace(regx, ',')));
}

// 配列をシャッフルして返す
function shuffle(array) {
  var result = [];
  for (i = array.length; i > 0; i--) {
    var index = Math.floor(Math.random() * i);
    var val = array.splice(index, 1)[0];
    result.push(val);
  }
  return result;
}

// 乱数生成
function getRamdomNumber(num) {
  return Math.floor(Math.random() * num);
}

// データをローカルストレージからクリアする関数
function removeLocal(key) {
  localStorage.removeItem(appsettings.appName + '.' + key);
}

// データをローカルストレージにセットする関数
function setLocal(key, value) {
  localStorage.setItem(appsettings.appName + '.' + key, value);
}

// ローカルストレージからデータをゲットする関数
function getLocal(key) {
  return localStorage.getItem(appsettings.appName + '.' + key);
}

// ローカルストレージから配列を取得(nullは空に)
function getLocalArray(key) {
  return (
    JSON.parse(localStorage.getItem(appsettings.appName + '.' + key)) ?? []
  );
}

// ローカルストレージに配列設定(nullは空に)
function setLocalArray(key, array) {
  localStorage.setItem(
    appsettings.appName + '.' + key,
    JSON.stringify(array ?? [])
  );
}

// エラー時処理
function showError(errorMsg1, errorMsg2) {
  // コンソールに表示
  console.error(errorMsg1, errorMsg2);
  // 画面に表示
  alert(errorMsg2);
}

// ボーカロイドタップ時
function clickVocaloid(image) {
  // 暗め表示の切り替え
  image.classList.toggle('darkened');
  // 選択中リストの編集
  if (image.name === 'vocaloid') {
    selectedVocaloids = image.classList.contains('darkened')
      ? selectedVocaloids.filter((item) => item !== image.id)
      : selectedVocaloids.concat(image.id);
  }

  // ローカルストレージに保存
  setLocalArray('selectedVocaloids', selectedVocaloids);

  // ボーカロイドリストより出題する曲リスト取得
  selectedSongIndex = getSelectedSongIndex();
  $('#songCount').text(selectedSongIndex.length + ' Songs');
}

// 年代変更時
function changeGeneration(id, value) {
  // ローカルストレージに保存(画面操作で呼ばれたときのみ)
  if (id) setLocal(id, value);

  // 選択中リストの編集
  // 年代開始終了の取得
  let year1 = getLocal('startYear') ?? generations[0];
  let year2 = getLocal('endYear') ?? generations[generations.length - 1];
  if (year1 > year2) {
    // 開始 > 終了 の場合、入れ替え
    [year1, year2] = [year2, year1];
  }
  // 選択中世代リストの編集
  selectedGenerations = [];
  for (let year = year1; year <= year2; year++) {
    selectedGenerations.push(String(year));
  }
  // ボーカロイドリストより出題する曲リスト取得
  selectedSongIndex = getSelectedSongIndex();
  $('#songCount').text(selectedSongIndex.length + ' Songs');
}

// 出題する曲リスト(ボーカロイドの選択と年代の選択から)
function getSelectedSongIndex() {
  const vocaloidIndices = getMatchingIndicesForVocaloid(
    songVocaloids,
    selectedVocaloids
  );
  const generationIndices = getMatchingIndicesForGeneration(
    songGenerations,
    selectedGenerations
  );

  console.log(
    'Vocaloid Indices:',
    vocaloidIndices.filter((i) => generationIndices.includes(i))
  );
  // 積集合（両方に含まれるインデックスのみ）
  return vocaloidIndices.filter((i) => generationIndices.includes(i));
}

// 配列同士で一致するもののインデックスを返す(ボカロ名用)
function getMatchingIndicesForVocaloid(arr1, arr2) {
  return arr1
    .map((item, index) => {
      // 「・」で分割して個々のボカロ名に分ける
      const itemVocaloids = item.split('・');
      // 選択されたボカロ名と少なくとも1つ一致するかどうか
      const hasMatch = itemVocaloids.some((v) => arr2.includes(v));
      return hasMatch ? index : -1;
    })
    .filter((index) => index !== -1);
}

// 配列同士で一致するもののインデックスを返す(年代用)
function getMatchingIndicesForGeneration(dateList, yearList) {
  const result = [];
  dateList.forEach((dateStr, index) => {
    const year = dateStr.slice(0, 4); // 最初の4文字が年
    if (yearList.includes(year)) {
      result.push(index);
    }
  });
  return result;
}

// カラーチェンジ
function changeColor(plusCount) {
  // 今のカラーインデックスを取得し、次のインデックス設定（ない場合最初のもの）
  var colorIndex = Number(getLocal('colorIndex') ?? 0) + plusCount;

  // 設定するカラーを設定（ない場合最初に戻る）
  var colorSet = colorSets[colorIndex] ?? colorSets[0];
  $('body').css({
    background: colorSet[1],
    color: colorSet[2],
  });
  $('.btn--main').css({
    'background-color': colorSet[3],
    color: colorSet[4],
  });

  // ★ ラジオボタン選択スタイルの更新
  // すべてのラベルのスタイルを一度リセット（←これ大事）
  $('.quizModeRadio').removeAttr('style');
  // チェックされたラジオのID取得
  const checkedId = $('input[name="quizMode"]:checked').attr('id');
  // チェックされたラジオに対応するラベルだけにスタイル適用
  $('label[for="' + checkedId + '"]').css({
    'background-color': colorSet[3],
    color: colorSet[4],
  });

  // ★ ラジオボタン選択スタイルの仕込み(選択中のカラーになるよう関数再設定)
  $('input[name="quizMode"]').on('change', function () {
    // ラベルをリセット
    $('.quizModeRadio').removeAttr('style');
    // チェックされたラジオのID取得
    const checkedId = $('input[name="quizMode"]:checked').attr('id');
    // 対応するラベルにスタイル付与
    $('label[for="' + checkedId + '"]').css({
      'background-color': colorSet[3],
      color: colorSet[4],
    });

    // ローカルストレージにセット
    setLocal('gameMode', $('input[name="quizMode"]:checked').val());
  });

  // 今のカラー設定をローカルストレージに保存
  var colorIndexNow = colorSets[colorIndex] ? colorIndex : 0;
  setLocal('colorIndex', colorIndexNow);
  // 今のカラー表示
  $('#changeColor').html(
    'Color ↺ <br>(' + (colorIndexNow + 1) + '/' + colorSets.length + ')'
  );
}
