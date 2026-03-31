import * as AST from './ast';
import * as readline from 'readline';

// ---------------------------------------------------------------------------
// Return / Break 伝播用のシグナル例外
// ---------------------------------------------------------------------------
class ReturnSignal {
  constructor(public value: any) {}
}

// ---------------------------------------------------------------------------
// スコープ環境
// ---------------------------------------------------------------------------
class Environment {
  public store: Map<string, any> = new Map();
  public exports: Set<string> = new Set();

  constructor(private parent: Environment | null = null) {}

  get(name: string): any {
    if (this.store.has(name)) return this.store.get(name);
    if (this.parent) return this.parent.get(name);
    throw new RuntimeError(`Undefined variable '${name}'.`);
  }

  set(name: string, value: any): void {
    this.store.set(name, value);
  }

  assign(name: string, value: any): void {
    if (this.store.has(name)) {
      this.store.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    // 未定義変数への代入は新規宣言として扱う（グローバルスコープなら上まで通り抜けた）
    this.store.set(name, value);
  }

  has(name: string): boolean {
    if (this.store.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
}

// ---------------------------------------------------------------------------
// ランタイムエラー
// ---------------------------------------------------------------------------
export class RuntimeError extends Error {
  constructor(message: string) {
    super(`RuntimeError: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// クラスのランタイム表現
// ---------------------------------------------------------------------------
class DennerClass {
  constructor(
    public declaration: AST.ClassDeclaration,
    public closure: Environment,
  ) {}
}

class DennerInstance {
  public fields: Map<string, any> = new Map();
  constructor(public klass: DennerClass) {}
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
class DennerFunction {
  constructor(
    public params: AST.Parameter[],
    public body: AST.BlockStatement,
    public closure: Environment,
  ) {}
}

export class DennerElement {
  public type = 'element';
  constructor(
    public tag: string,
    public attributes: Record<string, any>,
    public children: any[]
  ) {}

  public toString(): string {
    const isSelfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'rect', 'circle', 'image'].includes(this.tag);
    let attrStr = '';
    for (const [k, v] of Object.entries(this.attributes)) {
      if (typeof v === 'boolean') {
         if (v) attrStr += ` ${k}`;
      } else {
         attrStr += ` ${k}="${String(v).replace(/"/g, '&quot;')}"`;
      }
    }
    
    if (isSelfClosing) {
      return `<${this.tag}${attrStr} />`;
    }
    
    const childStr = this.children.map(c => {
      if (c instanceof DennerElement) return c.toString();
      return String(c);
    }).join('');
    
    return `<${this.tag}${attrStr}>${childStr}</${this.tag}>`;
  }
}

// ---------------------------------------------------------------------------
// GUI 状態
// ---------------------------------------------------------------------------
interface GuiState {
  window: any;
  canvas: any;
  ctx: any;
  width: number;
  height: number;
  lastKey: string;
  physicsObjects: PhysicsObject[];
}

interface PhysicsObject {
  id: string;
  type: 'rect' | 'image';
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  physicsEnabled: boolean;
  gravity: number;
  color: string;
  imgData?: any;
  onCollision?: (e: any) => void;
  collisionEffect?: number;
  animType?: string;
  animDuration?: number;
  animTimer?: number;
}

// ---------------------------------------------------------------------------
// メイン Interpreter クラス
// ---------------------------------------------------------------------------
export class Interpreter {
  private globalEnv: Environment = new Environment();
  private gui: GuiState | null = null;
  private sdl: any = null;
  private nativeCanvas: any = null;
  private guiRunning: boolean = false;

  constructor() {
    this.setupBuiltins(this.globalEnv);
  }

  public createEnvironment(): Environment {
    const env = new Environment();
    this.setupBuiltins(env);
    return env;
  }

