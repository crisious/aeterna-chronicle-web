/**
 * P14-16: 이상 탐지 v2
 * ML 기반 매크로/봇 탐지 + 경제 어뷰징 그래프 분석 + 승률 조작 탐지
 * P7 anomalyDetector(이제는 P9 antiCheatEngine.ts) 후속
 *
 * 알고리즘:
 *  1. Isolation Forest — 입력 간격 분포, 경로 반복도 기반 매크로/봇 탐지
 *  2. 골드 세탁 네트워크 그래프 분석 — 순환 거래, 허브 노드 탐지
 *  3. Win-Trading 탐지 — 비정상 승률 패턴, 반복 매칭 분석
 *
 * 의존: P14-01 dataWarehouse, P14-02 eventCollector, P9-08 antiCheatEngine
 */

import { prisma } from '../db';

// ─── Isolation Forest 구현 ──────────────────────────────────────

interface IsolationTreeNode {
  splitFeature: number;
  splitValue: number;
  left: IsolationTreeNode | null;
  right: IsolationTreeNode | null;
  size: number;
  depth: number;
  isLeaf: boolean;
}

interface IsolationForestConfig {
  numTrees: number;
  sampleSize: number;
  maxDepth: number;
  anomalyThreshold: number;   // 0~1, 높을수록 엄격 (기본 0.6)
  contamination: number;      // 예상 이상치 비율 (기본 0.05)
}

const DEFAULT_IF_CONFIG: IsolationForestConfig = {
  numTrees: 100,
  sampleSize: 256,
  maxDepth: 8,           // ceil(log2(256))
  anomalyThreshold: 0.6,
  contamination: 0.05,
};

/** 평균 경로 길이 보정값 c(n) */
function harmonicEstimate(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const H = Math.log(n - 1) + 0.5772156649;   // 오일러-마스케로니 상수
  return 2 * H - (2 * (n - 1) / n);
}

/** 단일 Isolation Tree 구축 */
function buildIsolationTree(
  data: number[][],
  depth: number,
  maxDepth: number,
): IsolationTreeNode {
  const n = data.length;
  const numFeatures = data[0]?.length ?? 0;

  // 종료 조건: 최대 깊이 도달 또는 데이터 1개 이하
  if (depth >= maxDepth || n <= 1) {
    return { splitFeature: -1, splitValue: 0, left: null, right: null, size: n, depth, isLeaf: true };
  }

  // 랜덤 피처 선택
  const featureIdx = Math.floor(Math.random() * numFeatures);
  const values = data.map(row => row[featureIdx]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // 모든 값이 동일하면 리프
  if (minVal === maxVal) {
    return { splitFeature: -1, splitValue: 0, left: null, right: null, size: n, depth, isLeaf: true };
  }

  // 랜덤 분할점
  const splitValue = minVal + Math.random() * (maxVal - minVal);
  const leftData = data.filter(row => row[featureIdx] < splitValue);
  const rightData = data.filter(row => row[featureIdx] >= splitValue);

  return {
    splitFeature: featureIdx,
    splitValue,
    left: buildIsolationTree(leftData, depth + 1, maxDepth),
    right: buildIsolationTree(rightData, depth + 1, maxDepth),
    size: n,
    depth,
    isLeaf: false,
  };
}

/** 샘플의 경로 길이 계산 */
function pathLength(sample: number[], node: IsolationTreeNode, depth: number): number {
  if (node.isLeaf) {
    return depth + harmonicEstimate(node.size);
  }
  if (sample[node.splitFeature] < node.splitValue) {
    return pathLength(sample, node.left!, depth + 1);
  }
  return pathLength(sample, node.right!, depth + 1);
}

/** Isolation Forest 학습 */
function trainIsolationForest(
  data: number[][],
  config: IsolationForestConfig = DEFAULT_IF_CONFIG,
): IsolationTreeNode[] {
  const trees: IsolationTreeNode[] = [];
  for (let i = 0; i < config.numTrees; i++) {
    // 서브샘플링
    const sample: number[][] = [];
    const sampleSize = Math.min(config.sampleSize, data.length);
    const indices = new Set<number>();
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * data.length));
    }
    for (const idx of indices) sample.push(data[idx]);
    trees.push(buildIsolationTree(sample, 0, config.maxDepth));
  }
  return trees;
}

