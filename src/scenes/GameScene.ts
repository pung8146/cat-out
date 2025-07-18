import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  private gecko!: Phaser.GameObjects.Container;
  private geckoParts: Phaser.GameObjects.Graphics[] = [];
  private holes!: Phaser.GameObjects.Group;
  private tiles!: Phaser.GameObjects.Group;
  private background!: Phaser.GameObjects.TileSprite;
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private level: number = 1;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timeLeft: number = 60; // 60초 제한 시간

  // 타일 맵 관련 변수들
  private tileSize: number = 40;
  private mapWidth: number = 20; // 800 / 40
  private mapHeight: number = 15; // 600 / 40
  private tileMap: number[][] = [];
  private validTiles: Phaser.GameObjects.Graphics[] = [];

  // 소코반 관련 변수들
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private lastValidPosition: { x: number; y: number } = { x: 140, y: 140 };
  private geckoDirection:
    | "horizontal"
    | "vertical"
    | "L-horizontal"
    | "L-vertical" = "horizontal"; // 도마뱀 방향
  private geckoLength: number = 3; // 도마뱀 길이 (3칸)
  private geckoPath: { x: number; y: number }[] = [];
  private lastDirection: { x: number; y: number } = { x: 1, y: 0 }; // 마지막 이동 방향

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.createBackground();
    this.createTileMap();
    this.createLevel();
    this.createGecko();
    this.createUI();
    this.setupMouseControls();
    this.setupCollisions();
    this.startTimer();
  }

  private createBackground() {
    // 배경 생성
    this.background = this.add.tileSprite(400, 300, 800, 600, "background");
    this.background.setTint(0x87ceeb); // 하늘색
  }

  private createTileMap() {
    // 투톤 격자 패턴 맵 생성 (0: 벽, 1: 길)
    this.tileMap = [];

    for (let y = 0; y < this.mapHeight; y++) {
      this.tileMap[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        // 가장자리는 벽, 나머지는 길
        if (
          x === 0 ||
          x === this.mapWidth - 1 ||
          y === 0 ||
          y === this.mapHeight - 1
        ) {
          this.tileMap[y][x] = 0; // 벽
        } else {
          this.tileMap[y][x] = 1; // 길
        }
      }
    }

    // 타일 맵 렌더링 (투톤 컬러)
    this.validTiles = [];
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = this.tileMap[y][x];
        const tileX = x * this.tileSize + this.tileSize / 2;
        const tileY = y * this.tileSize + this.tileSize / 2;

        if (tileType === 0) {
          // 벽 타일 (어두운 회색)
          const wallTile = this.add.graphics();
          wallTile.fillStyle(0x444444);
          wallTile.fillRect(
            -this.tileSize / 2,
            -this.tileSize / 2,
            this.tileSize,
            this.tileSize
          );
          wallTile.setPosition(tileX, tileY);
        } else if (tileType === 1) {
          // 길 타일 (격자 패턴 - 두 가지 색)
          const pathTile = this.add.graphics();

          // 격자 패턴: 짝수/홀수 위치에 따라 다른 색상
          const isEvenTile = (x + y) % 2 === 0;
          const tileColor = isEvenTile ? 0xcccccc : 0xaaaaaa; // 밝은 회색과 어두운 회색

          pathTile.fillStyle(tileColor);
          pathTile.fillRect(
            -this.tileSize / 2,
            -this.tileSize / 2,
            this.tileSize,
            this.tileSize
          );
          pathTile.setPosition(tileX, tileY);
          this.validTiles.push(pathTile);
        }
      }
    }
  }

  private createLevel() {
    // 색상 구멍 생성 (격자에 맞춰 배치)
    this.holes = this.add.group();
    const holes = [
      { x: 140, y: 140, color: 0xff0000 }, // 빨간색 (왼쪽 위)
      { x: 300, y: 140, color: 0x00ff00 }, // 녹색 (중앙 위)
      { x: 460, y: 140, color: 0x0000ff }, // 파란색 (오른쪽 위)
    ];

    holes.forEach((hole) => {
      const holeGraphics = this.add.graphics();
      holeGraphics.fillStyle(hole.color);
      holeGraphics.fillRect(-30, -30, 60, 60); // 60x60 크기의 네모
      holeGraphics.setPosition(hole.x, hole.y);
      this.holes.add(holeGraphics);
    });
  }

  private createGecko() {
    // 3칸 도마뱀 생성 (가로 방향)
    this.gecko = this.add.container(140, 140);
    // 초기 경로: 가로 3칸
    this.geckoPath = [
      { x: 140, y: 140 },
      { x: 100, y: 140 },
      { x: 60, y: 140 },
    ];
    this.renderGeckoFromPath();
    this.updateGeckoInteractive();
  }

  private renderGeckoFromPath() {
    this.geckoParts.forEach((part) => part.destroy());
    this.geckoParts = [];
    this.gecko.removeAll(true);
    for (let i = 0; i < this.geckoPath.length; i++) {
      const part = this.add.graphics();
      const color = i === 0 ? 0xff0000 : i === 1 ? 0xff4444 : 0xff8888;
      part.fillStyle(color);
      part.fillRect(
        -this.tileSize / 2,
        -this.tileSize / 2,
        this.tileSize,
        this.tileSize
      );
      part.setPosition(
        this.geckoPath[i].x - this.geckoPath[0].x,
        this.geckoPath[i].y - this.geckoPath[0].y
      );
      this.geckoParts.push(part);
      this.gecko.add(part);
    }
    // 컨테이너 위치를 머리로 이동
    this.gecko.x = this.geckoPath[0].x;
    this.gecko.y = this.geckoPath[0].y;
  }

  private updateGeckoInteractive() {
    // 머리, 몸통, 꼬리 모두 포함하는 경계
    const minX = Math.min(...this.geckoPath.map((p) => p.x));
    const minY = Math.min(...this.geckoPath.map((p) => p.y));
    const maxX = Math.max(...this.geckoPath.map((p) => p.x));
    const maxY = Math.max(...this.geckoPath.map((p) => p.y));
    this.gecko.setInteractive(
      new Phaser.Geom.Rectangle(
        minX - this.gecko.x - this.tileSize / 2,
        minY - this.gecko.y - this.tileSize / 2,
        maxX - minX + this.tileSize,
        maxY - minY + this.tileSize
      ),
      Phaser.Geom.Rectangle.Contains
    );
  }

  private createUI() {
    this.scoreText = this.add.text(16, 16, "점수: 0", {
      fontSize: "24px",
      color: "#FFFFFF",
      backgroundColor: "#000000",
      padding: { x: 10, y: 5 },
    });

    this.levelText = this.add.text(16, 50, "레벨: 1", {
      fontSize: "24px",
      color: "#FFFFFF",
      backgroundColor: "#000000",
      padding: { x: 10, y: 5 },
    });

    this.timerText = this.add.text(16, 84, "시간: 60", {
      fontSize: "24px",
      color: "#FFFFFF",
      backgroundColor: "#000000",
      padding: { x: 10, y: 5 },
    });
  }

  private setupMouseControls() {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // 도마뱀 머리 기준 경계
      const head = this.geckoPath[0];
      const bounds = new Phaser.Geom.Rectangle(
        head.x - this.tileSize / 2,
        head.y - this.tileSize / 2,
        this.tileSize,
        this.tileSize
      );
      if (bounds.contains(pointer.x, pointer.y)) {
        this.isDragging = true;
        this.dragStart = { x: pointer.x, y: pointer.y };
      }
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.dragStart) return;
      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;
      // 한 칸 이상 움직였는지, 그리고 상하좌우 중 가장 큰 방향만 허용
      if (Math.abs(dx) < this.tileSize / 2 && Math.abs(dy) < this.tileSize / 2)
        return;
      const dir: { x: number; y: number } = { x: 0, y: 0 };
      if (Math.abs(dx) > Math.abs(dy)) {
        dir.x = dx > 0 ? 1 : -1;
      } else {
        dir.y = dy > 0 ? 1 : -1;
      }
      this.tryMoveSnake(dir);
      this.isDragging = false;
      this.dragStart = null;
    });
    this.input.on("pointerup", () => {
      this.isDragging = false;
      this.dragStart = null;
    });
  }

  private tryMoveSnake(dir: { x: number; y: number }) {
    const head = this.geckoPath[0];
    const newHead = {
      x: head.x + dir.x * this.tileSize,
      y: head.y + dir.y * this.tileSize,
    };
    // 이동 가능 여부 체크
    if (!this.isValidPosition(newHead.x, newHead.y)) return;
    // 몸통과 겹치지 않게(자기 몸과 충돌 방지)
    if (this.geckoPath.some((p) => p.x === newHead.x && p.y === newHead.y))
      return;
    // 이동
    this.geckoPath = [
      newHead,
      ...this.geckoPath.slice(0, this.geckoLength - 1),
    ];
    this.renderGeckoFromPath();
    this.updateGeckoInteractive();
  }

  private isValidPosition(x: number, y: number): boolean {
    // 맵 범위 확인
    if (
      x < this.tileSize / 2 ||
      x > 800 - this.tileSize / 2 ||
      y < this.tileSize / 2 ||
      y > 600 - this.tileSize / 2
    ) {
      console.log(`위치 (${x}, ${y})가 맵 범위를 벗어남`);
      return false;
    }

    // 타일 맵에서 해당 위치가 길인지 확인
    const tileX = Math.floor(x / this.tileSize);
    const tileY = Math.floor(y / this.tileSize);

    console.log(`위치 (${x}, ${y}) -> 타일 (${tileX}, ${tileY})`);

    if (
      tileY >= 0 &&
      tileY < this.mapHeight &&
      tileX >= 0 &&
      tileX < this.mapWidth
    ) {
      const tileType = this.tileMap[tileY][tileX];
      console.log(`타일 (${tileX}, ${tileY})의 타입: ${tileType}`);
      return tileType === 1;
    }

    console.log(`타일 (${tileX}, ${tileY})가 맵 범위를 벗어남`);
    return false;
  }

  private canMoveTo(dx: number, dy: number): boolean {
    const currentX = this.gecko.x;
    const currentY = this.gecko.y;

    console.log("이동 시도:", dx, dy, "현재 위치:", currentX, currentY);

    // 새로운 머리 위치 계산
    const newX = currentX + dx;
    const newY = currentY + dy;

    console.log(`새 위치: (${newX}, ${newY})`);

    // 새로운 경로 계산 (머리만 새 위치로, 나머지는 기존 경로에서)
    const newPath = [{ x: newX, y: newY }];
    for (let i = 0; i < this.geckoLength - 1; i++) {
      if (this.geckoPath[i]) {
        newPath.push(this.geckoPath[i]);
      }
    }

    // 새로운 경로의 모든 부분이 유효한 위치인지 확인
    for (let i = 0; i < newPath.length; i++) {
      const pos = newPath[i];
      if (!this.isValidPosition(pos.x, pos.y)) {
        console.log(
          `도마뱀 ${i}번째 부분 위치 (${pos.x}, ${pos.y})가 유효하지 않음`
        );
        return false;
      }
    }

    console.log("이동 가능!");
    return true;
  }

  private updateGeckoPath(newX: number, newY: number) {
    console.log("경로 업데이트 시작:", newX, newY);
    console.log("업데이트 전 경로:", this.geckoPath);

    // 경로가 비어있거나 모든 위치가 같으면 초기 경로 설정
    if (
      this.geckoPath.length === 0 ||
      this.geckoPath.every((pos) => pos.x === newX && pos.y === newY)
    ) {
      console.log("경로 초기화 - 모든 위치가 같음");
      this.geckoPath = [
        { x: newX, y: newY },
        { x: newX - this.tileSize, y: newY },
        { x: newX - this.tileSize * 2, y: newY },
      ];
    } else {
      // 새로운 머리 위치를 경로 맨 앞에 추가
      this.geckoPath.unshift({ x: newX, y: newY });

      // 경로 길이를 3칸으로 유지 (꼬리 제거)
      while (this.geckoPath.length > this.geckoLength) {
        this.geckoPath.pop();
      }
    }

    console.log("업데이트 후 경로:", this.geckoPath);
    console.log("경로 길이:", this.geckoPath.length);
  }

  private updateGeckoLayoutFromPath() {
    // 기존 파트들 제거
    this.geckoParts.forEach((part) => part.destroy());
    this.geckoParts = [];

    console.log("경로 기반 레이아웃 업데이트 시작");
    console.log("현재 경로:", this.geckoPath);
    console.log("경로 길이:", this.geckoPath.length);

    // 경로가 충분하지 않으면 기본 레이아웃으로 폴백
    if (this.geckoPath.length < this.geckoLength) {
      console.log("경로가 부족함, 기본 레이아웃으로 폴백");
      this.updateGeckoLayout();
      return;
    }

    // 경로에 따라 파트들 재생성
    for (let i = 0; i < this.geckoLength; i++) {
      const part = this.add.graphics();

      // 머리, 몸통, 꼬리 구분
      let color: number;
      if (i === 0) {
        color = 0xff0000; // 머리 (빨간색)
      } else if (i === 1) {
        color = 0xff4444; // 몸통 (연한 빨간색)
      } else {
        color = 0xff8888; // 꼬리 (더 연한 빨간색)
      }

      part.fillStyle(color);
      part.fillRect(
        -this.tileSize / 2,
        -this.tileSize / 2,
        this.tileSize,
        this.tileSize
      );

      // 경로에 따라 위치 설정
      const pathPos = this.geckoPath[i];
      if (pathPos) {
        part.setPosition(pathPos.x - this.gecko.x, pathPos.y - this.gecko.y);
        console.log(
          `파트 ${i} 위치: (${pathPos.x - this.gecko.x}, ${
            pathPos.y - this.gecko.y
          })`
        );
      } else {
        console.log(`경로 ${i}가 없음!`);
        // 기본 위치로 설정
        part.setPosition((i - 1) * this.tileSize, 0);
      }

      this.geckoParts.push(part);
      this.gecko.add(part);
    }

    // 인터랙티브 영역 업데이트 (경로 기반)
    const bounds = this.calculateGeckoBounds();
    this.gecko.setInteractive(
      new Phaser.Geom.Rectangle(
        bounds.x - this.gecko.x,
        bounds.y - this.gecko.y,
        bounds.width,
        bounds.height
      ),
      Phaser.Geom.Rectangle.Contains
    );

    console.log("도마뱀 레이아웃 업데이트 (경로 기반) 완료");
  }

  private calculateGeckoBounds() {
    // 경로의 모든 점을 포함하는 경계 계산
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.geckoPath.forEach((pos) => {
      minX = Math.min(minX, pos.x - this.tileSize / 2);
      minY = Math.min(minY, pos.y - this.tileSize / 2);
      maxX = Math.max(maxX, pos.x + this.tileSize / 2);
      maxY = Math.max(maxY, pos.y + this.tileSize / 2);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private updateGeckoLayout() {
    // 기존 파트들 제거
    this.geckoParts.forEach((part) => part.destroy());
    this.geckoParts = [];

    console.log("레이아웃 업데이트 - 방향:", this.geckoDirection);

    // 새로운 방향에 따라 파트들 재생성
    for (let i = 0; i < this.geckoLength; i++) {
      const part = this.add.graphics();

      // 머리, 몸통, 꼬리 구분
      let color: number;
      if (i === 0) {
        color = 0xff0000; // 머리 (빨간색)
      } else if (i === 1) {
        color = 0xff4444; // 몸통 (연한 빨간색)
      } else {
        color = 0xff8888; // 꼬리 (더 연한 빨간색)
      }

      part.fillStyle(color);
      part.fillRect(
        -this.tileSize / 2,
        -this.tileSize / 2,
        this.tileSize,
        this.tileSize
      );

      // 방향에 따라 위치 설정
      if (this.geckoDirection === "horizontal") {
        // 가로 방향: 중앙 기준으로 좌우 배치
        part.setPosition((i - 1) * this.tileSize, 0);
        console.log(`가로 파트 ${i} 위치: (${(i - 1) * this.tileSize}, 0)`);
      } else if (this.geckoDirection === "vertical") {
        // 세로 방향: 중앙 기준으로 상하 배치
        part.setPosition(0, (i - 1) * this.tileSize);
        console.log(`세로 파트 ${i} 위치: (0, ${(i - 1) * this.tileSize})`);
      } else if (this.geckoDirection === "L-horizontal") {
        // L자 가로: 가로 2칸 + 세로 1칸
        if (i === 0) {
          part.setPosition(0, 0); // 머리 (중앙)
          console.log(`L가로 파트 ${i} 위치: (0, 0)`);
        } else if (i === 1) {
          part.setPosition(-this.tileSize, 0); // 몸통 (왼쪽)
          console.log(`L가로 파트 ${i} 위치: (-${this.tileSize}, 0)`);
        } else {
          part.setPosition(-this.tileSize, this.tileSize); // 꼬리 (왼쪽 아래)
          console.log(
            `L가로 파트 ${i} 위치: (-${this.tileSize}, ${this.tileSize})`
          );
        }
      } else if (this.geckoDirection === "L-vertical") {
        // L자 세로: 세로 2칸 + 가로 1칸
        if (i === 0) {
          part.setPosition(0, 0); // 머리 (중앙)
          console.log(`L세로 파트 ${i} 위치: (0, 0)`);
        } else if (i === 1) {
          part.setPosition(0, -this.tileSize); // 몸통 (위쪽)
          console.log(`L세로 파트 ${i} 위치: (0, -${this.tileSize})`);
        } else {
          part.setPosition(this.tileSize, -this.tileSize); // 꼬리 (오른쪽 위)
          console.log(
            `L세로 파트 ${i} 위치: (${this.tileSize}, -${this.tileSize})`
          );
        }
      }

      this.geckoParts.push(part);
      this.gecko.add(part);
    }

    // 인터랙티브 영역 업데이트
    if (this.geckoDirection === "horizontal") {
      this.gecko.setInteractive(
        new Phaser.Geom.Rectangle(
          -this.tileSize * 1.5,
          -this.tileSize / 2,
          this.tileSize * 3,
          this.tileSize
        ),
        Phaser.Geom.Rectangle.Contains
      );
    } else if (this.geckoDirection === "vertical") {
      this.gecko.setInteractive(
        new Phaser.Geom.Rectangle(
          -this.tileSize / 2,
          -this.tileSize * 1.5,
          this.tileSize,
          this.tileSize * 3
        ),
        Phaser.Geom.Rectangle.Contains
      );
    } else if (this.geckoDirection === "L-horizontal") {
      // L자 가로: 가로 2칸 + 세로 1칸 영역
      this.gecko.setInteractive(
        new Phaser.Geom.Rectangle(
          -this.tileSize * 1.5,
          -this.tileSize / 2,
          this.tileSize * 2,
          this.tileSize * 1.5
        ),
        Phaser.Geom.Rectangle.Contains
      );
    } else if (this.geckoDirection === "L-vertical") {
      // L자 세로: 세로 2칸 + 가로 1칸 영역
      this.gecko.setInteractive(
        new Phaser.Geom.Rectangle(
          -this.tileSize / 2,
          -this.tileSize * 1.5,
          this.tileSize * 1.5,
          this.tileSize * 2
        ),
        Phaser.Geom.Rectangle.Contains
      );
    }

    console.log("도마뱀 레이아웃 업데이트 완료");
  }

  private moveGecko(dx: number, dy: number) {
    if (this.canMoveTo(dx, dy)) {
      this.gecko.x += dx;
      this.gecko.y += dy;
    }
  }

  private setupCollisions() {
    // 충돌 감지는 update() 메서드에서 수동으로 처리
  }

  private handleHoleCollision(
    gecko: Phaser.GameObjects.GameObject,
    hole: Phaser.GameObjects.GameObject
  ) {
    const holeGraphics = hole as Phaser.GameObjects.Graphics;

    // 색상이 일치하는지 확인 (도마뱀은 빨간색, 빨간 구멍과 매칭)
    const holeX = holeGraphics.x;
    if (holeX === 140) {
      // 빨간 구멍 위치
      // 성공! 점수 증가
      this.score += 50;
      this.scoreText.setText("점수: " + this.score);

      // 구멍 제거
      holeGraphics.destroy();

      // 성공 효과 - 도마뱀을 녹색으로 변경
      this.geckoParts.forEach((part) => {
        part.clear();
        part.fillStyle(0x00ff00);
        part.fillRect(
          -this.tileSize / 2,
          -this.tileSize / 2,
          this.tileSize,
          this.tileSize
        );
      });

      this.time.delayedCall(200, () => {
        this.geckoParts.forEach((part, i) => {
          part.clear();
          part.fillStyle([0xff0000, 0xff4444, 0xff8888, 0xffcccc][i]);
          part.fillRect(
            -this.tileSize / 2,
            -this.tileSize / 2,
            this.tileSize,
            this.tileSize
          );
        });
      });

      // 모든 구멍이 제거되었는지 확인
      if (this.holes.children.size === 0) {
        this.levelComplete();
      }
    } else {
      // 실패! 점수 감소
      this.score = Math.max(0, this.score - 10);
      this.scoreText.setText("점수: " + this.score);

      // 실패 효과 - 도마뱀을 노란색으로 변경
      this.geckoParts.forEach((part) => {
        part.clear();
        part.fillStyle(0xffff00);
        part.fillRect(
          -this.tileSize / 2,
          -this.tileSize / 2,
          this.tileSize,
          this.tileSize
        );
      });

      this.time.delayedCall(200, () => {
        this.geckoParts.forEach((part, i) => {
          part.clear();
          part.fillStyle([0xff0000, 0xff4444, 0xff8888, 0xffcccc][i]);
          part.fillRect(
            -this.tileSize / 2,
            -this.tileSize / 2,
            this.tileSize,
            this.tileSize
          );
        });
      });
    }
  }

  private levelComplete() {
    this.score += 100;
    this.scoreText.setText("점수: " + this.score);

    // 레벨 완료 효과 - 도마뱀을 녹색으로 변경
    this.geckoParts.forEach((part) => {
      part.clear();
      part.fillStyle(0x00ff00);
      part.fillRect(
        -this.tileSize / 2,
        -this.tileSize / 2,
        this.tileSize,
        this.tileSize
      );
    });

    this.time.delayedCall(1000, () => {
      this.level++;
      this.levelText.setText("레벨: " + this.level);
      this.scene.restart();
    });
  }

  private startTimer() {
    // 1초마다 타이머 업데이트
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });
  }

  private updateTimer() {
    this.timeLeft--;
    this.timerText.setText("시간: " + this.timeLeft);

    if (this.timeLeft <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    // 게임 오버 처리
    this.scene.pause();

    const gameOverText = this.add.text(400, 300, "게임 오버!", {
      fontSize: "48px",
      color: "#FF0000",
      backgroundColor: "#000000",
      padding: { x: 20, y: 10 },
    });
    gameOverText.setOrigin(0.5);

    const finalScoreText = this.add.text(400, 350, "최종 점수: " + this.score, {
      fontSize: "24px",
      color: "#FFFFFF",
      backgroundColor: "#000000",
      padding: { x: 10, y: 5 },
    });
    finalScoreText.setOrigin(0.5);
  }

  update() {
    // 수동 충돌 감지
    this.checkCollisions();
  }

  private checkCollisions() {
    // 경로 기반 충돌 감지
    this.holes.children.each((hole: Phaser.GameObjects.GameObject) => {
      const holeGraphics = hole as Phaser.GameObjects.Graphics;
      const holeBounds = new Phaser.Geom.Rectangle(
        holeGraphics.x - 30,
        holeGraphics.y - 30,
        60,
        60
      );

      // 도마뱀의 각 부분과 구멍 충돌 확인
      let collision = false;
      this.geckoPath.forEach((pos) => {
        const partBounds = new Phaser.Geom.Rectangle(
          pos.x - this.tileSize / 2,
          pos.y - this.tileSize / 2,
          this.tileSize,
          this.tileSize
        );

        if (Phaser.Geom.Rectangle.Overlaps(partBounds, holeBounds)) {
          collision = true;
        }
      });

      if (collision) {
        this.handleHoleCollision(this.gecko, holeGraphics);
      }
      return true;
    });
  }
}
