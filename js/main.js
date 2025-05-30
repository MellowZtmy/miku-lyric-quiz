/**
 * 【定数設定】
 */
// 画面表示モード
const display = {
  TOP: 1,
  QUIZ: 2,
  RESULT: 3,
};
// ゲームモード
const gameMode = {
  LYRIC_TO_SONG: { VALUE: '1', TEXT: '歌詞から曲名' },
  SONG_TO_LYRIC: { VALUE: '2', TEXT: '曲名から歌詞' },
};
// 設定ファイル情報
var appsettings = [];
// 歌詞ファイル情報
var csvData = [];
// ひとこと
var acaneWords = [];
// カラーセット
var colorSets = [];
// ボーカロイド名リスト
var songVocaloids = [];
var selectedVocaloids = [];
var vocaloids = [];
// 年代リスト
var songGenerations = [];
var selectedGenerations = [];
var generations = [];
// 選択曲インデックス
var selectedSongIndex = [];
// クイズ
var quizzes = [];
// 現在のクイズインデックス
var currentQuizIndex;
// クイズ結果
var selectedList = [];

/**
 * 【イベント処理】
 */
// 1. 画面表示
$(document).ready(async function () {
  try {
    $('#spinner').show();

    // 1. 設定ファイル読み込み
    appsettings = await getJsonData('appsettings.json');

    // 2. 歌詞情報読み込み
    csvData = await fetchCsvData(appsettings.lyricsFileName);

    // ボーカロイド情報読み込み
    songVocaloids = csvData[appsettings.vocaloidLine];
    vocaloids = await fetchCsvData(appsettings.vocalodsFileName, 1);

    // 世代情報読み込み
    songGenerations = csvData[appsettings.uploadedDateLine];
    generations = [
      ...new Set(songGenerations.map((dt) => dt.slice(0, 4))),
    ].sort();

    // 3. ACAねさんのひとこと読み込み
    acaneWords = await fetchCsvData(appsettings.acaneWordsFileName);

    // 4. カラーセット読み込み
    colorSets = await fetchCsvData(appsettings.colorSetsFileName, 1);

    // 5. 開始画面を表示
    createDisplay(display.TOP);
  } catch (error) {
    // エラーハンドリング
    showError('Failed to load data:', error);
  }
});

// 2. クイズ読込
function loadQuiz(isInit) {
  try {
    // 再開の場合
    if (isInit) {
      // 現在の問題初期化
      currentQuizIndex = 0;
      // 結果初期化
      selectedList = [];
      // クイズ作成
      quizzes = createQuizzes();
    }

    // クイズ画面を表示
    createDisplay(display.QUIZ);
  } catch (error) {
    // エラーハンドリング
    showError('Failed to load quiz:', error);
  }
}

// 3. 選択肢タップ
function onSelect(selected) {
  try {
    // クイズ取得
    var quiz = quizzes[currentQuizIndex];

    // 結果保持
    selectedList.push(selected);

    // ラジオボタン制御
    $('[name="choices"]').each(function () {
      // 非活性
      $(this).prop('disabled', true);
      // 色変え
      var value = $(this).val();
      if (value == quiz.correctAnswer) {
        // 正解の択
        $(this).parent().addClass('label-correct');
        $('#marubatu' + value).append('〇');
      } else if (value == selected) {
        // 不正解の択(選んだ時だけ)
        $(this).parent().addClass('label-incorrect');
        $('#marubatu' + value).append('✕');
      }
    });

    // 最終問題ではない場合次の問題へ
    if (quizzes[currentQuizIndex + 1]) {
      currentQuizIndex++;
    }
    // NEXTボタン、RESULTボタン、MV表示
    $('#next').removeClass('visibility-hidden');
    $('#result').removeClass('visibility-hidden');
    $('#mv').removeClass('visibility-hidden');
  } catch (error) {
    // エラーハンドリング
    showError('Failed to show select:', error);
  }
}

// 4. Result画面表示
function showResult() {
  try {
    // クイズ画面を表示
    createDisplay(display.RESULT);
  } catch (error) {
    // エラーハンドリング
    showError('Failed to result select:', error);
  }
}

/**
 * 【Sub関数】
 */