/** Anomaly Score 계산 (0~1, 1에 가까울수록 이상) */
function anomalyScore(
  sample: number[],
  trees: IsolationTreeNode[],
  sampleSize: number,
): number {
  const avgPath = trees.reduce((sum, tree) => sum + pathLength(sample, tree, 0), 0) / trees.length;
  const c = harmonicEstimate(sampleSize);
  return Math.pow(2, -(avgPath / c));
}

// ─── 매크로/봇 탐지 피처 ────────────────────────────────────────

export interface BotDetectionFeatures {
  userId: string;
  characterName: string;

  // 입력 간격 분포
  avgInputIntervalMs: number;        // 평균 입력 간격
  stdInputIntervalMs: number;        // 입력 간격 표준편차
  minInputIntervalMs: number;        // 최소 입력 간격
  inputEntropy: number;              // 입력 패턴 엔트로피 (0~1)

  // 경로 반복도
  pathRepetitionRate: number;        // 이동 경로 반복률 (0~1)
  uniquePathRatio: number;           // 고유 경로 비율
  avgPathSegmentLength: number;      // 평균 경로 세그먼트 길이

  // 세션 패턴
  sessionDurationVariance: number;   // 세션 시간 분산
  actionPerMinute: number;           // 분당 행동 수
  idleTimeRatio: number;             // 유휴 시간 비율

  // 전투 패턴
  skillRotationEntropy: number;      // 스킬 사용 패턴 엔트로피
  targetSelectionVariance: number;   // 타겟 선택 분산
  reactionTimeMs: number;            // 평균 반응 시간
}

/** 피처 벡터 변환 */
function featuresToVector(f: BotDetectionFeatures): number[] {
  return [
    f.avgInputIntervalMs,
    f.stdInputIntervalMs,
    f.minInputIntervalMs,
    f.inputEntropy,
    f.pathRepetitionRate,
    f.uniquePathRatio,
    f.avgPathSegmentLength,
    f.sessionDurationVariance,
    f.actionPerMinute,
    f.idleTimeRatio,
    f.skillRotationEntropy,
    f.targetSelectionVariance,
    f.reactionTimeMs,
  ];
}

export interface BotDetectionResult {
  userId: string;
  characterName: string;
  anomalyScore: number;         // 0~1
  isSuspicious: boolean;
  confidence: number;           // 0~1
  topIndicators: { feature: string; value: number; zscore: number }[];
  recommendedAction: 'none' | 'monitor' | 'captcha' | 'temp_ban' | 'permanent_ban';
}

