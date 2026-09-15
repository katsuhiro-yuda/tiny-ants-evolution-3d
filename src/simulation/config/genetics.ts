/**
 * 遺伝と進化のバランス値（仕様書 §5, §6）。
 *
 * ここにある係数はすべて `genetics/traits.ts` の純粋関数から参照される。
 * 形質値（0.0〜1.0）を実際の能力値へ変換する際の対応表にあたる。
 */

/** 初期個体群の形質の中心値。全形質を中立から始める。 */
export const INITIAL_GENE_MEAN = 0.5;

/**
 * 初期個体群の形質のばらつき（中心値からの最大幅）。
 * 広すぎると初期集団だけで最適解へ到達してしまい、変異の寄与が見えなくなる。
 */
export const INITIAL_GENE_SPREAD = 0.18;

/** 通常の突然変異幅（±）。平均0の小さな変異（仕様書 §6）。 */
export const MUTATION_STEP = 0.035;

/** 大きな変異が起きる確率（形質ごとに判定する）。 */
export const MAJOR_MUTATION_CHANCE = 0.03;

/** 大きな変異の幅（±）。 */
export const MAJOR_MUTATION_STEP = 0.22;

/* --- 移動 --------------------------------------------------------------- */

/** speed=0 と speed=1 の最大移動速度（ワールド単位/秒）。 */
export const SPEED_MIN = 2.6;
export const SPEED_MAX = 5.8;

/** 重装甲化による速度低下の最大割合（仕様書 §6「重装甲化 → 速度低下」）。 */
export const ARMOR_SPEED_PENALTY = 0.3;

/** 代謝効率を上げたときの瞬発性能の低下割合（仕様書 §5「瞬発性能との両立コスト」）。 */
export const METABOLISM_SPEED_PENALTY = 0.18;

/** 大型化による旋回速度の低下割合（仕様書 §6「大型化 → 旋回低下」）。 */
export const BODY_SIZE_TURN_PENALTY = 0.35;

/* --- 感覚 --------------------------------------------------------------- */

/** visionRange=0 と =1 の視界半径（ワールド単位）。 */
export const VISION_MIN = 7;
export const VISION_MAX = 15;

/* --- 代謝 --------------------------------------------------------------- */

/** 基礎代謝の基準値（1秒あたり）。全形質が0の個体の消費量。 */
export const BASAL_METABOLISM_BASE = 0.36;

/** 基礎代謝へ上乗せされる割合（仕様書 §6 のコスト項目）。 */
export const BODY_SIZE_METABOLISM_COST = 0.55;
export const ARMOR_METABOLISM_COST = 0.4;
export const VISION_METABOLISM_COST = 0.3;

/** 代謝効率による基礎代謝の軽減割合。metabolism=1 でこの割合だけ下がる。 */
export const METABOLISM_EFFICIENCY = 0.3;

/** 移動コストの基準値（単位距離あたり）。 */
export const MOVEMENT_COST_BASE = 0.134;

/** 移動コストへ上乗せされる割合。速く・大きく・重いほど1歩が高くつく。 */
export const SPEED_MOVEMENT_COST = 0.45;

/**
 * 速度が移動単価へ効く指数。1より大きくすると、速度を上げるほど加速度的に高くつく。
 * これがないと「最速が常に有利」になり、speed が上限へ張り付いて分布が動かなくなる。
 */
export const MOVEMENT_COST_SPEED_EXPONENT = 1.6;
export const BODY_SIZE_MOVEMENT_COST = 0.5;
export const ARMOR_MOVEMENT_COST = 0.35;

/* --- 蓄積と寿命 --------------------------------------------------------- */

/** エネルギー上限の基準値。bodySize が大きいほど多く蓄えられる。 */
export const ENERGY_CAPACITY_BASE = 86;
export const BODY_SIZE_CAPACITY_BONUS = 0.45;

/** longevity=0 と =1 の寿命（秒）。 */
export const LIFESPAN_MIN = 55;
export const LIFESPAN_MAX = 140;

/** 寿命の個体差（±の割合）。同じ形質でも同時に死なないようにする。 */
export const LIFESPAN_JITTER = 0.1;

/* --- 消化 --------------------------------------------------------------- */

/** 消化形質が0のときの栄養効率。0にはせず、特化していなくても食べられるようにする。 */
export const DIGESTION_MIN_EFFICIENCY = 0.6;

/**
 * もう一方の消化形質による効率低下の割合
 * （仕様書 §6「肉食特化 → 植物から得られる栄養低下」とその対称）。
 */
export const CROSS_DIGESTION_PENALTY = 0.3;

/* --- 生態型 ------------------------------------------------------------- */

/**
 * 食性ラベルの閾値（仕様書 §6）。
 * plantDigestion と meatDigestion の差がこれ以上なら草食型・肉食型、未満なら雑食型。
 */
export const DIET_THRESHOLD = 0.15;

/** 特徴ラベルの境界。現存個体の上位20%（仕様書 §6）。 */
export const FEATURE_PERCENTILE = 0.8;

/** 個体に表示する特徴ラベルの最大数（仕様書 §6）。 */
export const MAX_FEATURE_LABELS = 2;

/* --- 繁殖 --------------------------------------------------------------- */

/** 成熟年齢の基準値（秒）。longevity=0 の個体がこの年齢で繁殖できるようになる。 */
export const MATURITY_AGE_BASE = 8;

/** 長寿命による成熟の遅れ（仕様書 §6「長寿命 → 成熟までの時間増」）。 */
export const LONGEVITY_MATURITY_COST = 0.8;

/** 繁殖に必要なエネルギー（上限に対する割合）。 */
export const REPRODUCTION_ENERGY_RATIO = 0.62;

/** 繁殖後に親へ残るエネルギー（上限に対する割合）。差分が繁殖の総コストになる。 */
export const REPRODUCTION_PARENT_REMAINDER_RATIO = 0.42;

/**
 * 子へ渡るエネルギー（親が支払った総コストに対する割合）の上限。
 * 残りは繁殖そのもののコストとして失われる。
 */
export const OFFSPRING_ENERGY_SHARE = 0.75;

/** 高繁殖力による子の初期エネルギー低下（仕様書 §6「高繁殖力 → 子の初期エネルギー低下」）。 */
export const FERTILITY_OFFSPRING_PENALTY = 0.4;

/** 繁殖の間隔（秒）。fertility が高いほど短い。 */
export const REPRODUCTION_COOLDOWN_MAX = 18;
export const REPRODUCTION_COOLDOWN_MIN = 7;

/** 子を親からどれだけ離して配置するか（ワールド単位）。 */
export const OFFSPRING_SPAWN_DISTANCE = 1.1;

/**
 * 個体数の上限。性能目標「500匹で30 FPS」（仕様書 §13）に合わせる。
 * 描画側の InstancedMesh もこの数で確保する。
 */
export const MAX_POPULATION = 500;