  // ------------------------------------------------------------------
  // 組み込みオブジェクトを globalEnv に登録
  // ------------------------------------------------------------------
  private setupBuiltins(env: Environment) {
    // log オブジェクト
    env.set('log', {
      print: (val: any) => {
        process.stdout.write(
          (val === undefined || val === null ? '' : String(val)) + '\n',
        );
      },
    });

    // 常数
    env.set('null', null);
    env.set('undefined', undefined);

    // string オブジェクト
    env.set('string', {
      replace: (s: string, f: string, r: string) => String(s).replace(f, r),
      split: (s: string, sep: string) => String(s).split(sep),
      trim: (s: string) => String(s).trim(),
      length: (s: string) => String(s).length,
      upper: (s: string) => String(s).toUpperCase(),
      lower: (s: string) => String(s).toLowerCase(),
      startswith: (s: string, p: string) => String(s).startsWith(p),
      endswith: (s: string, p: string) => String(s).endsWith(p),
      starts: (s: string, p: string) => String(s).startsWith(p),
      ends: (s: string, p: string) => String(s).endsWith(p),
      includes: (s: string, q: string) => String(s).includes(q),
      indexof: (s: string, q: string) => String(s).indexOf(q),
      substr: (s: string, start: number, len: number) => String(s).substr(start, len),
      substring: (s: string, start: number, end: number) => String(s).substring(start, end),
      charat: (s: string, i: number) => String(s).charAt(i),
      repeat: (s: string, n: number) => String(s).repeat(n),
      padstart: (s: string, len: number, ch: string) => String(s).padStart(len, ch),
      padend: (s: string, len: number, ch: string) => String(s).padEnd(len, ch),
    });

    // os オブジェクト
    env.set('os', {
      name: () => process.platform,
      env: (key: string) => process.env[key] ?? '',
    });

    // path オブジェクト
    const nodePath = require('path');
    env.set('path', {
      join: (...parts: string[]) => nodePath.join(...parts),
    });

    // net オブジェクト
    const http = require('http');
    env.set('net', {
      get: async (url: string) => {
        const res = await fetch(url);
        return await res.text();
      },
      serve: (port: number, handler: any) => {
        const server = http.createServer(async (req: any, res: any) => {
          try {
            let responseValue = undefined;
            if (handler instanceof DennerFunction) {
              const fnEnv = new Environment(handler.closure);
              if (handler.params.length > 0) {
                 fnEnv.set(handler.params[0].id.name, req.url);
              }
              const result = await this.executeBlock(handler.body, fnEnv);
              responseValue = (result instanceof ReturnSignal) ? result.value : undefined;
            } else if (typeof handler === 'function') {
              responseValue = await handler(req.url);
            } else {
              responseValue = handler;
            }
            
            if (responseValue instanceof DennerElement) {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(responseValue.toString());
            } else if (typeof responseValue === 'string') {
               const isHtml = responseValue.trim().startsWith('<') && responseValue.trim().endsWith('>');
               res.writeHead(200, { 'Content-Type': isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8' });
               res.end(responseValue);
            } else if (typeof responseValue === 'object' && responseValue !== null) {
               res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
               res.end(JSON.stringify(responseValue));
            } else {
               res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
               res.end(String(responseValue ?? ''));
            }
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(`Denner Server Error: ${err.message}`);
          }
        });
        server.listen(port, () => {
          console.log(`\x1b[32m🚀 Denner Server listening on http://localhost:${port}\x1b[0m`);
        });
        return new Promise(() => {}); // Block main script
      }
    });

    // cli オブジェクト
    env.set('cli', {
      input: async (prompt: string) => {
        return new Promise<string>((resolve) => {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl.question(prompt, (ans) => { rl.close(); resolve(ans); });
        });
      },
      get_key: async () => {
        // GUI モードのときはウィンドウのキー状態を返す
        if (this.gui) {
          return new Promise<string>((resolve) => {
            const check = () => {
              if (this.gui && this.gui.lastKey) {
                const k = this.gui.lastKey;
                this.gui.lastKey = '';
                resolve(k);
              } else {
                setImmediate(check);
              }
            };
            check();
          });
        }
        // CLI モードでは stdin から1文字
        return new Promise<string>((resolve) => {
          if (process.stdin.setRawMode) process.stdin.setRawMode(true);
          process.stdin.once('data', (buf) => {
            if (process.stdin.setRawMode) process.stdin.setRawMode(false);
            resolve(buf.toString('utf8'));
          });
        });
      },
    });

    // gui オブジェクト（遅延初期化: setupGui を呼ぶまでは stub）
    const self = this;
    env.set('gui', {
      setup: async (w: number, h: number) => { await self.setupGui(w, h); },
      clear: (color: string) => { self.guiClear(color); },
      rect: (x: number, y: number, w: number, h: number, color: string) => self.guiRect(x, y, w, h, color),
      image: async (url: string, x: number, y: number, w: number, h: number) => await self.guiImage(url, x, y, w, h),
      add: async (el: DennerElement) => {
         if (el.tag === 'rect') {
             const r = self.guiRect(el.attributes.x || 0, el.attributes.y || 0, el.attributes.w || 50, el.attributes.h || 50, el.attributes.color || 'white');
             r.id = String(el.attributes.id || `rect-${Date.now()}`);
             return r;
         } else if (el.tag === 'image') {
             const i = await self.guiImage(el.attributes.src || '', el.attributes.x || 0, el.attributes.y || 0, el.attributes.w || 50, el.attributes.h || 50);
             i.id = String(el.attributes.id || `image-${Date.now()}`);
             return i;
         } else {
             throw new RuntimeError(`Unsupported GUI element: ${el.tag}`);
         }
      },
      text: (t: string, x: number, y: number, color: string) => { self.guiText(t, x, y, color); },
      loop: async () => { await self.guiLoop(); },
      get_distance: (o1: PhysicsObject, o2: PhysicsObject) => {
          if (!o1 || !o2) return 0;
          const dx = (o1.x + o1.w/2) - (o2.x + o2.w/2);
          const dy = (o1.y + o1.h/2) - (o2.y + o2.h/2);
          return Math.sqrt(dx * dx + dy * dy);
      },
      get_last_key: () => {
        if (!self.gui) return '';
        const k = self.gui.lastKey;
        if (k === 'Space') self.gui.lastKey = '';
        return k;
      },
    });
  }

  // ------------------------------------------------------------------
  // GUI 初期化
  // ------------------------------------------------------------------
  private async setupGui(w: number, h: number) {
    if (!this.sdl) {
      try {
        this.sdl = require('@kmamal/sdl');
      } catch {
        throw new RuntimeError('GUI を使うには @kmamal/sdl が必要です。npm install @kmamal/sdl を実行してください。');
      }
    }
    if (!this.nativeCanvas) {
      try {
        this.nativeCanvas = require('@napi-rs/canvas');
      } catch {
        throw new RuntimeError('GUI を使うには @napi-rs/canvas が必要です。npm install @napi-rs/canvas を実行してください。');
      }
    }

    const win = this.sdl.video.createWindow({ title: 'Denner', width: w, height: h, resizable: false });
    const canvas = this.nativeCanvas.createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    this.gui = {
      window: win,
      canvas,
      ctx,
      width: w,
      height: h,
      lastKey: '',
      physicsObjects: [],
    };

    win.on('keyDown', (e: { scancode: string; key: string }) => {
      if (!this.gui) return;
      const map: Record<string, string> = {
        'up': 'Up', 'down': 'Down', 'left': 'Left', 'right': 'Right', 'space': 'Space',
      };
      const raw = (e.key || e.scancode || '').toLowerCase();
      this.gui.lastKey = map[raw] ?? (e.key || e.scancode || '');
    });
    win.on('keyUp', () => { if (this.gui) this.gui.lastKey = ''; });
    win.on('close', () => { this.guiRunning = false; win.destroy(); });
  }

  // ------------------------------------------------------------------
  // GUI 描画ヘルパー
  // ------------------------------------------------------------------
  private guiClear(color: string) {
    if (!this.gui) return;
    this.gui.ctx.fillStyle = color;
    this.gui.ctx.fillRect(0, 0, this.gui.width, this.gui.height);
  }

  private guiRect(x: number, y: number, w: number, h: number, color: string): PhysicsObject {
    const obj: PhysicsObject = { id: `rect-${Date.now()}`, type: 'rect', x, y, w, h, vx: 0, vy: 0, physicsEnabled: false, gravity: 0, color };
    if (this.gui) this.gui.physicsObjects.push(obj);
    const self = this;
    (obj as any).enablePhysics = (config: any) => {
      obj.physicsEnabled = true;
      obj.gravity = typeof config?.gravity === 'number' ? config.gravity : 9.8;
      return obj;
    };
    (obj as any).on = (event: string, cb: any) => {
      if (event === 'collision') obj.onCollision = cb;
      return obj;
    };
    (obj as any).setImage = async (newUrl: string) => {
       if (self.nativeCanvas) {
           obj.imgData = await self.nativeCanvas.loadImage(newUrl);
           obj.type = 'image';
       }
    };
    (obj as any).animate = (type: string, duration: number) => {
        obj.animType = type;
        obj.animDuration = duration || 1000;
        obj.animTimer = obj.animDuration;
        return obj;
    };
    return obj;
  }

  private async guiImage(url: string, x: number, y: number, w: number, h: number): Promise<PhysicsObject> {
    const obj: PhysicsObject = { id: `image-${Date.now()}`, type: 'image', x, y, w, h, vx: 0, vy: 0, physicsEnabled: false, gravity: 0, color: '' };
    if (this.gui && this.nativeCanvas) {
      try {
        const { loadImage } = this.nativeCanvas;
        obj.imgData = await loadImage(url);
      } catch { /* 画像ロード失敗は無視 */ }
    }
    if (this.gui) this.gui.physicsObjects.push(obj);
    const self = this;
    (obj as any).enablePhysics = (config: any) => {
      obj.physicsEnabled = true;
      obj.gravity = typeof config?.gravity === 'number' ? config.gravity : 9.8;
      return obj;
    };
    (obj as any).on = (event: string, cb: any) => {
      if (event === 'collision') obj.onCollision = cb;
      return obj;
    };
    (obj as any).setImage = async (newUrl: string) => {
       if (self.nativeCanvas) {
           obj.imgData = await self.nativeCanvas.loadImage(newUrl);
           obj.type = 'image';
       }
    };
    (obj as any).animate = (type: string, duration: number) => {
        obj.animType = type;
        obj.animDuration = duration || 1000;
        obj.animTimer = obj.animDuration;
        return obj;
    };
    return obj;
  }

  private guiText(t: string, x: number, y: number, color: string) {
    if (!this.gui) return;
    const { ctx } = this.gui;
    ctx.fillStyle = color;
    ctx.font = "18px monospace";
    ctx.fillText(String(t), x, y);
  }

  private async guiLoop() {
    if (!this.gui) return;
    this.guiRunning = true;
    const { window: win, canvas, ctx, physicsObjects } = this.gui;

    while (this.guiRunning) {
      // Clear screen
      this.guiClear('black');
      // Check for quit event or window close
      if (win.destroyed) {
         this.guiRunning = false;
         break;
      }

    // プレイヤー（物理なし最初の rect）のキー操作
    const player = physicsObjects.find(o => o.type === 'rect' && !o.physicsEnabled) as PhysicsObject | undefined;
    if (player) {
      const k = this.gui.lastKey;
      if (k === 'Left') { player.vx = -6; }
      else if (k === 'Right') { player.vx = 6; }
      else { player.vx = 0; }
      if (player.x < 0) player.x = 0;
      if (player.x + player.w > this.gui.width) player.x = this.gui.width - player.w;
    }

      // AABB 衝突判定と簡単な跳ね返り
      for (let i = 0; i < physicsObjects.length; i++) {
         for (let j = i + 1; j < physicsObjects.length; j++) {
            const a = physicsObjects[i];
            const b = physicsObjects[j];
            if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
               if (a.onCollision && a.onCollision instanceof DennerFunction) {
                  const evEnv = new Environment(a.onCollision.closure);
                  evEnv.set('e', { targetId: b.id, targetType: b.type, selfId: a.id });
                  this.executeBlock(a.onCollision.body, evEnv).catch(console.error);
               } else if (typeof a.onCollision === 'function') {
                  (a as any).onCollision({ targetId: b.id, targetType: b.type, selfId: a.id });
               }
               
               if (b.onCollision && b.onCollision instanceof DennerFunction) {
                  const evEnv = new Environment(b.onCollision.closure);
                  evEnv.set('e', { targetId: a.id, targetType: a.type, selfId: b.id });
                  this.executeBlock(b.onCollision.body, evEnv).catch(console.error);
               } else if (typeof b.onCollision === 'function') {
                  (b as any).onCollision({ targetId: a.id, targetType: a.type, selfId: b.id });
               }

                if (a.physicsEnabled) { 
                    a.y -= 2;
                    if (Math.abs(a.vy) > 0.1) a.vy *= -0.3;
                    (a as any).collisionEffect = 60;
                }
                if (b.physicsEnabled) { 
                    b.y += 2;
                    if (Math.abs(b.vy) > 0.1) b.vy *= -0.3;
                    (b as any).collisionEffect = 60;
                }
            }
         }
      }

    // 物理更新 & 描画
    for (const obj of physicsObjects) {
      if (obj.physicsEnabled) {
        obj.vy += obj.gravity * 0.016;
        
        // Jitter fix (same as Web version)
        if (Math.abs(obj.vy) < 0.1) obj.vy = 0;

        obj.x += obj.vx;
        obj.y += obj.vy;

        // Floor Collision
        if (obj.y + obj.h > this.gui.height) {
          obj.y = this.gui.height - obj.h;
          if (Math.abs(obj.vy) > 0.5) {
            obj.vy *= -0.5; // Bounce
          } else {
            obj.vy = 0; // Stop
          }
          if (obj.onCollision && obj.onCollision instanceof DennerFunction) {
             const evEnv = new Environment(obj.onCollision.closure);
             evEnv.set('e', { targetId: 'floor', targetType: 'boundary' });
             this.executeBlock(obj.onCollision.body, evEnv).catch(console.error);
          } else if (typeof obj.onCollision === 'function') {
            (obj as any).onCollision({ targetId: 'floor', targetType: 'boundary' });
          }
        }
      } else {
        obj.x += obj.vx;
        obj.y += obj.vy;
      }

      // Handle Effects & Animations
      if (obj.collisionEffect && obj.collisionEffect > 0) obj.collisionEffect--;
      if (obj.animTimer && obj.animTimer > 0) obj.animTimer--;

      // Drawing logic
      ctx.save();
      
      // Apply Animations
      let opacity = 1.0;
      if (obj.animType && obj.animTimer) {
          const progress = obj.animTimer / (obj.animDuration || 1);
          if (obj.animType === 'fade-out') opacity = progress;
          else if (obj.animType === 'fade-in') opacity = 1.0 - progress;
          else if (obj.animType === 'shake') {
              ctx.translate(Math.random()*4-2, Math.random()*4-2);
          } else if (obj.animType === 'pulse') {
              const s = 1.0 + Math.sin((1.0-progress) * Math.PI * 4) * 0.1;
              ctx.translate(obj.x + obj.w/2, obj.y + obj.h/2);
              ctx.scale(s, s);
              ctx.translate(-(obj.x + obj.w/2), -(obj.y + obj.h/2));
          }
      }
      ctx.globalAlpha = opacity;

      // Actual Draw
      if (obj.type === 'rect') {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
      } else if (obj.type === 'image' && obj.imgData) {
        ctx.drawImage(obj.imgData, obj.x, obj.y, obj.w, obj.h);
      }
      
      // Draw Collision Effect (ID Badge)
      if (obj.collisionEffect && obj.collisionEffect > 0) {
          const effectOpacity = obj.collisionEffect / 60;
          ctx.fillStyle = `rgba(255, 255, 255, ${effectOpacity})`;
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`ID: ${obj.id}`, obj.x + obj.w/2, obj.y - 10);
      }

      ctx.restore();
    }

    // SDL ウィンドウへ転送
    const { data } = ctx.getImageData(0, 0, this.gui.width, this.gui.height);
    // @kmamal/sdl は RGBA Buffer を期待する
    win.render(this.gui.width, this.gui.height, this.gui.width * 4, 'rgba32', Buffer.from(data.buffer));

    // 次フレームまで約16ms待機
    await new Promise(r => setTimeout(r, 16));
    }
    this.gui = null; // Cleanup
  }

