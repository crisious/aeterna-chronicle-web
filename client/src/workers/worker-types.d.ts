/**
 * Vite Worker import 타입 선언
 * import Worker from './someWorker?worker' 형식 지원
 */
declare module '*?worker' {
  const WorkerFactory: {
    new (): Worker;
  };
  export default WorkerFactory;
}