/** 봇/매크로 탐지 실행 */
export async function detectBots(
  featuresList: BotDetectionFeatures[],
  config: IsolationForestConfig = DEFAULT_IF_CONFIG,
): Promise<BotDetectionResult[]> {
  if (featuresList.length < 10) {
    console.warn('[AnomalyDetectorV2] Insufficient data for Isolation Forest (need ≥10 samples)');
    return [];
  }

  const vectors = featuresList.map(featuresToVector);
  const trees = trainIsolationForest(vectors, config);

  const featureNames = [
    'avgInputIntervalMs', 'stdInputIntervalMs', 'minInputIntervalMs', 'inputEntropy',
    'pathRepetitionRate', 'uniquePathRatio', 'avgPathSegmentLength',
    'sessionDurationVariance', 'actionPerMinute', 'idleTimeRatio',
    'skillRotationEntropy', 'targetSelectionVariance', 'reactionTimeMs',
  ];

  // 피처별 평균/표준편차 (z-score 계산용)
  const numFeatures = vectors[0].length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < numFeatures; i++) means[i] += vec[i];
  }
  for (let i = 0; i < numFeatures; i++) means[i] /= vectors.length;
  for (const vec of vectors) {
    for (let i = 0; i < numFeatures; i++) stds[i] += (vec[i] - means[i]) ** 2;
  }
  for (let i = 0; i < numFeatures; i++) stds[i] = Math.sqrt(stds[i] / vectors.length) || 1;

  const results: BotDetectionResult[] = [];

  for (let idx = 0; idx < featuresList.length; idx++) {
    const score = anomalyScore(vectors[idx], trees, config.sampleSize);
    const isSuspicious = score >= config.anomalyThreshold;

    // z-score 기반 상위 지표
    const zscores = vectors[idx].map((v, i) => ({
      feature: featureNames[i],
      value: v,
      zscore: Math.abs((v - means[i]) / stds[i]),
    }));
    zscores.sort((a, b) => b.zscore - a.zscore);

    let recommendedAction: BotDetectionResult['recommendedAction'] = 'none';
    if (score >= 0.85) recommendedAction = 'permanent_ban';
    else if (score >= 0.75) recommendedAction = 'temp_ban';
    else if (score >= 0.65) recommendedAction = 'captcha';
    else if (score >= config.anomalyThreshold) recommendedAction = 'monitor';

    results.push({
      userId: featuresList[idx].userId,
      characterName: featuresList[idx].characterName,
      anomalyScore: Math.round(score * 1000) / 1000,
      isSuspicious,
      confidence: Math.min(1, score * 1.2),
      topIndicators: zscores.slice(0, 5),
      recommendedAction,
    });
  }

  results.sort((a, b) => b.anomalyScore - a.anomalyScore);

  console.log(
    `[AnomalyDetectorV2] Bot detection complete — ${results.length} users, ` +
    `suspicious=${results.filter(r => r.isSuspicious).length}, ` +
    `ban_recommended=${results.filter(r => r.recommendedAction === 'permanent_ban' || r.recommendedAction === 'temp_ban').length}`,
  );

  return results;
}

// ─── 골드 세탁 네트워크 그래프 분석 ──────────────────────────────

export interface GoldTransaction {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  timestamp: Date;
  method: 'trade' | 'mail' | 'auction' | 'guild_bank';
  itemId?: string;
  itemPrice?: number;      // 시세 대비 가격 (정상이면 ≈1.0)
}

interface TransactionNode {
  userId: string;
  inDegree: number;
  outDegree: number;
  totalIn: number;
  totalOut: number;
  netFlow: number;
  connections: Set<string>;
}