  // ------------------------------------------------------------------
  // プログラム実行エントリ
  // ------------------------------------------------------------------
  private moduleLoader?: (source: string) => Promise<Environment>;
  private moduleCache: Map<string, Environment> = new Map();

  async run(program: AST.Program, moduleLoader?: (source: string) => Promise<Environment>, targetEnv: Environment = this.globalEnv): Promise<void> {
    this.moduleLoader = moduleLoader;
    // Pass 1: クラス・関数を先に登録（前方参照対応）
    for (const stmt of program.body) {
      if (stmt.type === 'FunctionDeclaration') {
        const decl = stmt as AST.FunctionDeclaration;
        targetEnv.set(decl.id.name, new DennerFunction(decl.params, decl.body, targetEnv));
      } else if (stmt.type === 'ClassDeclaration') {
        const decl = stmt as AST.ClassDeclaration;
        targetEnv.set(decl.id.name, new DennerClass(decl, targetEnv));
      } else if (stmt.type === 'ExportStatement') {
        const decl = (stmt as AST.ExportStatement).declaration;
        if (decl.type === 'FunctionDeclaration') {
          targetEnv.set(decl.id.name, new DennerFunction(decl.params, decl.body, targetEnv));
        }
      }
    }

    // Pass 2: 実行
    for (const stmt of program.body) {
      await this.execute(stmt, targetEnv);
    }
  }

