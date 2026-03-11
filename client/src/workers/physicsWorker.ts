/**
 * physicsWorker.ts — 클라이언트 물리 연산 WebWorker
 *
 * 메인 스레드 부하를 줄이기 위해 경로 탐색 + 충돌 예측을 오프로드한다.
 * Vite worker import 방식으로 로드: import PhysicsWorker from './physicsWorker?worker'
 */

// ── 메시지 타입 정의 ──────────────────────────────────────────

/** 메인 → Worker 요청 */
interface PhysicsRequest {
  type: 'pathfind' | 'collision-predict';
  id: string;  // 요청 ID (응답 매칭용)
}

/** 경로 탐색 요청 */
interface PathfindRequest extends PhysicsRequest {
  type: 'pathfind';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  obstacles: Array<{ x: number; y: number; width: number; height: number }>;
  gridSize: number;
}

/** 충돌 예측 요청 */
interface CollisionPredictRequest extends PhysicsRequest {
  type: 'collision-predict';
  entities: Array<{
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  }>;
  deltaMs: number;
}

type WorkerRequest = PathfindRequest | CollisionPredictRequest;

/** Worker → 메인 응답 */
interface PhysicsResponse {
  type: 'pathfind-result' | 'collision-result';
  id: string;
  computeMs: number;
}

interface PathfindResponse extends PhysicsResponse {
  type: 'pathfind-result';
  path: Array<{ x: number; y: number }>;
  found: boolean;
}

interface CollisionResponse extends PhysicsResponse {
  type: 'collision-result';
  collisions: Array<{ entityA: string; entityB: string; time: number }>;
}

// ── A* 경로 탐색 (간이 구현) ──────────────────────────────────

interface GridNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: GridNode | null;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function findPath(
  startX: number, startY: number,
  endX: number, endY: number,
  obstacles: Array<{ x: number; y: number; width: number; height: number }>,
  gridSize: number
): Array<{ x: number; y: number }> {
  const sx = Math.floor(startX / gridSize);
  const sy = Math.floor(startY / gridSize);
  const ex = Math.floor(endX / gridSize);
  const ey = Math.floor(endY / gridSize);

  // 장애물 셋 (빠른 조회용)
  const blocked = new Set<string>();
  for (const obs of obstacles) {
    const gx1 = Math.floor(obs.x / gridSize);
    const gy1 = Math.floor(obs.y / gridSize);
    const gx2 = Math.floor((obs.x + obs.width) / gridSize);
    const gy2 = Math.floor((obs.y + obs.height) / gridSize);
    for (let gx = gx1; gx <= gx2; gx++) {
      for (let gy = gy1; gy <= gy2; gy++) {
        blocked.add(`${gx},${gy}`);
      }
    }
  }

  // A* 탐색
  const open: GridNode[] = [{ x: sx, y: sy, g: 0, h: heuristic(sx, sy, ex, ey), f: heuristic(sx, sy, ex, ey), parent: null }];
  const closed = new Set<string>();
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (open.length > 0) {
    // f 값 최소 노드 선택
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const key = `${current.x},${current.y}`;

    if (current.x === ex && current.y === ey) {
      // 경로 역추적
      const path: Array<{ x: number; y: number }> = [];
      let node: GridNode | null = current;
      while (node) {
        path.unshift({ x: node.x * gridSize + gridSize / 2, y: node.y * gridSize + gridSize / 2 });
        node = node.parent;
      }
      return path;
    }

    closed.add(key);

    for (const [dx, dy] of directions) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nKey = `${nx},${ny}`;

      if (closed.has(nKey) || blocked.has(nKey)) continue;
      if (nx < 0 || ny < 0) continue; // 음수 좌표 방지

      const g = current.g + 1;
      const h = heuristic(nx, ny, ex, ey);
      const existing = open.find(n => n.x === nx && n.y === ny);

      if (!existing) {
        open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = g + existing.h;
        existing.parent = current;
      }
    }

    // 탐색 한도 (무한 루프 방지)
    if (closed.size > 10000) break;
  }

  return []; // 경로 없음
}

// ── 충돌 예측 ─────────────────────────────────────────────────

function predictCollisions(
  entities: Array<{ id: string; x: number; y: number; vx: number; vy: number; radius: number }>,
  deltaMs: number
): Array<{ entityA: string; entityB: string; time: number }> {
  const collisions: Array<{ entityA: string; entityB: string; time: number }> = [];
  const deltaSec = deltaMs / 1000;

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];

      // 예측 위치에서 거리 계산
      const futureAx = a.x + a.vx * deltaSec;
      const futureAy = a.y + a.vy * deltaSec;
      const futureBx = b.x + b.vx * deltaSec;
      const futureBy = b.y + b.vy * deltaSec;

      const dx = futureAx - futureBx;
      const dy = futureAy - futureBy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
        // 대략적인 충돌 시점 추정
        const currentDist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        const approachSpeed = (currentDist - dist) / deltaSec;
        const collisionTime = approachSpeed > 0
          ? ((currentDist - minDist) / approachSpeed) * 1000
          : 0;

        collisions.push({
          entityA: a.id,
          entityB: b.id,
          time: Math.max(0, collisionTime),
        });
      }
    }
  }

  return collisions;
}

// ── Worker 메시지 핸들러 ──────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const request = e.data;
  const start = performance.now();

  switch (request.type) {
    case 'pathfind': {
      const path = findPath(
        request.startX, request.startY,
        request.endX, request.endY,
        request.obstacles,
        request.gridSize
      );
      const response: PathfindResponse = {
        type: 'pathfind-result',
        id: request.id,
        path,
        found: path.length > 0,
        computeMs: performance.now() - start,
      };
      self.postMessage(response);
      break;
    }

    case 'collision-predict': {
      const collisions = predictCollisions(request.entities, request.deltaMs);
      const response: CollisionResponse = {
        type: 'collision-result',
        id: request.id,
        collisions,
        computeMs: performance.now() - start,
      };
      self.postMessage(response);
      break;
    }
  }
};

// Worker 준비 완료 신호
self.postMessage({ type: 'ready' });
