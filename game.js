(() => {
  'use strict';

  const DATA = window.GAME_DATA;
  const nodes = new Map(DATA.nodes.map(n => [n.id, n]));
  const nodeOrder = new Map(DATA.nodes.map((n, i) => [n.id, i]));
  const SAVE_PREFIX = 'fourth-bedroom-production-v21';
  const LEGACY_SAVE_PREFIX = 'fourth-bedroom-production-v20';
  const SAVE_KEYS = {
    auto: `${SAVE_PREFIX}-autosave`,
    slot1: `${SAVE_PREFIX}-slot1`,
    slot2: `${SAVE_PREFIX}-slot2`,
    slot3: `${SAVE_PREFIX}-slot3`
  };
  const PROFILE_KEY = 'fourth-bedroom-profile-v212';

  const RELEASE_VERSION = '2.20.0';
  const SAVE_FORMAT = 'FOURTH_BEDROOM_SAVE_V216';
  const COMPATIBLE_SAVE_FORMATS = new Set(['FOURTH_BEDROOM_SAVE_V210', 'FOURTH_BEDROOM_SAVE_V211', 'FOURTH_BEDROOM_SAVE_V212', 'FOURTH_BEDROOM_SAVE_V213', 'FOURTH_BEDROOM_SAVE_V214', 'FOURTH_BEDROOM_SAVE_V215', SAVE_FORMAT]);
  const JUDGEMENT_LABELS = {
    evidence: ['根拠', '現在確認できる物証を優先した'],
    safety: ['安全', '人命と停止条件を優先した'],
    collaboration: ['協働', '専門性と責任を他者へ渡した'],
    preservation: ['保存', '異なる層と関係を消さずに残した'],
    disclosure: ['公開', '検証可能な記録を外部へ接続した']
  };
  const CHOICE_IMPACTS = {
    p02x2:[{evidence:1},{evidence:1},{collaboration:1}], p06:[{safety:1},{safety:-1}], p13:[{safety:-1},{safety:1}], p18:[{collaboration:-1},{collaboration:2}],
    p39:[{evidence:2},{preservation:-1},{evidence:-1}], p48:[{disclosure:2,collaboration:1},{disclosure:-1}], p56:[{safety:-1},{safety:2,evidence:1}],
    p65:[{safety:2,collaboration:1},{safety:-2},{safety:1,collaboration:-1}],
    p71:[{preservation:1,safety:-2},{safety:2},{collaboration:2,safety:-1}],
    r03:[{disclosure:-1},{evidence:2,disclosure:1},{evidence:1}], r11:[{evidence:-2},{evidence:2,disclosure:1},{collaboration:-1}],
    r14:[{safety:2},{safety:-3}], r21:[{safety:1},{evidence:1},{evidence:2}],
    v07:[{evidence:-1},{evidence:2}], v12:[{disclosure:0},{preservation:-1},{evidence:1}], v17:[{safety:-2},{safety:-1},{safety:2,collaboration:1}], a203:[{collaboration:1},{evidence:1}],
    a206:[{disclosure:2,evidence:1},{disclosure:-1}], a231:[{preservation:-1},{preservation:-1},{preservation:-1},{evidence:2}],
    a243:[{preservation:-1},{preservation:-1},{preservation:2,evidence:1}], a244:[{preservation:-3},{preservation:2}],
    a246:[{preservation:-3},{preservation:2}], a249:[{safety:-2},{evidence:2,safety:1}], a263:[{evidence:-2},{evidence:2}],
    a270:[{preservation:-2},{collaboration:2,evidence:1}], a304:[{evidence:-1},{evidence:1}], a305b:[{evidence:-2},{evidence:2}],
    a310:[{preservation:-3},{preservation:2,evidence:2}], a314:[{preservation:-2},{evidence:2}], a317:[{evidence:-2},{evidence:2}],
    a407:[{evidence:-1},{preservation:0},{collaboration:1,evidence:1}], a409c:[{preservation:-2},{evidence:2,preservation:1}],
    a414:[{preservation:-3},{preservation:-2},{preservation:3,evidence:2}], a418:[{preservation:-2},{preservation:3,disclosure:1},{preservation:-2}],
    a506:[{evidence:-3},{preservation:-3},{evidence:3,preservation:2}], a512:[{safety:-3},{safety:2}], a521:[{disclosure:-2},{evidence:3,disclosure:1}],
    a602:[{collaboration:1},{collaboration:-1}], a607:[{collaboration:-3,safety:-2},{collaboration:3,safety:2}],
    a615:[{evidence:-3},{evidence:3,disclosure:2}], a618:[{disclosure:-2},{disclosure:3,safety:1}], a622:[{evidence:-2,disclosure:1},{evidence:-3,preservation:-3},{evidence:1,disclosure:-1},{evidence:2,preservation:-1},{evidence:3,preservation:3,disclosure:2}],
    v27_reflect_portal:[{evidence:2,collaboration:1},{safety:2,evidence:1}],
    v27_reflect_relation:[{evidence:2,preservation:1},{preservation:2}],
    v27_reflect_marta:[{disclosure:1,preservation:2},{evidence:2}],
    v27_reflect_archive:[{preservation:1,disclosure:1},{preservation:2,evidence:2}],
    v27_reflect_roles:[{collaboration:2,disclosure:1},{safety:2,disclosure:2}],
    v27_reflect_joint_procedure:[{safety:2,collaboration:2},{evidence:2,collaboration:2}],
    v27_reflect_floor_test:[{evidence:2,safety:2},{collaboration:1,safety:3}],
    v27_reflect_memory_record:[{evidence:2,preservation:2},{preservation:3,disclosure:1}],
    v27_reflect_provenance_boundary:[{evidence:2,disclosure:2},{preservation:2,evidence:2}],
    v27_reflect_restorable_disclosure:[{disclosure:3,evidence:1},{collaboration:2,evidence:2}],
    v27_reflect_smoke_report:[{safety:3,collaboration:1},{safety:3,collaboration:2}],
    v27_reflect_shutdown_record:[{evidence:3},{collaboration:2,disclosure:2}],
    v27_reflect_accountability:[{disclosure:3,evidence:1},{safety:2,collaboration:2}],
    v27_reflect_label:[{preservation:3,evidence:2},{evidence:3,disclosure:2}],
    v27_reflect_leon_memory:[{evidence:2,preservation:1},{evidence:3}],
    v27_reflect_unknown_room:[{safety:2,evidence:2},{evidence:2,safety:1}],
    v27_reflect_guest_arrival:[{evidence:2},{evidence:2,collaboration:1}],
    v27_reflect_second_vincent:[{evidence:3,preservation:1},{evidence:2,preservation:2}],
    v27_reflect_marta_entry:[{safety:1,evidence:2},{evidence:2,collaboration:1}]
  };
  const RELATIONSHIP_CONFIG = {
    claire:{name:'クレール',role:'画像・設備監視',correctEvidence:'role_claire',domain:'imaging'},
    marc:{name:'マルク',role:'施設操作・管理ログ',correctEvidence:'cleanup_cancelled',domain:'facility'},
    leon:{name:'レオン',role:'原本・所有者立会い',correctEvidence:'leon_consent_record',domain:'provenance'}
  };

  const DIAGNOSTIC_ATLAS = [
    {id:'visible',label:'可視光',short:'現在の色と形',src:'assets/painting-diagnostics/fourth_visible.webp',unlock:null,description:'現在の表面状態を記録した正面撮影。ここでは差異の位置だけを確認し、年代や作者は決めない。'},
    {id:'raking',label:'斜光',short:'亀裂・盛上り・光沢',src:'assets/painting-diagnostics/fourth_raking.webp',unlock:'surface_time_map',description:'低い角度の光で表面の凹凸を読む。第三椅子、肖像、周囲の光沢境界が同じ乾燥時間ではないことを示す。'},
    {id:'infrared',label:'赤外線',short:'下描きと変更前構図',src:'assets/painting-diagnostics/fourth_infrared.webp',unlock:'underdrawing_map',description:'表面の一部を透過して下描きを比較する。床線は後加筆の下へ続き、左扉と窓には変更前の構図が残る。'},
    {id:'ultraviolet',label:'紫外線蛍光',short:'ワニスと補彩範囲',src:'assets/painting-diagnostics/fourth_ultraviolet.webp',unlock:'third_chair_new_nails',description:'新旧のワニスと補彩の蛍光差を偽色で表示する。四つの追加要素は周囲と異なる反応を示す。'},
    {id:'xray',label:'X線',short:'支持体・釘・密度',src:'assets/painting-diagnostics/fourth_xray.webp',unlock:'new_frame',description:'顔料密度、支持体、固定具を比較する。新しい固定木片と釘が、古い支持体の連続性を遮っている。'},
    {id:'reverse',label:'裏面',short:'木枠・補修・署名位置',src:'assets/painting-diagnostics/fourth_reverse.webp',unlock:'marta_full_signature',description:'キャンバス裏面と木枠の登録画像。1948年の記録領域と、後年それを覆った処置を同じ面で確認する。'},
    {id:'marta1948',label:'1948年層',short:'比較再構成の完成時',src:'assets/painting-diagnostics/fourth_marta_1948.webp',unlock:'marta_original_plates',description:'マルタの乾板と工程記録から復元した完成直後の状態。第三椅子、鍵穴、女性肖像、夜窓はまだ存在しない。'},
    {id:'andre1967',label:'1967年層',short:'四要素の加筆直後',src:'assets/painting-diagnostics/fourth_andre_1967.webp',unlock:'andre_additions_sequence',description:'アンドレの撮影・来歴草稿・材料記録から再構成した後加筆直後。市場向けの物語を支える四要素が新しい。'},
    {id:'stratigraphy',label:'年代層分解',short:'層を混同しない偽色図',src:'assets/painting-diagnostics/fourth_stratigraphy.webp',unlock:'layer_andre',description:'基層、1948年再構成、1967年加筆、経年変化を偽色で分ける。色は作者の断定ではなく、記録上の作業群を示す。'},
    {id:'conserved',label:'最終保存状態',short:'層を残して説明可能にする',src:'assets/painting-diagnostics/fourth_conserved.webp',unlock:'joint_signatures',description:'後加筆を一括除去せず、各層を識別し、裏面・画像・原本との関係を再検証できる展示状態。'}
  ];
  const SPECTRAL_IMAGE_BY_MODE = Object.fromEntries(DIAGNOSTIC_ATLAS.filter(x=>['visible','raking','infrared'].includes(x.id)).map(x=>[x.id,x.src]));
  const EVIDENCE_IMAGE_MAP = {
    pressure_drop:'pressure_gauge',condensation:'coolant_joint',env_lab_leak:'coolant_joint',admin_delay:'marc_card',marc_card:'marc_card',env_frame_scar:'frame_scar',
    third_chair:'third_chair',third_chair_new_nails:'third_chair',keyhole:'keyhole',keyhole_is_paint:'keyhole',keyhole_confirmed_later:'keyhole',portrait:'mystery_portrait',female_portrait_emerging:'mystery_portrait',night_window:'night_window',
    chair_line:'floor_line',chair_is_view:'floor_line',mdv_signature:'mdv_signature',marta_full_signature:'mdv_signature',two_chairs_separated:'chair_shadows',purple_swatch_candidates:'purple_swatches',archive_linkage:'archive_links',
    fake_provenance_drafts:'provenance_drafts',env_andre_drafts:'provenance_drafts',purchase_ticket:'v17_ticket',cleanup_task:'cleanup_terminal',cleanup_cancelled:'cleanup_terminal'
  };
  const ACTION_CUTIN_IMAGES = Object.fromEntries(['carry','scan','stop','door','power','signal','sequence','coffee','terminal'].map(id=>[id,`assets/action-cutin/${id}.webp`]));

  const EVENT_CGS = {
    p36:{src:'assets/event-cg/lab_reveal.webp',position:'50% 45%',label:'第四版との初対面'},
    p58x1:{src:'assets/event-cg/lab_layers.webp',position:'50% 44%',label:'三つの光で分かれる層'},
    v01x1:{src:'assets/event-cg/painted_arrival.webp',position:'50% 48%',label:'描かれた部屋へ立つ'},
    v16x1:{src:'assets/event-cg/painted_collapse.webp',position:'50% 48%',label:'未完成の床'},
    a401:{src:'assets/event-cg/marta_rain.webp',position:'50% 45%',label:'1948年の工房'},
    a410x2:{src:'assets/event-cg/marta_comparison.webp',position:'50% 46%',label:'差異を並べて残す'},
    a501:{src:'assets/event-cg/andre_provenance.webp',position:'50% 43%',label:'古い紙へ新しい物語を書く'},
    a503x1:{src:'assets/event-cg/andre_staging.webp',position:'50% 44%',label:'物語を選ぶ照明'},
    a623:{src:'assets/event-cg/dawn_lab.webp',position:'50% 48%',label:'救えた夜のあと'},
    a627x3:{src:'assets/event-cg/final_gallery.webp',position:'50% 48%',label:'名前へ届く朝の光'}
  };

  const ACTION_CUTINS = {
    p18:['carry','荷物の重さを二人で分ける'], p58:['scan','走査光を絵具層へ通す'], p65:['stop','停止判断へ手を伸ばす'],
    p71:['door','閉じる防火扉と退避路'], r14:['power','主電源を切断してから盤を開く'],
    a212x2:['signal','クレールの声を現在の基準にする'], a526:['sequence','人命・作品・原本・データを順序へ置く'],
    a602:['coffee','砂糖二つの記憶が現在へ戻る'], a611:['terminal','自動削除の予約時刻を開く']
  };


  const ENVIRONMENT_DETAILS = [
    {id:'env_train_dossier',kind:'dossier',bgs:['train'],from:'p01',to:'p05',x:27,y:72,title:'署名欄の折れ',seen:'依頼書の右下だけ紙が柔らかい。',compare:'作品名の欄より、担当者署名欄を開いた回数が多い。',record:'澄は作品より先に、自分が署名する責任を確認している。',evidence:'env_train_dossier'},
    {id:'env_train_meal',kind:'meal',bgs:['train'],from:'p03',to:'p09x2',x:68,y:76,title:'残った軽食',seen:'包装は開いているのに、食事には手がついていない。',compare:'列車へ乗ってから書類だけが何度も移動している。',record:'緊張は独白より先に身体へ出ている。',evidence:'env_train_meal'},
    {id:'env_packed_department',kind:'boxes',bgs:['loadingBay','corridor'],from:'p18',to:'p26x2',x:13,y:62,title:'箱詰めされた撮影部門',seen:'保管箱の側面に撮影部門の旧ラベル。',compare:'壁の部署名プレートは外され、ねじ穴だけが新しい。',record:'クレールが守ろうとしているのは今夜の画像だけではない。',evidence:'env_packed_department'},
    {id:'env_lab_leak',kind:'drip',bgs:['labPainting','scan','infrared','scanSafe','equipment'],from:'p37',to:'p71',x:82,y:37,title:'継ぎ目の水滴',seen:'配管継ぎ目から同じ間隔で水滴が落ちる。',compare:'壁面の結露より粒が大きく、床の濡れが一点から広がる。',record:'結露と微小漏れを同じ見え方で処理しない。',evidence:'env_lab_leak'},
    {id:'env_frame_scar',kind:'scratch',bgs:['labPainting','scan','infrared','scanSafe'],from:'p37',to:'p64',x:62,y:66,title:'額縁右下の傷',seen:'額縁右下に二本の浅い傷。',compare:'レオンが祖父の倉庫で覚えていた位置と一致する。',record:'家族記憶は帰属の証明ではないが、物の連続性を調べる場所を示す。',evidence:'env_frame_scar'},
    {id:'env_wheel_stop',kind:'wheel',bgs:['equipment','emergency','smoke','corridor'],from:'p53',to:'r09',x:76,y:82,title:'安全線を越えた車輪止め',seen:'架台の車輪止めが黄色い安全線を少し越える。',compare:'明るい室内では避けられるが、低い煙の中では手探りになる高さ。',record:'小さな配置の乱れが退避経路の条件を変える。',evidence:'env_wheel_stop'},
    {id:'env_return_route',kind:'echo',bgs:['recovery','corridor'],from:'r01',to:'r10',loopMin:2,x:47,y:52,title:'先に見える退避路',seen:'防火扉の下と非常口までの距離だけ輪郭が鋭い。',compare:'同じ廊下だが、前の周回で危険だった箇所へ視線が先に移る。',record:'未来の事実ではなく、現在にある危険箇所を再確認する。',evidence:'env_return_route'},
    {id:'env_guest_table',kind:'table',bgs:['guestRoom','yellowHouse'],from:'a224',to:'a244',x:34,y:68,title:'揃わない二人分',seen:'二人分の食器が置かれている。',compare:'片方は日常用、片方は客用のままで、置く間隔も違う。',record:'迎える準備と、同じ生活を送れることは別である。',evidence:'env_guest_table'},
    {id:'env_gauguin_luggage',kind:'luggage',bgs:['guestRoom','yellowHouse'],from:'a224',to:'a244',x:78,y:67,title:'制作道具に偏った荷物',seen:'画材と本が多く、衣類と生活用品は少ない。',compare:'滞在用の荷物ではあるが、長期生活の量ではない。',record:'二人は同じ到着を、異なる期間として想定している。',evidence:'env_gauguin_luggage'},
    {id:'env_marta_materials',kind:'swatches',bgs:['martaWorkshop'],from:'a401',to:'a424',x:22,y:72,title:'揃わない材料、揃った番号',seen:'木枠、釘、紙袋の種類がばらばら。',compare:'それでも試料番号と写真番号は同じ順序で並ぶ。',record:'不足した材料と、厳密な記録方法を混同しない。',evidence:'env_marta_materials'},
    {id:'env_marta_cover',kind:'cloth',bgs:['martaWorkshop','paperArchive'],from:'a406',to:'a424',x:63,y:58,title:'署名を覆う布',seen:'裏面文字の上に布がかかっている。',compare:'布は縫い付けられず、処置用の重しだけで留められている。',record:'見えない署名を、消された署名と断定しない。',evidence:'env_marta_cover'},
    {id:'env_andre_drafts',kind:'typewriter',bgs:['andreWarehouse','documentLayer','provenanceRoom'],from:'a501',to:'a521',x:28,y:68,title:'両立しない来歴案',seen:'同じ作品に三種類の由来文がある。',compare:'秘密保管、家族封印、知人宅は同時に成立しない。',record:'古い過去を記録した文書ではなく、売れる説明の候補として扱う。',evidence:'env_andre_drafts'},
    {id:'env_vent_timer',kind:'timer',bgs:['warehouseDeep','warehouseDark'],from:'a511',to:'a517',x:84,y:28,title:'換気停止までの時間',seen:'壁のタイマーが減り続けている。',compare:'扉の謎を調べる時間より、空気が安全である時間の方が短い。',record:'探索の優先順位を物語ではなく身体条件から決める。',evidence:'env_vent_timer'},
    {id:'env_dawn_after',kind:'wetfloor',bgs:['outsideDawn'],from:'a528',to:'a625x3',x:48,y:79,title:'夜明けの非常灯',seen:'外は明るいが、室内の非常灯はまだ点灯している。',compare:'濡れた床と停止した機械は、事故が終わったことと復旧を分ける。',record:'救えた結果だけで、残る危険を見えなくしない。',evidence:'env_dawn_after'},
    {id:'env_final_label',kind:'label',bgs:['finalGallery'],from:'a623',to:'endTrue',x:69,y:48,title:'名前と資料が同じ面にある',seen:'マルタの名前の横に購入票と工程写真の番号。',compare:'名前だけを称える展示ではなく、由来を検証できる資料が隣接する。',record:'人物を物語へ戻すだけでなく、反証可能な関係を残す。',evidence:'env_final_label'}
  ];

  const INSIGHT_CHALLENGES = {
    p58x1:{eyebrow:'LAYER HYPOTHESIS',title:'同じ画面の中で、時間が違う根拠を結ぶ',prompt:'二つの観察を選び、現在の作業仮説を作る。',cards:[['crack','三脚目の亀裂だけが少ない'],['under','赤外線の床線が椅子の下を通る'],['night','窓が夜景に見える'],['gold','額縁が金色に見える']],correct:['crack','under'],conclusion:'三脚目は下描き後、表面層がある程度進んだ後に加えられた可能性が高い。'},
    a230x1:{eyebrow:'RELATION HYPOTHESIS',title:'二人の期待のずれを、性格以外から読む',prompt:'共同生活の期間について最も強く結び付く二つを選ぶ。',cards:[['cost','フィンセントは二人分を長期で計算'],['bags','ゴーギャンの生活用品は一か月分程度'],['yellow','部屋の壁が黄色い'],['books','ゴーギャンは本を持っている']],correct:['cost','bags'],conclusion:'対立は友情の有無だけでなく、生活を続ける時間の想定が最初から異なることにある。'},
    a406x1:{eyebrow:'METHOD HYPOTHESIS',title:'不足と粗雑さを分ける',prompt:'マルタの作業方法を説明する二つを選ぶ。',cards:[['reuse','木枠・紙・容器を再利用している'],['index','試料・乾板・日誌を同じ番号で結ぶ'],['rain','外で雨が降っている'],['purple','紫色の候補がある']],correct:['reuse','index'],conclusion:'材料は不足しているが、記録方法は意図的に統一されている。再利用は偽装や粗雑さの証明ではない。'},
    a416x1:{eyebrow:'ARCHIVE HYPOTHESIS',title:'物ではなく関係を保存する',prompt:'移管後も再検証できる組み合わせを選ぶ。',cards:[['number','キャンバスと乾板の共通索引番号'],['process','処置前後を示す連番写真'],['pretty','完成後の最も美しい写真'],['nameoff','作者名をすべて外す']],correct:['number','process'],conclusion:'単体の物を残すだけでなく、同じ作業へ属した資料同士の関係を保存する必要がある。'},
    a503x1:{eyebrow:'PROVENANCE HYPOTHESIS',title:'古い物語が作られた時点を読む',prompt:'アンドレが来歴を作ったと判断する二つを選ぶ。',cards:[['drafts','互いに両立しない三つの来歴草稿'],['ticket','購入票の品名は比較再構成画'],['dust','机に埃がある'],['lamp','肖像へ照明が当たる']],correct:['drafts','ticket'],conclusion:'購入時点の記録は比較再構成画であり、秘密の傑作という来歴は取得後に組み立てられた可能性が高い。'},
    a613x2:{eyebrow:'CURRENT EVIDENCE',title:'記憶を使わず、現在の証拠だけで到達する',prompt:'マルタの比較再構成を現在確かめる二つを選ぶ。',cards:[['purchase','購入票「比較再構成画 / M. de Vries」'],['signature','裏面署名と1948年の日付'],['memory','消えた周回で聞いたマルタの言葉'],['portrait','女性肖像がマルタに似て見える']],correct:['purchase','signature'],conclusion:'購入票と裏面署名は、現在の立会いと撮影で再取得できる。記憶を証拠へ混ぜなくても同じ結論へ届く。'}
  };

  const DECISION_ECHO = {
    evidence:{positive:'確認できる根拠へ戻った',negative:'結論を先へ進めた'},
    safety:{positive:'人命と停止条件を先に置いた',negative:'停止より継続を選んだ'},
    collaboration:{positive:'判断を他者へ渡した',negative:'一人で抱える方へ寄った'},
    preservation:{positive:'異なる層を消さずに残した',negative:'一つの説明へ寄せた'},
    disclosure:{positive:'外部で検証できる形へつないだ',negative:'外部接続を保留した'}
  };

  const HISTORICAL_ARTWORKS = [
    {id:'amsterdam',title:'《寝室》1888',subtitle:'第1版｜アムステルダム',src:'assets/historical/bedroom-1888-amsterdam.webp',credit:'Van Gogh Museum / Public Domain'},
    {id:'chicago',title:'《寝室》1889',subtitle:'同寸再制作｜シカゴ',src:'assets/historical/bedroom-1889-chicago.webp',credit:'Art Institute of Chicago / CC0'},
    {id:'orsay',title:'《寝室》1889',subtitle:'小型版｜パリ',src:'assets/historical/bedroom-1889-orsay.webp',credit:'Musée d’Orsay / Public Domain'},
    {id:'sketch',title:'書簡スケッチ 1888',subtitle:'テオ宛書簡の線画',src:'assets/historical/bedroom-letter-sketch.webp',credit:'Van Gogh Museum / Public Domain'}
  ];
  const FINAL_REPORT_REQUIREMENTS = [
    {title:'1948年の作成者と目的',ids:['marta_full_signature','purchase_ticket']},
    {title:'1967年の後加筆',ids:['marta_original_plates','andre_private_letter']},
    {title:'現在の証拠として再取得',ids:['current_reacquired','external_hash']},
    {title:'事実・未確定・価値の分離',ids:['report_three_columns']}
  ];

  const CHAPTER_INFO = {
    PROLOGUE: ['PROLOGUE', '目録にない部屋', '一枚の絵が、まだ名前を持たない夜。'],
    'ACT 1': ['ACT 1', '休息の部屋', '描かれた当時の色と、現在見えている色。'],
    'ACT 2': ['ACT 2', '来客のための椅子', '人を迎える期待は、同じ形では返ってこない。'],
    'ACT 3': ['ACT 3', '描き直された部屋', '同じ構図にも、同じ時間は戻らない。'],
    'ACT 4': ['ACT 4', '部屋を写した女', '失われた部屋を、残された差異から組み直す。'],
    'ACT 5': ['ACT 5', '売られる物語', '作品へ付け足された、分かりやすい物語。'],
    'ACT 6': ['ACT 6', '夜明けまで、彼はまだ画家だった', '知っている未来ではなく、現在の証拠で人を動かす。'],
    ENDING: ['ENDING', '記録の行方', '何を残し、何を事実として書くか。']
  };


  const LOOP_RECONSTRUCTION = {
    GO01:{eyebrow:'NEXT LOOP / SAFETY',question:'次の周回で、最初に現在証拠へ変えるべき計画はどれか。',evidence:'loop_plan_go01',correct:'verify-system',options:[
      {id:'save-painting',title:'作品を先に搬出する',body:'作品を危険区域から出せば事故を避けられる。',feedback:'作品の移動中も配管と防火区画は悪化する。人命と停止条件が先に必要。'},
      {id:'verify-system',title:'設備異常と停止権限を結ぶ',body:'配管、管理カード、停止提案を現在時刻の記録へまとめる。',carry:'配管、管理カード、停止権限を現在の記録で結び、作品より先に安全停止を成立させる。'},
      {id:'accuse-marc',title:'マルクを先に追及する',body:'原因を知っている人物へ説明を迫る。',feedback:'未来で知った疑いだけでは停止命令にも外部記録にもならない。'}]},
    GO04:{eyebrow:'NEXT LOOP / PAINTED SPACE',question:'描かれた部屋へ戻る前に、何を足場の条件として確かめるか。',evidence:'loop_plan_go04',correct:'read-surface',options:[
      {id:'trust-memory',title:'前の部屋を記憶どおり進む',body:'一度歩いた経路を同じ順番で再現する。',feedback:'死亡による復帰では作品層も人物関係も同じ状態とは限らない。'},
      {id:'read-surface',title:'線・影・床板を現在の足場にする',body:'見える輪郭を照合し、描かれている範囲だけを歩く。',carry:'床板、影、鉛筆線を確認し、描かれている範囲だけを現在の足場として扱う。'},
      {id:'reach-window',title:'窓の外へ最短で抜ける',body:'奥行きが見える方向を出口として使う。',feedback:'景色として見えることと、物理的な足場が存在することは別。'}]},
    GO26:{eyebrow:'FINAL LOOP / MISSING CONDITIONS',question:'一度救えた夜で、なお現在の記録から欠けていたものは何か。',evidence:'loop_plan_go26',correct:'close-four',options:[
      {id:'repeat-rescue',title:'前周回の救助手順をそのまま繰り返す',body:'成功した順番を正確に再現する。',feedback:'同じ救助だけでは、澄の曝露と削除予約と外部受領が未確定のまま残る。'},
      {id:'close-four',title:'役割・曝露・削除・受領を同時に閉じる',body:'一人で抱えず、四つの未確定条件を現在証拠へ変える。',carry:'役割分担、煙曝露、3時42分の削除、外部受領を現在の証拠で同時に閉じる。'},
      {id:'work-alone',title:'未来を知る澄が全作業を担当する',body:'説明の時間を省き、先回りして処理する。',feedback:'未来を知ることは、設備権限や立会いの専門性を代替しない。'}]}
  };

  const CASE_FOCUS = {
    PROLOGUE:{question:'目録にない第四版は、何でできているのか。',goal:'作品、設備、人物の利害を分け、最初の調査記録を成立させる。',rule:'見えた異常と、その意味づけを同じ欄へ書かない。'},
    'ACT 1':{question:'描かれた空間では、何を実在する足場として扱えるか。',goal:'床線、影、輪郭から、現在の作品層で成立する移動条件を確認する。',rule:'未来の記憶は進む方向を示すが、現在の線を上書きしない。'},
    'ACT 2':{question:'同じ部屋を望む二人は、同じ時間を想定していたのか。',goal:'椅子、費用、荷物、予定を比較し、関係を一つの感情へまとめない。',rule:'人物の印象より、同じ場面に残る物証の食い違いを先に置く。'},
    'ACT 3':{question:'同じ顔と構図を、同じ状態として扱ってよいか。',goal:'1888年と1889年の制作判断を分け、失われた関係を現在へ強制しない。',rule:'過去に成立した関係は、別の作品層の本人に対する証拠ではない。'},
    'ACT 4':{question:'1948年の再構成は、偽造ではなく何を残す作業だったのか。',goal:'材料不足と記録精度を分け、マルタの目的と工程を資料関係から復元する。',rule:'作者名だけでなく、目的、工程、関連資料の結び付きを保存する。'},
    'ACT 5':{question:'秘密の傑作という物語は、いつ、どの資料から作られたのか。',goal:'購入票と来歴草稿を分類し、本物の移管記録まで偽造と一括しない。',rule:'紙の古さ、文書の作成年代、書かれた内容を別々に検証する。'},
    'ACT 6':{question:'知っている未来を使わず、現在の証拠で全員を動かせるか。',goal:'人命、作品、原本、外部記録を役割分担と共同署名へ接続する。',rule:'完全な報告は、一人の確信ではなく、現在確認できる責任範囲の連鎖で作る。'},
    ENDING:{question:'発見した履歴を、どの言葉で未来へ残すか。',goal:'確定事実、未確認事項、保存・公開判断を分けた報告を選ぶ。',rule:'書かなかったことも、制度上は一つの判断として残る。'}
  };

  const LAYER_MAP = [
    {id:'present',period:'現在',title:'研究所と第四版',chapters:['PROLOGUE','ACT 1','ACT 5','ACT 6','ENDING'],evidence:['dossier','pressure_drop','current_reacquired','role_claire','role_marc','role_leon'],question:'今ここで確認できる物証と責任範囲は何か。',accent:'#8ca7bd'},
    {id:'1888',period:'1888',title:'最初の《寝室》',chapters:['ACT 2'],evidence:['chair_line','unfinished_floor','one_week_agreement','two_chairs_separated'],question:'描かれた空間と二人の生活は、何を実在させていたか。',accent:'#d5a861'},
    {id:'1889',period:'1889',title:'描き直された部屋',chapters:['ACT 3'],evidence:['vincent_1889','different_support','three_purposes','absence_recorded'],question:'同じ顔と構図を、同じ状態として扱ってよいか。',accent:'#8299b1'},
    {id:'1948',period:'1948',title:'マルタの比較再構成',chapters:['ACT 4'],evidence:['marta_identity','reconstruction_base','marta_full_signature','marta_not_forger'],question:'不足した材料の中で、何を正確に残そうとしたのか。',accent:'#a78da9'},
    {id:'1967',period:'1967',title:'アンドレの加筆と来歴',chapters:['ACT 5'],evidence:['andre_entry','fake_provenance_drafts','purchase_ticket','andre_private_letter'],question:'作品へ足された物語は、どの資料操作から生まれたか。',accent:'#aa8065'},
    {id:'memory',period:'未来の残像',title:'証拠にならない記憶',chapters:[],evidence:['altered_words','body_memory_split','successful_loop_loss','loop_plan_go01','loop_plan_go04','loop_plan_go26'],question:'この記憶を、現在のどこを調べる索引へ変えるか。',accent:'#74768f',memory:true}
  ];

  const CHAPTER_BRIEFING_CHAPTERS = new Set(['ACT 2','ACT 3','ACT 4','ACT 5','ACT 6','ENDING']);

  const ENDING_ARCHIVE_ORDER = ['bad1','bad2','bad3','normal','true'];


  const CHAPTER_ART = {
    PROLOGUE:'assets/chapter-art/prologue.webp',
    'ACT 1':'assets/chapter-art/act1.webp',
    'ACT 2':'assets/chapter-art/act2.webp',
    'ACT 3':'assets/chapter-art/act3.webp',
    'ACT 4':'assets/chapter-art/act4.webp',
    'ACT 5':'assets/chapter-art/act5.webp',
    'ACT 6':'assets/chapter-art/act6.webp',
    ENDING:'assets/chapter-art/ending.webp'
  };
  const ENDING_ART = {
    early:'assets/ending-thumbs/normal.webp', bad1:'assets/ending-thumbs/bad1.webp', bad2:'assets/ending-thumbs/bad2.webp',
    bad3:'assets/ending-thumbs/bad3.webp', normal:'assets/ending-thumbs/normal.webp', true:'assets/ending-thumbs/true.webp'
  };
  const SEMANTIC_OVERLAY_ASSETS = {
    burden:'assets/semantic-overlays/burden.webp', closure:'assets/semantic-overlays/closure.webp', leak:'assets/semantic-overlays/leak.webp',
    memory:'assets/semantic-overlays/memory.webp', painted:'assets/semantic-overlays/painted.webp', provenance:'assets/semantic-overlays/provenance.webp',
    dawn:'assets/semantic-overlays/dawn.webp', evidence:'assets/semantic-overlays/evidence.webp'
  };

  const PUZZLE_BLUEPRINTS = {
    vR6: {
      kind: 'board', theme: 'composition', eyebrow: 'SPATIAL RECONSTRUCTION',
      instruction: '部屋の輪郭が消える前に、痕跡と一致する位置を一つずつ確定する。',
      items: {
        chair: ['椅子の影', '床の鉛筆線と脚の影を重ねる'],
        door: ['扉の境界', '描かれた輪郭が最も安定する状態'],
        bed: ['床板の間隔', '壁際の影ではなく板目を基準にする']
      }
    },
    a226: {
      kind: 'board', theme: 'room', eyebrow: 'ROOM PREPARATION',
      instruction: '歓迎の演出ではなく、相手が一晩生活できる条件を部屋へ置く。',
      items: {
        sunflowers: ['壁面', '制作環境を見せるが、正面から圧迫しない'],
        chair: ['椅子', '作業と休息のどちらにも固定しすぎない'],
        expenses: ['費用メモ', '隠さず、相手が自分で判断できる場所へ'],
        schedule: ['予定表', '約束ではなく、話し合うためのたたき台']
      }
    },
    a233: {
      kind: 'board', theme: 'schedule', eyebrow: 'SEVEN-DAY AGREEMENT',
      instruction: '永遠の共同体ではなく、明日から七日間だけ続けられる生活手順を組む。',
      items: {
        breakfast: ['朝', '最初の負担を誰が引き受けるか'],
        shopping: ['昼前', '外出の負担を固定せず回す'],
        morning: ['制作時間', '互いの集中を守る距離'],
        critique: ['夕食後', '作品を見る時間を制作中から分ける'],
        money: ['週末', '費用を曖昧な善意へ戻さない']
      }
    },
    a271: {
      kind: 'board', theme: 'roles', eyebrow: 'COLLAPSE RESPONSE',
      instruction: '未来の記憶ではなく、三人が今持つ技能と物理条件で役割を割り当てる。',
      items: {
        gauguin: ['ゴーギャン', '光と画面の見え方を読む'],
        sumi: ['水瀬澄', '現在層と後加筆を見分ける'],
        vincent: ['フィンセント', '描かれた部屋の構造を知る']
      }
    },
    a311: {
      kind: 'board', theme: 'gallery', eyebrow: 'THREE-WORK REGISTER',
      instruction: '優劣を付けず、各作品の制作時期・用途・現在状態を個別の登録票へ記す。',
      items: {
        first: ['1888年第1版', '最初に描かれ、後に水損した油彩'],
        second: ['1889年同寸版', '同じ寸法でも支持体と材料が異なる'],
        third: ['家族向け小型版', '掛ける場所と受け手に合わせた作品'],
        color: ['現在の壁色', '制作意図と経年後の見え方を分ける']
      }
    },
    a410: {
      kind: 'board', theme: 'layers', eyebrow: '1948 CONSERVATION RECORD',
      instruction: '正解を一つへ統合せず、比較線・色候補・署名・工程写真を別々に保存する。',
      items: {
        line: ['家具比較線', '三版の差異を消さずに残す'],
        purple: ['紫色候補', '記述・現状・変色可能性を分離'],
        signature: ['作者と目的', '表面の帰属ではなく裏面記録として残す'],
        photos: ['工程写真', '完成像だけでなく前後関係を連番化']
      }
    },
    a508: {
      kind: 'sort', theme: 'provenance', eyebrow: 'PROVENANCE DISASSEMBLY',
      instruction: '来歴文を一文の物語として読まず、根拠の種類ごとに資料カードを分ける。',
      categories: [
        ['fact', '物証で確認', '原本・帳簿・現物で現在確認できる'],
        ['claim', '証言のみ', '語られているが裏付けがない'],
        ['inference', '見え方からの推測', '形や印象から導いた仮説'],
        ['promo', '宣伝表現', '関心や価格を高めるための言葉']
      ],
      items: [
        ['purchase', '資料庫からの購入票', 'fact'],
        ['sealed', '家族が秘密に封印', 'claim'],
        ['weapon', '床下の武器', 'inference'],
        ['masterpiece', '死を予告した傑作', 'promo']
      ]
    },
    a526: {
      kind: 'board', theme: 'emergency', eyebrow: 'EMERGENCY SEQUENCE',
      instruction: '時刻・担当・外部保存を一つの手順へ結び、人命と資料を同時に守る。',
      items: {
        cooling: ['01 冷却第二系統', '過熱が始まる前に停止時刻を置く'],
        power: ['02 主電源', '発火後ではなく作業前に切断'],
        people: ['03 設備担当', '単独作業を避け、権限を持つ立会人と組む'],
        data: ['04 異常データ', '施設内だけでなく外部受領へつなぐ'],
        originals: ['05 原本箱', '所有者が退避動線で携行する']
      }
    },
    a605: {
      kind: 'board', theme: 'reacquisition', eyebrow: 'CURRENT-EVIDENCE MATRIX',
      instruction: '消えた周回の記憶を結論に使わず、今夜もう一度取得できる物証と立会いへ置き換える。',
      items: {
        cooling: ['冷却低下', '現在の計器・校正票・水滴を結ぶ'],
        marta: ['マルタ署名', '裏面写真・乾板・購入票を再取得'],
        andre: ['アンドレ加筆', '塗膜・私信・加筆前乾板を照合'],
        cleanup: ['自動削除', '発生前に予約タスクを現在時刻で確認'],
        body: ['澄の身体', '曝露時間と代替担当を手順へ含める']
      }
    },
    a614: {
      kind: 'sort', theme: 'chronology', eyebrow: 'LAYER ATTRIBUTION',
      instruction: '似ている形を一つへまとめず、由来と年代の異なる四層へ物質を戻す。',
      categories: [
        ['gogh', 'ゴッホ由来構図', '1888–1889年の部屋構造'],
        ['marta', 'マルタ再構成', '1948年の比較研究層'],
        ['andre', 'アンドレ加筆', '1967年の物語化された層'],
        ['age', '経年変化', '現在までの変色・損傷状態']
      ],
      items: [
        ['bed', '黄色いベッドと二脚', 'gogh'],
        ['grid', '方眼と比較紫', 'marta'],
        ['chair3', '三脚目と鍵穴', 'andre'],
        ['blue', '現在青く見える壁', 'age']
      ]
    },
    a621: {
      kind: 'sort', theme: 'report', eyebrow: 'REPORT DESK',
      instruction: '報告書の各文を、確定事実・未確定・価値判断の三列へ分ける。',
      categories: [
        ['fact', '確定した事実', '現在の物証と手順で確認できる'],
        ['unknown', '未確定', '判断材料が足りず断定できない'],
        ['value', '価値判断', '保存・公開・処置として提案する判断']
      ],
      items: [
        ['authorship', 'ゴッホ真筆を示す材料はない', 'fact'],
        ['motive', 'マルタが将来の展示を望んだか', 'unknown'],
        ['andre', '第三の椅子は1967年加筆', 'fact'],
        ['study', '受容史資料として保存する価値', 'value'],
        ['purple', '1948年に選ばれた紫が唯一の正解か', 'unknown'],
        ['treatment', '加筆は可逆的に露出し履歴を残す', 'value']
      ]
    }
  };

  const $ = sel => document.querySelector(sel);
  const els = {
    title: $('#title-screen'), premonition: $('#premonition-screen'), game: $('#game-screen'), gameover: $('#gameover-screen'), ending: $('#ending-screen'),
    scene: $('#scene'), paintingStage: $('#painting-stage'), characterLayer: $('#character-layer'), hotspotLayer: $('#hotspot-layer'), eventCg: $('#event-cg-layer'), eventCgImage: $('#event-cg-image'), semanticLayer: $('#semantic-layer'),
    dialogue: $('#dialogue-panel'), speaker: $('#speaker-name'), emotion: $('#emotion-label'), text: $('#dialogue-text'), readStatus: $('#read-status'),
    choices: $('#choice-panel'), inv: $('#investigation-panel'), invTitle: $('#investigation-title'), invProgress: $('#investigation-progress'), invFinish: $('#finish-investigation'),
    chapter: $('#chapter-label'), location: $('#location-label'), time: $('#time-label'), loop: $('#loop-label'), toast: $('#toast'),
    progressLabel: $('#progress-label'), progressFill: $('#story-progress-fill'),
    audioToggle: $('#audio-toggle'), autoToggle: $('#auto-toggle'), skipToggle: $('#skip-toggle'), uiToggle: $('#ui-toggle'), restoreUi: $('#restore-ui'),
    gameoverTitle: $('#gameover-title'), gameoverBody: $('#gameover-body'), deathCounter: $('#death-counter'), returnButton: $('#return-button'),
    endingSummary: $('#ending-summary'), endingStats: $('#ending-stats'), endingImage: $('#ending-image'), continue: $('#continue-game'),
    chapterCard: $('#chapter-card'), chapterCardKicker: $('#chapter-card-kicker'), chapterCardTitle: $('#chapter-card-title'), chapterCardSubtitle: $('#chapter-card-subtitle'),
    placeCard: $('#place-card'), placeCardLocation: $('#place-card-location'), placeCardTime: $('#place-card-time'),
    beatCard: $('#beat-card'), beatCardText: $('#beat-card-text'),
    invHint: $('#investigation-hint'), playtestSummary: $('#playtest-summary'),
    menuStatus: $('#menu-status'),
    transition: $('#cinematic-transition'), saveIndicator: $('#save-indicator'),
    systemStatus: $('#system-status'), systemStatusLabel: $('#system-status-label'), systemStatusValue: $('#system-status-value'),
    systemStatusUnit: $('#system-status-unit'), systemStatusFill: $('#system-status-fill'), systemStatusNote: $('#system-status-note'),
    emergencyDoor: $('#emergency-door'), smokeLayer: $('#smoke-layer'), actionCutIn: $('#action-cut-in'), memoryDelta: $('#memory-delta'), srStatus: $('#screen-reader-status'),
    environmentLayer: $('#environment-layer'), observationTrace: $('#observation-trace'), focusToggle: $('#focus-toggle'), insightPanel: $('#insight-panel'),
    caseFocus: $('#case-focus'), caseFocusToggle: $('#case-focus-toggle'), layerMap: $('#layer-map'), layerMapToggle: $('#layer-map-toggle'), layerMapContent: $('#layer-map-content'), archiveContent: $('#archive-content'), reconsiderReport: $('#reconsider-report'),
    resumeDialog: $('#resume-dialog'), resumeBriefing: $('#resume-briefing'), chapterBriefingDialog: $('#chapter-briefing-dialog'), chapterBriefingContent: $('#chapter-briefing-content')
  };

  const defaultSettings = () => ({
    speed: 12,
    autoDelay: 1050,
    fontSize: 18,
    lineHeight: 19,
    panelOpacity: 90,
    reduceMotion: false,
    ambient: true,
    ambientVolume: 65,
    musicVolume: 28,
    sfxVolume: 70,
    highContrast: false,
    skipReadOnly: true,
    assistMode: 'standard',
    chapterBriefings: true
  });

  const defaultMetrics = () => ({
    startedAt: Date.now(),
    lastNodeAt: Date.now(),
    nodeVisits: {},
    choiceSelections: {},
    investigation: {},
    puzzleAttempts: {},
    deathsById: {},
    chapterMs: {},
    loopPlanAttempts: {},
    hintsUsed: 0,
    resumeBriefings: 0,
    layerMapViews: 0,
    chapterBriefingsShown: 0,
    chapterStops: 0,
    exportedAt: null
  });

  const defaultState = () => ({
    nodeId: 'p01',
    loop: 1,
    paintingLoop: 0,
    flags: {},
    evidence: [],
    visited: [],
    readNodes: {},
    readSegments: {},
    segmentIndex: 0,
    log: [],
    deaths: 0,
    currentChapter: 'PROLOGUE',
    currentLocation: '—',
    currentTime: '—',
    paintingRevealed: false,
    settings: defaultSettings(),
    judgement: {evidence:0,safety:0,collaboration:0,preservation:0,disclosure:0},
    choiceHistory: [],
    environmentDetails: [],
    sceneInsights: [],
    insightChallenges: [],
    loopPlans: {},
    chapterBriefingsSeen: {},
    playStartedAt: Date.now(),
    totalPlayMs: 0,
    metrics: defaultMetrics(),
    saveVersion: RELEASE_VERSION
  });

  let state = defaultState();
  let profile = loadProfile();
  let node = null;
  let typingTimer = null;
  let typingDone = true;
  let fullText = '';
  let invState = null;
  let pendingEvidenceToast = null;
  let toastTimer = null;
  let autoTimer = null;
  let chapterTimer = null;
  let placeTimer = null;
  let beatTimer = null;
  let hintTimer = null;
  let audio = null;
  let autoMode = false;
  let skipMode = false;
  let uiHidden = false;
  let currentWasRead = false;
  let lastSceneBg = '';
  let afterTextRanFor = null;
  let currentScript = [];
  let currentSegment = null;
  let segmentIndex = 0;
  let transitionTimer = null;
  let saveIndicatorTimer = null;
  let lastAutoIndicatorAt = 0;
  let previousLogCursor = -1;
  let notebookView = 'all';
  let spectralState = null;
  let previousSystemValue = null;
  let focusMode = false;
  let previousTension = 0;
  let observationTraceTimer = null;
  let observationHideTimer = null;
  let caseFocusOpen = false;
  let caseFocusPulseTimer = null;
  let layerMapOpen = false;
  let pendingResumeState = null;
  let pendingChapterBriefing = null;

  function normalizeState(saved) {
    const base = defaultState();
    const normalized = {
      ...base,
      ...(saved || {}),
      settings: {...base.settings, ...((saved && saved.settings) || {})},
      flags: {...((saved && saved.flags) || {})},
      judgement: {...base.judgement, ...((saved && saved.judgement) || {})},
      choiceHistory: Array.isArray(saved?.choiceHistory) ? [...saved.choiceHistory] : [],
      environmentDetails: Array.isArray(saved?.environmentDetails) ? [...saved.environmentDetails] : [],
      sceneInsights: Array.isArray(saved?.sceneInsights) ? [...saved.sceneInsights] : [],
      insightChallenges: Array.isArray(saved?.insightChallenges) ? [...saved.insightChallenges] : [],
      loopPlans: {...((saved && saved.loopPlans) || {})},
      chapterBriefingsSeen: {...((saved && saved.chapterBriefingsSeen) || {})},
      readNodes: {...((saved && saved.readNodes) || {})},
      readSegments: {...((saved && saved.readSegments) || {})},
      metrics: {...base.metrics, ...((saved && saved.metrics) || {}),
        nodeVisits: {...(((saved && saved.metrics) || {}).nodeVisits || {})},
        choiceSelections: {...(((saved && saved.metrics) || {}).choiceSelections || {})},
        investigation: {...(((saved && saved.metrics) || {}).investigation || {})},
        puzzleAttempts: {...(((saved && saved.metrics) || {}).puzzleAttempts || {})},
        deathsById: {...(((saved && saved.metrics) || {}).deathsById || {})},
        loopPlanAttempts: {...(((saved && saved.metrics) || {}).loopPlanAttempts || {})},
        chapterMs: {...(((saved && saved.metrics) || {}).chapterMs || {})}}
    };
    if (!Object.keys(normalized.readNodes).length && Array.isArray(normalized.visited)) {
      normalized.visited.forEach(id => { normalized.readNodes[id] = true; });
    }
    normalized.playStartedAt = Date.now();
    normalized.metrics.lastNodeAt = Date.now();
    normalized.saveVersion = RELEASE_VERSION;
    return normalized;
  }

  function legacyKey(name) {
    const suffix = name === 'auto' ? 'autosave' : name;
    return `${LEGACY_SAVE_PREFIX}-${suffix}`;
  }

  function migrateLegacySaves() {
    const names = ['auto','slot1','slot2','slot3'];
    for (const name of names) {
      try {
        if (!localStorage.getItem(SAVE_KEYS[name]) && localStorage.getItem(legacyKey(name))) {
          const parsed = JSON.parse(localStorage.getItem(legacyKey(name)));
          localStorage.setItem(SAVE_KEYS[name], JSON.stringify(normalizeState(parsed)));
        }
      } catch (e) { console.warn('legacy save migration failed', name, e); }
    }
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function validSaveShape(saved) {
    return !!saved && typeof saved === 'object' && typeof saved.nodeId === 'string' && nodes.has(saved.nodeId) &&
      Array.isArray(saved.evidence) && Array.isArray(saved.visited) && typeof saved.flags === 'object';
  }

  function readSave(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      let payload = parsed;
      if (parsed?.format && COMPATIBLE_SAVE_FORMATS.has(parsed.format)) {
        const json = JSON.stringify(parsed.payload);
        if (parsed.checksum !== hashString(json)) throw new Error('save checksum mismatch');
        payload = parsed.payload;
      }
      if (!validSaveShape(payload)) throw new Error('invalid save structure');
      return normalizeState(payload);
    } catch (e) {
      console.warn('save load failed', key, e);
      try {
        const raw = localStorage.getItem(key);
        if (raw) localStorage.setItem(`${key}-recovery-${Date.now()}`, raw);
        localStorage.removeItem(key);
      } catch (_) {}
      return null;
    }
  }

  function snapshotState() {
    state.totalPlayMs += Date.now() - state.playStartedAt;
    state.playStartedAt = Date.now();
    return JSON.parse(JSON.stringify(state));
  }

  function showSaveIndicator(force = false) {
    if (!els.saveIndicator) return;
    const now = Date.now();
    if (!force && now - lastAutoIndicatorAt < 5000) return;
    lastAutoIndicatorAt = now;
    clearTimeout(saveIndicatorTimer);
    els.saveIndicator.classList.add('visible');
    saveIndicatorTimer = setTimeout(() => els.saveIndicator.classList.remove('visible'), state.settings.reduceMotion ? 500 : 1250);
  }

  function writeSave(key, manual = false) {
    try {
      const payload = snapshotState();
      const payloadJson = JSON.stringify(payload);
      localStorage.setItem(key, JSON.stringify({format:SAVE_FORMAT, version:RELEASE_VERSION, checksum:hashString(payloadJson), payload}));
      updateContinueState();
      showSaveIndicator(manual);
      if (manual) {
        audio?.sfx('save');
        showToast('現在の記録を保存しました。');
      }
      renderSaveSlots();
      return true;
    } catch (e) {
      if (manual) showToast('保存に失敗しました。');
      return false;
    }
  }

  function saveGame(manual = false, key = SAVE_KEYS.auto) {
    return writeSave(key, manual);
  }

  function deleteSave(key) {
    try { localStorage.removeItem(key); } catch (_) {}
    updateContinueState();
    renderSaveSlots();
  }

  function allSaves() {
    return Object.fromEntries(Object.entries(SAVE_KEYS).map(([name, key]) => [name, readSave(key)]));
  }

  function latestSave() {
    const saves = Object.values(allSaves()).filter(Boolean);
    saves.sort((a, b) => (b.savedAt || b.playStartedAt || 0) - (a.savedAt || a.playStartedAt || 0));
    return saves[0] || null;
  }


  function defaultProfile() {
    return {version:1, unlockedEndings:{}, endingRuns:0, firstCompletedAt:null, lastCompletedAt:null};
  }

  function loadProfile() {
    try { return {...defaultProfile(), ...(JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') || {})}; }
    catch (_) { return defaultProfile(); }
  }

  function saveProfile() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (_) {}
  }

  function unlockEnding(kind) {
    const key = kind === 'early' ? 'early' : kind;
    profile.unlockedEndings ||= {};
    profile.unlockedEndings[key] = {
      at: Date.now(), deaths: state.deaths, evidence: state.evidence.length,
      judgement: {...state.judgement}, relationships: relationshipProfiles()
    };
    profile.endingRuns = Number(profile.endingRuns || 0) + 1;
    profile.firstCompletedAt ||= Date.now(); profile.lastCompletedAt = Date.now();
    saveProfile(); updateArchiveButton();
  }

  function updateArchiveButton() {
    const button = $('#title-archive');
    const count = ENDING_ARCHIVE_ORDER.filter(k => profile.unlockedEndings?.[k]).length;
    button?.classList.toggle('hidden', count === 0);
    if (button) button.textContent = `結末記録 ${count}/5`;
  }

  function renderEndingArchive() {
    if (!els.archiveContent) return;
    const unlocked = profile.unlockedEndings || {};
    const count = ENDING_ARCHIVE_ORDER.filter(k => unlocked[k]).length;
    const cards = ENDING_ARCHIVE_ORDER.map((kind,index) => {
      const record = unlocked[kind]; const info = DATA.endings?.[kind];
      if (!record || !info) return `<article class="archive-card locked"><span>${String(index+1).padStart(2,'0')}</span><div class="archive-thumb locked-thumb"></div><div><strong>未確認の結末</strong><p>別の報告の行方は、まだ記録されていない。</p></div></article>`;
      const date = new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(record.at);
      const art = ENDING_ART[kind] || ENDING_ART.normal;
      return `<article class="archive-card unlocked kind-${kind}"><span>${String(index+1).padStart(2,'0')}</span><img class="archive-thumb" src="${art}" alt="" decoding="async"><div><em>${escapeHtml(info.eyebrow)}</em><strong>${escapeHtml(info.title)}</strong><p>${escapeHtml(info.summary)}</p><small>${escapeHtml(date)} · ${record.deaths}死亡 · ${record.evidence}記録</small></div></article>`;
    }).join('');
    const early = unlocked.early ? '<p class="archive-side-record">SIDE RECORD — 調査を見送った夜も記録されています。</p>' : '';
    els.archiveContent.innerHTML = `<div class="archive-progress"><div><span>REPORT OUTCOMES</span><strong>${count} / 5</strong></div><i><b style="width:${count*20}%"></b></i></div><div class="archive-grid">${cards}</div>${early}`;
  }

  function updateContinueState() {
    const any = Object.values(SAVE_KEYS).some(key => {
      try { return !!localStorage.getItem(key); } catch (_) { return false; }
    });
    els.continue.disabled = !any;
    updateArchiveButton();
  }

  function clearAllSaves() {
    Object.values(SAVE_KEYS).forEach(key => { try { localStorage.removeItem(key); } catch (_) {} });
    updateContinueState();
  }

  function formatPlaytime(ms) {
    const minutes = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}時間${String(m).padStart(2, '0')}分` : `${m}分`;
  }

  function saveMetadata(saved) {
    if (!saved) return null;
    const nodeData = nodes.get(saved.nodeId);
    const stamp = saved.savedAt || saved.playStartedAt || Date.now();
    return {
      chapter: saved.currentChapter || nodeData?.chapter || '—',
      location: saved.currentLocation || nodeData?.location || '—',
      time: saved.currentTime || nodeData?.time || '—',
      deaths: saved.deaths || 0,
      play: formatPlaytime(saved.totalPlayMs || 0),
      stamp: new Intl.DateTimeFormat('ja-JP', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}).format(stamp)
    };
  }

  function applySettings() {
    const s = state.settings;
    document.documentElement.style.setProperty('--font-size', `${s.fontSize}px`);
    document.documentElement.style.setProperty('--dialogue-line-height', `${s.lineHeight / 10}`);
    document.documentElement.style.setProperty('--panel-opacity', `${s.panelOpacity / 100}`);
    document.body.classList.toggle('reduce-motion', s.reduceMotion);
    document.body.classList.toggle('high-contrast', s.highContrast);

    const inputs = {
      '#text-speed': s.speed,
      '#auto-delay': s.autoDelay,
      '#font-size': s.fontSize,
      '#line-height': s.lineHeight,
      '#panel-opacity': s.panelOpacity,
      '#ambient-volume': s.ambientVolume,
      '#music-volume': s.musicVolume,
      '#sfx-volume': s.sfxVolume
    };
    Object.entries(inputs).forEach(([selector, value]) => { const el = $(selector); if (el) el.value = value; });
    $('#reduce-motion').checked = s.reduceMotion;
    $('#ambient-enabled').checked = s.ambient;
    $('#high-contrast').checked = s.highContrast;
    $('#skip-read-only').checked = s.skipReadOnly;
    if ($('#chapter-briefings')) $('#chapter-briefings').checked = s.chapterBriefings !== false;
    if ($('#assist-mode')) $('#assist-mode').value = s.assistMode || 'standard';
    if (audio) {
      audio.enabled = s.ambient;
      audio.ambientVolume = s.ambientVolume / 100;
      audio.musicVolume = s.musicVolume / 100;
      audio.sfxVolume = s.sfxVolume / 100;
      audio.refreshVolume();
    }
    updateModeButtons();
  }

  class AudioSystem {
    constructor() {
      this.enabled = true;
      this.ambientVolume = .65;
      this.musicVolume = .28;
      this.sfxVolume = .7;
      this.dialogueDuck = {ambient:1,score:1};
      this.current = '';
      this.scoreName = '';
      this.ambientTrack = null;
      this.scoreTrack = null;
      this.fadeTokens = {ambient: 0, score: 0};
      this.preloadedSfx = new Map();
      this.ctx = null;
      this.assetRoot = 'assets/audio';
      this.ambientMap = {
        train:'train', trainQuiet:'train',
        summer:'arles-night', summerNight:'arles-night', arlesNight:'arles-night', arlesRoom:'arles-night', yellowHouseQuiet:'arles-night', dinner:'arles-night', saintRemyMorning:'arles-night', gardenLoop:'arles-night', roomTension:'arles-night',
        rain:'rain', rainWorkshop:'rain',
        stoneHall:'institute', hum:'institute', room:'institute', quiet:'institute', institutionalLow:'institute', reportRoom:'institute',
        cooling:'lab', preEmergency:'lab', paintRoom:'lab', lab:'lab', machine:'lab', controlledShutdown:'lab', countdown:'lab', finalNight:'lab', sharedPlan:'lab',
        scanner:'scanner', scannerLow:'scanner', photoPlate:'scanner', paperGrid:'scanner',
        blackout:'void', memory:'void', portal:'void', void:'void', lowTone:'void', delayedPoison:'void', deferral:'void', erasure:'void',
        fire:'fire', electric:'fire', crumble:'fire', overheatForecast:'fire', smokeExposure:'fire', controlledFire:'fire',
        warehouse:'warehouse', solventWarehouse:'warehouse', additionRoom:'warehouse',
        archivePaper:'archive', typewriterRoom:'archive', rationedWarmth:'archive',
        dawnQuiet:'dawn', falseRelief:'dawn',
        museumQuiet:'gallery', finalPainting:'gallery', spectacle:'gallery'
      };
      this.fileSfx = new Set(['advance','choice','evidence','save','error','death','chapter','door','paper','powerdown','heartbeat','layerShift','typewriter','stamp','bell','hash']);
    }
    init() {
      if (this.initialized) return;
      this.initialized = true;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        try { this.ctx = new Ctx(); } catch (_) { this.ctx = null; }
      }
      ['advance','choice','evidence','save','error'].forEach(name => {
        const a = new Audio(`${this.assetRoot}/sfx/${name}.wav`);
        a.preload = 'auto'; a.playsInline = true;
        this.preloadedSfx.set(name,a);
      });
    }
    resume() {
      this.init();
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    }
    createTrack(url, loop=true) {
      const a = new Audio(url);
      a.preload = 'auto'; a.loop = loop; a.playsInline = true;
      a.crossOrigin = 'anonymous';
      return a;
    }
    targetVolume(kind) {
      if (!this.enabled) return 0;
      return kind === 'ambient' ? .43 * this.ambientVolume * this.dialogueDuck.ambient : .34 * this.musicVolume * this.dialogueDuck.score;
    }
    fade(track, kind, to, duration=900, stopAfter=false) {
      if (!track) return;
      const token = ++this.fadeTokens[kind];
      const from = Number.isFinite(track.volume) ? track.volume : 0;
      const start = performance.now();
      const step = now => {
        if (token !== this.fadeTokens[kind]) return;
        const p = Math.min(1,(now-start)/duration);
        const eased = p*p*(3-2*p);
        track.volume = Math.max(0,Math.min(1,from+(to-from)*eased));
        if (p < 1) requestAnimationFrame(step);
        else if (stopAfter) { try { track.pause(); track.currentTime=0; } catch (_) {} }
      };
      requestAnimationFrame(step);
    }
    playLayer(kind, name, url) {
      const prop = kind === 'ambient' ? 'ambientTrack' : 'scoreTrack';
      const old = this[prop];
      if (old?.dataset?.track === name) { this.fade(old,kind,this.targetVolume(kind),260); return; }
      const next = this.createTrack(url,true);
      next.dataset.track = name; next.volume = 0;
      this[prop] = next;
      const playResult = next.play();
      if (playResult?.catch) playResult.catch(() => {});
      this.fade(next,kind,this.targetVolume(kind),1100);
      if (old) {
        // Separate token so the new fade is not cancelled by the outgoing fade.
        const from=old.volume, start=performance.now();
        const fadeOut=now=>{
          const p=Math.min(1,(now-start)/850), e=p*p*(3-2*p);
          old.volume=Math.max(0,from*(1-e));
          if(p<1) requestAnimationFrame(fadeOut); else { try{old.pause();old.currentTime=0;}catch(_){} }
        };
        requestAnimationFrame(fadeOut);
      }
    }
    stopAmbient() {
      this.current = '';
      if (this.ambientTrack) { this.fade(this.ambientTrack,'ambient',0,500,true); this.ambientTrack=null; }
    }
    stopScore() {
      this.scoreName = '';
      if (this.scoreTrack) { this.fade(this.scoreTrack,'score',0,650,true); this.scoreTrack=null; }
    }
    refreshVolume() {
      if (this.ambientTrack) this.fade(this.ambientTrack,'ambient',this.targetVolume('ambient'),180);
      if (this.scoreTrack) this.fade(this.scoreTrack,'score',this.targetVolume('score'),220);
    }
    set(type) {
      if (!this.enabled || !type) { this.stopAmbient(); return; }
      this.resume();
      const mapped = this.ambientMap[type] || 'institute';
      if (this.current === type && this.ambientTrack) { this.refreshVolume(); return; }
      this.current = type;
      this.playLayer('ambient',mapped,`${this.assetRoot}/ambient/${mapped}.mp3`);
    }
    setScore(name) {
      if (!this.enabled || !name || name === 'silence') { this.stopScore(); return; }
      this.resume();
      if (this.scoreName === name && this.scoreTrack) { this.refreshVolume(); return; }
      this.scoreName = name;
      const mapped = ['modern','arles','saint','marta','forgery','final','danger','memory'].includes(name) ? name : 'modern';
      this.playLayer('score',mapped,`${this.assetRoot}/music/${mapped}.mp3`);
    }

    setDialogueMode(mode='dialogue', danger=false) {
      const map = {
        dialogue:{ambient:.82,score:.72}, thought:{ambient:.88,score:.60}, narration:{ambient:.92,score:.76},
        document:{ambient:.72,score:.48}, system:{ambient:.62,score:.42}, interaction:{ambient:1,score:.90}
      };
      const next = {...(map[mode] || map.dialogue)};
      if (danger) { next.ambient *= .82; next.score *= .70; }
      this.dialogueDuck = next;
      this.refreshVolume();
    }
    worldCue(kind='detail', pan=0) {
      this.resume();
      if (!this.ctx || this.sfxVolume <= 0) { this.sfx('evidence'); return; }
      const ctx=this.ctx, master=ctx.createGain(), panner=ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      master.gain.value=.065*this.sfxVolume;
      if (panner) { panner.pan.value=Math.max(-1,Math.min(1,pan)); master.connect(panner).connect(ctx.destination); }
      else master.connect(ctx.destination);
      const palette={dossier:[520,760],meal:[360,510],boxes:[110,170],drip:[720,430],scratch:[980,640],wheel:[95,145],echo:[310,620],table:[260,390],luggage:[130,210],swatches:[580,820],cloth:[240,330],typewriter:[690,430],timer:[880,880],wetfloor:[420,280],label:[610,910]};
      const freqs=palette[kind]||[480,720];
      freqs.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i?'sine':'triangle';o.frequency.value=f;g.gain.setValueAtTime(.18/(i+1),ctx.currentTime+i*.07);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.26+i*.08);o.connect(g).connect(master);o.start(ctx.currentTime+i*.07);o.stop(ctx.currentTime+.34+i*.08);});
      setTimeout(()=>{try{master.disconnect();}catch(_){}},900);
    }
    playFileSfx(type) {
      const cached = this.preloadedSfx.get(type);
      const a = cached ? cached.cloneNode(true) : new Audio(`${this.assetRoot}/sfx/${type}.wav`);
      a.preload='auto'; a.playsInline=true; a.volume=Math.max(0,Math.min(1,.72*this.sfxVolume));
      const result=a.play();
      if (result?.catch) result.catch(()=>this.proceduralSfx(type));
    }
    proceduralSfx(type) {
      this.resume();
      if (!this.ctx || this.sfxVolume <= 0) return;
      const ctx=this.ctx, master=ctx.createGain();
      master.gain.value=.09*this.sfxVolume; master.connect(ctx.destination);
      const tone=(frequency,duration,wave='sine',start=0,gain=1)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type=wave; o.frequency.setValueAtTime(frequency,ctx.currentTime+start);
        g.gain.setValueAtTime(Math.max(.001,gain),ctx.currentTime+start);
        g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+start+duration);
        o.connect(g).connect(master);o.start(ctx.currentTime+start);o.stop(ctx.currentTime+start+duration);
      };
      switch(type){
        case 'knock':tone(118,.08,'triangle',0,.55);tone(94,.10,'triangle',.13,.48);break;
        case 'metal':tone(160,.12,'sawtooth',0,.34);tone(72,.26,'sine',.04,.30);break;
        case 'breath':tone(68,.26,'sine',0,.16);break;
        case 'paintcrack':tone(230,.08,'triangle',0,.28);tone(170,.10,'triangle',.07,.24);tone(110,.18,'sine',.15,.30);break;
        case 'chair':tone(126,.09,'triangle',0,.30);tone(72,.20,'sine',.04,.22);break;
        case 'pencil':tone(920,.035,'triangle',0,.08);tone(760,.04,'triangle',.04,.07);break;
        case 'plate':tone(690,.045,'triangle',0,.16);tone(255,.16,'sine',.04,.12);break;
        case 'rain':tone(820,.025,'triangle',0,.05);tone(740,.03,'triangle',.08,.04);break;
        case 'water':tone(520,.06,'sine',0,.08);tone(390,.08,'sine',.04,.06);break;
        case 'cup':tone(410,.045,'triangle',0,.12);tone(290,.08,'sine',.03,.08);break;
        case 'paperTear':tone(520,.12,'sawtooth',0,.16);tone(180,.24,'triangle',.08,.12);break;
        case 'drawer':tone(92,.14,'triangle',0,.22);tone(58,.22,'sine',.06,.18);break;
        case 'clock':tone(840,.035,'triangle',0,.10);tone(840,.035,'triangle',.5,.08);break;
        case 'message':tone(620,.06,'sine',0,.14);tone(820,.08,'sine',.09,.10);break;
        default:tone(420,.09,'triangle',0,.16);
      }
      setTimeout(()=>{try{master.disconnect();}catch(_){}},1800);
    }
    sfx(type) {
      if (!this.enabled || this.sfxVolume <= 0) return;
      this.resume();
      if (this.fileSfx.has(type)) this.playFileSfx(type); else this.proceduralSfx(type);
    }
  }

  const PREMONITION_LINES = [
    ['床板は、二枚目までしかない。','足元の木目は、途中から茶色の色面へ変わっている。'],
    ['「そこから先は、まだ描いていない」','知らない男の声。振り返る前に、部屋の輪郭が揺れる。'],
    ['足を置いた場所が、床ではなく絵具へ戻る。','描かれていないものは、この部屋には存在しない。'],
    ['未来の記憶は、証拠にならない。','死んで答えを知っても、現在の報告書には書けない。'],
    ['47分前','アヴィニョン発、アルル行き。まだ誰も死んでいない。']
  ];
  let premonitionIndex = 0;
  function renderPremonitionStep() {
    const line = $('#premonition-line'); const sub = $('#premonition-subline');
    if (!line || !sub) return;
    const [main,secondary] = PREMONITION_LINES[premonitionIndex];
    line.textContent = main; sub.textContent = secondary;
    document.querySelectorAll('.premonition-progress i').forEach((dot,index)=>dot.classList.toggle('active',index<=premonitionIndex));
    const next = $('#premonition-next'); if (next) next.textContent = premonitionIndex === PREMONITION_LINES.length - 1 ? '調査を始める' : '記憶をたどる';
    els.premonition?.setAttribute('data-step',String(premonitionIndex));
  }
  function showPremonition() {
    premonitionIndex = 0;
    els.title.classList.add('hidden'); els.game.classList.add('hidden'); els.gameover.classList.add('hidden'); els.ending.classList.add('hidden');
    els.premonition?.classList.remove('hidden'); renderPremonitionStep();
  }
  function advancePremonition() {
    if (premonitionIndex < PREMONITION_LINES.length - 1) { premonitionIndex += 1; renderPremonitionStep(); return; }
    startGame();
  }

  function startGame(saved = null) {
    const fresh = {...defaultState(), settings: {...defaultSettings(), ...(state?.settings || {})}};
    state = normalizeState(saved || fresh);
    state.playStartedAt = Date.now();
    applySettings();
    audio = audio || new AudioSystem();
    audio.enabled = state.settings.ambient;
    audio.ambientVolume = state.settings.ambientVolume / 100;
    audio.musicVolume = state.settings.musicVolume / 100;
    audio.sfxVolume = state.settings.sfxVolume / 100;
    audio.init();
    autoMode = false; skipMode = false; uiHidden = false;
    updateModeButtons(); toggleUi(false);
    els.title.classList.add('hidden');
    els.premonition?.classList.add('hidden');
    els.gameover.classList.add('hidden');
    els.ending.classList.add('hidden');
    els.game.classList.remove('hidden');
    renderNode(state.nodeId, false, true, Number(state.segmentIndex || 0));
    saveGame(false, SAVE_KEYS.auto);
  }

  function inferMood(n, id, active) {
    if (!active) return n.listenerMood || 'quiet';
    if (n.mood) return n.mood;
    const t = `${n.emotion || ''} ${n.text || ''} ${n.visualState || ''}`;
    const bg = String(n.bg || '');
    if (/息切れ|息が|呼吸|咳|煙曝露|酸素/.test(t)) return 'breathless';
    if (/震|動揺|足がすく|崩れ|落ちた|消えた|死んだ/.test(t)) return 'shaken';
    if (/火|発火|煙|感電|危険|非常|警報|崩壊/.test(t) || ['emergency','smoke','instituteFire','layerCollapse','bedroomCrumble'].includes(bg)) return 'alarm';
    if (/怒|違う|やめろ|険し|苛立|不機嫌|許さない/.test(t)) return 'tense';
    if (/疑|違和感|妙だ|信用|本当か|確かめる/.test(t)) return 'wary';
    if (/警戒|隠す|保留|言えない|守りに入/.test(t)) return 'guarded';
    if (/決めた|やる|任せて|引き受け|守る|残す|署名|終わらせる/.test(t)) return 'resolved';
    if (/撮影|測定|記録|開封|停止|切断|確認|作業/.test(t)) return 'working';
    if (/笑|微笑|安心|よかった|助かった|ありがとう/.test(t)) return 'soft';
    if (/疲|沈黙|罪悪感|覚えていない|失った|知らない|無理だ/.test(t)) return 'down';
    if (/絵|色|描|構図|椅子|部屋|比較|層|証拠/.test(t)) return 'focused';
    return 'neutral';
  }

  function characterSvg(id, mood = 'neutral') {
    const specs = {
      sumi:{skin:'#d6b09c',shadow:'#91695f',hair:'#171b22',coat:'#56606c',shirt:'#cbc6bb',accent:'#8f9aa8',light:'#e6cfb2'},
      claire:{skin:'#ddbda8',shadow:'#966b61',hair:'#30262b',coat:'#d4d0c8',shirt:'#536b79',accent:'#ad554d',light:'#ead9c4'},
      marc:{skin:'#cfb4a3',shadow:'#87665d',hair:'#817d78',coat:'#c6c4bd',shirt:'#293647',accent:'#8f7857',light:'#e1d1bd'},
      leon:{skin:'#d4b39b',shadow:'#896152',hair:'#b9b3aa',coat:'#182337',shirt:'#687484',accent:'#c0a15e',light:'#ebd8bc'},
      marta:{skin:'#cba783',shadow:'#845d4d',hair:'#4d4039',coat:'#c9c2b4',shirt:'#65594e',accent:'#756889',light:'#e4cda9'},
      andre:{skin:'#bc8767',shadow:'#71493f',hair:'#282225',coat:'#55463e',shirt:'#252a34',accent:'#98704f',light:'#d8af8e'}
    };
    const sp = specs[id] || specs.sumi;
    const expression = {
      neutral:{browL:'M147 210q16-6 31-1',browR:'M213 206q15-4 29 2',eyeL:'M151 224q14 7 27-1',eyeR:'M214 222q13 7 25 0',mouth:'M182 304q19 3 37-2',turn:0,open:0},
      quiet:{browL:'M148 213q15-3 30 0',browR:'M213 210q14-2 28 2',eyeL:'M151 226q14 5 27 0',eyeR:'M214 225q13 5 25 0',mouth:'M183 306h35',turn:-1,open:0},
      soft:{browL:'M147 209q16-6 31-2',browR:'M212 205q16-5 30 2',eyeL:'M151 224q14 8 27-1',eyeR:'M214 222q13 8 25 0',mouth:'M180 299q21 13 41-1',turn:-2,open:0},
      tense:{browL:'M147 214l31-9',browR:'M212 205l30 10',eyeL:'M151 225q14 5 27-1',eyeR:'M214 224q13 5 25 0',mouth:'M182 309q19-7 38 0',turn:1,open:0},
      alarm:{browL:'M147 204q16-11 31 0',browR:'M212 204q16-12 30 0',eyeL:'M151 222q14 9 27-1',eyeR:'M214 220q13 10 25 0',mouth:'M190 299q13 18 25 0',turn:2,open:1},
      down:{browL:'M147 210q16 0 31 7',browR:'M212 216q16-7 30-7',eyeL:'M151 228q14 3 27 0',eyeR:'M214 227q13 3 25 0',mouth:'M183 310q19-6 37 0',turn:-2,open:0},
      focused:{browL:'M147 214l31-5',browR:'M212 209l30 5',eyeL:'M151 225q14 5 27-1',eyeR:'M214 224q13 5 25 0',mouth:'M182 303q19 4 38 0',turn:0,open:0}
    }[mood] || null;
    const e = expression || {browL:'M147 210q16-6 31-1',browR:'M213 206q15-4 29 2',eyeL:'M151 224q14 7 27-1',eyeR:'M214 222q13 7 25 0',mouth:'M182 304q19 3 37-2',turn:0,open:0};
    const hair = {
      sumi:'M119 219Q119 122 198 106Q281 113 290 220Q270 177 220 169Q162 166 119 219M125 179Q99 261 120 364Q98 314 104 239Z',
      claire:'M122 215Q129 122 204 111Q283 117 292 222Q267 176 218 170Q163 169 122 215M127 178Q98 235 111 303Q124 264 138 211Z',
      marc:'M128 207Q138 145 202 133Q264 138 283 213Q255 183 217 176Q166 174 128 207',
      leon:'M128 205Q139 148 205 132Q268 138 282 211Q255 183 216 176Q167 175 128 205',
      marta:'M128 212Q140 132 205 119Q274 127 287 216Q260 178 216 172Q165 171 128 212M130 184Q113 253 129 322',
      andre:'M122 213Q130 127 203 116Q281 121 291 218Q264 178 216 171Q162 169 122 213'
    }[id] || '';
    const glasses = id==='marc'||id==='marta' ? `<g fill="none" stroke="#36373b" stroke-width="3.2" opacity=".72"><path d="M145 225q17-12 38 0q-4 26-23 28q-16-2-15-28ZM207 223q17-11 36 1q-2 24-20 27q-17-1-16-28ZM183 226q12-5 24-1"/></g>` : '';
    const earrings = id==='claire' ? `<circle cx="137" cy="274" r="5" fill="${sp.accent}"/><path d="M126 178Q105 206 110 256" stroke="${sp.accent}" stroke-width="6" opacity=".24" fill="none"/>` : '';
    const tie = id==='leon' ? `<path d="M196 408l24 0 10 98-23 29-23-29z" fill="${sp.accent}" opacity=".9"/>` : '';
    const hairExtra = {
      marta:`<ellipse cx="282" cy="166" rx="34" ry="39" fill="${sp.hair}"/><path d="M263 143q24-22 43 3" stroke="#c9b49d" stroke-width="3" opacity=".16" fill="none"/>`,
      andre:`<path d="M128 171Q177 119 252 130" stroke="#0e0d10" stroke-width="12" opacity=".55" fill="none"/><path d="M252 132q31 18 37 66" stroke="#0e0d10" stroke-width="9" opacity=".45" fill="none"/>`,
      marc:`<path d="M145 168q58-34 116 4" stroke="#d7d2c8" stroke-width="5" opacity=".18" fill="none"/>`,
      leon:`<path d="M135 169q61-32 125 3" stroke="#f0e8dc" stroke-width="6" opacity=".22" fill="none"/>`
    }[id] || '';
    const faceDetails = {
      marta:`<path d="M142 256q10 5 18 1M241 255q10-4 18 2M169 292q31 11 65-1" stroke="${sp.shadow}" stroke-width="2.2" opacity=".46" fill="none"/><path d="M153 198q19-10 37-2M211 195q20-9 38 3" stroke="#5b4941" stroke-width="2" opacity=".42" fill="none"/>`,
      andre:`<path d="M177 286q24-10 49 0q-22 15-49 0Z" fill="#35272a" opacity=".82"/><path d="M183 314q18 9 34 0" stroke="#3a2a2b" stroke-width="5" opacity=".7" fill="none"/><path d="M145 270q13 17 27 20M248 268q-11 17-25 21" stroke="${sp.shadow}" stroke-width="3" opacity=".42" fill="none"/>`,
      marc:`<path d="M142 258q11 8 21 3M240 258q11-6 20 2M162 291q38 13 73-2" stroke="${sp.shadow}" stroke-width="2.2" opacity=".38" fill="none"/>`,
      leon:`<path d="M137 214q13-20 28-29M262 188q16 14 22 34" stroke="#d7d0c7" stroke-width="8" opacity=".44" fill="none"/>`,
      claire:`<path d="M134 178q-17 38-9 87" stroke="#1f1920" stroke-width="8" opacity=".7" fill="none"/>`
    }[id] || '';
    return `<svg viewBox="0 0 420 650" aria-hidden="true">
      <defs>
        <linearGradient id="face-${id}" x1="0" y1="0" x2="1" y2=".75"><stop stop-color="${sp.light}"/><stop offset=".38" stop-color="${sp.skin}"/><stop offset="1" stop-color="${sp.shadow}"/></linearGradient>
        <linearGradient id="coat-${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${sp.coat}"/><stop offset="1" stop-color="#191e29"/></linearGradient>
        <filter id="ink-${id}" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="${id.length*17}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale=".75"/></filter>
        <filter id="blur-${id}"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <ellipse cx="216" cy="610" rx="152" ry="25" fill="#000" opacity=".42" filter="url(#blur-${id})"/>
      <path d="M38 278Q90 106 235 73Q337 57 403 230" fill="none" stroke="${sp.accent}" stroke-width="10" opacity=".26"/>
      <path d="M28 370Q92 209 167 165" fill="none" stroke="#f4e4c7" stroke-width="3" opacity=".13"/>
      <g transform="rotate(${e.turn} 210 260)" filter="url(#ink-${id})">
        <path d="M45 650Q58 487 121 410Q163 375 205 372Q259 372 306 411Q369 486 385 650Z" fill="url(#coat-${id})"/>
        <path d="M76 642Q99 505 142 433M352 642Q326 505 288 432" fill="none" stroke="${sp.accent}" stroke-width="12" opacity=".31"/>
        <path d="M160 389Q202 429 252 389L281 650H131Z" fill="${sp.shirt}" opacity=".9"/>
        ${tie}
        <path d="M173 338L244 334L249 410Q211 434 168 407Z" fill="url(#face-${id})"/>
        <path d="M120 210Q126 127 207 114Q286 121 295 220L283 294Q267 350 214 365Q159 349 133 296Z" fill="url(#face-${id})"/>
        <path d="M124 213Q113 242 126 288Q135 315 155 334Q132 317 118 289Q105 250 124 213Z" fill="${sp.shadow}" opacity=".34"/>
        <path d="M225 151Q274 161 289 216Q280 177 246 159Z" fill="#fff" opacity=".08"/>
        ${hairExtra}<path d="${hair}" fill="${sp.hair}"/>
        <path d="${e.browL}" stroke="#302b2c" stroke-width="4" stroke-linecap="round" fill="none"/><path d="${e.browR}" stroke="#302b2c" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="${e.eyeL}" stroke="#2a292c" stroke-width="3.8" stroke-linecap="round" fill="none"/><path d="${e.eyeR}" stroke="#2a292c" stroke-width="3.8" stroke-linecap="round" fill="none"/>
        <circle cx="166" cy="226" r="3.3" fill="#22252b"/><circle cx="226" cy="224" r="3.3" fill="#22252b"/>
        <path d="M200 221Q190 269 201 285Q210 291 220 281" stroke="${sp.shadow}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="${e.mouth}" stroke="#774d49" stroke-width="3.7" fill="none" stroke-linecap="round"/>${faceDetails}
        <path d="M140 190Q159 156 199 151M232 153Q263 163 280 194" stroke="#fff" stroke-width="4" fill="none" opacity=".11"/>
        ${glasses}${earrings}
      </g>
      <path d="M104 524Q200 566 320 510" fill="none" stroke="#fff" stroke-width="2" opacity=".08"/>
    </svg>`;
  }

  function speakerToId(speaker) {
    const s = speaker || '';
    if (/クレール/.test(s)) return 'claire';
    if (/フィンセント|ゴッホ/.test(s)) return 'vincent';
    if (/ゴーギャン/.test(s)) return 'gauguin';
    if (/マルタ/.test(s)) return 'marta';
    if (/アンドレ/.test(s)) return 'andre';
    if (/マルク/.test(s)) return 'marc';
    if (/レオン/.test(s)) return 'leon';
    if (/澄/.test(s)) return 'sumi';
    return null;
  }

  const FICTIONAL_PORTRAIT_IDS = new Set(['sumi','claire','marta','marc','leon','andre']);
  const CHARACTER_DISPLAY_NAMES = {
    sumi:'水瀬 澄', claire:'クレール・ベルナール', marta:'マルタ・デ・フリース',
    marc:'マルク・デュラン', leon:'レオン・ヴァスール', andre:'アンドレ・ヴァスール',
    vincent:'フィンセント・ファン・ゴッホ', gauguin:'ポール・ゴーギャン'
  };
  const CHARACTER_MOODS = ['neutral','quiet','soft','focused','working','guarded','wary','resolved','down','shaken','alarm','tense','breathless'];
  const MOOD_LABELS = {
    neutral:'通常', quiet:'観察', soft:'安堵', focused:'集中', working:'作業', guarded:'警戒',
    wary:'疑念', resolved:'決意', down:'疲労', shaken:'動揺', alarm:'恐怖', tense:'緊張', breathless:'息切れ'
  };

  function portraitAssetFor(id, mood) {
    if (FICTIONAL_PORTRAIT_IDS.has(id)) {
      const safeMood = CHARACTER_MOODS.includes(mood) ? mood : 'neutral';
      return `assets/characters/expressions/${id}/${safeMood}.webp`;
    }
    if (id === 'vincent') return 'assets/portrait-vincent.jpg';
    if (id === 'gauguin') return 'assets/portrait-gauguin.jpg';
    return null;
  }

  const preloadedAssets = new Set();
  function preloadAsset(src) {
    if (!src || preloadedAssets.has(src)) return;
    preloadedAssets.add(src);
    const img = new Image(); img.decoding = 'async'; img.loading = 'eager'; img.src = src;
  }

  function preloadForNode(n) {
    if (!n) return;
    const queue = [n];
    let cursor = n;
    for (let i = 0; i < 3; i++) {
      const nextId = cursor?.next || (cursor?.type === 'choice' ? cursor.choices?.[0]?.next : null);
      cursor = nextId ? nodes.get(nextId) : null;
      if (cursor) queue.push(cursor);
    }
    queue.forEach(item => {
      const scripts = Array.isArray(item.script) ? item.script : [item];
      scripts.forEach(seg => {
        const ids = seg.characters || item.characters || (seg.character || item.character ? [seg.character || item.character] : []);
        const speakerId = speakerToId(seg.speaker || item.speaker);
        ids.forEach(id => preloadAsset(portraitAssetFor(id, inferMood({...item,...seg}, id, speakerId ? speakerId === id : true))));
      });
      if (EVENT_CGS[item.id]) preloadAsset(EVENT_CGS[item.id].src);
    });
  }

  function setCharacters(n) {
    els.characterLayer.innerHTML = '';
    let ids = n.characters ? [...n.characters] : (n.character ? [n.character] : []);
    ids = [...new Set(ids.filter(Boolean))];
    if (!ids.length) return;
    const speakerId = speakerToId(n.speaker);
    if (speakerId && !ids.includes(speakerId)) ids.unshift(speakerId);
    const primary = [];
    if (speakerId && ids.includes(speakerId)) primary.push(speakerId);
    const preferredListener = ids.find(id => id !== speakerId);
    if (preferredListener) primary.push(preferredListener);
    if (!primary.length) primary.push(ids[0]);
    if (primary.length < 2 && ids[1]) primary.push(ids[1]);
    const overflow = ids.filter(id => !primary.includes(id));

    primary.slice(0,2).forEach((id, i) => {
      const active = speakerId ? speakerId === id : true;
      const roleClass = speakerId ? (active ? 'speaking' : 'listening') : 'present';
      const mood = inferMood(n, id, active);
      const d = document.createElement('div');
      d.className = `character-card ${primary.length === 1 ? 'right' : (i === 0 ? 'left' : 'right')} ${roleClass} mood-${mood}`;
      const portraitAsset = portraitAssetFor(id, mood);
      if (portraitAsset) {
        const historical = id === 'vincent' || id === 'gauguin';
        d.classList.add(historical ? 'painted-portrait' : 'illustrated-portrait', `portrait-${id}`);
        d.dataset.character = id; d.dataset.mood = mood;
        const label = CHARACTER_DISPLAY_NAMES[id] || id;
        const expression = MOOD_LABELS[mood] || '通常';
        d.innerHTML = `<div class="portrait-canvas"><img src="${portraitAsset}" alt="${label}・${expression}" decoding="async"><span class="portrait-glaze"></span><span class="portrait-emotion" aria-hidden="true"><i></i><b></b></span><span class="portrait-edge"></span></div>`;
        const portraitImage = d.querySelector('img');
        portraitImage.addEventListener('error', () => {
          if (FICTIONAL_PORTRAIT_IDS.has(id) && !portraitImage.dataset.fallback) {
            portraitImage.dataset.fallback = 'neutral'; portraitImage.src = portraitAssetFor(id, 'neutral');
          }
        }, {once:false});
      } else d.innerHTML = characterSvg(id, mood);
      els.characterLayer.appendChild(d);
    });

    if (overflow.length) {
      const rail = document.createElement('div');
      rail.className = 'character-presence-rail';
      rail.setAttribute('aria-hidden', 'true');
      rail.innerHTML = overflow.map(id => {
        const active = speakerId === id;
        const mood = inferMood(n, id, active);
        const src = portraitAssetFor(id, mood);
        const label = CHARACTER_DISPLAY_NAMES[id] || id;
        return `<span class="presence-chip ${active ? 'active' : ''}" data-character="${id}">${src ? `<img src="${src}" alt="" decoding="async">` : ''}<b>${label}</b></span>`;
      }).join('');
      els.characterLayer.appendChild(rail);
    }
  }


  function semanticProfileFor(n) {
    const bg=String(n?.bg || '');
    const stateName=String(n?.visualState || '');
    const combined=`${bg} ${stateName}`;
    if (bg === 'train') return 'burden';
    if (/breakRoom|instituteExterior|loadingBay/.test(bg) && canonicalChapter(n?.chapter || state.currentChapter) === 'PROLOGUE') return 'closure';
    if (/labPainting|scan|scanSafe|infrared|equipment/.test(bg) && /pressure|leak|warning|alarm|scan|observe|clinical/i.test(combined)) return 'leak';
    if (/corridor|recovery/.test(bg) && (state.deaths > 0 || /memory|return|uneasy/i.test(stateName))) return 'memory';
    if (/bedroomWorld|bedroomCrumble|portal|chairLayer|keyholeRoom|yellowHouse|guestRoom|saintRemy|comparisonRoom/.test(bg)) return 'painted';
    if (/martaWorkshop|paperArchive|archive|documentLayer|provenanceRoom|andreWarehouse|warehouseDeep|warehouseDark/.test(bg)) return 'provenance';
    if (/outsideDawn|finalGallery|finalLab/.test(bg)) return 'dawn';
    if (/labPainting|scan|infrared|archive|paperArchive|documentLayer|comparisonRoom/.test(bg)) return 'evidence';
    return '';
  }

  function transitionKindFor(n) {
    const stateName = String(n.visualState || '');
    const bg = String(n.bg || '');
    if (/memory|return|death|void|collapse|crumble/i.test(`${stateName} ${bg}`)) return 'memory';
    if (/fire|smoke|electric|overheat/i.test(`${stateName} ${bg}`)) return 'fire';
    if (['bedroomWorld','guestRoom','yellowHouse','chairLayer','keyholeRoom','saintRemy','comparisonRoom','martaWorkshop','paperArchive'].includes(bg)) return 'paint';
    return 'fade';
  }

  function playSceneTransition(n) {
    if (!els.transition || state.settings.reduceMotion) return;
    clearTimeout(transitionTimer);
    const kind = transitionKindFor(n);
    els.transition.className = `cinematic-transition kind-${kind}`;
    void els.transition.offsetWidth;
    els.transition.classList.add('active');
    transitionTimer = setTimeout(() => els.transition.classList.remove('active'), 760);
  }

  function cameraFor(n) {
    const v = `${n.visualState || ''} ${n.mood || ''} ${n.bg || ''}`;
    if (/alarm|fear|emergency|smoke|fire|death|collapse|crumble/.test(v)) return 'close';
    if (/document|paper|archive|scan|comparison|equipment/.test(v)) return 'detail';
    if (/memory|uneasy|blackout|void|keyhole/.test(v)) return 'uneasy';
    if (/exterior|courtyard|rhone|gallery|dawn/.test(v)) return 'wide';
    return 'normal';
  }

  function scoreForScene(n) {
    const bg = String(n.bg || '');
    const chapter = canonicalChapter(n.chapter || state.currentChapter);
    if (/fire|smoke|electric|collapse|crumble|blackout|void/.test(bg)) return 'danger';
    if (/portal|memory|screenGlow|chairLayer|keyholeRoom/.test(bg)) return 'memory';
    if (chapter === 'ACT 1' || chapter === 'ACT 2') return 'arles';
    if (chapter === 'ACT 3') return 'saint';
    if (chapter === 'ACT 4') return 'marta';
    if (chapter === 'ACT 5') return 'forgery';
    if (chapter === 'ACT 6' || chapter === 'ENDING') return 'final';
    return 'modern';
  }

  function pulseLinePresentation() {
    els.dialogue.classList.remove('line-enter');
    void els.dialogue.offsetWidth;
    els.dialogue.classList.add('line-enter');
    els.characterLayer.querySelectorAll('.character-card.speaking').forEach(card => {
      card.classList.remove('line-enter'); void card.offsetWidth; card.classList.add('line-enter');
    });
  }

  function setSystemStatus(n) {
    if (!els.systemStatus) return;
    const status = n.systemStatus;
    if (!status) {
      els.systemStatus.classList.add('hidden');
      previousSystemValue = null;
      return;
    }
    els.systemStatus.classList.remove('hidden','status-warning','status-critical','status-offline','status-pulse');
    els.systemStatus.classList.add(`status-${status.state || 'warning'}`);
    els.systemStatusLabel.textContent = status.label || 'SYSTEM';
    const offline = status.value === null || status.value === undefined;
    els.systemStatusValue.textContent = offline ? '—' : Number(status.value).toFixed(1);
    els.systemStatusUnit.textContent = offline ? '' : (status.unit || '');
    els.systemStatusNote.textContent = status.note || '';
    const pct = offline ? 0 : Math.max(0, Math.min(100, ((Number(status.value) - 1.4) / 1.2) * 100));
    els.systemStatusFill.style.width = `${pct}%`;
    if (previousSystemValue !== null && status.value !== previousSystemValue) {
      void els.systemStatus.offsetWidth;
      els.systemStatus.classList.add('status-pulse');
    }
    previousSystemValue = status.value;
  }

  function setEmergencyScene(n) {
    const level = Math.max(0, Math.min(4, Number(n.smokeLevel || 0)));
    els.scene.style.setProperty('--smoke-level', String(level));
    els.scene.dataset.smokeLevel = String(level);
    if (els.emergencyDoor) {
      els.emergencyDoor.className = `emergency-door${n.doorState ? ` door-${n.doorState}` : ''}`;
    }
  }

  function applyChoiceImpact(nodeId, index) {
    const impact = CHOICE_IMPACTS[nodeId]?.[index] || {};
    Object.entries(impact).forEach(([key, amount]) => {
      if (!(key in state.judgement)) return;
      state.judgement[key] = Math.max(-9, Math.min(20, Number(state.judgement[key] || 0) + Number(amount || 0)));
    });
    state.choiceHistory.push({nodeId,index:index+1,impact,at:Date.now()});
    if (state.choiceHistory.length > 120) state.choiceHistory.shift();
    const strongest=Object.entries(impact).sort((a,b)=>Math.abs(Number(b[1]||0))-Math.abs(Number(a[1]||0)))[0];
    if(strongest){state.flags.pendingDecisionEcho={key:strongest[0],amount:Number(strongest[1]||0)};}
  }

  function judgementProfile() {
    return Object.entries(state.judgement).sort((a,b) => b[1] - a[1]);
  }

  function judgementSummaryHtml(compact = false) {
    const values = judgementProfile();
    return `<section class="judgement-summary ${compact ? 'compact' : ''}" aria-label="これまでの判断傾向"><div class="judgement-summary-head"><span>DECISION RECORD</span><strong>これまでの判断</strong></div><div class="judgement-bars">${values.map(([key,value]) => { const label=JUDGEMENT_LABELS[key]?.[0]||key; const pct=Math.max(8,Math.min(100,(value+3)*6)); return `<div><span>${label}</span><i><b style="width:${pct}%"></b></i><em>${value >= 0 ? '+' : ''}${value}</em></div>`; }).join('')}</div></section>`;
  }

  function judgementClosingLine(kind) {
    const [topKey] = judgementProfile()[0] || ['evidence'];
    const desc = JUDGEMENT_LABELS[topKey]?.[1] || '';
    const trust = state.judgement.collaboration || 0;
    const suffix = trust >= 6 ? '最後の報告は、一人の判断ではなく、役割を渡した人々の署名とともに残った。' : trust <= 0 ? '澄は最後まで多くを自分で抱えた。その癖もまた、記録の余白に残った。' : '澄は必要な場面で他者へ判断を渡し、必要な場面では自分の署名を引き受けた。';
    return `これまでの選択では、${desc}。${suffix}`;
  }


  function latestChoiceIndex(nodeId) {
    for (let i=state.choiceHistory.length-1;i>=0;i--) if (state.choiceHistory[i]?.nodeId===nodeId) return Number(state.choiceHistory[i].index||0);
    return 0;
  }

  function relationshipProfiles() {
    const j=state.judgement||{};
    const selected=(id,index)=>latestChoiceIndex(id)===index;
    const clamp=v=>Math.max(-5,Math.min(12,Math.round(v*10)/10));
    let claire=(j.collaboration||0)*0.08+(j.safety||0)*0.04;
    claire += selected('p18',2)?2:selected('p18',1)?-1:0;
    claire += selected('p48',1)?1:selected('p48',2)?-0.5:0;
    claire += selected('p65',1)?2:selected('p65',2)?-1:selected('p65',3)?0:0;
    claire += selected('a203',1)?1:0;
    claire += selected('a602',1)?1:selected('a602',2)?-0.5:0;
    claire += selected('a607',2)?3:selected('a607',1)?-3:0;
    claire += selected('a615',2)?1:0;
    let marc=(j.disclosure||0)*0.07+(j.evidence||0)*0.04;
    marc += selected('p65',1)?1:selected('p65',2)?-1:0;
    marc += selected('a206',1)?1:0;
    marc += selected('a521',2)?2:selected('a521',1)?-2:0;
    marc += selected('a607',2)?1:selected('a607',1)?-2:0;
    marc += latestChoiceIndex('v27_reflect_accountability')?2:0;
    marc += selected('a615',2)?1:0;
    let leon=(j.preservation||0)*0.07+(j.evidence||0)*0.04;
    leon += selected('p39',1)?2:(selected('p39',2)||selected('p39',3))?-1:0;
    leon += selected('a407',3)?2:(selected('a407',1)?-1:0);
    leon += selected('a521',2)?3:selected('a521',1)?-2:0;
    leon += latestChoiceIndex('v27_reflect_leon_memory')?1:0;
    leon += selected('a607',2)?1:0;
    const build=(key,score)=>{
      score=clamp(score);
      const tier=score>=7?'entrusted':score>=3?'conditional':'guarded';
      const tierLabel={entrusted:'自発的協力',conditional:'条件付き協力',guarded:'要確認'}[tier];
      return {key,score,tier,tierLabel,...RELATIONSHIP_CONFIG[key]};
    };
    return {claire:build('claire',claire),marc:build('marc',marc),leon:build('leon',leon)};
  }

  function relationshipSummaryHtml(compact=false) {
    const profiles=relationshipProfiles();
    return `<section class="relationship-summary ${compact?'compact':''}" aria-label="人物との協力状態"><div class="relationship-summary-head"><span>CONSEQUENCE RECORD</span><strong>これまでの判断が、現在の協力へ返る</strong></div><div class="relationship-card-grid">${Object.values(profiles).map(p=>`<article class="relationship-card tier-${p.tier}"><div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.role)}</span></div><em>${escapeHtml(p.tierLabel)}</em><small>${p.tier==='entrusted'?'過去の対応から、自分の責任範囲を先に引き受ける。':p.tier==='conditional'?'現在の記録を示せば、責任範囲を引き受ける。':'関係や記憶ではなく、現在の物証による確認が必要。'}</small></article>`).join('')}</div></section>`;
  }

  function consequenceEpilogueHtml(kind) {
    const p=relationshipProfiles();
    const line=(person)=>{
      const tier=p[person].tier;
      const table={
        claire:{entrusted:'画像付属書へ共同署名し、以後の停止手順を澄と共同で改訂した。',conditional:'画像の同一性には署名したが、判断責任の分担は次の案件へ持ち越された。',guarded:'データの真正性だけを証言し、澄との距離を残した。'},
        marc:{entrusted:'辞任より先に操作ログと契約経緯を提出し、外部調査の聞き取りへ残った。',conditional:'求められた記録を提出して辞任した。説明は残ったが、自発的な公開ではなかった。',guarded:'進退を先に選び、委員会は断片的なログから判断経緯を復元した。'},
        leon:{entrusted:'原本と家族資料を長期寄託し、所有の記憶と検証可能な来歴を分けて残した。',conditional:'期限付き寄託へ同意し、公開範囲は今後の協議事項となった。',guarded:'作品の所有は維持し、外部には高精細複製と限定資料だけが残った。'}
      };
      let copy=table[person][tier];
      if(kind!=='true') copy = `${copy} ただし、今回の報告文が残した空白は解消されなかった。`;
      return copy;
    };
    return `<section class="ending-consequences"><div class="ending-consequence-head"><span>AFTER THE REPORT</span><strong>選択の積み重ねが残したもの</strong></div><div class="ending-consequence-grid">${['claire','marc','leon'].map(k=>`<article><b>${escapeHtml(p[k].name)}</b><em>${escapeHtml(p[k].tierLabel)}</em><p>${escapeHtml(line(k))}</p></article>`).join('')}</div></section>`;
  }

  let actionCutInTimer = null;
  function setActionCutIn(n) {
    if (!els.actionCutIn) return;
    clearTimeout(actionCutInTimer);
    const cfg = ACTION_CUTINS[n.id];
    if (!cfg) { els.actionCutIn.classList.add('hidden'); return; }
    els.actionCutIn.className = `action-cut-in kind-${cfg[0]}`;
    const actionIcon = els.actionCutIn.querySelector('.action-cut-in-icon');
    const actionSrc = ACTION_CUTIN_IMAGES[cfg[0]];
    actionIcon?.classList.toggle('has-image', !!actionSrc);
    if (actionIcon) actionIcon.style.backgroundImage = actionSrc ? `url("${actionSrc}")` : '';
    els.actionCutIn.querySelector('strong').textContent = cfg[1];
    void els.actionCutIn.offsetWidth;
    els.actionCutIn.classList.add('visible');
    actionCutInTimer = setTimeout(() => els.actionCutIn.classList.remove('visible'), state.settings.reduceMotion ? 900 : 2200);
  }

  function showMemoryDelta(gameoverId) {
    const g = DATA.gameovers[gameoverId];
    if (!els.memoryDelta || !g) return;
    const facts = [...(g.warnings || []).slice(0,2), g.residue].filter(Boolean);
    const plan = state.loopPlans?.[gameoverId];
    els.memoryDelta.querySelector('ul').innerHTML = facts.map(x => `<li>${escapeHtml(x)}</li>`).join('') + (plan ? `<li class="memory-plan"><strong>検証計画</strong>${escapeHtml(plan.carry)}</li>` : '');
    els.memoryDelta.classList.remove('hidden');
    requestAnimationFrame(() => els.memoryDelta.classList.add('visible'));
    const close = () => { els.memoryDelta.classList.remove('visible'); setTimeout(() => els.memoryDelta.classList.add('hidden'), 260); };
    els.memoryDelta.querySelector('button').onclick = close;
    setTimeout(close, state.settings.reduceMotion ? 4500 : 7600);
  }


  function nodeWithin(detail, n) {
    if (detail.bgs && !detail.bgs.includes(n.bg)) return false;
    if (detail.nodes && !detail.nodes.includes(n.id)) return false;
    if (detail.loopMin && Math.max(state.loop || 1, state.paintingLoop || 0) < detail.loopMin) return false;
    const index=nodeOrder.get(n.id) ?? -1;
    if (detail.from && index < (nodeOrder.get(detail.from) ?? -1)) return false;
    if (detail.to && index > (nodeOrder.get(detail.to) ?? Number.MAX_SAFE_INTEGER)) return false;
    return true;
  }

  function activeEnvironmentDetails(n) {
    return ENVIRONMENT_DETAILS.filter(detail => nodeWithin(detail,n)).slice(0,3);
  }

  function renderEnvironmentDetails(n) {
    if (!els.environmentLayer) return;
    const details=activeEnvironmentDetails(n);
    els.environmentLayer.innerHTML='';
    els.environmentLayer.classList.toggle('has-details',details.length>0);
    details.forEach(detail=>{
      const button=document.createElement('button');
      button.type='button';
      button.className=`world-detail kind-${detail.kind}${state.environmentDetails.includes(detail.id)?' discovered':''}`;
      button.dataset.id=detail.id;
      button.style.left=`${detail.x}%`; button.style.top=`${detail.y}%`;
      button.setAttribute('aria-label',`場面の痕跡：${detail.title}`);
      button.innerHTML=`<span class="prop-visual" aria-hidden="true"><i></i><i></i><i></i></span><span class="world-detail-label">${escapeHtml(detail.title)}</span>`;
      button.addEventListener('click',e=>{e.stopPropagation();discoverEnvironmentDetail(detail,button);});
      els.environmentLayer.appendChild(button);
    });
    if (els.focusToggle) {
      els.focusToggle.disabled=!details.length;
      els.focusToggle.classList.toggle('has-unseen',details.some(d=>!state.environmentDetails.includes(d.id)));
    }
  }

  function discoverEnvironmentDetail(detail, button) {
    const first=!state.environmentDetails.includes(detail.id);
    if(first){state.environmentDetails.push(detail.id);if(detail.evidence)addEvidence(detail.evidence,false);button?.classList.add('discovered');saveGame(false,SAVE_KEYS.auto);}
    audio?.worldCue(detail.kind,(Number(detail.x)-50)/50);
    showObservationTrace(detail);
    const active=activeEnvironmentDetails(node);
    if(active.length && active.every(d=>state.environmentDetails.includes(d.id))){
      const key=`${node.bg}:${active.map(d=>d.id).join('|')}`;
      if(!state.sceneInsights.includes(key)){state.sceneInsights.push(key);setTimeout(()=>showToast('<span class="toast-kicker">SCENE READ</span><strong>空間の痕跡を読み切った</strong><br>場所の説明ではなく、人物と危険の関係が一つの場面として残った。',true,true),420);}
    }
  }

  function showObservationTrace(detail) {
    if(!els.observationTrace)return;
    clearTimeout(observationTraceTimer);
    clearTimeout(observationHideTimer);
    const speaking=document.querySelector('.character-card.speaking');
    const speakingOnRight=speaking ? (speaking.getBoundingClientRect().left + speaking.getBoundingClientRect().width/2 > innerWidth/2) : false;
    const preferLeft=speaking ? speakingOnRight : Number(detail.x ?? 60) < 50;
    els.observationTrace.classList.toggle('trace-left',preferLeft);
    els.observationTrace.classList.toggle('trace-right',!preferLeft);
    els.observationTrace.querySelector('h2').textContent=detail.title;
    els.observationTrace.querySelector('[data-step="seen"]').textContent=detail.seen;
    els.observationTrace.querySelector('[data-step="compare"]').textContent=detail.compare;
    els.observationTrace.querySelector('[data-step="record"]').textContent=detail.record;
    els.observationTrace.classList.remove('hidden');
    void els.observationTrace.offsetWidth;
    els.observationTrace.classList.add('visible');
    const close=()=>{els.observationTrace.classList.remove('visible');clearTimeout(observationHideTimer);observationHideTimer=setTimeout(()=>els.observationTrace.classList.add('hidden'),260);};
    els.observationTrace.querySelector('button').onclick=close;
    observationTraceTimer=setTimeout(close,state.settings.reduceMotion?5200:9000);
  }

  function setTension(n) {
    let value=Math.max(0,Math.min(1,Number(n.smokeLevel||0)/4));
    if(n.systemStatus?.state==='warning')value=Math.max(value,.34);
    if(n.systemStatus?.state==='critical')value=Math.max(value,.78);
    if(n.systemStatus?.state==='offline')value=Math.max(value,.88);
    if(['collapse','death','preblackout'].includes(n.visualState))value=Math.max(value,.92);
    if(['loss','danger'].includes(n.sceneTone))value=Math.max(value,.72);
    els.scene.style.setProperty('--tension',String(value));
    els.scene.dataset.tension=value>.78?'critical':value>.38?'rising':'calm';
    if(value>.78 && previousTension<=.78)audio?.sfx('heartbeat');
    previousTension=value;
  }

  function showInsightChallenge(n,cfg) {
    if(!els.insightPanel)return;
    pauseAutoAtInteraction();
    audio?.setDialogueMode('interaction',false);
    let selected=[];
    const correct=[...cfg.correct].sort().join('|');
    els.insightPanel.innerHTML=`<div class="insight-heading"><p class="eyebrow">${escapeHtml(cfg.eyebrow)}</p><h2>${escapeHtml(cfg.title)}</h2><p>${escapeHtml(cfg.prompt)}</p></div><div class="insight-slots"><span>観察 A</span><i>＋</i><span>観察 B</span></div><div class="insight-cards">${cfg.cards.map(([id,label])=>`<button type="button" data-id="${escapeHtml(id)}"><span>観察</span><strong>${escapeHtml(label)}</strong></button>`).join('')}</div><p class="insight-feedback" aria-live="polite">二枚を選んでください。</p><div class="insight-actions"><button type="button" class="primary insight-check" disabled>作業仮説を記録する</button></div>`;
    els.insightPanel.classList.remove('hidden');
    const update=()=>{
      els.insightPanel.querySelectorAll('.insight-cards button').forEach(b=>b.classList.toggle('selected',selected.includes(b.dataset.id)));
      const labels=selected.map(id=>cfg.cards.find(c=>c[0]===id)?.[1]||'');
      const slots=els.insightPanel.querySelectorAll('.insight-slots span'); slots[0].textContent=labels[0]||'観察 A';slots[1].textContent=labels[1]||'観察 B';
      els.insightPanel.querySelector('.insight-check').disabled=selected.length!==2;
    };
    els.insightPanel.querySelectorAll('.insight-cards button').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=b.dataset.id;if(selected.includes(id))selected=selected.filter(x=>x!==id);else{if(selected.length>=2)selected.shift();selected.push(id);}audio?.sfx('choice');update();}));
    els.insightPanel.querySelector('.insight-check').addEventListener('click',e=>{e.stopPropagation();const key=[...selected].sort().join('|');const feedback=els.insightPanel.querySelector('.insight-feedback');if(key!==correct){audio?.sfx('error');feedback.textContent='二つは同じ結論を支えていない。見えた特徴と、それを比較できる基準を一組にする。';els.insightPanel.classList.add('wrong');setTimeout(()=>els.insightPanel.classList.remove('wrong'),520);return;}audio?.sfx('evidence');state.insightChallenges.push(n.id);feedback.innerHTML=`<strong>作業仮説</strong><br>${escapeHtml(cfg.conclusion)}`;els.insightPanel.classList.add('solved');els.insightPanel.querySelector('.insight-actions').innerHTML='<button type="button" class="primary insight-continue">次へ進む</button>';saveGame(false,SAVE_KEYS.auto);els.insightPanel.querySelector('.insight-continue').addEventListener('click',ev=>{ev.stopPropagation();els.insightPanel.classList.add('hidden');els.insightPanel.innerHTML='';if(n.next)renderNode(n.next);});});
    update();
    requestAnimationFrame(()=>els.insightPanel.querySelector('.insight-cards button')?.focus({preventScroll:true}));
  }

  let activeEventCg = '';
  function setEventCG(n) {
    if (!els.eventCg || !els.eventCgImage) return;
    const cfg = EVENT_CGS[n.id];
    if (!cfg) {
      activeEventCg = '';
      els.scene.classList.remove('cg-active');
      els.eventCg.classList.add('hidden');
      els.eventCgImage.removeAttribute('src');
      els.eventCgImage.style.objectPosition = '';
      return;
    }
    if (activeEventCg !== n.id) {
      activeEventCg = n.id;
      els.eventCgImage.src = cfg.src;
      els.eventCgImage.style.objectPosition = cfg.position || '50% 50%';
      els.eventCg.dataset.label = cfg.label || '';
      els.eventCg.classList.remove('cg-enter');
      void els.eventCg.offsetWidth;
      els.eventCg.classList.add('cg-enter');
    }
    els.eventCg.classList.remove('hidden');
    els.scene.classList.add('cg-active');
  }

  function setScene(n) {
    const newBg = n.bg || 'train';
    if (lastSceneBg && lastSceneBg !== newBg && !state.settings.reduceMotion) {
      playSceneTransition(n);
      els.scene.classList.add('scene-changing');
      setTimeout(() => els.scene.classList.remove('scene-changing'), 420);
    }
    lastSceneBg = newBg;
    const sceneState = n.visualState || 'normal';
    const sceneTone = n.sceneTone || 'default';
    els.scene.className = `scene bg-${newBg} state-${sceneState} tone-${sceneTone}${els.scene.classList.contains('scene-changing') ? ' scene-changing' : ''}`;
    els.scene.dataset.state = sceneState;
    els.scene.dataset.tone = sceneTone;
    els.scene.dataset.camera = cameraFor(n);
    const paintBgs = ['labPainting','scan','infrared','scanSafe','screenGlow','portal'];
    if (n.type === 'revealPainting') state.paintingRevealed = true;
    els.paintingStage.classList.toggle('hidden', !(state.paintingRevealed && paintBgs.includes(n.bg)));
    setEventCG(n);
    setCharacters(n);
    setActionCutIn(n);
    setSystemStatus(n);
    setEmergencyScene(n);
    setTension(n);
    renderEnvironmentDetails(n);
    audio?.set(n.ambient || ambientForBg(n.bg));
    audio?.setScore(scoreForScene(n));
  }

  function ambientForBg(bg) {
    const map = {train:'train',arles:'summer',alley:'summer',avenue:'summer',instituteExterior:'summerNight',loadingBay:'hum',corridor:'hum',breakRoom:'room',recovery:'room',labPainting:'lab',archive:'room',courtyard:'summerNight',equipment:'machine',scan:'scanner',infrared:'scannerLow',scanSafe:'scanner',screenGlow:'lowTone',blackout:'blackout',emergency:'fire',smoke:'fire',electric:'electric',portal:'portal',bedroomWorld:'arlesRoom',guestRoom:'arlesRoom',yellowHouse:'arlesRoom',chairLayer:'lowTone',keyholeRoom:'lowTone',layerCollapse:'crumble',saintRemy:'quiet',comparisonRoom:'quiet',martaWorkshop:'rainWorkshop',paperArchive:'archivePaper',andreWarehouse:'typewriterRoom',warehouseDeep:'solventWarehouse',warehouseDark:'void',documentLayer:'typewriterRoom',provenanceRoom:'room',fireControl:'overheatForecast',instituteFire:'fire',outsideDawn:'summerNight',finalLab:'lab',finalGallery:'quiet',darkGallery:'void',bedroomCrumble:'crumble',unpainted:'void'};
    return map[bg] || 'room';
  }

  function clearTyping() {
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
  }

  function clearAutoTimer() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  function canonicalChapter(chapter) {
    const c = chapter || '';
    if (/^PROLOGUE|^RETURN/.test(c)) return 'PROLOGUE';
    for (let i = 1; i <= 6; i++) if (new RegExp(`ACT\\s*${i}`).test(c)) return `ACT ${i}`;
    if (/ENDING|END/.test(c)) return 'ENDING';
    return c;
  }


  function latestLoopPlan() {
    for (const id of ['GO26','GO04','GO01']) if (state.loopPlans?.[id]) return state.loopPlans[id];
    return null;
  }

  function renderCaseFocus() {
    if (!els.caseFocus) return;
    const chapter = canonicalChapter(state.currentChapter);
    const cfg = CASE_FOCUS[chapter] || CASE_FOCUS.PROLOGUE;
    els.caseFocus.querySelector('.case-focus-chapter').textContent = chapter;
    els.caseFocus.querySelector('.case-focus-question').textContent = cfg.question;
    els.caseFocus.querySelector('.case-focus-goal').textContent = cfg.goal;
    els.caseFocus.querySelector('.case-focus-rule').textContent = cfg.rule;
    const plan = latestLoopPlan(); const holder = els.caseFocus.querySelector('.case-focus-plan');
    holder.classList.toggle('hidden', !plan);
    if (plan) holder.querySelector('p').textContent = plan.carry;
  }

  function toggleCaseFocus(force) {
    if (!els.caseFocus) return;
    caseFocusOpen = typeof force === 'boolean' ? force : !caseFocusOpen;
    renderCaseFocus();
    els.caseFocus.classList.toggle('hidden', !caseFocusOpen);
    els.caseFocus.classList.toggle('visible', caseFocusOpen);
    els.caseFocusToggle?.setAttribute('aria-pressed', String(caseFocusOpen));
    els.caseFocusToggle?.classList.remove('attention');
    if (caseFocusOpen) els.caseFocus.querySelector('button')?.focus({preventScroll:true});
  }

  function pulseCaseFocus() {
    if (!els.caseFocusToggle) return;
    clearTimeout(caseFocusPulseTimer);
    els.caseFocusToggle.classList.add('attention');
    caseFocusPulseTimer = setTimeout(() => els.caseFocusToggle.classList.remove('attention'), state.settings.reduceMotion ? 1200 : 4200);
  }

  function layerForChapter(chapter) {
    const canonical = canonicalChapter(chapter || state.currentChapter);
    if (canonical === 'ACT 2') return '1888';
    if (canonical === 'ACT 3') return '1889';
    if (canonical === 'ACT 4') return '1948';
    if (canonical === 'ACT 5' && /現代/.test(chapter || state.currentChapter)) return 'present';
    if (canonical === 'ACT 5') return '1967';
    return 'present';
  }

  function layerSnapshot(source = state) {
    const evidence = new Set(source?.evidence || []);
    const current = layerForChapter(source?.currentChapter || 'PROLOGUE');
    return LAYER_MAP.map(layer => {
      const found = layer.evidence.filter(id => evidence.has(id));
      const unlocked = layer.memory ? Number(source?.deaths || 0) > 0 || found.length > 0 : found.length > 0 || layer.id === current || layer.id === 'present';
      const confirmed = found.length >= Math.min(3, layer.evidence.length);
      return {...layer, found, unlocked, confirmed, current:layer.id === current};
    });
  }

  function renderLayerMap(source = state) {
    if (!els.layerMapContent) return;
    const snap = layerSnapshot(source);
    els.layerMapContent.innerHTML = snap.map(layer => {
      const status = !layer.unlocked ? '未到達' : layer.confirmed ? '主要記録を確認' : layer.current ? '現在調査中' : '痕跡を確認';
      const facts = layer.found.slice(-4).map(id => DATA.evidence[id]?.title).filter(Boolean);
      return `<article class="layer-card ${layer.unlocked?'unlocked':'locked'} ${layer.current?'current':''} ${layer.memory?'memory':''}" style="--layer-accent:${escapeHtml(layer.accent)}"><div class="layer-period"><span>${escapeHtml(layer.period)}</span><span>${layer.memory?'MEMORY':'MATERIAL LAYER'}</span></div><h3>${escapeHtml(layer.title)}</h3><span class="layer-status">${escapeHtml(status)}</span>${layer.unlocked ? `<ul>${(facts.length?facts:['まだ記録は少ない。']).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><p class="layer-question">${escapeHtml(layer.question)}</p>` : '<p class="layer-question">この層へ到達すると、現在の証拠とのつながりが表示される。</p>'}<span class="layer-count">${layer.found.length}/${layer.evidence.length}</span></article>`;
    }).join('');
  }

  function toggleLayerMap(force, source = state) {
    if (!els.layerMap) return;
    layerMapOpen = typeof force === 'boolean' ? force : !layerMapOpen;
    if (layerMapOpen) { toggleCaseFocus(false); renderLayerMap(source); metricIncrementScalar('layerMapViews'); }
    els.layerMap.classList.toggle('hidden', !layerMapOpen);
    els.layerMap.classList.toggle('visible', layerMapOpen);
    els.layerMapToggle?.setAttribute('aria-pressed', String(layerMapOpen));
    els.layerMapToggle?.classList.remove('attention');
    if (layerMapOpen) els.layerMap.querySelector('button')?.focus({preventScroll:true});
  }

  function metricIncrementScalar(key, amount = 1) {
    const metrics = state.metrics || (state.metrics = defaultMetrics());
    metrics[key] = Number(metrics[key] || 0) + amount;
  }

  function recentEvidenceTitles(source, limit = 4) {
    return [...(source?.evidence || [])].reverse().map(id => DATA.evidence[id]?.title).filter(Boolean).slice(0, limit);
  }

  function renderResumeBriefing(saved) {
    if (!els.resumeBriefing || !saved) return;
    const chapter = canonicalChapter(saved.currentChapter || 'PROLOGUE');
    const focus = CASE_FOCUS[chapter] || CASE_FOCUS.PROLOGUE;
    const latestPlan = ['GO26','GO04','GO01'].map(id => saved.loopPlans?.[id]).find(Boolean);
    const recent = recentEvidenceTitles(saved, 4);
    const snap = layerSnapshot(saved);
    const unlocked = snap.filter(x => x.unlocked).length;
    const meta = saveMetadata(saved);
    const top = Object.entries(saved.judgement || {}).sort((a,b)=>Number(b[1])-Number(a[1]))[0];
    const axis = top ? (JUDGEMENT_LABELS[top[0]]?.[0] || '根拠') : '根拠';
    els.resumeBriefing.innerHTML = `<div class="resume-place"><div><span>${escapeHtml(chapter)}</span><h3>${escapeHtml(meta?.location || saved.currentLocation || '—')} · ${escapeHtml(meta?.time || saved.currentTime || '—')}</h3></div><time>${escapeHtml(meta?.stamp || '')} · ${escapeHtml(meta?.play || '')}</time></div><div class="resume-grid"><section class="resume-block"><h4>現在の問い</h4><p>${escapeHtml(focus.question)}</p></section><section class="resume-block"><h4>判断の傾向</h4><p>これまで最も強く表れている軸は「${escapeHtml(axis)}」。結論ではなく、澄が何を優先してきたかを示す。</p></section><section class="resume-block"><h4>直近の確認記録</h4><ul>${(recent.length?recent:['まだ記録はない。']).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section class="resume-block"><h4>${latestPlan?'次周回の検証計画':'現在の目的'}</h4><p>${escapeHtml(latestPlan?.carry || focus.goal)}</p><div class="resume-layer-progress" aria-label="到達した年代層 ${unlocked} / ${snap.length}">${snap.map(x=>`<i class="${x.unlocked?'on':''}"></i>`).join('')}</div></section></div>`;
  }

  function openResumeBriefing(saved) {
    if (!saved) return;
    pendingResumeState = saved;
    renderResumeBriefing(saved);
    showAccessibleDialog(els.resumeDialog);
  }

  function resumeWithReview(mode = 'game') {
    const saved = pendingResumeState; pendingResumeState = null;
    els.resumeDialog?.close();
    if (!saved) return;
    startGame(saved);
    metricIncrementScalar('resumeBriefings');
    if (mode === 'layers') setTimeout(() => toggleLayerMap(true), 80);
    if (mode === 'notebook') setTimeout(() => openDialog('notebook'), 80);
  }

  function showChapterBriefing(previousChapter, currentChapter) {
    const current = canonicalChapter(currentChapter);
    if (!state.settings.chapterBriefings || !CHAPTER_BRIEFING_CHAPTERS.has(current) || state.chapterBriefingsSeen?.[current]) return;
    state.chapterBriefingsSeen ||= {};
    state.chapterBriefingsSeen[current] = true;
    const previous = canonicalChapter(previousChapter || 'PROLOGUE');
    const prevFocus = CASE_FOCUS[previous] || CASE_FOCUS.PROLOGUE;
    const nextFocus = CASE_FOCUS[current] || CASE_FOCUS.PROLOGUE;
    const recent = recentEvidenceTitles(state, 4);
    const info = CHAPTER_INFO[current] || [current,current,''];
    els.chapterBriefingContent.innerHTML = `<div class="chapter-briefing-title"><span>${escapeHtml(info[0])} / EVIDENCE HANDOFF</span><h3>${escapeHtml(info[1])}</h3><p>${escapeHtml(info[2] || nextFocus.question)}</p></div><div class="chapter-briefing-grid"><section class="chapter-briefing-block"><h4>ここまでに確認した記録</h4><ul>${(recent.length?recent:['まだ記録は少ない。']).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section class="chapter-briefing-block"><h4>残しておく未解決</h4><p>${escapeHtml(prevFocus.question)}</p></section><section class="chapter-briefing-block chapter-briefing-next"><h4>次の層で確かめること</h4><p><strong>${escapeHtml(nextFocus.question)}</strong><br>${escapeHtml(nextFocus.rule)}</p></section></div>`;
    metricIncrementScalar('chapterBriefingsShown');
    saveGame(false, SAVE_KEYS.auto);
    showAccessibleDialog(els.chapterBriefingDialog);
  }

  function showChapterCard(chapter) {
    const info = CHAPTER_INFO[canonicalChapter(chapter)];
    if (!info) return;
    clearTimeout(chapterTimer);
    els.chapterCardKicker.textContent = info[0];
    els.chapterCardTitle.textContent = info[1];
    els.chapterCardSubtitle.textContent = info[2];
    const chapterKey = canonicalChapter(chapter);
    const chapterArt = CHAPTER_ART[chapterKey] || CHAPTER_ART.PROLOGUE;
    els.chapterCard.style.setProperty('--chapter-art', `url("${chapterArt}")`);
    preloadAsset(chapterArt);
    els.chapterCard.classList.remove('hidden');
    audio?.sfx('chapter');
    renderCaseFocus(); pulseCaseFocus();
    chapterTimer = setTimeout(() => els.chapterCard.classList.add('hidden'), state.settings.reduceMotion ? 700 : 2200);
  }

  function showPlaceCard(location, time) {
    clearTimeout(placeTimer);
    els.placeCardLocation.textContent = location || '—';
    els.placeCardTime.textContent = time || '—';
    els.placeCard.classList.remove('hidden');
    placeTimer = setTimeout(() => els.placeCard.classList.add('hidden'), state.settings.reduceMotion ? 650 : 1900);
  }

  function showBeatCard(text) {
    if (!els.beatCard || !text) return;
    clearTimeout(beatTimer);
    els.beatCardText.textContent = text;
    els.beatCard.classList.remove('hidden','beat-in');
    void els.beatCard.offsetWidth;
    els.beatCard.classList.add('beat-in');
    beatTimer = setTimeout(() => els.beatCard.classList.add('hidden'), state.settings.reduceMotion ? 750 : 1950);
  }

  function trackNodeTime(nextChapter) {
    const now = Date.now();
    const metrics = state.metrics || (state.metrics = defaultMetrics());
    const delta = Math.max(0, Math.min(300000, now - (metrics.lastNodeAt || now)));
    const chapter = canonicalChapter(state.currentChapter || 'PROLOGUE');
    metrics.chapterMs[chapter] = (metrics.chapterMs[chapter] || 0) + delta;
    metrics.lastNodeAt = now;
    if (nextChapter) metrics.currentChapter = canonicalChapter(nextChapter);
  }

  function metricIncrement(bucket, key, amount = 1) {
    const metrics = state.metrics || (state.metrics = defaultMetrics());
    metrics[bucket] ||= {};
    metrics[bucket][key] = (metrics[bucket][key] || 0) + amount;
  }

  function updateProgress(id) {
    const i = nodeOrder.get(id) || 0;
    const pct = Math.max(0, Math.min(100, Math.round((i / Math.max(1, DATA.nodes.length - 1)) * 100)));
    els.progressLabel.textContent = `${pct}%`;
    els.progressFill.style.width = `${pct}%`;
  }

  function scriptForNode(n) {
    let script = Array.isArray(n?.script) && n.script.length ? [...n.script] : [{
      mode: n?.voice === 'inner' ? 'thought' : (n?.type === 'evidenceText' ? 'document' : 'dialogue'),
      speaker: n?.speaker || '', emotion: n?.emotion || '',
      voice: n?.voice === 'inner' ? 'thought' : (n?.voice || 'normal'), text: n?.text || ''
    }];
    const echoes = {
      r01: state.flags.accepted_help ? '階段で荷物を渡した時の重さまで戻っている。今度は、助けを求める前に一人で抱えない。' : '階段で荷物を離さなかった手の感覚まで戻っている。一人で持てることと、一人で持つべきことは違う。',
      a203: state.flags.local_copy_only ? 'クレールが残した複製は、私の記憶ではなく現在の記録として二人の間にある。' : '',
      a602: (state.judgement.collaboration || 0) >= 5 ? '以前より先に、誰へ何を渡すかを考えている。未来を知っていることを、役割を奪う理由にはしない。' : '',
      a623: judgementClosingLine('true')
    };
    if (echoes[n?.id]) script.push({mode:'thought',speaker:'',voice:'thought',delivery:'measured',text:echoes[n.id],logSpeaker:'澄'});
    return script;
  }


  function segmentPresentation(n, seg) {
    return {
      ...n,
      ...seg,
      bg: seg?.bg || n.bg,
      ambient: seg?.ambient || n.ambient,
      visualState: seg?.visualState || n.visualState,
      sceneTone: seg?.sceneTone || n.sceneTone,
      characters: seg?.characters || n.characters,
      character: seg?.character || n.character,
      mood: seg?.mood || n.mood,
      listenerMood: seg?.listenerMood || n.listenerMood,
      speaker: seg?.speaker ?? n.speaker ?? '',
      emotion: seg?.emotion ?? '',
      text: seg?.text ?? ''
    };
  }

  function renderSegment(index, save = true) {
    if (!node) return;
    segmentIndex = Math.max(0, Math.min(index, Math.max(0, currentScript.length - 1)));
    state.segmentIndex = segmentIndex;
    previousLogCursor = -1;
    currentSegment = currentScript[segmentIndex] || {mode:'thought',speaker:'',emotion:'',voice:'thought',text:''};
    const rawMode = currentSegment.mode || (currentSegment.voice === 'inner' ? 'thought' : 'dialogue');
    const textMode = rawMode === 'inner' ? 'thought' : rawMode;
    const presentation = segmentPresentation(node, currentSegment);
    if (textMode !== 'dialogue') presentation.speaker = '';
    afterTextRanFor = null;
    const segmentKey = `${node.id}:${segmentIndex}`;
    currentWasRead = !!state.readSegments[segmentKey];
    state.readSegments[segmentKey] = true;
    els.readStatus.textContent = `${currentWasRead ? '既読' : ''}${currentScript.length > 1 ? `${currentWasRead ? ' · ' : ''}${segmentIndex + 1}/${currentScript.length}` : ''}`;
    setScene(presentation);
    pulseLinePresentation();
    audio?.setDialogueMode(textMode,isDangerNode(presentation));
    const cue = currentSegment.sfx || (segmentIndex === 0 ? node.sfx : null);
    if (cue) setTimeout(() => audio?.sfx(cue), currentSegment.sfxDelay || node.sfxDelay || 40);
    const visibleSpeaker = textMode === 'dialogue' ? (currentSegment.speaker || '') :
      (textMode === 'document' || textMode === 'system' ? (currentSegment.speaker || '') : '');
    els.speaker.textContent = visibleSpeaker;
    els.emotion.textContent = '';
    const speakerRow = els.speaker.closest('.speaker-row');
    const speakerRowHidden = !visibleSpeaker && !['document','system'].includes(textMode);
    if (speakerRow) speakerRow.hidden = speakerRowHidden;
    els.emotion.hidden = true;
    els.dialogue.dataset.mode = textMode;
    els.dialogue.dataset.voice = currentSegment.voice || textMode || 'normal';
    els.dialogue.dataset.delivery = currentSegment.delivery || 'neutral';
    els.dialogue.classList.toggle('speakerless', !visibleSpeaker);
    els.scene.dataset.textMode = textMode;
    els.dialogue.setAttribute('aria-label', ({dialogue: visibleSpeaker ? `${visibleSpeaker}の発言` : '発言', thought:'澄の心の声', narration:'澄が見聞きしたこと', document:'文書', system:'システム表示'}[textMode] || '文章'));
    fullText = currentSegment.text || '';
    if (['investigate','investigatePainting','spectralInvestigation','puzzle'].includes(node.type) && !fullText) els.dialogue.classList.add('hidden');
    else els.dialogue.classList.remove('hidden');
    addLog(node, currentSegment, segmentIndex);
    typeText(fullText, () => afterTextComplete(node));
    if (save) saveGame(false, SAVE_KEYS.auto);
    updateMenuStatus();
  }

  function renderNode(id, save = true, suppressCards = false, resumeSegment = 0) {
    clearTyping(); clearAutoTimer(); hideTransient(); afterTextRanFor = null;
    const nextNode = nodes.get(id);
    if (!nextNode) { console.error('missing node', id); return; }
    trackNodeTime(nextNode.chapter || state.currentChapter);
    metricIncrement('nodeVisits', id);
    const previousChapter = state.currentChapter;
    const previousLocation = state.currentLocation;
    const previousTime = state.currentTime;
    node = nextNode;
    state.nodeId = id;
    preloadForNode(node);
    if (!state.visited.includes(id)) state.visited.push(id);
    if (node.set) applySet(node.set);
    if (node.chapter) state.currentChapter = node.chapter;
    if (node.location) state.currentLocation = node.location;
    if (node.time) state.currentTime = node.time;
    state.savedAt = Date.now();
    state.readNodes[id] = true;
    const semanticProfile = semanticProfileFor(node);
    els.scene.dataset.semantic = semanticProfile;
    if (els.semanticLayer) {
      const semanticAsset = SEMANTIC_OVERLAY_ASSETS[semanticProfile];
      els.semanticLayer.style.backgroundImage = semanticAsset ? `url("${semanticAsset}")` : '';
      els.semanticLayer.classList.toggle('active', !!semanticAsset);
    }

    els.chapter.textContent = state.currentChapter;
    els.location.textContent = state.currentLocation;
    els.time.textContent = state.currentTime;
    els.loop.textContent = state.paintingLoop ? `絵画記録 ${String(state.paintingLoop).padStart(2,'0')}` : `記録 ${String(state.loop).padStart(2,'0')}`;
    updateProgress(id);
    renderCaseFocus();
    if (layerMapOpen) renderLayerMap();

    if (!suppressCards && canonicalChapter(state.currentChapter) !== canonicalChapter(previousChapter)) { showChapterCard(state.currentChapter); pendingChapterBriefing = {previous:previousChapter,current:state.currentChapter}; }
    if (!suppressCards && (state.currentLocation !== previousLocation || state.currentTime !== previousTime)) showPlaceCard(state.currentLocation, state.currentTime);
    if (!suppressCards && node.beat) showBeatCard(node.beat);

    currentScript = scriptForNode(node);
    if (node.evidence && !state.evidence.includes(node.evidence)) {
      addEvidence(node.evidence, false);
      pendingEvidenceToast = node.evidence;
    }
    renderSegment(Number.isFinite(resumeSegment) ? resumeSegment : 0, save);
    if(state.flags.pendingDecisionEcho){
      const echo=state.flags.pendingDecisionEcho;delete state.flags.pendingDecisionEcho;
      const copy=DECISION_ECHO[echo.key]?.[echo.amount>=0?'positive':'negative'];
      if(copy)setTimeout(()=>showToast(`<span class="toast-kicker">DECISION ECHO</span><strong>${escapeHtml(copy)}</strong><br>選択は結末だけでなく、澄が何を判断の基準にしたかとして残る。`,false,true),state.settings.reduceMotion?80:420);
    }
  }

  function applySet(obj) {
    Object.entries(obj).forEach(([k,v]) => {
      if (k === 'loop' || k === 'paintingLoop') state[k] = v;
      else state.flags[k] = v;
    });
  }

  function typingDelayFor(char) {
    const pace = Number(currentSegment?.pace || node?.pace || 1);
    const base = Number(state.settings.speed) * pace;
    if (base === 0 || state.settings.reduceMotion) return 0;
    if (char === '。' || char === '！' || char === '？' || char === '\n') return base + 80;
    if (char === '、') return base + 35;
    return base;
  }

  function typeText(text, done) {
    els.text.textContent = '';
    typingDone = false;
    let i = 0;
    const shouldInstant = state.settings.speed === 0 || state.settings.reduceMotion || (skipMode && (!state.settings.skipReadOnly || currentWasRead));
    if (shouldInstant) {
      els.text.textContent = text;
      typingDone = true;
      if (els.srStatus) els.srStatus.textContent = text;
      done?.();
      return;
    }
    const step = () => {
      i++;
      els.text.textContent = text.slice(0, i);
      if (i >= text.length) {
        typingDone = true;
        typingTimer = null;
        if (els.srStatus) els.srStatus.textContent = text;
        done?.();
        return;
      }
      typingTimer = setTimeout(step, typingDelayFor(text[i - 1]));
    };
    typingTimer = setTimeout(step, Math.max(1, state.settings.speed));
  }

  function completeTyping() {
    if (typingDone) return false;
    clearTyping();
    els.text.textContent = fullText;
    typingDone = true;
    if (els.srStatus) els.srStatus.textContent = fullText;
    afterTextComplete(node);
    return true;
  }

  function isInteractiveNode(n) {
    return ['choice','investigate','investigatePainting','spectralInvestigation','artComparison','paintedWorldTrial','puzzle','teamCommitment','chainAssembly','finalSignature','earlyEnding','ending'].includes(n.type);
  }

  function isDangerNode(n) {
    return n.type === 'deathSequence' || ['blackout','emergency','smoke','electric','instituteFire','layerCollapse','bedroomCrumble','void'].includes(n.bg) || ['preblackout','collapse','death','memory'].includes(n.visualState);
  }

  function scheduleAuto(n) {
    clearAutoTimer();
    if (!autoMode && !skipMode) return;
    if (!n || isInteractiveNode(n)) return;
    let delay;
    if (skipMode && (!state.settings.skipReadOnly || currentWasRead)) delay = 110;
    else {
      const presented = segmentPresentation(n, currentSegment || {});
      const text = currentSegment?.text || n.text || '';
      const deliveryPause = ({quick:-110,direct:20,measured:260,dry:110,precise:210,formal:180,restrained:240,persuasive:90,controlled:100,constrained:460,radio:160}[currentSegment?.delivery] || 0);
      const punctuation = (text.match(/[。！？]/g) || []).length * 150 + (text.match(/[、…]/g) || []).length * 55 + (text.match(/\n/g) || []).length * 180;
      const modeFactor = currentSegment?.mode === 'thought' ? 1.12 : currentSegment?.mode === 'document' ? 1.18 : 1;
      delay = Number(state.settings.autoDelay) + Math.min(2600, text.length * 20 * modeFactor) + punctuation + Number(currentSegment?.autoExtra || n.autoExtra || 0) + deliveryPause;
      delay = Math.max(240, delay);
      if (isDangerNode(presented)) delay += 900;
    }
    autoTimer = setTimeout(() => advance(true), delay);
  }

  function afterTextComplete(n) {
    const segmentKey = n ? `${n.id}:${segmentIndex}` : '';
    if (!n || afterTextRanFor === segmentKey) return;
    afterTextRanFor = segmentKey;
    typingDone = true;
    const finalSegment = segmentIndex >= currentScript.length - 1;
    if (!finalSegment) { scheduleAuto(n); return; }
    if (pendingEvidenceToast) {
      const ev = pendingEvidenceToast; pendingEvidenceToast = null; showEvidenceToast(ev);
    }
    if (pendingChapterBriefing) { const brief = pendingChapterBriefing; pendingChapterBriefing = null; showChapterBriefing(brief.previous, brief.current); if (els.chapterBriefingDialog?.open) return; }
    if (n.type === 'choice') { pauseAutoAtInteraction(); showChoices(n.choices); return; }
    if (n.type === 'investigate' || n.type === 'investigatePainting') { pauseAutoAtInteraction(); startInvestigation(n); return; }
    if (n.type === 'spectralInvestigation') { pauseAutoAtInteraction(); startSpectralInvestigation(n); return; }
    if (n.type === 'artComparison') { pauseAutoAtInteraction(); showArtworkComparison(n); return; }
    if (n.type === 'paintedWorldTrial') { pauseAutoAtInteraction(); showPaintedWorldTrial(n); return; }
    if (n.type === 'teamCommitment') { pauseAutoAtInteraction(); showTeamCommitment(n); return; }
    if (n.type === 'chainAssembly') { pauseAutoAtInteraction(); showChainAssembly(n); return; }
    if (n.type === 'finalSignature') { pauseAutoAtInteraction(); showFinalSignature(n); return; }
    if (n.type === 'puzzle') { pauseAutoAtInteraction(); showPuzzle(n); return; }
    if (n.type === 'earlyEnding') { pauseAutoAtInteraction(); setTimeout(() => showEnding('early'), 500); return; }
    if (n.type === 'ending') { pauseAutoAtInteraction(); setTimeout(() => showEnding(n.endingKind || 'demo'), 500); return; }
    scheduleAuto(n);
  }

  function advance(fromAuto = false) {
    if (completeTyping()) return;
    if (!node) return;
    clearAutoTimer();
    if (!fromAuto) audio?.sfx('advance');
    if (segmentIndex < currentScript.length - 1) {
      renderSegment(segmentIndex + 1, true);
      return;
    }
    if (isInteractiveNode(node)) return;
    const insightCfg=INSIGHT_CHALLENGES[node.id];
    if(insightCfg && !state.insightChallenges.includes(node.id)){showInsightChallenge(node,insightCfg);return;}
    if (node.type === 'deathSequence') { showGameover(node.death); return; }
    if (node.next) renderNode(node.next);
  }

  function hideTransient() {
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
    els.dialogue.classList.remove('hidden');
    els.choices.classList.add('hidden'); els.choices.innerHTML = '';
    els.inv.classList.add('hidden'); els.hotspotLayer.innerHTML = ''; invState = null;
    document.querySelector('.spectral-panel')?.remove(); spectralState = null;
    document.querySelectorAll('.consequence-panel').forEach(panel => panel.remove());
    document.body.classList.remove('spectral-active');
    els.paintingStage.classList.remove('spectral-visible','spectral-raking','spectral-infrared','mode-switching');
    const paintingImg = els.paintingStage.querySelector('img'); if (paintingImg) paintingImg.src = 'assets/painting-diagnostics/fourth_visible.webp';
    document.querySelector('.puzzle-panel')?.remove();
    document.querySelector('.art-comparison-panel')?.remove();
    document.querySelector('.painted-world-trial')?.remove();
    if(els.insightPanel){els.insightPanel.classList.add('hidden');els.insightPanel.innerHTML='';}
  }

  function pauseAutoAtInteraction() {
    clearAutoTimer();
  }

  function showChoices(choices) {
    els.choices.innerHTML = '';
    const reportAudit = node?.id === 'a622' ? finalReportAudit() : null;
    choices.forEach((c, index) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--choice-index', index);
      const locked = !!(reportAudit && index === 4 && !reportAudit.ready);
      b.disabled = locked;
      b.innerHTML = `<span class="choice-number">${String(index + 1).padStart(2,'0')}</span><span>${escapeHtml(c.text)}${locked ? '<small class="choice-lock">証拠または共同署名が不足</small>' : ''}</span>`;
      b.addEventListener('click', e => {
        e.stopPropagation();
        audio?.sfx('choice');
        metricIncrement('choiceSelections', `${node.id}:${index + 1}`);
        applyChoiceImpact(node.id, index);
        if (c.set) applySet(c.set);
        renderNode(c.next);
      });
      els.choices.appendChild(b);
    });
    if (node?.id === 'a622') els.choices.insertAdjacentHTML('afterbegin', reportAudit.html + relationshipSummaryHtml(true) + judgementSummaryHtml(true));
    els.choices.classList.remove('hidden');
    els.choices.classList.remove('choice-enter'); void els.choices.offsetWidth; els.choices.classList.add('choice-enter');
    requestAnimationFrame(() => els.choices.querySelector('button')?.focus({preventScroll:true}));
  }

  function startInvestigation(n) {
    invState = {found:new Set(), min:n.min || n.hotspots.length, node:n, startedAt:Date.now(), hints:0};
    els.invTitle.textContent = n.title || '調査';
    updateInvProgress();
    els.inv.classList.remove('hidden');
    renderHotspots();
    configureInvestigationHint();
    els.invFinish.onclick = e => {
      e.stopPropagation();
      if (invState.found.size >= invState.min) {
        audio?.sfx('choice');
        const elapsed = Date.now() - invState.startedAt;
        const record = state.metrics.investigation[n.id] || {runs:0,totalMs:0,hints:0};
        record.runs += 1; record.totalMs += elapsed; record.hints += invState.hints;
        state.metrics.investigation[n.id] = record;
        renderNode(n.next);
      }
    };
  }

  function configureInvestigationHint() {
    if (!els.invHint || !invState) return;
    const mode = state.settings.assistMode || 'standard';
    els.invHint.classList.toggle('hidden', mode === 'off');
    els.invHint.disabled = mode !== 'story';
    els.invHint.textContent = mode === 'story' ? '観察の手引き' : '手引き準備中';
    els.invHint.onclick = e => { e.stopPropagation(); useInvestigationHint(); };
    if (mode === 'off') return;
    const wait = mode === 'story' ? 3500 : 14000;
    hintTimer = setTimeout(() => {
      if (!invState) return;
      els.invHint.disabled = false;
      els.invHint.textContent = '観察の手引き';
    }, state.settings.reduceMotion ? 300 : wait);
  }

  function useInvestigationHint() {
    if (!invState || !els.invHint || els.invHint.disabled) return;
    const target = (invState.node.hotspots || []).find(h => !invState.found.has(h.id));
    if (!target) { showToast('未確認の場所はありません。'); return; }
    const button = els.hotspotLayer.querySelector(`[data-id="${target.id}"]`);
    button?.classList.add('hinted');
    setTimeout(() => button?.classList.remove('hinted'), state.settings.reduceMotion ? 900 : 3300);
    invState.hints += 1; state.metrics.hintsUsed += 1;
    showToast(`<strong>視線を向ける</strong><br>${escapeHtml(target.label)}の周辺を確認してください。`, false, true);
    els.invHint.disabled = true;
    els.invHint.textContent = '手引きを使用済み';
  }

  function renderHotspots() {
    els.hotspotLayer.innerHTML = '';
    if (!invState) return;
    const painting = invState.node.type === 'investigatePainting';
    invState.node.hotspots.forEach(h => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hotspot'; b.dataset.id = h.id;
      const lab = document.createElement('span'); lab.className = 'hotspot-label'; lab.textContent = h.label; b.appendChild(lab);
      const pos = () => {
        if (painting) {
          const r = els.paintingStage.getBoundingClientRect();
          b.style.left = `${r.left + r.width * h.x / 100}px`; b.style.top = `${r.top + r.height * h.y / 100}px`;
          b.style.width = `${r.width * h.w / 100}px`; b.style.height = `${r.height * h.h / 100}px`;
        } else {
          b.style.left = `${h.x}%`; b.style.top = `${h.y}%`; b.style.width = `${h.w}%`; b.style.height = `${h.h}%`;
        }
      };
      pos(); b._position = pos;
      if (invState.found.has(h.id)) b.classList.add('found');
      b.addEventListener('click', e => {
        e.stopPropagation();
        const isNew = !invState.found.has(h.id);
        invState.found.add(h.id); b.classList.add('found');
        if (isNew) audio?.sfx('evidence');
        if (h.evidence) addEvidence(h.evidence, true);
        showToast(`<strong>${escapeHtml(h.label)}</strong><br>${escapeHtml(h.text)}`, false, true);
        showObservationTrace({title:h.label,seen:h.text,compare:h.compare || '周囲の材質・位置・時間差と照合する。',record:h.record || '見えた特徴と意味づけを分けて観察手帳へ残す。'});
        updateInvProgress();
      });
      els.hotspotLayer.appendChild(b);
    });
  }

  function updateInvProgress() {
    const n = invState?.node;
    if (!n) return;
    els.invProgress.textContent = `発見 ${invState.found.size} / 必要 ${invState.min}`;
    els.invFinish.disabled = invState.found.size < invState.min;
  }

  window.addEventListener('resize', () => document.querySelectorAll('.hotspot').forEach(h => h._position?.()));

  function startSpectralInvestigation(n) {
    const cfg = n.spectral || {};
    const modes = cfg.modes || [];
    const targets = cfg.targets || [];
    if (!modes.length || !targets.length) { renderNode(n.next); return; }
    state.paintingRevealed = true;
    els.paintingStage.classList.remove('hidden');
    spectralState = {
      node: n,
      cfg,
      mode: modes[0].id,
      found: new Set(),
      completedModes: new Set(),
      startedAt: Date.now(),
      switches: 0
    };
    document.body.classList.add('spectral-active');
    els.dialogue.classList.add('hidden');
    const panel = document.createElement('section');
    panel.className = 'spectral-panel';
    panel.innerHTML = `<div class="spectral-heading"><p class="eyebrow">MULTISPECTRAL OBSERVATION</p><h2>${escapeHtml(n.title || '画像比較')}</h2><p>${escapeHtml(cfg.instruction || '')}</p></div><div class="spectral-modes" role="tablist" aria-label="観察方法">${modes.map((m,i) => `<button type="button" role="tab" data-mode="${escapeHtml(m.id)}" aria-selected="${i === 0 ? 'true' : 'false'}"><strong>${escapeHtml(m.label)}</strong><span>${escapeHtml(m.short || '')}</span><i>0/${targets.filter(t => t.mode === m.id).length}</i></button>`).join('')}</div><div class="spectral-current"><div><span id="spectral-current-label"></span><p id="spectral-current-description"></p></div><span id="spectral-progress"></span></div><div class="spectral-findings" aria-live="polite"><p class="spectral-empty">画像上の観察点を選んでください。</p></div><div class="spectral-actions"><button type="button" class="spectral-notebook">観察手帳</button><button type="button" class="spectral-diagnostics">登録画像</button><button type="button" class="primary spectral-finish" disabled>比較記録を確定する</button></div>`;
    els.game.appendChild(panel);
    panel.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', e => {
      e.stopPropagation();
      setSpectralMode(button.dataset.mode, true);
    }));
    panel.querySelector('.spectral-notebook').addEventListener('click', e => { e.stopPropagation(); openDialog('notebook'); });
    panel.querySelector('.spectral-diagnostics')?.addEventListener('click', e => { e.stopPropagation(); openDiagnostics(spectralState?.mode || 'visible'); });
    panel.querySelector('.spectral-finish').addEventListener('click', e => {
      e.stopPropagation();
      if (!spectralReady()) return;
      audio?.sfx('choice');
      const elapsed = Date.now() - spectralState.startedAt;
      const record = state.metrics.investigation[n.id] || {runs:0,totalMs:0,hints:0,modeSwitches:0};
      record.runs += 1; record.totalMs += elapsed; record.modeSwitches = (record.modeSwitches || 0) + spectralState.switches;
      state.metrics.investigation[n.id] = record;
      if (cfg.success) showToast(`<strong>比較記録</strong><br>${escapeHtml(cfg.success)}`, true, true);
      renderNode(n.next);
    });
    setSpectralMode(modes[0].id, false);
  }

  function setSpectralMode(modeId, userSwitch = false) {
    if (!spectralState) return;
    const mode = (spectralState.cfg.modes || []).find(m => m.id === modeId);
    if (!mode) return;
    if (userSwitch && spectralState.mode !== modeId) {
      spectralState.switches += 1;
      audio?.sfx('advance');
    }
    spectralState.mode = modeId;
    if (SPECTRAL_IMAGE_BY_MODE[modeId]) { els.paintingStage.querySelector('img').src = SPECTRAL_IMAGE_BY_MODE[modeId]; }
    els.paintingStage.classList.remove('spectral-visible','spectral-raking','spectral-infrared','mode-switching');
    els.paintingStage.classList.add(`spectral-${modeId}`);
    if (!state.settings.reduceMotion) {
      void els.paintingStage.offsetWidth;
      els.paintingStage.classList.add('mode-switching');
      setTimeout(() => els.paintingStage.classList.remove('mode-switching'), 780);
    }
    const panel = document.querySelector('.spectral-panel');
    panel?.querySelectorAll('[data-mode]').forEach(button => {
      const active = button.dataset.mode === modeId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    const label = panel?.querySelector('#spectral-current-label');
    const desc = panel?.querySelector('#spectral-current-description');
    if (label) label.textContent = mode.label;
    if (desc) desc.textContent = mode.description || '';
    renderSpectralTargets();
    updateSpectralPanel();
  }

  function renderSpectralTargets() {
    els.hotspotLayer.innerHTML = '';
    if (!spectralState) return;
    const visible = (spectralState.cfg.targets || []).filter(t => t.mode === spectralState.mode);
    visible.forEach(target => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot spectral-hotspot';
      b.dataset.id = target.id;
      b.setAttribute('aria-label', target.label);
      const label = document.createElement('span');
      label.className = 'hotspot-label';
      label.textContent = target.label;
      b.appendChild(label);
      const position = () => {
        const r = els.paintingStage.getBoundingClientRect();
        b.style.left = `${r.left + r.width * target.x / 100}px`;
        b.style.top = `${r.top + r.height * target.y / 100}px`;
        b.style.width = `${r.width * target.w / 100}px`;
        b.style.height = `${r.height * target.h / 100}px`;
      };
      position(); b._position = position;
      if (spectralState.found.has(target.id)) b.classList.add('found');
      b.addEventListener('click', e => {
        e.stopPropagation();
        const isNew = !spectralState.found.has(target.id);
        spectralState.found.add(target.id);
        b.classList.add('found');
        if (isNew) audio?.sfx('evidence');
        showToast(`<span class="toast-kicker">${escapeHtml(target.certainty || '観察')}</span><strong>${escapeHtml(target.label)}</strong><br>${escapeHtml(target.text)}`, false, true);
        showObservationTrace({title:target.label,seen:target.text,compare:`${(spectralState.cfg.modes.find(m=>m.id===target.mode)||{}).label || '観察方法'}で見えた特徴を他の波長と照合する。`,record:'同じ画面にあることと、同じ時期に作られたことを分けて記録する。'});
        completeSpectralModeIfReady(target.mode);
        updateSpectralPanel();
      });
      els.hotspotLayer.appendChild(b);
    });
    setTimeout(() => document.querySelectorAll('.spectral-hotspot').forEach(h => h._position?.()), 30);
  }

  function modeTargets(modeId) {
    return (spectralState?.cfg.targets || []).filter(t => t.mode === modeId);
  }

  function modeFoundCount(modeId) {
    return modeTargets(modeId).filter(t => spectralState?.found.has(t.id)).length;
  }

  function completeSpectralModeIfReady(modeId) {
    if (!spectralState || spectralState.completedModes.has(modeId)) return;
    const required = Number(spectralState.cfg.requiredPerMode || modeTargets(modeId).length);
    if (modeFoundCount(modeId) < required) return;
    spectralState.completedModes.add(modeId);
    const mode = spectralState.cfg.modes.find(m => m.id === modeId);
    if (mode?.evidence) addEvidence(mode.evidence, true);
  }

  function spectralReady() {
    if (!spectralState) return false;
    const required = Number(spectralState.cfg.requiredPerMode || 1);
    return (spectralState.cfg.modes || []).every(m => modeFoundCount(m.id) >= Math.min(required, modeTargets(m.id).length));
  }

  function updateSpectralPanel() {
    if (!spectralState) return;
    const panel = document.querySelector('.spectral-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-mode]').forEach(button => {
      const modeId = button.dataset.mode;
      const count = modeFoundCount(modeId);
      const total = modeTargets(modeId).length;
      const counter = button.querySelector('i');
      if (counter) counter.textContent = `${count}/${total}`;
      button.classList.toggle('complete', count >= total);
    });
    const all = spectralState.cfg.targets || [];
    const progress = panel.querySelector('#spectral-progress');
    if (progress) progress.textContent = `観察 ${spectralState.found.size} / ${all.length}`;
    const findings = panel.querySelector('.spectral-findings');
    const foundTargets = all.filter(t => spectralState.found.has(t.id));
    findings.innerHTML = foundTargets.length ? foundTargets.map(t => `<article><span>${escapeHtml((spectralState.cfg.modes.find(m => m.id === t.mode) || {}).label || '')}</span><div><strong>${escapeHtml(t.label)}</strong><p>${escapeHtml(t.text)}</p></div></article>`).join('') : '<p class="spectral-empty">画像上の観察点を選んでください。</p>';
    panel.querySelector('.spectral-finish').disabled = !spectralReady();
  }

  function addEvidence(id, toast = true) {
    if (!DATA.evidence[id]) return;
    if (!state.evidence.includes(id)) {
      state.evidence.push(id);
      if (toast) showEvidenceToast(id);
      renderNotebook();
      if (layerMapOpen) renderLayerMap();
    }
  }

  function showEvidenceToast(id) {
    const e = DATA.evidence[id];
    if (!e) return;
    audio?.sfx('evidence');
    if (e.kind === 'person') {
      showToast(`<span class="toast-kicker">人物観察を更新</span><strong>${escapeHtml(e.title)}</strong><br><span>${escapeHtml(e.role || '')}</span><br>${escapeHtml(e.text)}`, true, true);
      return;
    }
    showToast(`<strong>${escapeHtml(e.title)}</strong><br>${escapeHtml(e.text)}`, true, true);
  }

  function showToast(msg, evidence = false, html = false) {
    clearTimeout(toastTimer);
    els.toast.className = `toast${evidence ? ' evidence' : ''}`;
    if (html) els.toast.innerHTML = msg; else els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), evidence ? 4800 : 3800);
  }


  function renderLoopReconstruction(id) {
    const cfg = LOOP_RECONSTRUCTION[id];
    els.returnButton.disabled = false; els.returnButton.textContent = '記録点へ戻る';
    if (!cfg) return;
    let selected = state.loopPlans?.[id];
    const panel = document.createElement('section'); panel.className = 'loop-reconstruction';
    panel.innerHTML = `<div class="loop-reconstruction-head"><span>${escapeHtml(cfg.eyebrow)}</span><strong>死を、次の検証手順へ変える</strong></div><h3>${escapeHtml(cfg.question)}</h3><div class="loop-plan-options">${cfg.options.map(option=>`<button type="button" data-plan="${option.id}"><strong>${escapeHtml(option.title)}</strong><span>${escapeHtml(option.body)}</span></button>`).join('')}</div><p class="loop-plan-feedback" aria-live="polite"></p>`;
    els.gameoverBody.appendChild(panel);
    const feedback = panel.querySelector('.loop-plan-feedback');
    const confirm = option => {
      state.loopPlans ||= {};
      state.loopPlans[id] = {planId:option.id, carry:option.carry, at:Date.now()};
      state.flags.activeLoopPlan = id;
      addEvidence(cfg.evidence, false);
      panel.querySelectorAll('button').forEach(button => { button.disabled = true; button.classList.toggle('selected', button.dataset.plan === option.id); });
      feedback.innerHTML = `<strong>次周回へ持ち越す計画</strong>${escapeHtml(option.carry)}`;
      els.returnButton.disabled = false; els.returnButton.textContent = 'この計画で記録点へ戻る';
      pulseCaseFocus(); saveGame(false, SAVE_KEYS.auto); audio?.sfx('evidence');
    };
    if (selected) {
      const option = cfg.options.find(x => x.id === selected.planId) || cfg.options.find(x => x.id === cfg.correct);
      if (option) confirm(option);
    } else {
      els.returnButton.disabled = true;
      panel.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        const option = cfg.options.find(x => x.id === button.dataset.plan); if (!option) return;
        metricIncrement('loopPlanAttempts', id);
        panel.querySelectorAll('button').forEach(x => x.classList.remove('wrong'));
        if (option.id !== cfg.correct) {
          button.classList.add('wrong'); feedback.textContent = option.feedback || '現在の証拠へ変えられる計画を選び直す。'; audio?.sfx('error'); return;
        }
        confirm(option);
      }));
      requestAnimationFrame(() => panel.querySelector('button')?.focus({preventScroll:true}));
    }
  }

  function showGameover(id) {
    const g = DATA.gameovers[id];
    if (!g) return;
    pauseModes(true);
    state.deaths++;
    metricIncrement('deathsById', id);
    const repeatDeath = state.metrics.deathsById[id] || 1;
    let cause = g.cause;
    if (g.causeByPath) cause = g.causeByPath[state.flags.death_path] || Object.values(g.causeByPath)[0];
    if (id === 'GO01') addEvidence('marc_card', false);
    if (id === 'GO04') { addEvidence('unfinished_floor', false); addEvidence('mdv_signature', false); }
    for (const ev of g.evidence || []) addEvidence(ev, false);
    state.flags.lastGameover = id; state.flags.returnTo = g.returnTo;
    state.savedAt = Date.now();
    audio?.sfx('death');
    document.body.classList.add('death-transition');
    setTimeout(() => {
      document.body.classList.remove('death-transition');
      els.game.classList.add('hidden'); els.gameover.classList.remove('hidden');
      els.gameoverTitle.textContent = g.title;
      els.deathCounter.innerHTML = `DEATH ${String(state.deaths).padStart(2,'0')} · ${id}${repeatDeath > 1 ? `<span class="gameover-repeat">同一死因 ${repeatDeath}回</span>` : ''}`;
      const warnings = (g.warnings || []).map((x, i) => `<li><span>${String(i + 1).padStart(2,'0')}</span><p>${escapeHtml(x)}</p></li>`).join('');
      els.gameoverBody.innerHTML = `
        <section class="cause-chain"><div class="cause-step"><span>01</span><div><h3>判断</h3><p>${escapeHtml(cause || '原因を特定できなかった。')}</p></div></div>
        <div class="cause-step"><span>02</span><div><h3>事前に確認できた兆候</h3><ol class="warning-list">${warnings}</ol></div></div>
        <div class="cause-step residue-step"><span>03</span><div><h3>最後に残った観察</h3><p>${escapeHtml(g.residue || '持ち越せる観察はない。')}</p></div></div></section>`;
      renderLoopReconstruction(id);
      audio?.set('void');
      saveGame(false, SAVE_KEYS.auto);
    }, state.settings.reduceMotion ? 50 : 620);
  }

  function returnFromGameover() {
    const required = LOOP_RECONSTRUCTION[state.flags.lastGameover];
    if (required && !state.loopPlans?.[state.flags.lastGameover]) {
      const feedback = els.gameoverBody.querySelector('.loop-plan-feedback');
      if (feedback) feedback.textContent = '次周回で検証する計画を一つ確定してください。';
      els.gameoverBody.querySelector('.loop-plan-options button')?.focus({preventScroll:true});
      return;
    }
    const target = state.flags.returnTo || 'r01';
    const lastGameover = state.flags.lastGameover;
    els.gameover.classList.add('hidden'); els.game.classList.remove('hidden');
    renderNode(target);
    setTimeout(() => { showMemoryDelta(lastGameover); const plan = state.loopPlans?.[lastGameover]; if (plan) { showToast(`<span class="toast-kicker">CASE FOCUS UPDATED</span><strong>次周回の検証計画</strong><br>${escapeHtml(plan.carry)}`, false, true); pulseCaseFocus(); } }, state.settings.reduceMotion ? 80 : 620);
  }


  function artworkComparisonInsight(mode, selected) {
    const names = selected.map(id => HISTORICAL_ARTWORKS.find(work => work.id === id)?.title || id);
    if (mode === 'structure') return `同じ部屋でも、椅子、肖像、画面の切り取りは一致しない。${selected.includes('sketch') ? '書簡スケッチは完成画の骨格を示すが、油彩画そのものではない。' : `${names.join('と')}は複製誤差ではなく、描き直す際の選択を含む。`}`;
    if (mode === 'color') return '現在青く見える壁だけを制作時の色として扱わない。書簡には淡い紫の意図があり、退色と作品ごとの材料差を分けて考える必要がある。';
    if (selected.includes('orsay')) return '小型版は家族の家へ掛けるための別作品であり、三版の平均や縮小コピーではない。';
    if (selected.includes('chicago')) return '同寸版は第1版の水損後に描き直された再制作で、最初の作品を機械的に複製したものではない。';
    return '書簡スケッチは制作意図を伝える資料であり、完成油彩画と異なる役割を持つ。';
  }

  function showArtworkComparison(n) {
    const modes = {structure:['構図','椅子・肖像・輪郭'],color:['色','現在色と制作意図'],purpose:['用途','なぜ描き直したか']};
    let mode = 'structure'; let selected = []; const discoveries = new Set();
    const panel = document.createElement('section'); panel.className = 'art-comparison-panel';
    panel.innerHTML = `<div class="art-compare-head"><div><p class="eyebrow">THREE BEDROOMS / ONE LETTER</p><h2>${escapeHtml(n.title)}</h2><p>比較軸を一つ選び、二点の資料を照合する。違いを一つの「誤差」にまとめない。</p></div><button type="button" class="art-compare-notebook">観察手帳</button></div>
      <div class="art-compare-lenses">${Object.entries(modes).map(([id,[label,sub]])=>`<button type="button" data-mode="${id}" class="${id===mode?'active':''}"><strong>${label}</strong><span>${sub}</span></button>`).join('')}</div>
      <div class="artwork-grid">${HISTORICAL_ARTWORKS.map(work=>`<button type="button" class="artwork-card" data-work="${work.id}"><span class="artwork-image"><img src="${work.src}" alt="${escapeHtml(work.title)}" decoding="async"></span><strong>${escapeHtml(work.title)}</strong><small>${escapeHtml(work.subtitle)}</small><em>${escapeHtml(work.credit)}</em></button>`).join('')}</div>
      <div class="art-compare-result" aria-live="polite"><span>比較待ち</span><p>二点を選んでください。</p></div>
      <div class="art-compare-progress"><strong>比較記録 0/3</strong><span><i></i></span></div>
      <div class="art-compare-actions"><button type="button" class="primary art-compare-check" disabled>二点を比較する</button><button type="button" class="art-compare-finish" disabled>比較シートを確定する</button></div>`;
    els.game.appendChild(panel); els.dialogue.classList.add('hidden');
    const update = () => {
      panel.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
      panel.querySelectorAll('[data-work]').forEach(b=>b.classList.toggle('selected',selected.includes(b.dataset.work)));
      panel.querySelector('.art-compare-check').disabled = selected.length !== 2;
      panel.querySelector('.art-compare-finish').disabled = discoveries.size < 3;
      panel.querySelector('.art-compare-progress strong').textContent=`比較記録 ${discoveries.size}/3`;
      panel.querySelector('.art-compare-progress i').style.width=`${discoveries.size/3*100}%`;
    };
    panel.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();mode=b.dataset.mode;selected=[];audio?.sfx('choice');update();}));
    panel.querySelectorAll('[data-work]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const id=b.dataset.work;if(selected.includes(id))selected=selected.filter(x=>x!==id);else{if(selected.length>=2)selected.shift();selected.push(id);}audio?.sfx('choice');update();}));
    panel.querySelector('.art-compare-check').addEventListener('click',e=>{e.stopPropagation();if(selected.length!==2)return;discoveries.add(mode);const result=panel.querySelector('.art-compare-result');result.querySelector('span').textContent=`${modes[mode][0]}の比較`;result.querySelector('p').textContent=artworkComparisonInsight(mode,selected);result.classList.add('revealed');if(mode==='structure')addEvidence('three_bedrooms',false);if(mode==='color')addEvidence('original_purple',false);if(mode==='purpose')addEvidence('artwork_purpose_comparison',false);if(selected.includes('sketch'))addEvidence('letter_sketch_method',false);selected=[];audio?.sfx('evidence');update();});
    panel.querySelector('.art-compare-finish').addEventListener('click',e=>{e.stopPropagation();addEvidence('historical_comparison_complete',false);panel.remove();els.dialogue.classList.remove('hidden');renderNode(n.next);});
    panel.querySelector('.art-compare-notebook').addEventListener('click',e=>{e.stopPropagation();openDialog('notebook');});
    update(); requestAnimationFrame(()=>panel.querySelector('[data-mode]')?.focus({preventScroll:true}));
  }

  function showPaintedWorldTrial(n) {
    const routes = [
      {id:'corridor',title:'左の廊下',note:'扉の内側で輪郭が途切れ、奥に床板の反復がない。',icon:'door'},
      {id:'window',title:'窓の外',note:'外景には影と床の接続がなく、色面だけが続いている。',icon:'window'},
      {id:'stabilize',title:'家具を動かす',note:'椅子とベッドの影が、床線と部屋の形を支えている。',icon:'chair'}
    ];
    let inspected = new Set(); let selected = null;
    const panel=document.createElement('section');panel.className='painted-world-trial';
    panel.innerHTML=`<div class="painted-trial-head"><p class="eyebrow">PAINTED-WORLD PHYSICS</p><h2>${escapeHtml(n.title||'描かれた空間を読む')}</h2><p>ここでは「部屋らしく見える」ことと「足場として存在する」ことが同じではない。</p></div>
      <div class="painted-room-map" aria-label="崩れかけた絵画世界"><span class="paint-wall wall-left"></span><span class="paint-wall wall-right"></span><span class="paint-bed"></span><span class="paint-chair"></span><span class="paint-floor stable-a"></span><span class="paint-floor stable-b"></span><span class="paint-void"></span>${routes.map((r,i)=>`<button type="button" class="paint-route route-${r.icon}" data-route="${i}"><strong>${r.title}</strong><span>輪郭を調べる</span></button>`).join('')}</div>
      <div class="painted-rule" aria-live="polite"><span>未観察</span><p>退避先の輪郭、影、筆触を調べてください。</p></div>
      <div class="painted-trial-actions"><button type="button" class="primary painted-commit" disabled>この方法を試す</button><small>最初の観察では、絵画世界の規則をすべて知ることはできない。</small></div>`;
    els.game.appendChild(panel);els.dialogue.classList.add('hidden');
    const update=()=>{panel.querySelectorAll('[data-route]').forEach(b=>{const i=Number(b.dataset.route);b.classList.toggle('inspected',inspected.has(i));b.classList.toggle('selected',selected===i);b.querySelector('span').textContent=inspected.has(i)?routes[i].note:'輪郭を調べる';});panel.querySelector('.painted-commit').disabled=selected===null;};
    panel.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const i=Number(b.dataset.route);inspected.add(i);selected=i;panel.querySelector('.painted-rule span').textContent=routes[i].title;panel.querySelector('.painted-rule p').textContent=routes[i].note;audio?.sfx('choice');update();}));
    panel.querySelector('.painted-commit').addEventListener('click',e=>{e.stopPropagation();if(selected===null)return;const choice=n.choices[selected];metricIncrement('choiceSelections',`${n.id}:${selected+1}`);applyChoiceImpact(n.id,selected);if(choice.set)applySet(choice.set);panel.remove();els.dialogue.classList.remove('hidden');renderNode(choice.next);});
    update();
  }

  function showPaintedRoomPuzzle(n,cfg) {
    const pieces={chair:{label:'椅子',correct:'chair-line'},door:{label:'扉',correct:'door-closed'},bed:{label:'ベッド',correct:'bed-board'}};
    let selected=null;const placed={};
    const panel=document.createElement('section');panel.className='puzzle-panel painted-room-puzzle';
    panel.innerHTML=`<div class="puzzle-heading"><p class="eyebrow">PAINTED SPACE RECONSTRUCTION</p><h2>${escapeHtml(n.title)}</h2><p>床板、鉛筆線、家具の影を重ねる。記憶に似せるのではなく、今見える痕跡へ戻す。</p></div>
      <div class="paint-restore-layout"><div class="paint-piece-tray">${Object.entries(pieces).map(([id,p])=>`<button type="button" draggable="true" data-piece="${id}"><span>配置物</span><strong>${p.label}</strong></button>`).join('')}</div>
      <div class="paint-restore-canvas"><div class="restore-wall"></div><button type="button" data-zone="door-open"><span>扉・開いた境界</span></button><button type="button" data-zone="door-closed"><span>扉・閉じた輪郭</span></button><button type="button" data-zone="chair-window"><span>椅子・窓際</span></button><button type="button" data-zone="chair-line"><span>椅子・鉛筆線</span></button><button type="button" data-zone="bed-wall"><span>ベッド・壁際</span></button><button type="button" data-zone="bed-board"><span>ベッド・床板一枚</span></button><div class="restore-void">描かれていない領域</div></div></div>
      <p class="puzzle-feedback" aria-live="polite">配置物を選び、痕跡の位置へ置いてください。</p><div class="tactile-progress"><strong>配置 0/3</strong><span><i class="tactile-progress-fill"></i></span></div>
      <div class="puzzle-primary-actions"><button type="button" class="primary puzzle-check">構図を安定させる</button><button type="button" class="paint-reset">配置を戻す</button></div>`;
    els.game.appendChild(panel);els.dialogue.classList.add('hidden');
    const update=()=>{panel.querySelectorAll('[data-piece]').forEach(b=>b.classList.toggle('selected',b.dataset.piece===selected));panel.querySelectorAll('[data-zone]').forEach(z=>{const occupant=Object.entries(placed).find(([,zone])=>zone===z.dataset.zone)?.[0];z.classList.toggle('occupied',!!occupant);z.querySelector('span').textContent=occupant?`${pieces[occupant].label}を配置`:(z.dataset.zone.replaceAll('-','・'));});updatePuzzleProgress(panel,Object.keys(placed).length,3,'配置');};
    const assign=(piece,zone)=>{if(!piece)return;placed[piece]=zone;selected=null;audio?.sfx('choice');update();};
    panel.querySelectorAll('[data-piece]').forEach(b=>{b.addEventListener('click',e=>{e.stopPropagation();selected=selected===b.dataset.piece?null:b.dataset.piece;update();});b.addEventListener('dragstart',e=>{e.dataTransfer?.setData('text/plain',b.dataset.piece);});});
    panel.querySelectorAll('[data-zone]').forEach(z=>{z.addEventListener('click',e=>{e.stopPropagation();if(!selected){panel.querySelector('.puzzle-feedback').textContent='先に配置物を選んでください。';return;}assign(selected,z.dataset.zone);});z.addEventListener('dragover',e=>e.preventDefault());z.addEventListener('drop',e=>{e.preventDefault();assign(e.dataTransfer?.getData('text/plain'),z.dataset.zone);});});
    panel.querySelector('.paint-reset').addEventListener('click',e=>{e.stopPropagation();Object.keys(placed).forEach(k=>delete placed[k]);selected=null;update();});
    panel.querySelector('.puzzle-check').addEventListener('click',e=>{e.stopPropagation();metricIncrement('puzzleAttempts',n.id);const missing=Object.keys(pieces).filter(k=>!placed[k]);const wrong=Object.keys(pieces).filter(k=>placed[k]&&placed[k]!==pieces[k].correct);if(!missing.length&&!wrong.length){els.dialogue.classList.remove('hidden');puzzleComplete(panel,n,cfg);return;}audio?.sfx('error');panel.querySelector('.puzzle-feedback').textContent=missing.length?`未配置：${missing.map(k=>pieces[k].label).join('、')}`:`痕跡と一致しない：${wrong.map(k=>pieces[k].label).join('、')}。影、線、床板をもう一度比べる。`;});
    update();
  }


  function consequencePanelBase(n, eyebrow, title, intro) {
    const panel=document.createElement('section');
    panel.className='puzzle-panel consequence-panel';
    panel.innerHTML=`<div class="puzzle-heading"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(intro)}</p></div>`;
    els.game.appendChild(panel); els.dialogue.classList.add('hidden');
    return panel;
  }

  function finishConsequencePanel(panel,n,evidence,flag) {
    audio?.sfx('evidence');
    if(evidence) addEvidence(evidence,false);
    if(flag) state.flags[flag]=true;
    saveGame(false,SAVE_KEYS.auto);
    panel.classList.add('puzzle-complete');
    panel.querySelectorAll('button').forEach(b=>b.disabled=true);
    setTimeout(()=>{panel.remove();els.dialogue.classList.remove('hidden');renderNode(n.next);},state.settings.reduceMotion?120:850);
  }

  function showTeamCommitment(n) {
    const profiles=relationshipProfiles();
    const roles={claire:'冷却監視・外部ハッシュ・澄の曝露確認',marc:'主電源・停止権限・設定変更ログ',leon:'原本箱・所有者同意・搬出停止'};
    const confirmed=new Set();
    const panel=consequencePanelBase(n,'TEAM COMMITMENT','責任を渡すことを、操作にする','「協力する」と言うだけでは足りない。誰に何を任せ、澄が何を奪わないかを確定する。');
    panel.insertAdjacentHTML('beforeend',`${relationshipSummaryHtml(true)}<div class="commitment-grid">${Object.entries(roles).map(([key,role])=>`<button type="button" data-person="${key}" class="commitment-card tier-${profiles[key].tier}"><span>${escapeHtml(profiles[key].name)}</span><strong>${escapeHtml(role)}</strong><small>${profiles[key].tier==='entrusted'?'担当を先に引き受ける準備がある。':profiles[key].tier==='conditional'?'役割境界を明文化すれば引き受ける。':'曖昧な依頼では動かない。責任範囲の確認が必要。'}</small><em>未確認</em></button>`).join('')}</div><p class="puzzle-feedback" aria-live="polite">三人の担当を一つずつ確認してください。</p><div class="tactile-progress"><strong>役割 0/3</strong><span><i class="tactile-progress-fill"></i></span></div><div class="puzzle-primary-actions"><button type="button" class="primary commitment-finish" disabled>共同手順へ進む</button></div>`);
    const update=()=>{panel.querySelectorAll('[data-person]').forEach(b=>{const ok=confirmed.has(b.dataset.person);b.classList.toggle('confirmed',ok);b.querySelector('em').textContent=ok?'責任範囲を確認':'未確認';});updatePuzzleProgress(panel,confirmed.size,3,'役割');panel.querySelector('.commitment-finish').disabled=confirmed.size<3;};
    panel.querySelectorAll('[data-person]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();confirmed.add(b.dataset.person);audio?.sfx('choice');panel.querySelector('.puzzle-feedback').textContent=`${profiles[b.dataset.person].name}へ、${roles[b.dataset.person]}を渡した。`;update();}));
    panel.querySelector('.commitment-finish').addEventListener('click',e=>{e.stopPropagation();if(confirmed.size<3)return;finishConsequencePanel(panel,n,'team_commitment_record','teamCommitmentReady');});
    update();
  }

  function showChainAssembly(n) {
    const profiles=relationshipProfiles();
    const approved=new Set(Object.keys(profiles).filter(k=>profiles[k].tier==='entrusted'));
    const options={
      claire:[['role_claire','役割カードと曝露確認'],['final_reacquisition_list','澄の再取得表'],['memory','前周回のクレールの言葉']],
      marc:[['cleanup_cancelled','解除した予約タスクと操作ログ'],['report_value_set','作品の研究価値'],['memory','窓に見えた黒い影']],
      leon:[['leon_consent_record','開封・連続撮影・外部保存への同意'],['env_frame_scar','祖父が覚えていた額縁の傷'],['memory','過去の倉庫で見た購入票']]
    };
    const panel=consequencePanelBase(n,'CHAIN OF CUSTODY','協力を、現在の証拠へ結ぶ','信頼だけで原本を開けない。自発的な協力がない場合は、今ここにある記録を示して立会いを成立させる。');
    panel.insertAdjacentHTML('beforeend',`${relationshipSummaryHtml(true)}<div class="custody-grid">${Object.keys(profiles).map(key=>`<article class="custody-card tier-${profiles[key].tier}" data-custody="${key}"><header><div><strong>${profiles[key].name}</strong><span>${profiles[key].role}</span></div><em>${approved.has(key)?'立会い確定':'根拠待ち'}</em></header><div class="custody-options">${approved.has(key)?'<p>これまでの対応により、自分の責任範囲を先に引き受けた。</p>':options[key].map(([id,label])=>`<button type="button" data-proof="${id}" data-for="${key}" ${id!=='memory'&&!state.evidence.includes(id)?'disabled':''}>${escapeHtml(label)}</button>`).join('')}</div></article>`).join('')}</div><p class="puzzle-feedback" aria-live="polite">立会いが未確定の人物には、現在の記録を示してください。</p><div class="tactile-progress"><strong>立会い ${approved.size}/3</strong><span><i class="tactile-progress-fill"></i></span></div><div class="puzzle-primary-actions"><button type="button" class="primary custody-finish" ${approved.size<3?'disabled':''}>原本箱の共同開封へ進む</button></div>`);
    const update=()=>{Object.keys(profiles).forEach(key=>{const card=panel.querySelector(`[data-custody="${key}"]`);const ok=approved.has(key);card.classList.toggle('confirmed',ok);card.querySelector('header em').textContent=ok?'立会い確定':'根拠待ち';if(ok)card.querySelectorAll('button').forEach(b=>b.disabled=true);});updatePuzzleProgress(panel,approved.size,3,'立会い');panel.querySelector('.custody-finish').disabled=approved.size<3;};
    panel.querySelectorAll('[data-proof]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const person=b.dataset.for;const proof=b.dataset.proof;if(proof===RELATIONSHIP_CONFIG[person].correctEvidence){approved.add(person);audio?.sfx('evidence');panel.querySelector('.puzzle-feedback').textContent=`${profiles[person].name}の責任範囲を、現在の記録へ接続した。`;}else{audio?.sfx('error');panel.querySelector('.puzzle-feedback').textContent=proof==='memory'?'未来の記憶は探索場所を示せても、立会いの根拠にはならない。':'その資料は重要だが、この人物が引き受ける操作の根拠ではない。';}update();}));
    panel.querySelector('.custody-finish').addEventListener('click',e=>{e.stopPropagation();if(approved.size<3)return;finishConsequencePanel(panel,n,'joint_chain_of_custody','chainOfCustodyReady');});
    update();
  }

  function showFinalSignature(n) {
    const profiles=relationshipProfiles();
    const expected={analysis:'sumi',imaging:'claire',facility:'marc',provenance:'leon'};
    const labels={analysis:['保存修復分析','澄'],imaging:['画像・時刻・同一性','クレール'],facility:['設備操作・変更履歴','マルク'],provenance:['原本・所有者同意','レオン']};
    const assigned={analysis:'sumi'};
    Object.keys(profiles).forEach(k=>{if(profiles[k].tier==='entrusted')assigned[profiles[k].domain]=k;});
    let selected=null;
    const panel=consequencePanelBase(n,'SIGNATURE SCOPE','名前ではなく、確認できる範囲へ署名する','共同署名は全員が同じ結論へ責任を負うことではない。各自が確認した欄だけを引き受ける。');
    panel.insertAdjacentHTML('beforeend',`${relationshipSummaryHtml(true)}<div class="signature-layout"><div class="signature-people"><button type="button" class="fixed" disabled><span>水瀬 澄</span><small>保存修復分析</small></button>${Object.keys(profiles).map(k=>`<button type="button" data-signer="${k}" class="tier-${profiles[k].tier}"><span>${profiles[k].name}</span><small>${profiles[k].role}</small></button>`).join('')}</div><div class="signature-domains">${Object.entries(labels).map(([id,[title,name]])=>`<button type="button" data-domain="${id}" ${id==='analysis'?'disabled':''}><span>${escapeHtml(title)}</span><strong>${id==='analysis'?'水瀬 澄':'未署名'}</strong></button>`).join('')}</div></div><p class="puzzle-feedback" aria-live="polite">署名者を選び、その人物が現在確認できる欄へ配置してください。</p><div class="tactile-progress"><strong>署名 ${Object.keys(assigned).length}/4</strong><span><i class="tactile-progress-fill"></i></span></div><div class="puzzle-primary-actions"><button type="button" class="primary signature-finish" disabled>最終報告へ共同署名する</button></div>`);
    const update=()=>{panel.querySelectorAll('[data-signer]').forEach(b=>b.classList.toggle('selected',b.dataset.signer===selected));panel.querySelectorAll('[data-domain]').forEach(b=>{const signer=assigned[b.dataset.domain];b.classList.toggle('confirmed',!!signer);b.querySelector('strong').textContent=signer?(signer==='sumi'?'水瀬 澄':profiles[signer].name):'未署名';});updatePuzzleProgress(panel,Object.keys(assigned).length,4,'署名');panel.querySelector('.signature-finish').disabled=Object.keys(assigned).length<4;};
    panel.querySelectorAll('[data-signer]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();selected=selected===b.dataset.signer?null:b.dataset.signer;audio?.sfx('choice');update();}));
    panel.querySelectorAll('[data-domain]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();if(!selected){panel.querySelector('.puzzle-feedback').textContent='先に署名者を選んでください。';return;}const domain=b.dataset.domain;if(expected[domain]!==selected){audio?.sfx('error');panel.querySelector('.puzzle-feedback').textContent='その人物が現在確認した範囲を越えている。専門性と立会い記録を確認する。';return;}assigned[domain]=selected;selected=null;audio?.sfx('evidence');panel.querySelector('.puzzle-feedback').textContent=`${labels[domain][0]}を、${profiles[assigned[domain]].name}の責任範囲へ接続した。`;update();}));
    panel.querySelector('.signature-finish').addEventListener('click',e=>{e.stopPropagation();if(Object.keys(assigned).length<4)return;finishConsequencePanel(panel,n,'joint_signatures','finalCoalitionReady');});
    update();
  }

  function finalReportAudit() {
    const rows=FINAL_REPORT_REQUIREMENTS.map(req=>{const missing=req.ids.filter(id=>!state.evidence.includes(id));return {...req,missing,ok:!missing.length};});
    const coalitionOk=!!state.flags.finalCoalitionReady && state.evidence.includes('joint_signatures');
    rows.push({title:'専門領域別の共同署名',missing:coalitionOk?[]:['joint_signatures'],ok:coalitionOk});
    const ready=rows.every(row=>row.ok);const top=judgementProfile()[0]||['evidence',0];const label=JUDGEMENT_LABELS[top[0]]?.[0]||'根拠';
    const html=`<section class="final-report-audit ${ready?'ready':'incomplete'}"><div><p class="eyebrow">REPORT EVIDENCE AUDIT</p><h3>この結論を、現在の証拠だけで書けるか</h3><p>未来で知った内容ではなく、現周回で再取得した物証と記録を確認する。これまで最も強く表れた判断軸は「${escapeHtml(label)}」。</p></div><ul>${rows.map(row=>`<li class="${row.ok?'ok':'missing'}"><span>${row.ok?'確認済み':'不足'}</span><strong>${escapeHtml(row.title)}</strong>${row.ok?'':`<small>${row.missing.length}件の根拠が未取得</small>`}</li>`).join('')}</ul><p class="audit-verdict">${ready?'最終報告の各層を、現在の証拠へ接続できる。':'完全な分離報告には、現在の証拠が足りない。保留または追加調査を選べる。'}</p></section>`;
    return {ready,html};
  }

  function getPuzzleConfig(n) {
    return n.puzzle || {
      fields: [
        {key:'chair',label:'椅子',options:[['window','窓際のまま'],['line','鉛筆線へ戻す'],['door','扉の前へ置く']],correct:'line'},
        {key:'door',label:'左扉',options:[['open','開いたまま'],['half','半開き'],['closed','完全に閉じる']],correct:'closed'},
        {key:'bed',label:'ベッド',options:[['wall','壁へ密着'],['oneboard','床板一枚分離す'],['center','中央へ寄せる']],correct:'oneboard'}
      ],
      success:'スケッチ、鉛筆線、家具の影が一致した。', button:'構図を確定する'
    };
  }

  function optionValue(option) { return Array.isArray(option) ? option[0] : option.value; }
  function optionLabel(option) { return Array.isArray(option) ? option[1] : option.label; }

  function puzzleComplete(panel, n, cfg) {
    audio?.sfx('evidence');
    const feedback = panel.querySelector('.puzzle-feedback');
    feedback.textContent = cfg.success || '観察と配置が一致した。';
    panel.classList.add('puzzle-complete');
    panel.querySelectorAll('button').forEach(button => { button.disabled = true; });
    if (cfg.set) applySet(cfg.set);
    for (const ev of cfg.evidence || []) addEvidence(ev, false);
    setTimeout(() => { panel.remove(); renderNode(n.next); }, 950);
  }

  function updatePuzzleProgress(panel, complete, total, label = '配置') {
    const progress = panel.querySelector('.tactile-progress strong');
    const fill = panel.querySelector('.tactile-progress-fill');
    if (progress) progress.textContent = `${label} ${complete}/${total}`;
    if (fill) fill.style.width = `${total ? (complete / total) * 100 : 0}%`;
  }

  function attachPuzzleNotebook(panel) {
    panel.querySelector('.puzzle-notebook')?.addEventListener('click', e => {
      e.stopPropagation();
      openDialog('notebook');
    });
  }

  function showBoardPuzzle(n, cfg, blueprint) {
    const fields = cfg.fields || [];
    const values = {};
    const panel = document.createElement('section');
    panel.className = `puzzle-panel tactile-puzzle tactile-${blueprint.theme || 'board'}`;
    panel.innerHTML = `
      <div class="puzzle-heading">
        <p class="eyebrow">${escapeHtml(blueprint.eyebrow || 'RESTORATION ANALYSIS')}</p>
        <h2>${escapeHtml(n.title)}</h2>
        <p>${escapeHtml(blueprint.instruction || n.text || '')}</p>
      </div>
      <div class="tactile-progress" aria-live="polite"><strong>配置 0/${fields.length}</strong><span><i class="tactile-progress-fill"></i></span></div>
      <div class="tactile-board" role="group" aria-label="${escapeHtml(n.title)}">
        ${fields.map((field, index) => {
          const meta = blueprint.items?.[field.key] || [field.label, '物証と矛盾しない状態を選ぶ'];
          return `<article class="tactile-field" data-key="${escapeHtml(field.key)}">
            <div class="tactile-field-head"><span class="tactile-index">${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(meta[0] || field.label)}</h3><p>${escapeHtml(meta[1] || '')}</p></div></div>
            <div class="tactile-options" role="group" aria-label="${escapeHtml(field.label)}の候補">
              ${field.options.map(option => `<button type="button" data-value="${escapeHtml(optionValue(option))}">${escapeHtml(optionLabel(option))}</button>`).join('')}
            </div>
            <p class="tactile-selection" aria-live="polite">未配置</p>
          </article>`;
        }).join('')}
      </div>
      <p class="puzzle-feedback" aria-live="polite"></p>
      <div class="puzzle-progressive-hint hidden" aria-live="polite"></div>
      <div class="puzzle-primary-actions"><button type="button" class="primary puzzle-check">${escapeHtml(cfg.button || '配置を確定する')}</button></div>
      <div class="puzzle-secondary-actions"><button type="button" class="puzzle-notebook">観察手帳を開く</button><button type="button" class="puzzle-assist hidden">一項目の候補を示す</button></div>`;
    els.game.appendChild(panel);
    attachPuzzleNotebook(panel);

    panel.querySelectorAll('.tactile-options button').forEach(button => {
      button.addEventListener('click', e => {
        e.stopPropagation();
        const fieldEl = button.closest('.tactile-field');
        const key = fieldEl.dataset.key;
        values[key] = button.dataset.value;
        fieldEl.querySelectorAll('.tactile-options button').forEach(b => b.classList.toggle('selected', b === button));
        fieldEl.classList.add('configured');
        fieldEl.querySelector('.tactile-selection').textContent = `選択：${button.textContent}`;
        updatePuzzleProgress(panel, Object.keys(values).length, fields.length, '配置');
        audio?.sfx('choice');
      });
    });

    let localAttempts = 0;
    panel.querySelector('.puzzle-check').addEventListener('click', e => {
      e.stopPropagation();
      localAttempts += 1;
      metricIncrement('puzzleAttempts', n.id);
      const unanswered = fields.filter(field => !values[field.key]);
      const wrong = fields.filter(field => values[field.key] && values[field.key] !== field.correct);
      const feedback = panel.querySelector('.puzzle-feedback');
      panel.querySelectorAll('.tactile-field').forEach(fieldEl => fieldEl.classList.remove('needs-review'));
      [...unanswered, ...wrong].forEach(field => panel.querySelector(`.tactile-field[data-key="${CSS.escape(field.key)}"]`)?.classList.add('needs-review'));
      if (!unanswered.length && !wrong.length) {
        puzzleComplete(panel, n, cfg);
        return;
      }
      audio?.sfx('error');
      feedback.textContent = unanswered.length
        ? `未配置の項目がある：${unanswered.map(field => field.label).join('、')}。`
        : (cfg.failure || `物証と一致しない項目がある：${wrong.map(field => field.label).join('、')}。`);
      const progressive = panel.querySelector('.puzzle-progressive-hint');
      if (localAttempts >= 2 && state.settings.assistMode !== 'off') {
        progressive.classList.remove('hidden');
        const targets = [...unanswered, ...wrong].slice(0, 2);
        progressive.textContent = `見直す範囲：${targets.map(field => field.label).join('、')}。選択した結果が、現在の物証を消したり一つへ統合していないか確認してください。`;
      }
      const assist = panel.querySelector('.puzzle-assist');
      if (localAttempts >= 2 && state.settings.assistMode === 'story') {
        assist.classList.remove('hidden');
        assist.onclick = ev => {
          ev.stopPropagation();
          const field = [...unanswered, ...wrong][0];
          if (!field) return;
          const target = panel.querySelector(`.tactile-field[data-key="${CSS.escape(field.key)}"] button[data-value="${CSS.escape(field.correct)}"]`);
          target?.click();
          state.metrics.hintsUsed += 1;
          assist.disabled = true;
          assist.textContent = `${field.label}の候補を反映済み`;
          progressive.classList.remove('hidden');
          progressive.textContent = `${field.label}は、現在確認できる物証と矛盾しない位置へ合わせました。`;
        };
      }
      panel.classList.remove('puzzle-error'); void panel.offsetWidth; panel.classList.add('puzzle-error');
    });
  }

  function showDragPlacementPuzzle(n, cfg, blueprint) {
    const fields = cfg.fields || [];
    const placements = {};
    let selected = null;
    const panel = document.createElement('section');
    panel.className = `puzzle-panel tactile-puzzle tactile-drag tactile-${blueprint.theme || 'placement'}`;
    const cards = fields.flatMap((field, fieldIndex) => field.options.map((option, optionIndex) => ({
      id:`${field.key}:${optionValue(option)}`, field:field.key, value:optionValue(option), label:optionLabel(option), fieldLabel:field.label,
      order:fieldIndex * 10 + optionIndex
    })));
    panel.innerHTML = `<div class="puzzle-heading"><p class="eyebrow">${escapeHtml(blueprint.eyebrow || 'PLACEMENT')}</p><h2>${escapeHtml(n.title)}</h2><p>${escapeHtml(blueprint.instruction || n.text || '')}</p></div>
      <div class="tactile-progress" aria-live="polite"><strong>配置 0/${fields.length}</strong><span><i class="tactile-progress-fill"></i></span></div>
      <div class="drag-placement-layout">
        <section class="drag-card-tray" aria-label="配置する候補"><div class="drag-card-tray-head"><strong>候補カード</strong><span>ドラッグ、またはカード→配置先の順にタップ</span></div><div class="drag-card-list">${cards.map(card => `<button type="button" draggable="true" class="drag-option-card" data-id="${escapeHtml(card.id)}" data-field="${escapeHtml(card.field)}" data-value="${escapeHtml(card.value)}"><span>${escapeHtml(card.fieldLabel)}</span><strong>${escapeHtml(card.label)}</strong></button>`).join('')}</div></section>
        <section class="drag-target-list" aria-label="配置先">${fields.map((field,index) => { const meta=blueprint.items?.[field.key]||[field.label,'物証と矛盾しない条件']; return `<button type="button" class="drag-target" data-field="${escapeHtml(field.key)}"><span class="tactile-index">${String(index+1).padStart(2,'0')}</span><div><strong>${escapeHtml(meta[0]||field.label)}</strong><small>${escapeHtml(meta[1]||'')}</small><em>未配置</em></div></button>`; }).join('')}</section>
      </div><p class="puzzle-feedback" aria-live="polite"></p><div class="puzzle-progressive-hint hidden" aria-live="polite"></div>
      <div class="puzzle-primary-actions"><button type="button" class="primary puzzle-check">${escapeHtml(cfg.button || '配置を確定する')}</button><button type="button" class="drag-reset">配置を戻す</button></div><div class="puzzle-secondary-actions"><button type="button" class="puzzle-notebook">観察手帳を開く</button><button type="button" class="puzzle-assist hidden">一項目の候補を示す</button></div>`;
    els.game.appendChild(panel); attachPuzzleNotebook(panel);
    const cardMap = new Map(cards.map(c => [c.id,c]));
    function update() {
      panel.querySelectorAll('.drag-option-card').forEach(card => card.classList.toggle('active', card.dataset.id === selected));
      fields.forEach(field => {
        const target=panel.querySelector(`.drag-target[data-field="${CSS.escape(field.key)}"]`); const cardId=placements[field.key]; const card=cardMap.get(cardId);
        target.classList.toggle('configured',!!card); target.querySelector('em').textContent=card ? card.label : '未配置';
      });
      updatePuzzleProgress(panel,Object.keys(placements).length,fields.length,'配置');
    }
    function assign(cardId, fieldKey) {
      const card=cardMap.get(cardId); if(!card || card.field !== fieldKey) { panel.querySelector('.puzzle-feedback').textContent='このカードは別の観察項目に属しています。'; return; }
      placements[fieldKey]=cardId; selected=null; audio?.sfx('choice'); update();
    }
    panel.querySelectorAll('.drag-option-card').forEach(card => {
      card.addEventListener('click',e=>{e.stopPropagation();selected=selected===card.dataset.id?null:card.dataset.id;update();});
      card.addEventListener('dragstart',e=>{selected=card.dataset.id;e.dataTransfer?.setData('text/plain',selected);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';update();});
    });
    panel.querySelectorAll('.drag-target').forEach(target => {
      target.addEventListener('click',e=>{e.stopPropagation();if(!selected){panel.querySelector('.puzzle-feedback').textContent='先に候補カードを選んでください。';return;}assign(selected,target.dataset.field);});
      target.addEventListener('dragover',e=>{e.preventDefault();target.classList.add('drag-over');});
      target.addEventListener('dragleave',()=>target.classList.remove('drag-over'));
      target.addEventListener('drop',e=>{e.preventDefault();target.classList.remove('drag-over');assign(e.dataTransfer?.getData('text/plain')||selected,target.dataset.field);});
    });
    panel.querySelector('.drag-reset').addEventListener('click',e=>{e.stopPropagation();Object.keys(placements).forEach(k=>delete placements[k]);selected=null;update();});
    let attempts=0;
    panel.querySelector('.puzzle-check').addEventListener('click',e=>{
      e.stopPropagation(); attempts++; metricIncrement('puzzleAttempts',n.id);
      const unanswered=fields.filter(f=>!placements[f.key]); const wrong=fields.filter(f=>placements[f.key] && cardMap.get(placements[f.key])?.value!==f.correct);
      panel.querySelectorAll('.drag-target').forEach(t=>t.classList.toggle('needs-review',unanswered.concat(wrong).some(f=>f.key===t.dataset.field)));
      if(!unanswered.length&&!wrong.length){puzzleComplete(panel,n,cfg);return;}
      panel.querySelector('.puzzle-feedback').textContent=unanswered.length?`未配置：${unanswered.map(f=>f.label).join('、')}`:`物証と一致しない配置：${wrong.map(f=>f.label).join('、')}`;
      if(attempts>=2&&state.settings.assistMode!=='off'){const hint=panel.querySelector('.puzzle-progressive-hint');hint.classList.remove('hidden');hint.textContent=`見直す範囲：${[...unanswered,...wrong].slice(0,2).map(f=>f.label).join('、')}。カードの説明と、配置先の物理条件を照合してください。`;}
      const assist=panel.querySelector('.puzzle-assist');if(attempts>=2&&state.settings.assistMode==='story'){assist.classList.remove('hidden');assist.onclick=ev=>{ev.stopPropagation();const f=[...unanswered,...wrong][0];if(!f)return;assign(`${f.key}:${f.correct}`,f.key);state.metrics.hintsUsed++;assist.disabled=true;};}
    });
    update();
  }

  function showSortPuzzle(n, cfg, blueprint) {
    const assignments = {};
    let activeKey = null;
    const panel = document.createElement('section');
    panel.className = `puzzle-panel tactile-puzzle tactile-sort tactile-${blueprint.theme || 'sort'}`;
    panel.innerHTML = `
      <div class="puzzle-heading">
        <p class="eyebrow">${escapeHtml(blueprint.eyebrow || 'EVIDENCE SORTING')}</p>
        <h2>${escapeHtml(n.title)}</h2>
        <p>${escapeHtml(blueprint.instruction || n.text || '')}</p>
      </div>
      <div class="tactile-progress" aria-live="polite"><strong>分類 0/${blueprint.items.length}</strong><span><i class="tactile-progress-fill"></i></span></div>
      <div class="sort-deck" aria-label="未分類の資料">
        <div class="sort-deck-head"><strong>資料カード</strong><span>カードを選び、分類先を選択。PCではドラッグも可能。</span></div>
        <div class="sort-card-list" data-category="unassigned">
          ${blueprint.items.map(([key, label]) => `<button type="button" draggable="true" class="sort-card" data-key="${escapeHtml(key)}"><span>資料</span><strong>${escapeHtml(label)}</strong><small>未分類</small></button>`).join('')}
        </div>
      </div>
      <div class="sort-mobile-dock"><span>選択中</span><strong>資料カードを選択</strong><div></div></div>
      <div class="sort-bins">
        ${blueprint.categories.map(([id, label, description]) => `<section class="sort-bin" data-category="${escapeHtml(id)}"><button type="button" class="sort-bin-target" data-category="${escapeHtml(id)}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(description)}</span><i>0件</i></button><div class="sort-bin-cards" data-category="${escapeHtml(id)}"></div></section>`).join('')}
      </div>
      <p class="puzzle-feedback" aria-live="polite"></p>
      <div class="puzzle-progressive-hint hidden" aria-live="polite"></div>
      <div class="puzzle-primary-actions"><button type="button" class="primary puzzle-check">${escapeHtml(cfg.button || '分類を確定する')}</button><button type="button" class="sort-reset">すべて未分類へ戻す</button></div>
      <div class="puzzle-secondary-actions"><button type="button" class="puzzle-notebook">観察手帳を開く</button><button type="button" class="puzzle-assist hidden">一項目の候補を示す</button></div>`;
    els.game.appendChild(panel);
    attachPuzzleNotebook(panel);

    const itemMap = new Map(blueprint.items.map(item => [item[0], item]));
    const categoryMap = new Map(blueprint.categories.map(category => [category[0], category]));

    function updateBins() {
      panel.querySelectorAll('.sort-bin').forEach(bin => {
        const category = bin.dataset.category;
        const count = Object.values(assignments).filter(value => value === category).length;
        bin.querySelector('.sort-bin-target i').textContent = `${count}件`;
        bin.classList.toggle('has-cards', count > 0);
      });
      panel.querySelectorAll('.sort-card').forEach(card => {
        const category = assignments[card.dataset.key];
        const label = categoryMap.get(category)?.[1] || '未分類';
        card.querySelector('small').textContent = label;
        card.classList.toggle('active', card.dataset.key === activeKey);
      });
      updatePuzzleProgress(panel, Object.keys(assignments).length, blueprint.items.length, '分類');
      const dock = panel.querySelector('.sort-mobile-dock');
      if (dock) { const item = itemMap.get(activeKey); dock.querySelector('strong').textContent = item?.[1] || '資料カードを選択'; dock.querySelector('div').innerHTML = blueprint.categories.map(([id,label]) => `<button type="button" data-category="${escapeHtml(id)}" ${activeKey ? '' : 'disabled'}>${escapeHtml(label)}</button>`).join(''); dock.querySelectorAll('button').forEach(button => button.addEventListener('click', e => { e.stopPropagation(); if (activeKey) assign(activeKey, button.dataset.category); })); }
    }

    function assign(key, category) {
      if (!itemMap.has(key) || !categoryMap.has(category)) return;
      assignments[key] = category;
      const card = panel.querySelector(`.sort-card[data-key="${CSS.escape(key)}"]`);
      const destination = panel.querySelector(`.sort-bin-cards[data-category="${CSS.escape(category)}"]`);
      destination?.appendChild(card);
      activeKey = null;
      updateBins();
      audio?.sfx('choice');
    }

    function returnAll() {
      const deck = panel.querySelector('.sort-card-list');
      blueprint.items.forEach(([key]) => {
        const card = panel.querySelector(`.sort-card[data-key="${CSS.escape(key)}"]`);
        if (card) deck.appendChild(card);
      });
      Object.keys(assignments).forEach(key => delete assignments[key]);
      activeKey = null;
      updateBins();
    }

    panel.querySelectorAll('.sort-card').forEach(card => {
      card.addEventListener('click', e => {
        e.stopPropagation();
        activeKey = activeKey === card.dataset.key ? null : card.dataset.key;
        updateBins();
      });
      card.addEventListener('dragstart', e => {
        activeKey = card.dataset.key;
        e.dataTransfer?.setData('text/plain', card.dataset.key);
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        updateBins();
      });
    });

    panel.querySelectorAll('.sort-bin-target').forEach(target => {
      target.addEventListener('click', e => {
        e.stopPropagation();
        if (!activeKey) {
          panel.querySelector('.puzzle-feedback').textContent = '先に資料カードを一枚選んでください。';
          return;
        }
        assign(activeKey, target.dataset.category);
      });
    });

    panel.querySelectorAll('.sort-bin').forEach(bin => {
      bin.addEventListener('dragover', e => { e.preventDefault(); bin.classList.add('drag-over'); });
      bin.addEventListener('dragleave', () => bin.classList.remove('drag-over'));
      bin.addEventListener('drop', e => {
        e.preventDefault();
        bin.classList.remove('drag-over');
        const key = e.dataTransfer?.getData('text/plain') || activeKey;
        assign(key, bin.dataset.category);
      });
    });

    panel.querySelector('.sort-reset').addEventListener('click', e => { e.stopPropagation(); returnAll(); });

    let localAttempts = 0;
    panel.querySelector('.puzzle-check').addEventListener('click', e => {
      e.stopPropagation();
      localAttempts += 1;
      metricIncrement('puzzleAttempts', n.id);
      const unanswered = blueprint.items.filter(([key]) => !assignments[key]);
      const wrong = blueprint.items.filter(([key, , correct]) => assignments[key] && assignments[key] !== correct);
      panel.querySelectorAll('.sort-card').forEach(card => card.classList.remove('needs-review'));
      [...unanswered, ...wrong].forEach(([key]) => panel.querySelector(`.sort-card[data-key="${CSS.escape(key)}"]`)?.classList.add('needs-review'));
      const feedback = panel.querySelector('.puzzle-feedback');
      if (!unanswered.length && !wrong.length) {
        puzzleComplete(panel, n, cfg);
        return;
      }
      audio?.sfx('error');
      feedback.textContent = unanswered.length
        ? `未分類の資料がある：${unanswered.map(([,label]) => label).join('、')}。`
        : `分類根拠が一致しない資料がある：${wrong.map(([,label]) => label).join('、')}。`;
      const progressive = panel.querySelector('.puzzle-progressive-hint');
      if (localAttempts >= 2 && state.settings.assistMode !== 'off') {
        progressive.classList.remove('hidden');
        const targets = [...unanswered, ...wrong].slice(0, 2);
        progressive.textContent = `見直す資料：${targets.map(([,label]) => label).join('、')}。紙や言葉の古さではなく、内容を現在確認できる方法で分類してください。`;
      }
      const assist = panel.querySelector('.puzzle-assist');
      if (localAttempts >= 2 && state.settings.assistMode === 'story') {
        assist.classList.remove('hidden');
        assist.onclick = ev => {
          ev.stopPropagation();
          const item = [...unanswered, ...wrong][0];
          if (!item) return;
          assign(item[0], item[2]);
          state.metrics.hintsUsed += 1;
          assist.disabled = true;
          assist.textContent = `${item[1]}を分類済み`;
          progressive.classList.remove('hidden');
          progressive.textContent = `${item[1]}は、現在確認できる根拠の種類へ移しました。`;
        };
      }
      panel.classList.remove('puzzle-error'); void panel.offsetWidth; panel.classList.add('puzzle-error');
    });

    updateBins();
  }

  function showPuzzle(n) {
    const cfg = getPuzzleConfig(n);
    const blueprint = PUZZLE_BLUEPRINTS[n.id] || {kind:'board', theme:'board', eyebrow:'RESTORATION ANALYSIS', instruction:n.text || '', items:{}};
    if (n.id === 'vR6') showPaintedRoomPuzzle(n, cfg);
    else if (blueprint.kind === 'sort') showSortPuzzle(n, cfg, blueprint);
    else if (['a233','a271','a526'].includes(n.id)) showDragPlacementPuzzle(n, cfg, blueprint);
    else showBoardPuzzle(n, cfg, blueprint);
  }

  function showEnding(kind) {
    pauseModes(true);
    state.flags.lastEndingKind = kind; unlockEnding(kind);
    els.game.classList.add('hidden'); els.ending.classList.remove('hidden');
    const endingArt = ENDING_ART[kind] || ENDING_ART.normal;
    if (els.endingImage) { els.endingImage.src = endingArt; els.endingImage.alt = '到達した結末を象徴する場面'; }
    if (kind === 'early') {
      $('#ending-screen .eyebrow').textContent = 'NORMAL END — 見なかった夜';
      $('#ending-screen h2').textContent = '誰も死ななかった。誰の名前も戻らなかった。';
      els.endingSummary.textContent = node.text;
    } else {
      const info = DATA.endings?.[kind] || {eyebrow:'CHAPTER COMPLETE', title:'記録は次の層へ続く。', summary:node.text || ''};
      $('#ending-screen .eyebrow').textContent = info.eyebrow;
      $('#ending-screen h2').textContent = info.title;
      els.endingSummary.textContent = `${info.summary || node.text || ''} ${judgementClosingLine(kind)}`;
    }
    const minutes = Math.max(1, Math.round((state.totalPlayMs + Date.now() - state.playStartedAt) / 60000));
    const readPercent = Math.round((Object.keys(state.readNodes).length / DATA.nodes.length) * 100);
    const topJudgement = judgementProfile()[0] || ['evidence',0];
    els.reconsiderReport?.classList.toggle('hidden', kind === 'early');
    els.endingStats.innerHTML = `<div class="stat"><strong>${state.deaths}</strong>死亡</div><div class="stat"><strong>${state.evidence.length}</strong>記録</div><div class="stat"><strong>${minutes}</strong>分</div><div class="stat"><strong>${JUDGEMENT_LABELS[topJudgement[0]]?.[0] || '根拠'}</strong>判断軸</div>` + relationshipSummaryHtml(true) + judgementSummaryHtml(true) + consequenceEpilogueHtml(kind);
    saveGame(false, SAVE_KEYS.auto);
  }

  function renderNotebook() {
    const query = ($('#notebook-search')?.value || '').trim().toLowerCase();
    const selectedFilter = $('#notebook-filter')?.value || 'all';
    const unlocked = state.evidence.map((id, unlockIndex) => ({id, unlockIndex, ...DATA.evidence[id]})).filter(x => x.title);
    const records = unlocked.filter(e => e.kind !== 'person');
    const peopleHistory = unlocked.filter(e => e.kind === 'person');
    const latestPeople = [...peopleHistory.reduce((map, entry) => map.set(entry.personId || entry.id, entry), new Map()).values()];
    let allItems = notebookView === 'people' ? latestPeople : notebookView === 'records' ? records : [...latestPeople, ...records];
    const groups = [...new Set(allItems.map(e => e.group))];
    const filterEl = $('#notebook-filter');
    if (filterEl) {
      const selected = selectedFilter;
      filterEl.innerHTML = `<option value="all">すべての分類</option>${groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('')}`;
      filterEl.value = groups.includes(selected) ? selected : 'all';
    }
    const activeFilter = filterEl?.value || 'all';
    const visible = allItems.filter(e => (activeFilter === 'all' || e.group === activeFilter) && (!query || `${e.title} ${e.text || ''} ${e.group || ''} ${e.role || ''} ${(e.facts || []).join(' ')} ${e.currentView || ''} ${e.stake || ''}`.toLowerCase().includes(query)));
    const grouped = {};
    visible.forEach(e => (grouped[e.group] ??= []).push(e));
    $('#notebook-count').textContent = `${visible.length} / ${allItems.length}件`;
    const renderPerson = e => `<article class="note-item person-note" data-person="${escapeHtml(e.personId || '')}"><div class="person-note-heading"><div><strong>${escapeHtml(e.title)}</strong><span>${escapeHtml(e.role || '')}</span></div><span class="person-note-status">現時点</span></div><div class="person-note-grid"><section><h4>確認できた事実</h4><ul>${(e.facts || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section><h4>澄の現在の見方</h4><p>${escapeHtml(e.currentView || e.text || '')}</p></section></div><div class="person-note-stake"><b>この夜に失うもの</b><p>${escapeHtml(e.stake || 'まだ分からない。')}</p></div></article>`;
    const renderRecord = e => { const imageKey=EVIDENCE_IMAGE_MAP[e.id]; const imageSrc=imageKey ? `assets/evidence-closeups/${imageKey}.webp` : ''; return `<article class="note-item ${imageSrc?'has-evidence-image':''}">${imageSrc?`<button type="button" class="evidence-thumb" data-evidence-src="${escapeHtml(imageSrc)}" data-evidence-title="${escapeHtml(e.title)}" aria-label="${escapeHtml(e.title)}の画像を拡大"><img src="${escapeHtml(imageSrc)}" alt="" loading="lazy"></button>`:''}<div><strong>${escapeHtml(e.title)}</strong><p>${escapeHtml(e.text)}</p></div></article>`; };
    $('#notebook-content').innerHTML = Object.entries(grouped).map(([g, items]) => `<section class="note-group ${g === '人物観察' ? 'people-group' : ''}"><div class="note-group-heading"><h3>${escapeHtml(g)}</h3><span>${items.length}</span></div>${items.map(e => e.kind === 'person' ? renderPerson(e) : renderRecord(e)).join('')}</section>`).join('') || '<p class="empty-state">条件に合う記録はありません。</p>';
    document.querySelectorAll('.evidence-thumb').forEach(button=>button.addEventListener('click',()=>openEvidenceImage(button.dataset.evidenceSrc,button.dataset.evidenceTitle,button.closest('.note-item')?.querySelector('p')?.textContent||'')));
    document.querySelectorAll('[data-notebook-view]').forEach(button => {
      const active = button.dataset.notebookView === notebookView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function renderLog() {
    const query = ($('#log-search')?.value || '').trim().toLowerCase();
    const entries = state.log.slice(-400).filter(x => !query || `${x.speaker} ${x.text}`.toLowerCase().includes(query));
    $('#log-content').innerHTML = entries.reverse().map(x => `<div class="log-entry"><b>${escapeHtml(x.speaker || (x.mode === 'thought' ? '澄' : x.mode === 'narration' ? '観察' : x.mode === 'document' ? '記録' : '観察'))}</b><p>${escapeHtml(x.text)}</p></div>`).join('') || '<p class="empty-state">条件に合う会話はありません。</p>';
  }

  function addLog(n, seg = null, index = 0) {
    const text = seg?.text ?? n.text;
    if (!text) return;
    const key = `${n.id}:${index}`;
    const prev = state.log[state.log.length - 1];
    if (prev?.segmentKey === key) return;
    state.log.push({nodeId:n.id, segmentKey:key, mode:seg?.mode || 'dialogue', speaker:seg?.logSpeaker || seg?.speaker || n.speaker || '', text, chapter:state.currentChapter});
    if (state.log.length > 1200) state.log.shift();
  }

  function renderSaveSlots() {
    const holder = $('#save-slots');
    if (!holder) return;
    const rows = [
      ['auto', 'AUTO', '各場面で自動更新'],
      ['slot1', 'SLOT 1', '手動記録'],
      ['slot2', 'SLOT 2', '手動記録'],
      ['slot3', 'SLOT 3', '手動記録']
    ];
    holder.innerHTML = rows.map(([name, label, note]) => {
      const saved = readSave(SAVE_KEYS[name]);
      const meta = saveMetadata(saved);
      const empty = !meta;
      return `<article class="save-slot ${empty ? 'empty' : ''}" data-slot="${name}">
        <div class="save-slot-index"><strong>${label}</strong><span>${note}</span></div>
        <div class="save-slot-body">${empty ? '<p>記録なし</p>' : `<h3>${escapeHtml(meta.chapter)}</h3><p>${escapeHtml(meta.location)} · ${escapeHtml(meta.time)}</p><small>${escapeHtml(meta.stamp)} · ${escapeHtml(meta.play)} · ${meta.deaths}死亡</small>`}</div>
        <div class="save-slot-actions">${name !== 'auto' ? '<button data-action="save">上書き保存</button>' : ''}<button data-action="load" ${empty ? 'disabled' : ''}>読み込む</button>${name !== 'auto' ? `<button data-action="delete" ${empty ? 'disabled' : ''}>削除</button>` : ''}</div>
      </article>`;
    }).join('');
    holder.querySelectorAll('.save-slot').forEach(slot => {
      const name = slot.dataset.slot;
      slot.querySelector('[data-action="save"]')?.addEventListener('click', () => {
        if (els.game.classList.contains('hidden')) { showToast('ゲーム中に保存してください。'); return; }
        saveGame(true, SAVE_KEYS[name]);
      });
      slot.querySelector('[data-action="load"]')?.addEventListener('click', () => {
        const saved = readSave(SAVE_KEYS[name]);
        if (!saved) return;
        slot.closest('dialog')?.close();
        openResumeBriefing(saved);
      });
      slot.querySelector('[data-action="delete"]')?.addEventListener('click', () => deleteSave(SAVE_KEYS[name]));
    });
  }

  function currentPlaytestData() {
    trackNodeTime(state.currentChapter);
    const m = state.metrics || defaultMetrics();
    const investigationRuns = Object.values(m.investigation || {});
    const invRuns = investigationRuns.reduce((a,x) => a + (x.runs || 0), 0);
    const invMs = investigationRuns.reduce((a,x) => a + (x.totalMs || 0), 0);
    return {
      gameVersion: DATA.meta.version,
      exportedAt: new Date().toISOString(),
      nodeId: state.nodeId,
      chapter: state.currentChapter,
      totalPlayMs: state.totalPlayMs + Date.now() - state.playStartedAt,
      deaths: state.deaths,
      evidence: state.evidence.length,
      readNodes: Object.keys(state.readNodes).length,
      hintsUsed: m.hintsUsed || 0,
      nodeVisits: m.nodeVisits || {},
      choiceSelections: m.choiceSelections || {},
      judgement: {...state.judgement},
      relationships: relationshipProfiles(),
      loopPlans: {...state.loopPlans},
      endingArchive: {...(profile.unlockedEndings || {})},
      choiceHistory: [...state.choiceHistory],
      investigation: m.investigation || {},
      puzzleAttempts: m.puzzleAttempts || {},
      deathsById: m.deathsById || {},
      chapterMs: m.chapterMs || {},
      averageInvestigationMs: invRuns ? Math.round(invMs / invRuns) : 0,
      resumeBriefings: m.resumeBriefings || 0,
      layerMapViews: m.layerMapViews || 0,
      chapterBriefingsShown: m.chapterBriefingsShown || 0,
      chapterStops: m.chapterStops || 0,
      chapterBriefingsSeen: {...(state.chapterBriefingsSeen || {})},
      settings: {...state.settings}
    };
  }

  let diagnosticMode = 'visible';
  function diagnosticUnlocked(item) {
    return !item.unlock || state.evidence.includes(item.unlock);
  }
  function renderDiagnostics(requested = diagnosticMode) {
    const available = DIAGNOSTIC_ATLAS.filter(diagnosticUnlocked);
    const selected = DIAGNOSTIC_ATLAS.find(x=>x.id===requested && diagnosticUnlocked(x)) || available[available.length-1] || DIAGNOSTIC_ATLAS[0];
    diagnosticMode = selected.id;
    const list=$('#diagnostic-mode-list');
    const active=$('#diagnostic-active-image'); const base=$('#diagnostic-base-image');
    if (!list || !active || !base) return;
    base.src='assets/painting-diagnostics/fourth_visible.webp'; active.src=selected.src;
    active.alt=`第四版・${selected.label}`;
    $('#diagnostic-title').textContent=selected.label;
    $('#diagnostic-description').textContent=selected.description;
    list.innerHTML=DIAGNOSTIC_ATLAS.map(item=>{const unlocked=diagnosticUnlocked(item);return `<button type="button" role="tab" data-diagnostic="${item.id}" class="${item.id===selected.id?'active':''}" aria-selected="${item.id===selected.id}" ${unlocked?'':'disabled'}><strong>${escapeHtml(item.label)}</strong><span>${unlocked?escapeHtml(item.short):'未取得の記録'}</span></button>`;}).join('');
    list.querySelectorAll('[data-diagnostic]').forEach(button=>button.addEventListener('click',()=>renderDiagnostics(button.dataset.diagnostic)));
    const opacity=$('#diagnostic-opacity'); const zoom=$('#diagnostic-zoom');
    active.style.opacity=String(Number(opacity?.value||100)/100);
    const scale=Number(zoom?.value||100)/100; $('#diagnostic-canvas').style.setProperty('--diagnostic-zoom',scale);
  }
  function openDiagnostics(mode='visible') { renderDiagnostics(mode); showAccessibleDialog($('#diagnostics-dialog')); }
  function openEvidenceImage(src,title,caption) {
    if (!src) return;
    $('#evidence-image-full').src=src; $('#evidence-image-full').alt=title||'証拠画像'; $('#evidence-image-title').textContent=title||'証拠画像'; $('#evidence-image-caption').textContent=caption||'';
    showAccessibleDialog($('#evidence-image-dialog'));
  }

  function renderPlaytest() {
    if (!els.playtestSummary) return;
    const report = currentPlaytestData();
    const chapters = Object.entries(report.chapterMs).sort((a,b) => a[0].localeCompare(b[0], 'ja'));
    const puzzleRetries = Object.values(report.puzzleAttempts).reduce((a,x) => a + Math.max(0, x - 1), 0);
    els.playtestSummary.innerHTML = `<div class="playtest-metrics">
      <div class="playtest-metric"><span>総プレイ時間</span><strong>${escapeHtml(formatPlaytime(report.totalPlayMs))}</strong></div>
      <div class="playtest-metric"><span>死亡</span><strong>${report.deaths}</strong></div>
      <div class="playtest-metric"><span>パズル再試行</span><strong>${puzzleRetries}</strong></div>
      <div class="playtest-metric"><span>ヒント使用</span><strong>${report.hintsUsed}</strong></div><div class="playtest-metric"><span>周回計画</span><strong>${Object.keys(report.loopPlans || {}).length}/3</strong></div><div class="playtest-metric"><span>層位図</span><strong>${report.layerMapViews}</strong></div><div class="playtest-metric"><span>再開整理</span><strong>${report.resumeBriefings}</strong></div>
    </div><table class="playtest-table"><thead><tr><th>章</th><th>滞在時間</th><th>読了状況</th></tr></thead><tbody>${chapters.map(([c,ms]) => `<tr><td>${escapeHtml(c)}</td><td>${escapeHtml(formatPlaytime(ms))}</td><td>${c === canonicalChapter(state.currentChapter) ? '現在地' : '記録済み'}</td></tr>`).join('') || '<tr><td colspan="3">まだ章ごとの計測がありません。</td></tr>'}</tbody></table><p class="modal-note">平均調査時間：${report.averageInvestigationMs ? Math.round(report.averageInvestigationMs / 1000) + '秒' : '未計測'}　読了：${report.readNodes} / ${DATA.nodes.length}ノード</p>`;
  }

  function exportPlaytest() {
    const report = currentPlaytestData();
    const blob = new Blob([JSON.stringify(report, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `fourth-bedroom-playtest-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    state.metrics.exportedAt = report.exportedAt;
    showToast('プレイ記録を書き出しました。');
  }

  function resetPlaytestMetrics() {
    if (!confirm('物語の進行やセーブは残し、計測データだけをリセットします。よろしいですか？')) return;
    state.metrics = defaultMetrics();
    renderPlaytest();
  }

  function updateMenuStatus() {
    if (!els.menuStatus) return;
    els.menuStatus.innerHTML = `<strong>${escapeHtml(state.currentChapter)}</strong><span>${escapeHtml(state.currentLocation)} · ${escapeHtml(state.currentTime)}</span><span>${state.evidence.length}記録 · ${state.deaths}死亡 · ${formatPlaytime(state.totalPlayMs + Date.now() - state.playStartedAt)}</span>`;
  }

  function showAccessibleDialog(d) {
    if (!d || d.open) return;
    d._returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    requestAnimationFrame(() => d.querySelector('button, input, select, [tabindex]:not([tabindex="-1"])')?.focus({preventScroll:true}));
  }

  function openDialog(id) {
    const d = $(`#${id}-dialog`);
    if (!d) return;
    if (id === 'notebook') renderNotebook();
    if (id === 'log') renderLog();
    if (id === 'saves') renderSaveSlots();
    if (id === 'playtest') renderPlaytest();
    if (id === 'archive') renderEndingArchive();
    if (id === 'diagnostics') renderDiagnostics();
    showAccessibleDialog(d);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function updateModeButtons() {
    els.autoToggle?.classList.toggle('active', autoMode);
    els.skipToggle?.classList.toggle('active', skipMode);
    els.autoToggle?.setAttribute('aria-pressed', String(autoMode));
    els.skipToggle?.setAttribute('aria-pressed', String(skipMode));
    if (els.audioToggle) els.audioToggle.textContent = state.settings.ambient ? '音' : '消音';
  }

  function toggleAuto(force) {
    autoMode = typeof force === 'boolean' ? force : !autoMode;
    if (autoMode) skipMode = false;
    updateModeButtons();
    if (autoMode && typingDone) scheduleAuto(node); else clearAutoTimer();
  }

  function toggleSkip(force) {
    skipMode = typeof force === 'boolean' ? force : !skipMode;
    if (skipMode) autoMode = false;
    updateModeButtons();
    if (skipMode) {
      if (!typingDone && (!state.settings.skipReadOnly || currentWasRead)) completeTyping();
      if (typingDone) scheduleAuto(node);
    } else clearAutoTimer();
  }

  function pauseModes(hard = false) {
    clearAutoTimer();
    if (hard) { autoMode = false; skipMode = false; updateModeButtons(); }
  }

  function toggleUi(force) {
    uiHidden = typeof force === 'boolean' ? force : !uiHidden;
    document.body.classList.toggle('ui-hidden', uiHidden);
    els.restoreUi.classList.toggle('hidden', !uiHidden);
  }

  document.querySelectorAll('dialog').forEach(d => d.addEventListener('close', () => {
    const target = d._returnFocus;
    d._returnFocus = null;
    target?.focus?.({preventScroll:true});
  }));
  document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { b.closest('dialog')?.close(); openDialog(b.dataset.open); }));

  function startNewGameFromTitle() {
    const hasSave = Object.values(SAVE_KEYS).some(k => { try { return !!localStorage.getItem(k); } catch (_) { return false; } });
    if (hasSave && !confirm('現在のオートセーブとは別に開始します。手動スロットは残ります。よろしいですか？')) return false;
    try { localStorage.removeItem(SAVE_KEYS.auto); } catch (_) {}
    showPremonition();
    return true;
  }
  window.FB_START = startNewGameFromTitle;
  $('#new-game').addEventListener('click', startNewGameFromTitle);
  els.continue.addEventListener('click', () => { const saved = readSave(SAVE_KEYS.auto) || latestSave(); if (saved) openResumeBriefing(saved); });
  $('#title-load').addEventListener('click', () => openDialog('saves'));
  $('#title-settings').addEventListener('click', () => openDialog('settings'));
  $('#title-concept').addEventListener('click', () => openDialog('concept'));
  $('#title-credits').addEventListener('click', () => openDialog('credits'));
  $('#title-archive').addEventListener('click', () => openDialog('archive'));
  $('#premonition-next').addEventListener('click', advancePremonition);
  $('#premonition-skip').addEventListener('click', () => startGame());
  els.dialogue.addEventListener('click', () => advance());
  els.returnButton.addEventListener('click', returnFromGameover);
  els.caseFocusToggle?.addEventListener('click', e => { e.stopPropagation(); toggleCaseFocus(); });
  els.caseFocus?.querySelector('button')?.addEventListener('click', () => toggleCaseFocus(false));
  els.layerMapToggle?.addEventListener('click', e => { e.stopPropagation(); toggleLayerMap(); });
  els.layerMap?.querySelector('button')?.addEventListener('click', () => toggleLayerMap(false));
  $('#menu-layer-map')?.addEventListener('click', () => { $('#menu-dialog').close(); toggleLayerMap(true); });
  $('#resume-now')?.addEventListener('click', () => resumeWithReview('game'));
  $('#resume-layers')?.addEventListener('click', () => resumeWithReview('layers'));
  $('#resume-notebook')?.addEventListener('click', () => resumeWithReview('notebook'));
  $('#chapter-briefing-continue')?.addEventListener('click', () => { els.chapterBriefingDialog?.close(); advance(); });
  $('#chapter-briefing-stop')?.addEventListener('click', () => { metricIncrementScalar('chapterStops'); saveGame(true, SAVE_KEYS.auto); els.chapterBriefingDialog?.close(); els.game.classList.add('hidden'); els.title.classList.remove('hidden'); updateContinueState(); });
  $('#gameover-notebook').addEventListener('click', () => openDialog('notebook'));
  $('#menu-button').addEventListener('click', () => { updateMenuStatus(); showAccessibleDialog($('#menu-dialog')); });
  $('#manual-save').addEventListener('click', () => {
    const empty = ['slot1','slot2','slot3'].find(name => !readSave(SAVE_KEYS[name]));
    saveGame(true, SAVE_KEYS[empty || 'slot1']);
  });
  $('#go-title').addEventListener('click', () => {
    saveGame(false, SAVE_KEYS.auto); $('#menu-dialog').close(); els.game.classList.add('hidden'); els.title.classList.remove('hidden'); updateContinueState();
  });
  $('#reconsider-report').addEventListener('click', () => {
    els.ending.classList.add('hidden'); els.game.classList.remove('hidden');
    state.flags.reviewingFinalReport = true; renderNode('a622'); saveGame(false, SAVE_KEYS.auto);
  });
  $('#ending-archive').addEventListener('click', () => openDialog('archive'));
  $('#restart-demo').addEventListener('click', () => { try { localStorage.removeItem(SAVE_KEYS.auto); } catch (_) {} els.ending.classList.add('hidden'); showPremonition(); });
  $('#return-title').addEventListener('click', () => { els.ending.classList.add('hidden'); els.title.classList.remove('hidden'); updateContinueState(); });

  els.autoToggle.addEventListener('click', () => toggleAuto());
  els.skipToggle.addEventListener('click', () => toggleSkip());
  els.uiToggle.addEventListener('click', () => toggleUi());
  els.restoreUi.addEventListener('click', () => toggleUi(false));
  if (els.focusToggle) els.focusToggle.addEventListener('click', e => {
    e.stopPropagation();
    focusMode=!focusMode;
    document.body.classList.toggle('focus-mode',focusMode);
    els.focusToggle.setAttribute('aria-pressed',String(focusMode));
    els.focusToggle.textContent=focusMode?'視線 ON':'視線';
    audio?.worldCue('echo',0);
  });

  els.audioToggle.addEventListener('click', () => {
    state.settings.ambient = !state.settings.ambient;
    audio.enabled = state.settings.ambient;
    audio.set(state.settings.ambient ? (node?.ambient || ambientForBg(node?.bg)) : '');
    audio.setScore(state.settings.ambient ? scoreForScene(node || {}) : 'silence');
    updateModeButtons();
  });

  const settingHandlers = {
    '#text-speed': v => state.settings.speed = Number(v),
    '#auto-delay': v => state.settings.autoDelay = Number(v),
    '#font-size': v => state.settings.fontSize = Number(v),
    '#line-height': v => state.settings.lineHeight = Number(v),
    '#panel-opacity': v => state.settings.panelOpacity = Number(v),
    '#ambient-volume': v => state.settings.ambientVolume = Number(v),
    '#music-volume': v => state.settings.musicVolume = Number(v),
    '#sfx-volume': v => state.settings.sfxVolume = Number(v)
  };
  Object.entries(settingHandlers).forEach(([selector, handler]) => $(selector).addEventListener('input', e => { handler(e.target.value); applySettings(); }));
  $('#reduce-motion').addEventListener('change', e => { state.settings.reduceMotion = e.target.checked; applySettings(); });
  $('#ambient-enabled').addEventListener('change', e => { state.settings.ambient = e.target.checked; applySettings(); audio?.set(e.target.checked ? (node?.ambient || ambientForBg(node?.bg)) : ''); });
  $('#high-contrast').addEventListener('change', e => { state.settings.highContrast = e.target.checked; applySettings(); });
  $('#skip-read-only').addEventListener('change', e => { state.settings.skipReadOnly = e.target.checked; applySettings(); });
  $('#chapter-briefings')?.addEventListener('change', e => { state.settings.chapterBriefings = e.target.checked; applySettings(); });
  $('#assist-mode').addEventListener('change', e => { state.settings.assistMode = e.target.value; applySettings(); if (invState) configureInvestigationHint(); });
  $('#export-playtest').addEventListener('click', exportPlaytest);
  $('#reset-playtest').addEventListener('click', resetPlaytestMetrics);
  $('#diagnostic-opacity')?.addEventListener('input',e=>{const image=$('#diagnostic-active-image');if(image) image.style.opacity=String(Number(e.target.value)/100);});
  $('#diagnostic-zoom')?.addEventListener('input',e=>{$('#diagnostic-canvas')?.style.setProperty('--diagnostic-zoom',Number(e.target.value)/100);});
  $('#diagnostic-reset')?.addEventListener('click',()=>{const opacity=$('#diagnostic-opacity'),zoom=$('#diagnostic-zoom');if(opacity)opacity.value=100;if(zoom)zoom.value=100;renderDiagnostics(diagnosticMode);});
  $('#notebook-search').addEventListener('input', renderNotebook);
  $('#notebook-filter').addEventListener('change', renderNotebook);
  document.querySelectorAll('[data-notebook-view]').forEach(button => button.addEventListener('click', () => { notebookView = button.dataset.notebookView || 'all'; $('#notebook-filter').value = 'all'; renderNotebook(); }));
  $('#log-search').addEventListener('input', renderLog);

  function showPreviousLine() {
    if (!state.log.length) return;
    previousLogCursor = previousLogCursor < 0 ? state.log.length - 2 : Math.max(0, previousLogCursor - 1);
    const item = state.log[previousLogCursor];
    if (!item) return;
    const label = item.speaker || (item.mode === 'thought' ? '—' : item.mode === 'document' ? '記録' : '観察');
    showToast(`<strong>${escapeHtml(label)}</strong><br>${escapeHtml(item.text)}`, false, true);
  }

  document.addEventListener('keydown', e => {
    const open = document.querySelector('dialog[open]');
    if (open) { if (e.key === 'Escape') open.close(); return; }
    if (e.key === 'Escape') { if (!els.game.classList.contains('hidden')) { updateMenuStatus(); showAccessibleDialog($('#menu-dialog')); } return; }
    if (e.key.toLowerCase() === 'n') { openDialog('notebook'); return; }
    if (e.key.toLowerCase() === 'l') { openDialog('log'); return; }
    if (e.key.toLowerCase() === 'd') { openDiagnostics(); return; }
    if (e.key.toLowerCase() === 'm' && !els.game.classList.contains('hidden')) { toggleLayerMap(); return; }
    if (e.key.toLowerCase() === 'a' && !els.game.classList.contains('hidden')) { toggleAuto(); return; }
    if (e.key.toLowerCase() === 's' && !els.game.classList.contains('hidden')) { toggleSkip(); return; }
    if (e.key.toLowerCase() === 'h' && !els.game.classList.contains('hidden')) { toggleUi(); return; }
    if (e.key.toLowerCase() === 'f' && !els.game.classList.contains('hidden')) { toggleCaseFocus(); return; }
    if (e.key === 'ArrowUp' && !els.game.classList.contains('hidden')) { e.preventDefault(); showPreviousLine(); return; }
    if (e.key.toLowerCase() === 'g' && !els.game.classList.contains('hidden') && invState) { useInvestigationHint(); return; }
    if (/^[1-9]$/.test(e.key) && !els.choices.classList.contains('hidden')) {
      const choice = els.choices.querySelectorAll('button')[Number(e.key) - 1];
      if (choice) { e.preventDefault(); choice.click(); }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && !els.game.classList.contains('hidden')) { e.preventDefault(); advance(); }
  });

  window.addEventListener('beforeunload', () => { if (!els.game.classList.contains('hidden')) saveGame(false, SAVE_KEYS.auto); });

  function setOfflineLibraryStatus(stateName, text, percent = null) {
    const box = document.getElementById('offline-library-status');
    const label = document.getElementById('offline-library-text');
    const value = document.getElementById('offline-library-progress');
    if (!box || !label || !value) return;
    box.dataset.state = stateName;
    label.textContent = text;
    value.textContent = percent === null ? '' : `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
  }

  async function prepareOfflineLibrary() {
    if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) {
      setOfflineLibraryStatus('unsupported', 'この環境ではオフライン保存を利用できません', null);
      return;
    }
    navigator.serviceWorker.addEventListener('message', event => {
      const data = event.data || {};
      if (data.type === 'CACHE_PROGRESS') {
        const percent = data.total ? (data.completed / data.total) * 100 : 0;
        setOfflineLibraryStatus('preparing', '全編オフライン資料を保存中', percent);
      } else if (data.type === 'CACHE_COMPLETE') {
        localStorage.setItem('fourthBedroomOfflineReady', RELEASE_VERSION);
        setOfflineLibraryStatus('ready', '全編をオフラインで再生できます', 100);
      } else if (data.type === 'CACHE_ERROR') {
        setOfflineLibraryStatus('error', 'オフライン保存を再試行します', data.percent ?? null);
      } else if (data.type === 'CACHE_STATUS') {
        if (data.complete) setOfflineLibraryStatus('ready', '全編をオフラインで再生できます', 100);
        else if (data.total) setOfflineLibraryStatus('preparing', '全編オフライン資料を保存中', (data.completed / data.total) * 100);
      }
    });
    try {
      if (localStorage.getItem('fourthBedroomOfflineReady') === RELEASE_VERSION) {
        setOfflineLibraryStatus('ready', '全編をオフラインで再生できます', 100);
      }
      const registration = await navigator.serviceWorker.register(`service-worker.js?v=${RELEASE_VERSION}`);
      await navigator.serviceWorker.ready;
      const worker = registration.active || registration.waiting || registration.installing;
      worker?.postMessage({type:'GET_CACHE_STATUS'});
      worker?.postMessage({type:'CACHE_ALL_ASSETS'});
    } catch (error) {
      setOfflineLibraryStatus('error', 'オフライン保存を開始できませんでした', null);
    }
  }

  window.addEventListener('load', prepareOfflineLibrary);

  window.FB_DEBUG = {
    getState: () => JSON.parse(JSON.stringify(state)),
    getNode: () => node ? {id:node.id, type:node.type, bg:node.bg} : null,
    goto: (id, showCards = false) => renderNode(id, false, !showCards),
    completeText: () => completeTyping(),
    evidence: () => [...state.evidence],
    grantEvidence: ids => { for (const id of (Array.isArray(ids) ? ids : [ids])) addEvidence(id, false); return [...state.evidence]; },
    toggleAuto: value => toggleAuto(value),
    toggleSkip: value => toggleSkip(value),
    saveKeys: () => ({...SAVE_KEYS}),
    renderSaveSlots,
    renderPlaytest,
    useInvestigationHint,
    currentPlaytestData,
    clearAllSaves,
    judgement: () => ({...state.judgement}),
    relationships: () => relationshipProfiles(),
    showTeamCommitment: () => showTeamCommitment(node),
    showChainAssembly: () => showChainAssembly(node),
    showFinalSignature: () => showFinalSignature(node),
    preloadCount: () => preloadedAssets.size,
    profile: () => JSON.parse(JSON.stringify(profile)),
    caseFocus: () => ({chapter:canonicalChapter(state.currentChapter), open:caseFocusOpen, plan:latestLoopPlan()}),
    layerMap: () => ({open:layerMapOpen,layers:layerSnapshot()}),
    openResumeBriefing: saved => openResumeBriefing(saved || readSave(SAVE_KEYS.auto) || latestSave()),
    showChapterBriefing: (previous='ACT 1',current='ACT 2') => { state.chapterBriefingsSeen ||= {}; delete state.chapterBriefingsSeen[canonicalChapter(current)]; showChapterBriefing(previous,current); },
    showGameover: id => showGameover(id),
    showEnding: kind => showEnding(kind),
    renderEndingArchive: () => renderEndingArchive(),
    eventCg: () => ({node:node?.id || null,active:els.scene.classList.contains('cg-active'),src:els.eventCgImage?.getAttribute('src') || '',label:els.eventCg?.dataset.label || ''})
  };

  window.dispatchEvent(new CustomEvent('fb:ready', {detail:{version:RELEASE_VERSION}}));
  if (new URLSearchParams(location.search).get('start') === '1') setTimeout(startNewGameFromTitle, 0);

  audio = new AudioSystem();
  migrateLegacySaves();
  const initial = latestSave();
  state = normalizeState(initial || defaultState());
  applySettings();
  renderNotebook();
  renderLog();
  renderSaveSlots();
  updateContinueState();
  renderEndingArchive();
  preloadForNode(nodes.get(state.nodeId));
})();