  // ------------------------------------------------------------------
  // ステートメント実行
  // ------------------------------------------------------------------
  private async execute(stmt: AST.Statement, env: Environment): Promise<any> {
    switch (stmt.type) {
      // --------------------------------------------------------
      case 'VariableDeclaration': {
        const decl = stmt as AST.VariableDeclaration;
        const value = await this.evaluate(decl.init, env);
        env.set(decl.id.name, value);
        return;
      }
      // --------------------------------------------------------
      case 'FunctionDeclaration': {
        const decl = stmt as AST.FunctionDeclaration;
        env.set(decl.id.name, new DennerFunction(decl.params, decl.body, env));
        return;
      }
      // --------------------------------------------------------
      case 'ClassDeclaration': {
        const decl = stmt as AST.ClassDeclaration;
        env.set(decl.id.name, new DennerClass(decl, env));
        return;
      }
      // --------------------------------------------------------
      case 'ExpressionStatement': {
        const exprStmt = stmt as AST.ExpressionStatement;
        await this.evaluate(exprStmt.expression, env);
        return;
      }
      // --------------------------------------------------------
      case 'BlockStatement': {
        const block = stmt as AST.BlockStatement;
        const blockEnv = new Environment(env);
        for (const s of block.body) {
          const result = await this.execute(s, blockEnv);
          if (result instanceof ReturnSignal) return result;
        }
        return;
      }
      // --------------------------------------------------------
      case 'IfStatement': {
        const ifStmt = stmt as AST.IfStatement;
        const cond = await this.evaluate(ifStmt.test, env);
        if (cond) {
          return this.executeBlock(ifStmt.consequent, env);
        } else if (ifStmt.alternate) {
          if (ifStmt.alternate.type === 'IfStatement') {
            return this.execute(ifStmt.alternate, env);
          }
          return this.executeBlock(ifStmt.alternate as AST.BlockStatement, env);
        }
        return;
      }
      // --------------------------------------------------------
      case 'WhileStatement': {
        const whileStmt = stmt as AST.WhileStatement;
        while (await this.evaluate(whileStmt.test, env)) {
          const result = await this.executeBlock(whileStmt.body, env);
          if (result instanceof ReturnSignal) return result;
        }
        return;
      }
      // --------------------------------------------------------
      case 'ForRangeStatement': {
        const forRange = stmt as AST.ForRangeStatement;
        const start = await this.evaluate(forRange.start, env);
        const end = await this.evaluate(forRange.end, env);
        for (let i = start; i < end; i++) {
          const loopEnv = new Environment(env);
          loopEnv.set(forRange.iterator.name, i);
          const result = await this.executeBlock(forRange.body, loopEnv);
          if (result instanceof ReturnSignal) return result;
        }
        return;
      }
      // --------------------------------------------------------
      case 'ForInStatement': {
        const forIn = stmt as AST.ForInStatement;
        const iterable = await this.evaluate(forIn.iterable, env);
        const items = Array.isArray(iterable) ? iterable : Object.entries(iterable as object);
        for (const item of items) {
          const loopEnv = new Environment(env);
          if (forIn.iterators.length === 1) {
            loopEnv.set(forIn.iterators[0].name, item);
          } else if (forIn.iterators.length === 2 && Array.isArray(item)) {
            loopEnv.set(forIn.iterators[0].name, item[0]);
            loopEnv.set(forIn.iterators[1].name, item[1]);
          }
          const result = await this.executeBlock(forIn.body, loopEnv);
          if (result instanceof ReturnSignal) return result;
        }
        return;
      }
      // --------------------------------------------------------
      case 'ReturnStatement': {
        const ret = stmt as AST.ReturnStatement;
        const value = await this.evaluate(ret.argument, env);
        return new ReturnSignal(value);
      }
      // --------------------------------------------------------
      case 'ImportStatement': {
        const imp = stmt as AST.ImportStatement;
        if (!this.moduleLoader) {
            throw new RuntimeError(`Module loader not provided for import '${imp.source}'`);
        }
        
        let modEnv = this.moduleCache.get(imp.source);
        if (!modEnv) {
            modEnv = await this.moduleLoader(imp.source);
            this.moduleCache.set(imp.source, modEnv);
        }

        if (imp.alias) {
            // Namespace import: import "mod" as m
            // modEnv is already an Environment object which we can treat as an object
            env.set(imp.alias, modEnv.store); 
        } else {
            // Default "import all exports"
            modEnv.exports.forEach(key => {
                env.set(key, modEnv!.store.get(key));
            });
        }
        return;
      }
      case 'ExportStatement': {
         const exp = stmt as AST.ExportStatement;
         // Execute the internal declaration
         await this.execute(exp.declaration, env);
         // Mark as exported in current environment
         env.exports.add(exp.declaration.id.name);
         return;
      }
      default:
        throw new RuntimeError(`Unknown statement type: ${(stmt as any).type}`);
    }
  }