// クイズ作成
function createQuizzes() {
  // ゲームモード取得
  const currentGameMode = $('input[name="quizMode"]:checked').val();
  // 選択ボーカロイドの曲名取得
  const songs = csvData[appsettings.songNameLine].filter((_, index) =>
    selectedSongIndex.includes(index)
  );
  // 選択ボーカロイドの歌詞取得
  const lyrics = [];
  csvData.slice(appsettings.lyricsStartLine).forEach((lyric) => {
    lyrics.push(lyric.filter((_, index) => selectedSongIndex.includes(index)));
  });
  // 曲の投稿日取得
  const uploadedDates = csvData[appsettings.uploadedDateLine].filter(
    (_, index) => selectedSongIndex.includes(index)
  );
  // 曲の動画ID取得
  const mvIds = csvData[appsettings.mvIdLine].filter((_, index) =>
    selectedSongIndex.includes(index)
  );
  // 曲の作曲者取得
  const composers = csvData[appsettings.composerLine].filter((_, index) =>
    selectedSongIndex.includes(index)
  );
  // 曲の作詞者取得
  const lyricists = csvData[appsettings.lyricistLine].filter((_, index) =>
    selectedSongIndex.includes(index)
  );
  // 曲の動画サイト取得
  const mvSites = csvData[appsettings.siteNameLine].filter((_, index) =>
    selectedSongIndex.includes(index)
  );
  // 問題数取得
  const quizzesLength = songs.length;
  // 選択肢数取得
  const choiceLength = appsettings.choiceLength;

  // 正常に処理できるかチェック
  if (!appsettings.allowSameSong && songs.length < quizzesLength) {
    throw new Error(
      '全曲数' +
        songs.length +
        '曲です。問題の重複を認めない設定で' +
        quizzesLength +
        '曲の問題は作れません。'
    );
  }
  if (songs.length < choiceLength) {
    throw new Error(
      '曲が' + appsettings.choiceLength + 'つ以上になるように選んでね'
    );
  }
  if (!currentGameMode) {
    throw new Error('モードを選んでね');
  }

  // 各変数初期化
  // 問題歌詞リスト
  let questions = [];
  // 曲リスト
  let songList = [];
  // 選択肢リスト(2次元配列)
  let choices = [[]];
  // 正解選択肢リスト
  let correctAnswers = [];
  // MVIDリスト
  let mvIdList = [];
  // 投稿日リスト
  let uploadedDateList = [];
  // 作曲者リスト
  let composerList = [];
  // 作詞者リスト
  let lyricistList = [];
  // MVサイトリスト
  let mvSiteList = [];

  // 問題数分処理する
  for (let i = 0; i < quizzesLength; i++) {
    // 1. 正解曲決定
    let songIndex = '';
    let song = '';
    while (true) {
      // 乱数生成し、正解の曲を設定
      songIndex = getRamdomNumber(songs.length);

      // 曲取得
      song = songs[songIndex];

      // 曲名が取得でき被っていない場合正解曲決定
      if (song !== '' && !songList.includes(song)) {
        // 正解の曲リストに曲追加
        songList.push(song); // 歌詞モードでもベースは曲
        // mvID追加
        mvIdList.push(mvIds[songIndex]);
        // 投稿日追加
        uploadedDateList.push(uploadedDates[songIndex]);
        // 作曲者追加
        composerList.push(composers[songIndex]);
        // 作詞者追加
        lyricistList.push(lyricists[songIndex]);
        // mvサイト追加
        mvSiteList.push(mvSites[songIndex]);
        break;
      }
    }

    // 選択肢作成
    choices[i] = [];
    if (currentGameMode === gameMode.LYRIC_TO_SONG.VALUE) {
      // 歌詞から曲を当てる（元のモード）
      choices[i][0] = song;

      for (let j = 1; j < choiceLength; j++) {
        while (true) {
          const wrongSongIndex = getRamdomNumber(songs.length);
          const wrongSong = songs[wrongSongIndex];
          if (wrongSong !== '' && !choices[i].includes(wrongSong)) {
            choices[i][j] = wrongSong;
            break;
          }
        }
      }

      choices[i] = shuffle(choices[i]);
      correctAnswers.push(choices[i].indexOf(song));

      // 3. 問題文歌詞作成
      while (true) {
        // 乱数生成し、問題文の歌詞を設定
        const lyricsIndex = getRamdomNumber(lyrics.length);

        // 歌詞取得
        const lyric = lyrics[lyricsIndex][songIndex];

        // 問題文が取得でき、被っていない場合歌詞決定
        if (
          lyric !== '' &&
          (appsettings.allowSameSong || !questions.includes(lyric))
        ) {
          questions.push(lyric); // 問題文に歌詞を使う
          break;
        }
      }
    } else if (currentGameMode === gameMode.SONG_TO_LYRIC.VALUE) {
      // 曲から歌詞を当てる
      // 正解の歌詞
      let correctLyric = '';
      while (true) {
        const lyricsIndex = getRamdomNumber(lyrics.length);
        correctLyric = lyrics[lyricsIndex][songIndex];
        if (
          correctLyric !== '' &&
          (appsettings.allowSameSong || !choices.flat().includes(correctLyric))
        ) {
          break;
        }
      }

      choices[i][0] = correctLyric;

      let usedWrongSongIndexes = [songIndex]; // 正解曲インデックスを除外する

      for (let j = 1; j < choiceLength; j++) {
        while (true) {
          const wrongSongIndex = getRamdomNumber(songs.length);

          // 正解と同じ曲の歌詞はスキップ
          if (usedWrongSongIndexes.includes(wrongSongIndex)) continue;

          const lyricsIndex = getRamdomNumber(lyrics.length);
          const wrongLyric = lyrics[lyricsIndex][wrongSongIndex];

          if (wrongLyric !== '' && !choices[i].includes(wrongLyric)) {
            choices[i][j] = wrongLyric;
            usedWrongSongIndexes.push(wrongSongIndex);
            break;
          }
        }
      }

      choices[i] = shuffle(choices[i]);
      correctAnswers.push(choices[i].indexOf(correctLyric));
      questions.push(song); // 問題文には曲名を使う
    }
  }

  // 戻り値作成
  return questions.map((question, index) => ({
    song: songList[index],
    question: question,
    correctAnswer: correctAnswers[index],
    choices: choices[index],
    mvId: mvIdList[index],
    composer: composerList[index],
    lyricist: lyricistList[index],
    uploadedDate: uploadedDateList[index],
    mvSite: mvSiteList[index],
  }));
}

