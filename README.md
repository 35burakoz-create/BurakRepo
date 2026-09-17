# Thermo Drift (working title) - Unity 2D Portrait Prototype

This repository contains ready-to-drop gameplay scripts for a global hypercasual mobile runner concept where player control quality depends on matching a moving temperature target.

## Included scripts

Place these scripts under `Assets/Scripts`:

- `GameManager.cs`: game state machine, score, multiplier, target-cycle, restart, best score save.
- `PlayerController.cs`: one-finger horizontal drag movement with traction/drift behavior from temperature mismatch.
- `TemperatureField.cs`: procedural scalar field with `SampleTemp(...)` and `IdealMask(...)`.
- `TrackScroller.cs`: UV scrolling for track/background movement.
- `Spawner.cs`: pooled spawning for obstacles, bonuses, and gates with ideal-band safety rule.
- `TempGate.cs`: trigger-based instant target swap with cue.
- `UIManager.cs`: English UI labels and revive/restart flow.

---

## Exact Unity scene setup

### 1) Project / scene basics
1. Create a new Unity **2D (URP or Built-in)** project.
2. Set build platform to Android (optional now, required for export).
3. Open your main scene, save as `Main.unity`.
4. In **File > Build Settings**, add `Main` scene to build list.

### 2) Camera
1. Select `Main Camera`.
2. Projection: **Orthographic**.
3. Size: **5.5**.
4. Position: `(0, 0, -10)`.
5. Background: dark color (e.g. `#1A1C24`).

### 3) Core manager objects
Create empty GameObjects:

- `GameManager` with component `GameManager`.
- `TemperatureField` with component `TemperatureField`.
- `Spawner` with component `Spawner`.
- `UIManager` with component `UIManager`.

Recommended inspector values:

**GameManager**
- Target Temp: `0`
- Target Tolerance: `0.20`
- Random Retarget Interval: `12`
- Base Scroll Speed: `7`
- Speed Boost At Perfect: `3`
- Min Multiplier: `1`
- Max Multiplier: `4`

**TemperatureField**
- Spatial Frequency: `0.35`
- Time Frequency: `0.70`
- Harmonics: `0.55`
- Harmonic Scale: `2.20`

**Spawner**
- Temperature Field: reference `TemperatureField`
- MinX: `-2.4`, MaxX: `2.4`
- SpawnY: `9`, DespawnY: `-7`
- LaneStep: `0.6`
- SpawnEverySeconds: `0.45`
- GateEverySeconds: `8`
- ObstacleChanceIdealZone: `0.15`
- ObstacleChanceNonIdealZone: `0.65`
- BonusChanceIdealZone: `0.5`

### 4) Player setup
1. Create `Player` as `SpriteRenderer` (placeholder sprite: built-in square/circle).
2. Scale around `(0.7, 0.7, 1)`.
3. Add `Rigidbody2D`:
   - Body Type: **Kinematic**
   - Simulated: enabled
4. Add `CircleCollider2D` (or BoxCollider2D), **Is Trigger = true**.
5. Tag object as **Player**.
6. Add `PlayerController` and set:
   - MinX: `-2.4`, MaxX: `2.4`
   - MaxControlSpeed: `11`
   - MinControlSpeed: `3`
   - MaxTraction: `16`
   - MinTraction: `2`
   - TemperatureField: reference `TemperatureField`

### 5) Track visual setup (placeholder, immediate run)
1. Create `Track` as `Quad` or `SpriteRenderer` stretched to fill viewport vertically.
2. Create a simple placeholder material (or sprite texture).
3. Add `TrackScroller` on `Track` and set:
   - Track Renderer: renderer on Track object
   - Texture Property: `_MainTex`
   - UV Scroll Factor: `0.07`

### 6) Prefabs for pooled spawning
Create 3 prefabs:

#### Obstacle prefab
- Name: `PF_Obstacle`
- SpriteRenderer: placeholder red square
- BoxCollider2D: IsTrigger **true**
- Tag: **Obstacle**

#### Bonus prefab
- Name: `PF_Bonus`
- SpriteRenderer: placeholder yellow circle
- CircleCollider2D: IsTrigger **true**
- Tag: **Bonus**

#### Temp Gate prefab
- Name: `PF_Gate`
- SpriteRenderer: placeholder cyan rectangle (tall)
- BoxCollider2D: IsTrigger **true**
- Add `TempGate` script
- Tag optional (gate script handles trigger)

Now in `Spawner > Prefabs`, set size to `3`:
1. Kind `Obstacle`, Prefab `PF_Obstacle`, Preload `16`
2. Kind `Bonus`, Prefab `PF_Bonus`, Preload `12`
3. Kind `Gate`, Prefab `PF_Gate`, Preload `6`

### 7) UI setup (English)
1. Create `Canvas` (Screen Space Overlay) + `CanvasScaler`:
   - UI Scale Mode: **Scale With Screen Size**
   - Reference Resolution: `1080 x 1920`
2. Create Text elements (legacy `Text`):
   - `TapToStartText` (center)
   - `TargetText` (top-left)
   - `MultiplierText` (top-left under target)
   - `ScoreText` (top-right)
   - `BestText` (top-right under score)
   - `GateCueText` (near top-center, initially disabled)
3. Create `RevivePanel` (disabled by default) with two buttons:
   - `ReviveButton` text: `Revive`
   - `RestartButton` text: `Restart`
4. On `UIManager`, wire references to all fields.

### 8) Final checks before Play
- Ensure `Player` tag is exactly `Player`.
- Ensure obstacle/bonus tags are exactly `Obstacle` and `Bonus`.
- Ensure all colliders are `Is Trigger`.
- Ensure `Spawner` references the 3 prefabs.

Press Play: tap to start, drag horizontally, avoid obstacles, collect bonuses, and pass gates for instant target swaps.

---

## Android export notes (portrait + input)

### Player settings
1. **File > Build Settings > Android > Switch Platform**.
2. **Project Settings > Player > Resolution and Presentation**:
   - Default Orientation: **Portrait**
   - Allowed Orientations: Portrait only
3. **Project Settings > Player > Other Settings**:
   - Scripting Backend: **IL2CPP**
   - API Compatibility: `.NET Standard 2.1`
   - Target Architectures: ARMv7 + ARM64 (or ARM64 only for store requirements)
4. **Quality**: keep a low/medium mobile profile for hypercasual target devices.

### Input handling recommendation
- Current scripts support both touch and mouse (`Input.touchCount` + mouse fallback), so it works in editor and on-device.
- For production with the new Input System, you can keep this as fallback or wrap with compile symbols later.

### Performance and UX tips
- Keep sprite atlases small and compressed.
- Use pooling (already done in `Spawner`) to avoid runtime instantiate spikes.
- Keep colliders simple (Box/Circle), avoid polygon colliders.
- Use fail-fast restart (already exposed via UIManager -> GameManager.RestartRun()).