  private async executeBlock(block: AST.BlockStatement, parentEnv: Environment): Promise<any> {
    const blockEnv = new Environment(parentEnv);
    for (const s of block.body) {
      const result = await this.execute(s, blockEnv);
      if (result instanceof ReturnSignal) return result;
    }
  }

  // ------------------------------------------------------------------
  // 式評価
  // ------------------------------------------------------------------
  private async evaluate(expr: AST.Expression, env: Environment): Promise<any> {
    switch (expr.type) {
      // --------------------------------------------------------
      case 'NumberLiteral':
        return (expr as AST.NumberLiteral).value;
      // --------------------------------------------------------
      case 'StringLiteral':
        return (expr as AST.StringLiteral).value;
      // --------------------------------------------------------
      case 'BooleanLiteral':
        return (expr as AST.BooleanLiteral).value;
      // --------------------------------------------------------
      case 'Identifier': {
        const id = expr as AST.Identifier;
        return env.get(id.name);
      }
      // --------------------------------------------------------
      case 'UnaryExpression': {
        const un = expr as AST.UnaryExpression;
        const val = await this.evaluate(un.argument, env);
        if (un.operator === '-') return -val;
        if (un.operator === '!') return !val;
        if (un.operator === '+') return +val;
        throw new RuntimeError(`Unknown unary operator: ${un.operator}`);
      }
      // --------------------------------------------------------
      case 'ElementLiteral': {
        const el = expr as AST.ElementLiteral;
        const attrs: Record<string, any> = {};
        for (const [k, v] of Object.entries(el.attributes)) {
          attrs[k] = await this.evaluate(v, env);
        }
        const children = [];
        for (const childNode of el.children) {
          children.push(await this.evaluate(childNode, env));
        }
        return new DennerElement(el.tag, attrs, children);
      }
      // --------------------------------------------------------
      case 'BinaryExpression': {
        const bin = expr as AST.BinaryExpression;
        const left = await this.evaluate(bin.left, env);
        const right = await this.evaluate(bin.right, env);
        switch (bin.operator) {
          case '+':
            if (typeof left === 'string' || typeof right === 'string') return String(left) + String(right);
            return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return left < right;
          case '>': return left > right;
          case '<=': return left <= right;
          case '>=': return left >= right;
          case '&&': return left && right;
          case '||': return left || right;
          default:
            throw new RuntimeError(`Unknown binary operator: ${bin.operator}`);
        }
      }
      // --------------------------------------------------------
      case 'AssignmentExpression': {
        const assign = expr as AST.AssignmentExpression;
        const value = await this.evaluate(assign.right, env);
        if (assign.left.type === 'Identifier') {
          const name = (assign.left as AST.Identifier).name;
          if (env.has(name)) {
            env.assign(name, value);
          } else {
            env.set(name, value);
          }
        } else if (assign.left.type === 'MemberExpression') {
          // list[i] = v  or  obj.field = v
          const mem = assign.left as AST.MemberExpression;
          // MemberExpression の object を評価
          const obj = await this.evaluate(mem.object, env);
          const prop = mem.property.name;
          if (obj instanceof DennerInstance) {
            obj.fields.set(prop, value);
          } else if (obj && typeof obj === 'object') {
            obj[prop] = value;
          }
        }
        return value;
      }
      // --------------------------------------------------------
      case 'MemberExpression': {
        const mem = expr as AST.MemberExpression;
        const obj = await this.evaluate(mem.object, env);
        const prop = mem.property.name;
        if (obj instanceof DennerInstance) {
          if (obj.fields.has(prop)) return obj.fields.get(prop);
          // メソッドを探す
          const method = obj.klass.declaration.members.find(
            m => m.type === 'ClassMethod' && (m as AST.ClassMethod).id.name === prop,
          ) as AST.ClassMethod | undefined;
          if (method) {
            const fn = new DennerFunction(method.params, method.body, obj.klass.closure);
            return { __boundMethod: fn, __instance: obj };
          }
          throw new RuntimeError(`Property '${prop}' does not exist on instance.`);
        }
        if (obj instanceof Map) {
          if (obj.has(prop)) return obj.get(prop);
          throw new RuntimeError(`Property '${prop}' does not exist on module.`);
        }
        if (obj && typeof obj === 'object') {
          const val = obj[prop];
          if (val !== undefined) return val;
          // Fallback for native objects where we want to give 'undefined' back or throw
        }
        throw new RuntimeError(`Cannot access property '${prop}' on ${typeof obj}.`);
      }
      // --------------------------------------------------------
      case 'CallExpression': {
        const call = expr as AST.CallExpression;
        return this.evalCallExpression(call, env);
      }
      // --------------------------------------------------------
      case 'ObjectLiteral': {
        const obj = expr as AST.ObjectLiteral;
        const result: Record<string, any> = {};
        for (const prop of obj.properties) {
          result[prop.key] = await this.evaluate(prop.value, env);
        }
        return result;
      }
      // --------------------------------------------------------
      case 'ListLiteral': {
        const list = expr as AST.ListLiteral;
        const elements: any[] = [];
        for (const el of list.elements) {
          elements.push(await this.evaluate(el, env));
        }
        return elements;
      }
      // --------------------------------------------------------
      case 'FunctionExpression': {
        const func = expr as AST.FunctionExpression;
        return new DennerFunction(func.params, func.body, env);
      }
      // --------------------------------------------------------
      default:
        throw new RuntimeError(`Unknown expression type: ${(expr as any).type}`);
    }
  }