// 画面タグ作成
function createDisplay(mode) {
  // 少し待ってから処理を開始（スピナー表示のため、DOM描画を反映させるため）
  setTimeout(() => {
    try {
      // タグクリア
      $('#display').empty();

      // 変数初期化
      var tag = '';

      // タグ作成
      if (mode === display.TOP) {
        // 選択中ボーカロイド設定
        selectedVocaloids = getLocalArray('selectedVocaloids');
        // ボーカロイドリストより出題する曲リスト取得
        selectedSongIndex = getSelectedSongIndex();

        // ハイスコア表示
        tag +=
          ' <p class="right-text">High Score : ' +
          (getLocal('ztmyLyricQuizHighScore') ?? '-') +
          '</p>';

        // モード選択
        tag += ' <h2 class="h2-display">Mode</h2>';
        tag += ' <div class="quiz-mode-container">';
        for (const [modeKey, modeData] of Object.entries(gameMode)) {
          tag +=
            '   <input type="radio" id="' +
            modeKey +
            '" name="quizMode" value="' +
            modeData.VALUE +
            '" hidden ' +
            (getLocal('gameMode')
              ? modeData.VALUE === getLocal('gameMode') // ローカルストレージにゲームモードがある場合
                ? 'checked'
                : ''
              : modeData.VALUE === gameMode.LYRIC_TO_SONG.VALUE // ローカルストレージにゲームモードがない場合
              ? 'checked'
              : '') +
            '>';
          tag +=
            '   <label for="' +
            modeKey +
            '" class="quizModeRadio">' +
            modeData.TEXT +
            '</label>';
        }
        tag += ' </div>';
        // 今のゲームモードをローカルストレージにセット
        setLocal(
          'gameMode',
          getLocal('gameMode') ?? gameMode.LYRIC_TO_SONG.VALUE
        );

        // ボーカロイド
        tag += ' <h2 class="h2-display">Vocaloids</h2>';
        vocaloids.forEach(function (vocaloid) {
          tag +=
            ' <img src="' +
            appsettings.vocaloidImagePath +
            vocaloid[0] +
            '.jpg" id="' +
            vocaloid[0] +
            '" name="vocaloid" alt="' +
            vocaloid[0] +
            '" class="vocaloid' +
            (selectedVocaloids.includes(vocaloid[0]) ? '' : ' darkened') +
            '" onclick="clickVocaloid(this)">';
        });

        // 年代
        tag += ' <h2 class="h2-display">Generations</h2>';
        tag += ' <div class="year-select-container"> ';
        tag += ' <div class="year-select"> ';
        // 開始年
        tag +=
          '   <select id="startYear" onchange="changeGeneration(this.id, this.value)"> ';
        generations.forEach(function (generation) {
          let selected =
            (!getLocal('startYear') && generation === generations[0]) ||
            (getLocal('startYear') && generation === getLocal('startYear'))
              ? 'selected'
              : '';
          tag += `<option value="${generation}" ${selected}>${generation}年</option>`;
          // ローカルストレージにセット
          if (selected) setLocal('startYear', generation);
        });
        tag += '   </select> ';
        tag += ' </div> ';
        // 終了年
        tag += ' <label class="year-select-label">～</label> ';
        tag += ' <div class="year-select"> ';
        tag +=
          '   <select id="endYear" onchange="changeGeneration(this.id, this.value)"> ';
        generations.forEach(function (generation) {
          let selected =
            (!getLocal('endYear') &&
              generation === generations[generations.length - 1]) ||
            (getLocal('endYear') && generation === getLocal('endYear'))
              ? 'selected'
              : '';
          tag += `<option value="${generation}" ${selected}>${generation}年</option>`;
          // ローカルストレージにセット
          if (selected) setLocal('endYear', generation);
        });
        tag += '   </select> ';
        tag += ' </div> ';
        tag += ' </div> ';
        // 年代変更イベントの呼び出し(出題する曲リスト編集のため)
        changeGeneration();

        // 曲数
        tag +=
          ' <h2 class="center-text margin-top-20" id="songCount">' +
          selectedSongIndex.length +
          ' Songs</h2>';
        // STARTボタン
        tag += '<button id="start"';
        tag += '  onclick="loadQuiz(true)"';
        tag += '  class="btn btn--main btn--radius btn--cubic bottom-button"';
        tag += '>';
        tag += '  START';
        tag += '</button>';
        tag +=
          ' <h2 id="changeColor" class="center-text margin-top-20" onclick="changeColor(1)">Color ↺</h2>';
        tag += ' </div>';

        // 引用について
        tag += ' <footer style="text-align: center; margin-top: 2rem;">';
        tag +=
          '   <a href="about.html" target="_blank" rel="noopener noreferrer">サイト情報</a>';
        tag += ' </footer>';
        // 紙吹雪解除
        $('canvas')?.remove();

        // 一番上にスクロール
        window.scrollTo({
          top: 0,
        });
      } else if (mode === display.QUIZ) {
        // QUIZ画面の場合
        var quiz = quizzes[currentQuizIndex];
        tag += ' ';
        tag += ' <!-- 問題番号 -->';
        tag +=
          ' <h2 class="h2-display">Question. ' +
          (currentQuizIndex + 1) +
          ' / ' +
          quizzes.length +
          '</h2>';
        tag += ' ';

        // 『』で囲む対象の区別
        let isgameModeLyricToSong =
          getLocal('gameMode') === gameMode.LYRIC_TO_SONG.VALUE;
        tag += ' <!-- 問題文 -->';
        tag += ` <p class="font-one-point-five reveal">
        ${
          (isgameModeLyricToSong ? '『' : '') +
          quiz.question +
          (isgameModeLyricToSong ? '』' : '')
        }</p>`;
        tag += ' ';
        tag += ' <!-- 選択肢のラジオボタン + ラベル -->';
        quiz.choices.forEach((choice, index) => {
          tag += '   <label';
          tag += '     class="choice-radio-label"';
          tag += '   >';
          tag += '     <input';
          tag += '       type="radio"';
          tag += '       id="choice' + index + '"';
          tag += '       value="' + index + '"';
          tag += '       name="choices"';
          tag += '       onchange="onSelect(' + index + ')"';
          tag += '     >';
          tag += '     <span class="left-text">';
          tag +=
            '     ' +
            (isgameModeLyricToSong ? '' : '『') +
            choice +
            (isgameModeLyricToSong ? '' : '』');
          tag += '     </span>';
          tag +=
            '     <span id="marubatu' +
            index +
            '" class="right-text bold-text font-one-point-five">';
          tag += '     ';
          tag += '     </span>';
          tag += '   </label>';
          tag += ' ';
        });

        tag += ' ';
        tag += ' <!-- 次へ / 終了 ボタン -->';
        tag += quizzes[currentQuizIndex + 1]
          ? '   <button id="next" onclick="loadQuiz(false)" class="btn btn--main btn--radius btn--cubic visibility-hidden">NEXT→</button>'
          : '   <button id="result" onclick="showResult()" class="btn btn--main btn--radius btn--cubic visibility-hidden">RESULT</button>';
        // MV表示
        tag += '    <!--MV ニコニコ--> ';
        tag +=
          '    <div class="margin-top-20 fade-up visibility-hidden" id="mv"> ';
        tag +=
          '      <div style="position: relative; width: 100%; padding-bottom: 56.25%"> ';
        tag += '        <div ';
        tag += '          style=" ';
        tag += '            position: absolute; ';
        tag += '            top: 0px; ';
        tag += '            left: 0px; ';
        tag += '            width: 100%; ';
        tag += '            height: 100%; ';
        tag += '          " ';
        tag += '        > ';
        tag += '          <iframe ';
        tag += quiz.mvSite.startsWith('ニコニコ')
          ? '            src="https://embed.nicovideo.jp/watch/' //ニコニコ
          : '            src="https://www.youtube.com/embed/'; // YouTube
        tag += quiz.mvId + '?loop=1&playlist=' + quiz.mvId + '" ';
        tag += '            frameborder="0" ';
        tag += '            width="100%" ';
        tag += '            height="100%"  style="border-radius: 15px;"';
        tag += '            allowfullscreen="" ';
        tag += '          ></iframe> ';
        tag += '        </div> ';
        tag += '      </div> ';
        tag += `    <p class="right-text"> ♪${quiz.song} / ${quiz.composer}<br>`;
        tag += `    作詞 ： ${quiz.lyricist}<br>`;
        tag += `    ${quiz.uploadedDate}</p>`;
        tag += '    </div> ';
        console.log(quiz);
      } else if (mode === display.RESULT) {
        // 問題数取得
        var quizzesLength = quizzes.length;
        // 正解数取得
        var correctCount = selectedList.filter(
          (value, index) => value === quizzes[index].correctAnswer
        ).length;
        // RESULT画面
        // 正解数表示
        tag +=
          ' <h2 class="center-text' +
          (correctCount === quizzesLength ? ' text-correct' : '') +
          ' fade-up" style="animation-delay: 0s;">' +
          correctCount +
          ' / ' +
          quizzesLength +
          '</h2>';
        tag +=
          correctCount === quizzesLength
            ? '<h2 class="center-text text-correct">PERFECT!!</h2>'
            : '';
        // Result表示
        tag +=
          ' <h2 class="h2-display fade-up" style="animation-delay: 0s;">Result</h2>';
        quizzes.forEach((quiz, index) => {
          tag +=
            ' <div class="font-one-point-two fade-up" style="animation-delay: 0s;">Q' +
            (index + 1) +
            '. ' +
            quiz.question +
            '</div>';
          tag +=
            ' <div class="font-one-point-two right-text ' +
            (selectedList[index] === quiz.correctAnswer ? 'text-correct' : '') +
            ' fade-up" style="animation-delay: 0s;">' +
            quiz.choices[quiz.correctAnswer] +
            '</div>';
          tag += index === quizzes.length - 1 ? '' : '<br>';
        });
        // ボーカロイド表示
        tag +=
          selectedVocaloids.length > 0
            ? ' <h2 class="h2-display fade-up" style="animation-delay: 1s;">Vocaloids</h2>'
            : '';
        vocaloids.forEach(function (vocaloid) {
          if (selectedVocaloids.includes(vocaloid[0])) {
            tag +=
              ' <img src="' +
              appsettings.vocaloidImagePath +
              vocaloid[0] +
              '.jpg" id="' +
              vocaloid[0] +
              '" name="vocaloid" alt="' +
              vocaloid[0] +
              '" class="vocaloid fade-up" style="animation-delay: 1s;">';
          }
        });

        tag +=
          ' <h2 class="h2-display fade-up" style="animation-delay: 2s;">Generations</h2>';
        tag += ` <label class="year-select-label fade-up" style="animation-delay: 2s;">${getLocal(
          'startYear'
        )}年 ～ ${getLocal('endYear')}年</label>  `;
        // 全問正解の場合紙吹雪、ひとこと
        if (correctCount === quizzesLength) {
          tag +=
            '<h2 class="h2-display font-one-point-two fade-up" style="animation-delay: 3s;">ひとこと</h2>';
          tag +=
            '<div class="font-one-point-two fade-up" style="animation-delay: 3s;">' +
            acaneWords[getRamdomNumber(acaneWords.length)] +
            '</div>';
          $('#confetti').prepend('<canvas></canvas>');
          dispConfetti();
        }
        tag +=
          ' <button id="retry" onclick="createDisplay(display.TOP)" class="btn btn--main btn--radius btn--cubic fade-up" style="animation-delay: 3s;">RETRY</button>';

        // ハイスコア設定(「??」は「<」より優先度が低いのでカッコをつける
        if ((Number(getLocal('ztmyLyricQuizHighScore')) ?? 0) < correctCount) {
          setLocal('ztmyLyricQuizHighScore', correctCount);
        }
      }

      // タグ流し込み
      $('#display').append(tag);

      // カラー適用
      changeColor(0);
    } finally {
      // 最後にスピナーを非表示
      $('#spinner').hide();
    }
  }, 0); // 0ms で「次のイベントループ」で処理実行（レンダリング保証）
}
