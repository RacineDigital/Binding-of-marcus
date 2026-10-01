type Handler<T> = (payload: T) => void;
export class Emitter<M extends Record<string, unknown>> {
  private map = new Map<keyof M, Handler<any>[]>();
  on<K extends keyof M>(k: K, h: Handler<M[K]>): () => void {
    let arr = this.map.get(k);
    if (!arr) { arr = []; this.map.set(k, arr); }
    arr.push(h);
    return () => { const a = this.map.get(k); if (a) { const i = a.indexOf(h); if (i >= 0) a.splice(i, 1); } };
  }
  emit<K extends keyof M>(k: K, p: M[K]): void {
    const arr = this.map.get(k);
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) arr[i](p);
  }
  clear(): void { this.map.clear(); }
}