export interface GoldLaunderingResult {
  suspiciousNetworks: GoldLaunderingNetwork[];
  totalTransactionsAnalyzed: number;
  totalSuspiciousAmount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface GoldLaunderingNetwork {
  networkId: string;
  nodes: string[];                  // userId 목록
  hubNode: string;                  // 중심 허브 계정
  cycleCount: number;               // 순환 거래 횟수
  totalVolume: number;              // 총 거래량
  avgTransactionSize: number;
  suspiciousPatterns: string[];     // 탐지된 패턴 설명
  riskScore: number;                // 0~100
  evidence: {
    cycleTransactions: string[];    // 순환 거래 ID
    underPricedTrades: string[];    // 시세 대비 저가 거래 ID
    rapidFireTrades: string[];      // 단시간 대량 거래 ID
  };
}

/** 골드 세탁 네트워크 분석 */
export async function analyzeGoldLaundering(
  transactions: GoldTransaction[],
  opts?: {
    minCycleLength?: number;        // 최소 순환 경로 길이 (기본 3)
    maxCycleLength?: number;        // 최대 순환 경로 길이 (기본 6)
    suspiciousPriceRatio?: number;  // 시세 대비 의심 비율 (기본 0.3 = 30% 이하)
    rapidFireWindowMs?: number;     // 연속 거래 의심 윈도우 (기본 60초)
    minNetworkSize?: number;        // 분석 대상 최소 네트워크 크기 (기본 3)
  },
): Promise<GoldLaunderingResult> {
  const {
    minCycleLength = 3,
    maxCycleLength = 6,
    suspiciousPriceRatio = 0.3,
    rapidFireWindowMs = 60_000,
    minNetworkSize = 3,
  } = opts ?? {};

  // 그래프 구축
  const nodeMap = new Map<string, TransactionNode>();
  const adjacency = new Map<string, Map<string, GoldTransaction[]>>();

  for (const tx of transactions) {
    // 노드 등록
    for (const uid of [tx.fromUserId, tx.toUserId]) {
      if (!nodeMap.has(uid)) {
        nodeMap.set(uid, { userId: uid, inDegree: 0, outDegree: 0, totalIn: 0, totalOut: 0, netFlow: 0, connections: new Set() });
      }
    }

    const fromNode = nodeMap.get(tx.fromUserId)!;
    const toNode = nodeMap.get(tx.toUserId)!;
    fromNode.outDegree++;
    fromNode.totalOut += tx.amount;
    fromNode.connections.add(tx.toUserId);
    toNode.inDegree++;
    toNode.totalIn += tx.amount;
    toNode.connections.add(tx.fromUserId);

    // 인접 리스트
    if (!adjacency.has(tx.fromUserId)) adjacency.set(tx.fromUserId, new Map());
    const neighbors = adjacency.get(tx.fromUserId)!;
    if (!neighbors.has(tx.toUserId)) neighbors.set(tx.toUserId, []);
    neighbors.get(tx.toUserId)!.push(tx);
  }

  // netFlow 계산
  for (const node of nodeMap.values()) {
    node.netFlow = node.totalIn - node.totalOut;
  }

  // 순환 탐지 (DFS)
  const cycles: string[][] = [];
  const visited = new Set<string>();

  function dfs(start: string, current: string, path: string[]): void {
    if (path.length > maxCycleLength) return;
    const neighbors = adjacency.get(current);
    if (!neighbors) return;

    for (const next of neighbors.keys()) {
      if (next === start && path.length >= minCycleLength) {
        cycles.push([...path, start]);
        continue;
      }
      if (!path.includes(next)) {
        dfs(start, next, [...path, next]);
      }
    }
  }

  for (const userId of nodeMap.keys()) {
    if (!visited.has(userId)) {
      dfs(userId, userId, [userId]);
      visited.add(userId);
    }
  }

  // 연결 컴포넌트 (Union-Find 간이)
  const parent = new Map<string, string>();
  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  function union(a: string, b: string): void {
    parent.set(find(a), find(b));
  }

  for (const tx of transactions) {
    union(tx.fromUserId, tx.toUserId);
  }

  // 컴포넌트별 그룹핑
  const components = new Map<string, string[]>();
  for (const userId of nodeMap.keys()) {
    const root = find(userId);
    if (!components.has(root)) components.set(root, []);
    components.get(root)!.push(userId);
  }

  // 의심 네트워크 판별
  const suspiciousNetworks: GoldLaunderingNetwork[] = [];
  let networkCounter = 0;

  for (const [_root, members] of components) {
    if (members.length < minNetworkSize) continue;

    // 허브 노드 (최대 연결 수)
    let hubNode = members[0];
    let maxConnections = 0;
    for (const uid of members) {
      const conn = nodeMap.get(uid)!.connections.size;
      if (conn > maxConnections) {
        maxConnections = conn;
        hubNode = uid;
      }
    }

    // 관련 순환 필터
    const networkCycles = cycles.filter(cycle =>
      cycle.some(uid => members.includes(uid)),
    );

    // 의심 거래 수집
    const networkTxs = transactions.filter(
      tx => members.includes(tx.fromUserId) && members.includes(tx.toUserId),
    );

    const underPricedTrades = networkTxs
      .filter(tx => tx.itemPrice !== undefined && tx.itemPrice < suspiciousPriceRatio)
      .map(tx => tx.id);

    // 연속 거래 탐지
    const sortedTxs = [...networkTxs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const rapidFireTrades: string[] = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      if (sortedTxs[i].timestamp.getTime() - sortedTxs[i - 1].timestamp.getTime() < rapidFireWindowMs) {
        rapidFireTrades.push(sortedTxs[i - 1].id, sortedTxs[i].id);
      }
    }

    const suspiciousPatterns: string[] = [];
    if (networkCycles.length > 0) suspiciousPatterns.push(`순환 거래 ${networkCycles.length}건 탐지`);
    if (underPricedTrades.length > 0) suspiciousPatterns.push(`시세 대비 저가 거래 ${underPricedTrades.length}건`);
    if (rapidFireTrades.length > 0) suspiciousPatterns.push(`단시간 연속 거래 ${new Set(rapidFireTrades).size}건`);

    const totalVolume = networkTxs.reduce((s, tx) => s + tx.amount, 0);

    // 리스크 스코어
    let riskScore = 0;
    riskScore += Math.min(30, networkCycles.length * 10);
    riskScore += Math.min(25, underPricedTrades.length * 5);
    riskScore += Math.min(20, new Set(rapidFireTrades).size * 3);
    riskScore += Math.min(15, (members.length - minNetworkSize) * 3);
    riskScore += Math.min(10, Math.floor(totalVolume / 100000));

    if (suspiciousPatterns.length > 0) {
      suspiciousNetworks.push({
        networkId: `GLN-${++networkCounter}`,
        nodes: members,
        hubNode,
        cycleCount: networkCycles.length,
        totalVolume,
        avgTransactionSize: networkTxs.length > 0 ? Math.round(totalVolume / networkTxs.length) : 0,
        suspiciousPatterns,
        riskScore: Math.min(100, riskScore),
        evidence: {
          cycleTransactions: networkCycles.flat().slice(0, 20),
          underPricedTrades: underPricedTrades.slice(0, 20),
          rapidFireTrades: [...new Set(rapidFireTrades)].slice(0, 20),
        },
      });
    }
  }

  const totalSuspiciousAmount = suspiciousNetworks.reduce((s, n) => s + n.totalVolume, 0);
  const maxRisk = Math.max(0, ...suspiciousNetworks.map(n => n.riskScore));

  console.log(
    `[AnomalyDetectorV2] Gold laundering analysis — ${transactions.length} txs, ` +
    `${suspiciousNetworks.length} suspicious networks, ` +
    `total suspicious volume=${totalSuspiciousAmount.toLocaleString()} gold`,
  );

  return {
    suspiciousNetworks: suspiciousNetworks.sort((a, b) => b.riskScore - a.riskScore),
    totalTransactionsAnalyzed: transactions.length,
    totalSuspiciousAmount,
    riskLevel: maxRisk >= 80 ? 'critical' : maxRisk >= 60 ? 'high' : maxRisk >= 30 ? 'medium' : 'low',
  };
}

// ─── Win-Trading 탐지 ───────────────────────────────────────────

export interface PvPMatch {
  matchId: string;
  winnerId: string;
  loserId: string;
  winnerRating: number;
  loserRating: number;
  duration: number;          // seconds
  timestamp: Date;
  mode: 'ranked' | 'casual';
  region: string;
}

export interface WinTradingResult {
  suspiciousPairs: WinTradingPair[];
  totalMatchesAnalyzed: number;
  detectionTimestamp: string;
}

export interface WinTradingPair {
  pairId: string;
  player1: string;
  player2: string;
  totalMatches: number;
  player1WinRate: number;        // 0~1
  avgMatchDuration: number;      // seconds
  matchFrequency: number;        // 일 평균 매칭 횟수
  ratingDelta: { player1: number; player2: number };
  suspiciousIndicators: string[];
  riskScore: number;             // 0~100
}

/** Win-Trading 탐지 */
export async function detectWinTrading(
  matches: PvPMatch[],
  opts?: {
    minMatchCount?: number;       // 같은 상대 최소 매칭 수 (기본 5)
    maxAvgDuration?: number;      // 의심 평균 매칭 시간 (기본 30초)
    winRateThreshold?: number;    // 일방적 승률 임계치 (기본 0.9)
    frequencyThreshold?: number;  // 일 평균 매칭 의심 빈도 (기본 3)
  },
): Promise<WinTradingResult> {
  const {
    minMatchCount = 5,
    maxAvgDuration = 30,
    winRateThreshold = 0.9,
    frequencyThreshold = 3,
  } = opts ?? {};

  // 플레이어 쌍별 매칭 집계
  const pairMap = new Map<string, {
    matches: PvPMatch[];
    player1: string;
    player2: string;
    p1Wins: number;
  }>();

  for (const match of matches) {
    if (match.mode !== 'ranked') continue;

    const [a, b] = [match.winnerId, match.loserId].sort();
    const pairKey = `${a}:${b}`;

    if (!pairMap.has(pairKey)) {
      pairMap.set(pairKey, { matches: [], player1: a, player2: b, p1Wins: 0 });
    }

    const pair = pairMap.get(pairKey)!;
    pair.matches.push(match);
    if (match.winnerId === a) pair.p1Wins++;
  }

  const suspiciousPairs: WinTradingPair[] = [];
  let pairCounter = 0;

  for (const [_key, data] of pairMap) {
    if (data.matches.length < minMatchCount) continue;

    const avgDuration = data.matches.reduce((s, m) => s + m.duration, 0) / data.matches.length;
    const p1WinRate = data.p1Wins / data.matches.length;
    const oneWayWinRate = Math.max(p1WinRate, 1 - p1WinRate);

    // 매칭 기간 계산
    const timestamps = data.matches.map(m => m.timestamp.getTime());
    const spanDays = Math.max(1, (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000);
    const matchFrequency = data.matches.length / spanDays;

    // 레이팅 변화
    const sortedMatches = [...data.matches].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstMatch = sortedMatches[0];
    const lastMatch = sortedMatches[sortedMatches.length - 1];

    const p1First = firstMatch.winnerId === data.player1 ? firstMatch.winnerRating : firstMatch.loserRating;
    const p1Last = lastMatch.winnerId === data.player1 ? lastMatch.winnerRating : lastMatch.loserRating;
    const p2First = firstMatch.winnerId === data.player2 ? firstMatch.winnerRating : firstMatch.loserRating;
    const p2Last = lastMatch.winnerId === data.player2 ? lastMatch.winnerRating : lastMatch.loserRating;

    const indicators: string[] = [];
    let riskScore = 0;

    if (oneWayWinRate >= winRateThreshold) {
      indicators.push(`일방적 승률 ${(oneWayWinRate * 100).toFixed(1)}%`);
      riskScore += 30;
    }
    if (avgDuration <= maxAvgDuration) {
      indicators.push(`평균 매칭 시간 ${avgDuration.toFixed(0)}초 (즉시 항복 의심)`);
      riskScore += 25;
    }
    if (matchFrequency >= frequencyThreshold) {
      indicators.push(`일 평균 ${matchFrequency.toFixed(1)}회 반복 매칭`);
      riskScore += 20;
    }
    if (data.matches.length >= minMatchCount * 3) {
      indicators.push(`동일 상대 ${data.matches.length}회 매칭 (비정상 빈도)`);
      riskScore += 15;
    }

    // 시간대 집중도 (새벽 시간대 편중)
    const lateNightMatches = data.matches.filter(m => {
      const hour = m.timestamp.getHours();
      return hour >= 2 && hour <= 6;
    });
    if (lateNightMatches.length > data.matches.length * 0.6) {
      indicators.push(`새벽 시간대 매칭 ${(lateNightMatches.length / data.matches.length * 100).toFixed(0)}% 편중`);
      riskScore += 10;
    }

    if (indicators.length > 0) {
      suspiciousPairs.push({
        pairId: `WTP-${++pairCounter}`,
        player1: data.player1,
        player2: data.player2,
        totalMatches: data.matches.length,
        player1WinRate: Math.round(p1WinRate * 1000) / 1000,
        avgMatchDuration: Math.round(avgDuration),
        matchFrequency: Math.round(matchFrequency * 10) / 10,
        ratingDelta: {
          player1: Math.round(p1Last - p1First),
          player2: Math.round(p2Last - p2First),
        },
        suspiciousIndicators: indicators,
        riskScore: Math.min(100, riskScore),
      });
    }
  }

  console.log(
    `[AnomalyDetectorV2] Win-trading detection — ${matches.length} matches, ` +
    `${suspiciousPairs.length} suspicious pairs`,
  );

  return {
    suspiciousPairs: suspiciousPairs.sort((a, b) => b.riskScore - a.riskScore),
    totalMatchesAnalyzed: matches.length,
    detectionTimestamp: new Date().toISOString(),
  };
}

// ─── 통합 이상 탐지 실행기 ──────────────────────────────────────

export interface AnomalyDetectionReport {
  timestamp: string;
  bot: { totalAnalyzed: number; suspicious: number; results: BotDetectionResult[] };
  goldLaundering: GoldLaunderingResult;
  winTrading: WinTradingResult;
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  actionsSummary: {
    monitorCount: number;
    captchaCount: number;
    tempBanCount: number;
    permanentBanCount: number;
  };
}

/** antiCheatEngine.ts 연동 — 의심 유저 점수 전달 인터페이스 */
export interface AntiCheatIntegration {
  /** antiCheatEngine에 의심 점수 추가 */
  addSuspicionScore: (userId: string, score: number, reason: string) => Promise<void>;
  /** 자동 제재 트리거 */
  triggerAction: (userId: string, action: 'kick' | 'temp_ban' | 'permanent_ban', reason: string) => Promise<void>;
}

/** 통합 이상 탐지 — 모든 탐지기 일괄 실행 */
export async function runFullAnomalyDetection(
  botFeatures: BotDetectionFeatures[],
  goldTransactions: GoldTransaction[],
  pvpMatches: PvPMatch[],
  antiCheat?: AntiCheatIntegration,
): Promise<AnomalyDetectionReport> {
  const [botResults, goldResult, winTradingResult] = await Promise.all([
    detectBots(botFeatures),
    analyzeGoldLaundering(goldTransactions),
    detectWinTrading(pvpMatches),
  ]);

  // antiCheatEngine 연동
  if (antiCheat) {
    for (const bot of botResults.filter(r => r.isSuspicious)) {
      await antiCheat.addSuspicionScore(
        bot.userId,
        bot.anomalyScore * 100,
        `ML 봇 탐지 (score=${bot.anomalyScore}, action=${bot.recommendedAction})`,
      );
      if (bot.recommendedAction === 'temp_ban' || bot.recommendedAction === 'permanent_ban') {
        await antiCheat.triggerAction(bot.userId, bot.recommendedAction === 'permanent_ban' ? 'permanent_ban' : 'temp_ban',
          `Isolation Forest anomaly score ${bot.anomalyScore}`);
      }
    }

    for (const network of goldResult.suspiciousNetworks.filter(n => n.riskScore >= 60)) {
      for (const userId of network.nodes) {
        await antiCheat.addSuspicionScore(
          userId,
          network.riskScore,
          `골드 세탁 네트워크 ${network.networkId} (risk=${network.riskScore})`,
        );
      }
    }

    for (const pair of winTradingResult.suspiciousPairs.filter(p => p.riskScore >= 60)) {
      for (const userId of [pair.player1, pair.player2]) {
        await antiCheat.addSuspicionScore(
          userId,
          pair.riskScore,
          `Win-trading ${pair.pairId} (risk=${pair.riskScore})`,
        );
      }
    }
  }

  const actionsSummary = {
    monitorCount: botResults.filter(r => r.recommendedAction === 'monitor').length,
    captchaCount: botResults.filter(r => r.recommendedAction === 'captcha').length,
    tempBanCount: botResults.filter(r => r.recommendedAction === 'temp_ban').length,
    permanentBanCount: botResults.filter(r => r.recommendedAction === 'permanent_ban').length,
  };

  const riskLevels = [
    goldResult.riskLevel,
    botResults.some(r => r.anomalyScore >= 0.85) ? 'critical' as const : 'low' as const,
    winTradingResult.suspiciousPairs.some(p => p.riskScore >= 80) ? 'critical' as const : 'low' as const,
  ];
  const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
  const overallRiskLevel = riskLevels.reduce((a, b) => riskOrder[a] >= riskOrder[b] ? a : b, 'low' as const);

  console.log(
    `[AnomalyDetectorV2] Full detection complete — overall risk: ${overallRiskLevel}, ` +
    `bots=${botResults.filter(r => r.isSuspicious).length}, ` +
    `gold networks=${goldResult.suspiciousNetworks.length}, ` +
    `win-trading pairs=${winTradingResult.suspiciousPairs.length}`,
  );

  return {
    timestamp: new Date().toISOString(),
    bot: { totalAnalyzed: botFeatures.length, suspicious: botResults.filter(r => r.isSuspicious).length, results: botResults },
    goldLaundering: goldResult,
    winTrading: winTradingResult,
    overallRiskLevel,
    actionsSummary,
  };
}
