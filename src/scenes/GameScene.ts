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
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastValidPosition: { x: number; y: number } = { x: 140, y: 140 };

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
    // 한 칸 도마뱀 생성
    this.gecko = this.add.container(140, 140); // 격자 중앙에 위치

    // 한 개의 네모로 도마뱀 구성
    const part = this.add.graphics();
    part.fillStyle(0xff0000); // 빨간색
    part.fillRect(
      -this.tileSize / 2,
      -this.tileSize / 2,
      this.tileSize,
      this.tileSize
    );

    this.geckoParts.push(part);
    this.gecko.add(part);

    // 도마뱀을 인터랙티브하게 만들기
    this.gecko.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.tileSize / 2,
        -this.tileSize / 2,
        this.tileSize,
        this.tileSize
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // 디버깅을 위한 텍스트 추가
    const debugText = this.add.text(140, 200, "한 칸 도마뱀 (클릭 가능)", {
      fontSize: "14px",
      color: "#FFFFFF",
      backgroundColor: "#000000",
    });
    debugText.setOrigin(0.5);
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
    // 마우스 드래그 컨트롤 설정
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // 도마뱀의 실제 경계 계산 (한 칸)
      const geckoBounds = new Phaser.Geom.Rectangle(
        this.gecko.x - this.tileSize / 2,
        this.gecko.y - this.tileSize / 2,
        this.tileSize,
        this.tileSize
      );

      console.log("클릭 위치:", pointer.x, pointer.y);
      console.log("도마뱀 위치:", this.gecko.x, this.gecko.y);
      console.log("도마뱀 경계:", geckoBounds);

      if (geckoBounds.contains(pointer.x, pointer.y)) {
        console.log("도마뱀 클릭됨!");
        this.isDragging = true;
        this.dragOffset.x = pointer.x - this.gecko.x;
        this.dragOffset.y = pointer.y - this.gecko.y;
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        console.log("드래그 중:", pointer.x, pointer.y);

        const newX = pointer.x - this.dragOffset.x;
        const newY = pointer.y - this.dragOffset.y;

        // 타일 기반 위치로 스냅
        const snappedX =
          Math.round(newX / this.tileSize) * this.tileSize + this.tileSize / 2;
        const snappedY =
          Math.round(newY / this.tileSize) * this.tileSize + this.tileSize / 2;

        console.log("스냅된 위치:", snappedX, snappedY);

        // 유효한 위치인지 확인
        if (this.canMoveTo(snappedX - this.gecko.x, snappedY - this.gecko.y)) {
          console.log("이동 가능:", snappedX, snappedY);
          this.gecko.x = snappedX;
          this.gecko.y = snappedY;
          this.lastValidPosition = { x: snappedX, y: snappedY };
        } else {
          console.log("이동 불가능:", snappedX, snappedY);
        }
      }
    });

    this.input.on("pointerup", () => {
      if (this.isDragging) {
        console.log("드래그 종료");
        this.isDragging = false;
      }
    });
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

    // 한 칸 이동 가능한지 확인
    const newX = currentX + dx;
    const newY = currentY + dy;

    console.log(`새 위치: (${newX}, ${newY})`);

    if (!this.isValidPosition(newX, newY)) {
      console.log(`위치 (${newX}, ${newY})가 유효하지 않음`);
      return false;
    }

    console.log("이동 가능!");
    return true;
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
    const geckoBounds = new Phaser.Geom.Rectangle(
      this.gecko.x - this.tileSize / 2,
      this.gecko.y - this.tileSize / 2,
      this.tileSize,
      this.tileSize
    );

    this.holes.children.each((hole: Phaser.GameObjects.GameObject) => {
      const holeGraphics = hole as Phaser.GameObjects.Graphics;
      const holeBounds = new Phaser.Geom.Rectangle(
        holeGraphics.x - 30,
        holeGraphics.y - 30,
        60,
        60
      );

      if (Phaser.Geom.Rectangle.Overlaps(geckoBounds, holeBounds)) {
        this.handleHoleCollision(this.gecko, holeGraphics);
      }
      return true;
    });
  }
}