  // ------------------------------------------------------------------
  // CallExpression の評価（複雑なので分離）
  // ------------------------------------------------------------------
  private async evalCallExpression(call: AST.CallExpression, env: Environment): Promise<any> {
    // --- MemberExpression 呼び出し (a.b(...)) ---
    if (call.callee.type === 'MemberExpression') {
      const mem = call.callee as AST.MemberExpression;
      const obj = await this.evaluate(mem.object, env);
      const prop = mem.property.name;

      // ---- バインドメソッド（クラスインスタンスのメソッド） ----
      if (obj instanceof DennerInstance) {
        const method = obj.klass.declaration.members.find(
          m => m.type === 'ClassMethod' && (m as AST.ClassMethod).id.name === prop,
        ) as AST.ClassMethod | undefined;
        if (!method) throw new RuntimeError(`Method '${prop}' does not exist.`);

        const args = await Promise.all(call.arguments.map((a: AST.Expression) => this.evaluate(a, env)));
        // メソッド環境: this = インスタンス、パラメータを登録
        // ※ フィールドを environment に展開せず、this.fieldName への
        //   アクセスは MemberExpression/AssignmentExpression で直接 instance.fields を操作する
        const methodEnv = new Environment(obj.klass.closure);
        methodEnv.set('this', obj);
        for (let i = 0; i < method.params.length; i++) {
          methodEnv.set(method.params[i].id.name, args[i]);
        }

        const result = await this.executeBlock(method.body, methodEnv);

        if (result instanceof ReturnSignal) return result.value;
        return undefined;
      }

      // ---- 物理オブジェクト上のメソッド (obj.enablePhysics / obj.on) ----
      if (obj && typeof (obj as any)[prop] === 'function') {
        const args = await Promise.all(call.arguments.map((a: AST.Expression) => this.evaluate(a, env)));
        return (obj as any)[prop](...args);
      }

      // ---- 通常オブジェクト上のメソッド ----
      if (obj && typeof obj === 'object' && !(obj instanceof Map) && typeof obj[prop] === 'function') {
        const args = await Promise.all(call.arguments.map((a: AST.Expression) => this.evaluate(a, env)));
        return await obj[prop](...args);
      }
      
      // それ以外（モジュールの関数など）は通常の評価に任せる
    }

    // --- 通常の Identifier または MemberExpression の評価結果呼び出し ---
    const callee = await this.evaluate(call.callee, env);
    const args = await Promise.all(call.arguments.map((a: AST.Expression) => this.evaluate(a, env)));

    // クラスのコンストラクタ呼び出し (new ClassName(...))
    if (callee instanceof DennerClass) {
      const instance = new DennerInstance(callee);
      // プロパティの初期値を設定
      for (const member of callee.declaration.members) {
        if (member.type === 'ClassProperty') {
          const prop = member as AST.ClassProperty;
          let initVal: any;
          if (prop.init) {
            initVal = await this.evaluate(prop.init, callee.closure);
          } else {
            // 型に応じたデフォルト値
            const t = prop.typeAnnotation;
            if (t === 'num') initVal = 0;
            else if (t === 'str') initVal = '';
            else if (t === 'bool') initVal = false;
            else initVal = undefined;
          }
          instance.fields.set(prop.id.name, initVal);
        }
      }
      // constructor メソッドを呼ぶ
      const ctor = callee.declaration.members.find(
        m => m.type === 'ClassMethod' && (m as AST.ClassMethod).id.name === 'constructor',
      ) as AST.ClassMethod | undefined;
      if (ctor) {
        const ctorEnv = new Environment(callee.closure);
        ctorEnv.set('this', instance);
        for (let i = 0; i < ctor.params.length; i++) {
          ctorEnv.set(ctor.params[i].id.name, args[i]);
        }
        for (const [k, v] of instance.fields) ctorEnv.set(k, v);
        await this.executeBlock(ctor.body, ctorEnv);
        // this への代入を反映
        for (const member of callee.declaration.members) {
          if (member.type === 'ClassProperty') {
            const fieldName = (member as AST.ClassProperty).id.name;
            if (ctorEnv.has(fieldName)) {
              instance.fields.set(fieldName, ctorEnv.get(fieldName));
            }
          }
        }
      }
      return instance;
    }

    // DennerFunction 呼び出し
    if (callee instanceof DennerFunction) {
      const fnEnv = new Environment(callee.closure);
      for (let i = 0; i < callee.params.length; i++) {
        fnEnv.set(callee.params[i].id.name, args[i]);
      }
      const result = await this.executeBlock(callee.body, fnEnv);
      if (result instanceof ReturnSignal) return result.value;
      return undefined;
    }

    // バインドメソッド（MemberExpression を Identifier で受けた場合）
    if (callee && (callee as any).__boundMethod) {
      const { __boundMethod: fn, __instance: inst } = callee as any;
      const fnEnv = new Environment((fn as DennerFunction).closure);
      fnEnv.set('this', inst);
      for (const [k, v] of (inst as DennerInstance).fields) fnEnv.set(k, v);
      const fnDecl = fn as DennerFunction;
      for (let i = 0; i < fnDecl.params.length; i++) {
        fnEnv.set(fnDecl.params[i].id.name, args[i]);
      }
      const result = await this.executeBlock(fnDecl.body, fnEnv);
      if (result instanceof ReturnSignal) return result.value;
      return undefined;
    }

    // JS ネイティブ関数
    if (typeof callee === 'function') {
      return await callee(...args);
    }

    throw new RuntimeError(`'${JSON.stringify(call.callee)}' is not callable.`);
  }
}
