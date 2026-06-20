local outputPath = app.params["output"]
local palettePath = app.params["palette"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local FRAME_SIZE = 64
local BASE_FRAME_COUNT = 40
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

local colors = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 12, g = 10, b = 8, a = 132 },
  hairDark = Color { r = 135, g = 75, b = 30, a = 255 },
  hair = Color { r = 202, g = 134, b = 45, a = 255 },
  hairLight = Color { r = 241, g = 185, b = 69, a = 255 },
  skin = Color { r = 211, g = 143, b = 103, a = 255 },
  skinDark = Color { r = 130, g = 77, b = 65, a = 255 },
  robeDark = Color { r = 45, g = 83, b = 124, a = 255 },
  robe = Color { r = 78, g = 128, b = 175, a = 255 },
  robeLight = Color { r = 141, g = 184, b = 210, a = 255 },
  goldDark = Color { r = 137, g = 87, b = 21, a = 255 },
  gold = Color { r = 218, g = 165, b = 32, a = 255 },
  goldLight = Color { r = 255, g = 214, b = 88, a = 255 },
  bronze = Color { r = 169, g = 98, b = 37, a = 255 },
  silver = Color { r = 185, g = 188, b = 190, a = 255 },
  cyan = Color { r = 0, g = 255, b = 255, a = 255 },
  cyanDim = Color { r = 55, g = 158, b = 178, a = 255 },
  staff = Color { r = 124, g = 72, b = 34, a = 255 },
  -- Platinum / pale gold + teal clock accents (B9 identity additions).
  platinum = Color { r = 224, g = 228, b = 232, a = 255 },
  paleGold = Color { r = 232, g = 222, b = 168, a = 255 },
  teal = Color { r = 64, g = 196, b = 188, a = 255 },
  tealDim = Color { r = 38, g = 122, b = 120, a = 255 },
  hitRed = Color { r = 255, g = 91, b = 91, a = 255 },
  reference = Color { r = 0, g = 255, b = 255, a = 96 },
}

-- Five production directions. Mirrors the ether_knight / memory_weaver full
-- template so the promoted time_guardian shares the exact direction vocabulary.
local directions = {
  { id = "D", x = 0, side = 1, profile = 0, back = 0, cape = 0 },
  { id = "DL", x = -1, side = 1, profile = 1, back = 0, cape = -1 },
  { id = "L", x = -2, side = -1, profile = 2, back = 0, cape = -2 },
  { id = "UL", x = -1, side = -1, profile = 1, back = 1, cape = -1 },
  { id = "U", x = 0, side = 1, profile = 0, back = 2, cape = 0 },
}

local FRAME_COUNT = BASE_FRAME_COUNT * #directions

local sprite = Sprite(FRAME_SIZE, FRAME_SIZE, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

if palettePath ~= nil and palettePath ~= "" then
  pcall(function()
    app.command.LoadPalette { filename = palettePath }
  end)
end

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, FRAME_SIZE, FRAME_SIZE)
end)

for i = 2, FRAME_COUNT do
  sprite:newFrame()
end

local shadowLayer = sprite.layers[1]
shadowLayer.name = "shadow"

local bodyLayer = sprite:newLayer()
bodyLayer.name = "body"

local robeLayer = sprite:newLayer()
robeLayer.name = "robe"

local clockLayer = sprite:newLayer()
clockLayer.name = "clock"

local accentLayer = sprite:newLayer()
accentLayer.name = "accent"

local referenceLayer = sprite:newLayer()
referenceLayer.name = "reference"
referenceLayer.isVisible = false

local function newImage()
  local image = Image(CANVAS_WIDTH, CANVAS_HEIGHT, ColorMode.RGB)
  image:clear()
  return image
end

local function fillRect(image, x, y, w, h, color)
  for py = y, y + h - 1 do
    if py >= 0 and py < CANVAS_HEIGHT then
      for px = x, x + w - 1 do
        if px >= 0 and px < CANVAS_WIDTH then
          image:drawPixel(px, py, color)
        end
      end
    end
  end
end

local function fillPixel(image, x, y, color)
  if x >= 0 and x < CANVAS_WIDTH and y >= 0 and y < CANVAS_HEIGHT then
    image:drawPixel(x, y, color)
  end
end

local function drawLine(image, x0, y0, x1, y1, color, thickness)
  local dx = math.abs(x1 - x0)
  local sx = x0 < x1 and 1 or -1
  local dy = -math.abs(y1 - y0)
  local sy = y0 < y1 and 1 or -1
  local err = dx + dy
  local half = math.max(0, math.floor((thickness or 1) / 2))

  while true do
    fillRect(image, x0 - half, y0 - half, half * 2 + 1, half * 2 + 1, color)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then
      err = err + dy
      x0 = x0 + sx
    end
    if e2 <= dx then
      err = err + dx
      y0 = y0 + sy
    end
  end
end

local function drawSpark(image, x, y, color)
  fillPixel(image, x, y, color)
  fillPixel(image, x - 1, y, color)
  fillPixel(image, x + 1, y, color)
  fillPixel(image, x, y - 1, color)
  fillPixel(image, x, y + 1, color)
end

local function drawPlus(image, x, y, color)
  fillPixel(image, x, y, color)
  fillPixel(image, x - 1, y, color)
  fillPixel(image, x + 1, y, color)
  fillPixel(image, x, y - 1, color)
  fillPixel(image, x, y + 1, color)
end

-- Thirty base poses: idle(4) walk(6) attack_melee(6) cast(5) hit(3) death(6).
-- time_guardian is a support class, so "attack_melee" is a pendulum / clock-hand
-- pocket-watch strike and "cast" is a time-rune / haste glow (clock-face ring).
local basePoses = {
  { motion = "idle", bob = 0, sway = 0, gear = 0, staff = 0, watch = 0 },
  { motion = "idle", bob = -1, sway = 0, gear = 1, staff = -1, watch = 1 },
  { motion = "idle", bob = 0, sway = 1, gear = 0, staff = 0, watch = 0 },
  { motion = "idle", bob = 1, sway = 0, gear = -1, staff = 1, watch = -1 },

  { motion = "walk", bob = 0, sway = -1, gear = 1, staff = -1, watch = 1, leftStep = -2, rightStep = 2 },
  { motion = "walk", bob = -1, sway = 0, gear = 2, staff = -1, watch = 1, leftStep = -1, rightStep = 1 },
  { motion = "walk", bob = 0, sway = 1, gear = 1, staff = 0, watch = 0, leftStep = 0, rightStep = 0 },
  { motion = "walk", bob = 1, sway = 0, gear = 0, staff = 1, watch = -1, leftStep = 1, rightStep = -1 },
  { motion = "walk", bob = 0, sway = -1, gear = -1, staff = 1, watch = -1, leftStep = 2, rightStep = -2 },
  { motion = "walk", bob = -1, sway = 0, gear = 0, staff = 0, watch = 0, leftStep = 0, rightStep = 0 },

  { motion = "attack_melee", bob = 0, sway = -1, gear = -1, staff = -1, torso = -1, strike = 0, leftStep = -1, rightStep = 1 },
  { motion = "attack_melee", bob = -1, sway = -1, gear = -2, staff = -1, torso = -2, strike = 0, leftStep = -2, rightStep = 2 },
  { motion = "attack_melee", bob = 0, sway = 1, gear = 2, staff = 1, torso = 2, strike = 1, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 1, sway = 1, gear = 2, staff = 2, torso = 2, strike = 2, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 0, sway = 0, gear = 1, staff = 1, torso = 1, strike = 1, leftStep = 1, rightStep = -1 },
  { motion = "attack_melee", bob = 0, sway = 0, gear = 0, staff = 0, torso = 0, strike = 0, leftStep = 0, rightStep = 0 },

  { motion = "cast", bob = 0, sway = 0, gear = 1, staff = 0, glow = 1 },
  { motion = "cast", bob = -1, sway = 0, gear = 2, staff = 0, glow = 2 },
  { motion = "cast", bob = -2, sway = 0, gear = 3, staff = 1, glow = 3 },
  { motion = "cast", bob = -1, sway = 0, gear = 2, staff = 0, glow = 4 },
  { motion = "cast", bob = 0, sway = 0, gear = 1, staff = 0, glow = 2 },

  { motion = "hit", bob = -1, sway = 0, gear = -2, staff = -1, torso = -3, hit = 1, leftStep = 1, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, gear = -1, staff = -1, torso = -2, hit = 2, leftStep = 2, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, gear = 0, staff = 0, torso = 0, hit = 0, leftStep = 0, rightStep = 0 },

  { motion = "death", death = 1 },
  { motion = "death", death = 2 },
  { motion = "death", death = 3 },
  { motion = "death", death = 4 },
  { motion = "death", death = 5 },
  { motion = "death", death = 6 },

  { motion = "ready", bob = 0, sway = 0, gear = 1, staff = 0, watch = 0, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, gear = 2, staff = 0, watch = 1, ready = 1 },
  { motion = "ready", bob = 0, sway = 0, gear = 1, staff = 0, watch = 0, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, gear = 2, staff = 0, watch = 1, ready = 1 },

  { motion = "victory", bob = 0, sway = 0, gear = 2, staff = 0, watch = 0, vic = 1 },
  { motion = "victory", bob = -1, sway = 0, gear = 3, staff = 0, watch = 1, vic = 2 },
  { motion = "victory", bob = -2, sway = 0, gear = 4, staff = 1, watch = 1, vic = 3 },
  { motion = "victory", bob = -1, sway = 0, gear = 3, staff = 0, watch = 1, vic = 3 },
  { motion = "victory", bob = 0, sway = 0, gear = 2, staff = 0, watch = 0, vic = 2 },
  { motion = "victory", bob = -1, sway = 0, gear = 3, staff = 0, watch = 1, vic = 3 },
}

local motionTags = {
  { name = "idle", from = 1, to = 4, color = colors.cyan },
  { name = "walk", from = 5, to = 10, color = colors.gold },
  { name = "attack_melee", from = 11, to = 16, color = colors.bronze },
  { name = "cast", from = 17, to = 21, color = colors.teal },
  { name = "hit", from = 22, to = 24, color = colors.cyanDim },
  { name = "death", from = 25, to = 30, color = colors.robeDark },
  { name = "ready", from = 31, to = 34, color = colors.teal },
  { name = "victory", from = 35, to = 40, color = colors.gold },
}

local function directedPose(basePose, direction)
  local pose = {}
  for key, value in pairs(basePose) do
    pose[key] = value
  end
  pose.direction = direction.id
  pose.dirX = direction.x
  pose.staffSide = direction.side
  pose.profile = direction.profile
  pose.backView = direction.back
  pose.capeShift = direction.cape
  return pose
end

local function profileWidth(pose, frontWidth, diagonalWidth, sideWidth)
  local profile = pose.profile or 0
  if profile >= 2 then return sideWidth end
  if profile == 1 then return diagonalWidth end
  return frontWidth
end

local function centeredX(baseX, baseWidth, actualWidth, pose)
  return baseX + math.floor((baseWidth - actualWidth) / 2) + (pose.dirX or 0)
end

local function orientedX(pose, x)
  if (pose.staffSide or 1) < 0 then
    return FRAME_SIZE - 1 - x + (pose.dirX or 0)
  end
  return x + (pose.dirX or 0)
end

local function drawOrientedLine(image, pose, x0, y0, x1, y1, color, thickness)
  drawLine(image, orientedX(pose, x0), y0, orientedX(pose, x1), y1, color, thickness)
end

local function drawShadow(image, pose)
  local dirX = pose.dirX or 0
  if pose.motion == "death" then
    fillRect(image, 18 + dirX, 58, 31, 2, colors.shadow)
    fillRect(image, 22 + dirX, 60, 23, 1, colors.shadow)
    return
  end
  local stretch = pose.motion == "attack_melee" and 3 or 0
  local narrow = (pose.profile or 0) >= 2 and 4 or 0
  fillRect(image, 20 - stretch + dirX + narrow, 58, 24 + stretch * 2 - narrow * 2, 2, colors.shadow)
  fillRect(image, 24 - stretch + dirX + narrow, 60, 16 + stretch * 2 - narrow * 2, 1, colors.shadow)
end

local function drawDeathBody(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  local bodyShift = (pose.profile or 0) >= 2 and -2 or 0
  if drop <= 2 then
    fillRect(image, 22 + dirX + bodyShift, 12 + drop * 6, 20, 18, colors.outline)
    fillRect(image, 24 + dirX + bodyShift, 15 + drop * 6, 16, 13, colors.hairDark)
    fillRect(image, 25 + dirX + bodyShift, 17 + drop * 6, 14, 9, colors.skin)
    fillRect(image, 21 + dirX + bodyShift, 27 + drop * 4, 23, 22, colors.outline)
    fillRect(image, 24 + dirX + bodyShift, 31 + drop * 4, 17, 16, colors.skin)
  else
    fillRect(image, 17 + dirX + bodyShift, 47, 32, 10, colors.outline)
    fillRect(image, 21 + dirX + bodyShift, 49, 24, 6, colors.skin)
    fillRect(image, 20 + dirX + bodyShift, 42, 19, 7, colors.outline)
    fillRect(image, 23 + dirX + bodyShift, 44, 13, 4, colors.hairDark)
  end
end

local function drawBody(image, pose)
  if pose.motion == "death" then
    drawDeathBody(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local torso = pose.torso or 0
  local leftStep = pose.leftStep or 0
  local rightStep = pose.rightStep or 0
  local lean = math.floor(torso / 2)
  local backView = pose.backView or 0
  local dirX = pose.dirX or 0
  local headW = profileWidth(pose, 18, 15, 12)
  local torsoW = profileWidth(pose, 20, 17, 13)
  local headX = centeredX(23 + sway + lean, 18, headW, pose)
  local torsoX = centeredX(22 + sway + torso, 20, torsoW, pose)

  -- Head: front-facing frames expose skin/eyes; rear frames read as hood and hair.
  fillRect(image, headX, 9 + bob, headW, 18, colors.outline)
  if backView == 0 then
    fillRect(image, headX + 2, 12 + bob, math.max(8, headW - 4), 13, colors.skin)
    fillRect(image, headX + 4, 15 + bob, math.max(8, headW - 8), 3, colors.skinDark)
    fillRect(image, headX + 5, 16 + bob, 2, 2, colors.cyan)
    fillRect(image, headX + headW - 7, 16 + bob, 2, 2, colors.cyan)
  else
    fillRect(image, headX + 2, 12 + bob, math.max(8, headW - 4), 13, colors.hairDark)
    fillRect(image, headX + 4, 14 + bob, math.max(6, headW - 8), 9, colors.hair)
    fillRect(image, centeredX(30 + sway, 5, 5, pose), 16 + bob, 5, 9, colors.robeDark)
  end

  -- Hair cap.
  fillRect(image, headX - 1, 7 + bob, headW + 2, 9, colors.outline)
  fillRect(image, headX + 1, 8 + bob, headW - 2, 7, colors.hair)
  if backView == 0 then
    fillRect(image, headX + 3, 9 + bob, 6, 3, colors.hairLight)
    fillRect(image, headX + headW - 5, 9 + bob, 4, 3, colors.hairDark)
  else
    fillRect(image, headX + 3, 9 + bob, math.max(6, headW - 6), 4, colors.hairLight)
  end

  -- Arms. Rear-facing poses tuck exposed forearms under robe sleeves to keep
  -- the silhouette readable as a back view at 64x64.
  if (pose.profile or 0) >= 2 then
    fillRect(image, torsoX + 1, 28 + bob, 6, 15, colors.outline)
    fillRect(image, torsoX + 2, 31 + bob, 4, 10, backView == 0 and colors.skin or colors.robeDark)
  elseif backView > 0 then
    fillRect(image, 18 + torso + dirX, 28 + bob, 8, 15, colors.outline)
    fillRect(image, 39 + torso + dirX, 28 + bob, 8, 15, colors.outline)
    fillRect(image, 20 + torso + dirX, 31 + bob, 5, 10, colors.robeDark)
    fillRect(image, 41 + torso + dirX, 31 + bob, 4, 10, colors.robeDark)
    fillRect(image, 21 + torso + dirX, 32 + bob, 3, 3, colors.goldDark)
    fillRect(image, 41 + torso + dirX, 32 + bob, 3, 3, colors.goldDark)
  else
    fillRect(image, 18 + torso + dirX, 28 + bob, 8, 15, colors.outline)
    fillRect(image, 39 + torso + dirX, 28 + bob, 8, 15, colors.outline)
    fillRect(image, 20 + torso + dirX, 31 + bob, 5, 10, colors.skin)
    fillRect(image, 41 + torso + dirX, 31 + bob, 4, 10, colors.skin)
  end

  -- Legs / hem-feet.
  fillRect(image, 24 + leftStep + dirX, 49, 8, 10, colors.outline)
  fillRect(image, 36 + rightStep + dirX, 49, 8, 10, colors.outline)
  fillRect(image, 26 + leftStep + dirX, 51, 4, 6, colors.robeDark)
  fillRect(image, 38 + rightStep + dirX, 51, 4, 6, colors.robeDark)
end

local function drawDeathRobe(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  local bodyShift = (pose.profile or 0) >= 2 and -2 or 0
  if drop <= 2 then
    fillRect(image, 17 + dirX + bodyShift, 24 + drop * 4, 31, 10, colors.outline)
    fillRect(image, 19 + dirX + bodyShift, 25 + drop * 4, 27, 8, colors.gold)
    fillRect(image, 21 + dirX + bodyShift, 26 + drop * 4, 22, 4, colors.bronze)
    fillRect(image, 21 + dirX + bodyShift, 31 + drop * 4, 23, 8, colors.robe)
  else
    -- Robe pooled on the ground with a pale-gold trim.
    fillRect(image, 15 + dirX + bodyShift, 51, 35, 7, colors.outline)
    fillRect(image, 18 + dirX + bodyShift, 52, 29, 5, colors.robe)
    fillRect(image, 22 + dirX + bodyShift, 53, 18, 2, colors.gold)
    fillRect(image, 24 + dirX + bodyShift, 54, 10, 1, colors.paleGold)
  end
end

local function drawRobe(image, pose)
  if pose.motion == "death" then
    drawDeathRobe(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local torso = pose.torso or 0
  local dirX = pose.dirX or 0
  local backView = pose.backView or 0
  local collarW = profileWidth(pose, 31, 26, 19)
  local collarX = centeredX(17 + sway + torso, 31, collarW, pose)

  -- Gold mantle + pale-gold / bronze collar trim.
  fillRect(image, collarX, 24 + bob, collarW, 10, colors.outline)
  fillRect(image, collarX + 2, 25 + bob, collarW - 4, 8, colors.gold)
  fillRect(image, collarX + 4, 26 + bob, math.max(6, math.floor(collarW / 3)), 4, colors.goldLight)
  if backView == 0 then
    fillRect(image, collarX + math.floor(collarW * 0.6), 26 + bob, 6, 4, colors.goldDark)
    fillRect(image, collarX + 2, 31 + bob, collarW - 4, 4, colors.bronze)
    fillRect(image, centeredX(30 + sway, 5, 5, pose), 28 + bob, 5, 5, colors.outline)
    fillRect(image, centeredX(31 + sway, 3, 3, pose), 29 + bob, 3, 3, colors.teal)
  else
    -- Back hood ridge + pale-gold spine seam.
    fillRect(image, collarX + 2, 31 + bob, collarW - 4, 4, colors.bronze)
    fillRect(image, centeredX(31 + sway, 3, 3, pose), 26 + bob, 3, 8, colors.paleGold)
  end

  -- Lower robe skirt.
  local skirtW = profileWidth(pose, 23, 19, 14)
  local skirtX = centeredX(21 + sway + torso, 23, skirtW, pose)
  fillRect(image, skirtX, 33 + bob, skirtW, 18, colors.outline)
  fillRect(image, skirtX + 3, 35 + bob, skirtW - 6, 15, colors.robe)
  fillRect(image, skirtX + 5, 36 + bob, math.max(5, math.floor(skirtW / 3)), 4, colors.robeLight)
  fillRect(image, skirtX + math.floor(skirtW / 2) - 1, 34 + bob, 3, 16, colors.goldLight)
  fillRect(image, skirtX + 2, 43 + bob, skirtW - 4, 4, colors.goldDark)

  -- Robe side panels.
  fillRect(image, centeredX(18 + sway, 5, 5, pose), 32 + bob, 5, 18, colors.robeDark)
  fillRect(image, centeredX(42 + sway, 5, 5, pose), 32 + bob, 5, 18, colors.robeDark)
end

-- A turning clock gear (rotated tooth phase per frame).
local function drawGear(image, x, y, size, phase)
  fillRect(image, x, y, size, size, colors.outline)
  fillRect(image, x + 1, y + 1, size - 2, size - 2, colors.gold)
  fillRect(image, x + 2, y + 2, size - 4, size - 4, colors.bronze)
  fillPixel(image, x + math.floor(size / 2), y + math.floor(size / 2), colors.teal)
  if phase % 2 == 0 then
    fillPixel(image, x + math.floor(size / 2), y - 1, colors.goldLight)
    fillPixel(image, x + math.floor(size / 2), y + size, colors.goldLight)
  else
    fillPixel(image, x - 1, y + math.floor(size / 2), colors.goldLight)
    fillPixel(image, x + size, y + math.floor(size / 2), colors.goldLight)
  end
end

-- The pocket-watch / clock-face the guardian carries (oriented to facing).
local function drawPocketWatch(image, pose, x, y, ringColor)
  fillRect(image, x, y, 12, 12, colors.outline)
  fillRect(image, x + 1, y + 1, 10, 10, colors.platinum)
  fillRect(image, x + 2, y + 2, 8, 8, colors.robeDark)
  fillRect(image, x + 1, y + 3, 1, 6, ringColor)
  fillRect(image, x + 10, y + 3, 1, 6, ringColor)
  fillRect(image, x + 3, y + 1, 6, 1, ringColor)
  fillRect(image, x + 3, y + 10, 6, 1, ringColor)
  -- Clock hands.
  drawLine(image, x + 6, y + 6, x + 6, y + 3, colors.paleGold, 1)
  drawLine(image, x + 6, y + 6, x + 9, y + 6, colors.teal, 1)
  fillPixel(image, x + 6, y + 6, colors.cyan)
  -- Pocket-watch crown.
  fillRect(image, x + 5, y - 1, 2, 1, colors.gold)
end

local function drawDeathClock(image, pose)
  -- Clock gears tumble down and out as the guardian falls; pocket-watch drops.
  local drop = pose.death
  local dirX = pose.dirX or 0
  drawGear(image, 10 + dirX, math.min(50, 30 + drop * 4), 7, drop)
  drawGear(image, 47 + dirX, math.min(52, 28 + drop * 5), 6, drop + 1)
  drawPocketWatch(image, pose, orientedX(pose, 40), math.min(48, 26 + drop * 4), colors.tealDim)
end

local function drawClock(image, pose, frameNumber)
  if pose.motion == "death" then
    drawDeathClock(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local gear = pose.gear or 0
  local staff = pose.staff or 0
  local strike = pose.strike or 0
  local dirX = pose.dirX or 0

  -- Orbiting clock gears around the guardian (clock motif silhouette).
  drawGear(image, 10 + dirX, 24 + gear, 8, frameNumber)
  drawGear(image, 47 + dirX, 22 - gear + bob, 7, frameNumber + 1)
  drawGear(image, 13 + dirX, 42 - gear, 6, frameNumber + 2)
  drawLine(image, 17 + dirX, 28 + gear, 25 + sway + dirX, 34 + bob, colors.tealDim, 1)
  drawLine(image, 47 + dirX, 26 - gear + bob, 40 + sway + dirX, 34 + bob, colors.tealDim, 1)

  if strike > 0 then
    -- Pendulum / clock-hand strike: pocket-watch swings forward on the facing side.
    local thrustX = orientedX(pose, 40 + strike * 4)
    drawPocketWatch(image, pose, thrustX, 26 + bob - strike, colors.teal)
    drawOrientedLine(image, pose, 30, 40 + bob, 44 + strike * 4, 32 + bob - strike, colors.tealDim, 1)
  else
    -- Idle / walk / cast: pocket-watch floats at the guardian's free hand.
    local watch = pose.watch or 0
    drawPocketWatch(image, pose, orientedX(pose, 8), 28 + watch + bob, colors.teal)
  end

  -- Clock staff held on the oriented side, topped with a clock-face dial.
  local sx = orientedX(pose, 52 + sway)
  local headX = orientedX(pose, 47 + sway)
  drawLine(image, sx, 19 + bob + staff, orientedX(pose, 50 + sway), 57 + bob, colors.staff, 2)
  drawLine(image, orientedX(pose, 53 + sway), 20 + bob + staff, orientedX(pose, 51 + sway), 56 + bob, colors.goldLight, 1)
  fillRect(image, headX, 11 + bob + staff, 12, 12, colors.outline)
  fillRect(image, headX + 2, 13 + bob + staff, 8, 8, colors.platinum)
  fillRect(image, headX + 4, 15 + bob + staff, 4, 4, colors.robeDark)
  fillPixel(image, headX + 6, 17 + bob + staff, colors.cyan)
  drawLine(image, headX + 6, 17 + bob + staff, headX + 8, 14 + bob + staff, colors.teal, 1)
  drawLine(image, headX + 6, 17 + bob + staff, headX + 3, 18 + bob + staff, colors.paleGold, 1)
end

local function drawDeathAccent(image, pose)
  if pose.death <= 3 then
    fillRect(image, 31 + (pose.dirX or 0), 44 + pose.death, 4, 1, colors.tealDim)
  end
end

local function drawAccent(image, pose, frameNumber)
  if pose.motion == "death" then
    drawDeathAccent(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local gear = pose.gear or 0
  local dirX = pose.dirX or 0

  -- Floating time motes around the guardian.
  drawSpark(image, 32 + sway + dirX, 40 + bob, colors.cyan)
  drawSpark(image, 14 + dirX, 20 + gear, colors.tealDim)
  drawSpark(image, 52 + dirX, 20 - gear + bob, colors.teal)
  fillRect(image, 28 + sway + dirX, 47 + bob, 10, 2, colors.cyanDim)
  fillPixel(image, 30 + sway + dirX, 33 + bob, colors.goldLight)
  fillPixel(image, 33 + sway + dirX, 36 + bob, colors.paleGold)

  -- Pendulum / clock-hand swing trail on attack strike frames.
  if (pose.strike or 0) > 0 then
    drawOrientedLine(image, pose, 34, 22 + pose.strike * 4, 60, 16 + pose.strike * 7, colors.teal, 1)
    drawOrientedLine(image, pose, 40, 18 + pose.strike * 5, 62, 22 + pose.strike * 8, colors.tealDim, 1)
  end

  -- Cast: time-rune / haste glow as a growing clock-face ring above the guardian.
  if (pose.glow or 0) > 0 then
    local gx = 32 + dirX
    local gy = 6 + bob
    drawPlus(image, gx, gy, colors.teal)
    if pose.glow >= 2 then
      -- Clock-face ring with twelve-mark ticks.
      drawSpark(image, gx - 7, gy + 8, colors.cyan)
      drawSpark(image, gx + 6, gy + 10, colors.tealDim)
      fillPixel(image, gx, gy - 4, colors.paleGold)
      fillPixel(image, gx, gy + 8, colors.paleGold)
      fillPixel(image, gx - 5, gy + 2, colors.paleGold)
      fillPixel(image, gx + 5, gy + 2, colors.paleGold)
    end
    if pose.glow >= 3 then
      fillRect(image, gx - 6, 2, 13, 2, colors.teal)
      fillRect(image, gx - 7, 12, 15, 1, colors.cyan)
      -- Clock hands inside the rune ring.
      drawLine(image, gx, gy + 2, gx, gy - 3, colors.paleGold, 1)
      drawLine(image, gx, gy + 2, gx + 4, gy + 2, colors.cyan, 1)
    end
    if pose.glow >= 4 then
      drawLine(image, gx - 10, 18, gx + 8, 18, colors.teal, 1)
    end
  end

  -- Hit flash sparks on recoil frames.
  if (pose.hit or 0) > 0 then
    fillRect(image, 18 + dirX, 20, 4, 2, colors.hitRed)
    fillRect(image, 15 + dirX, 25, 5, 2, colors.cyan)
    fillRect(image, 20 + dirX, 18, 2, 4, colors.goldLight)
  end

  -- Ready stance: focused teal clock-tick at the guardian's chest.
  if (pose.ready or 0) > 0 then
    drawSpark(image, 32 + dirX, 34 + bob, colors.teal)
    fillRect(image, 28 + dirX, 33 + bob, 9, 1, colors.tealDim)
    fillPixel(image, 32 + dirX, 31 + bob, colors.paleGold)
  end

  -- Victory: rising teal clock-rune sparkle burst that scales with pose.vic.
  if (pose.vic or 0) > 0 then
    drawSpark(image, 32 + dirX, 8 - pose.vic + bob, colors.teal)
    drawSpark(image, 22 + dirX, 14 + bob, colors.cyan)
    drawSpark(image, 42 + dirX, 14 + bob, colors.tealDim)
    if pose.vic >= 2 then
      fillRect(image, 26 + dirX, 4, 13, 1, colors.paleGold)
      drawSpark(image, 16 + dirX, 20 + bob, colors.tealDim)
      drawSpark(image, 48 + dirX, 20 + bob, colors.tealDim)
    end
    if pose.vic >= 3 then
      fillRect(image, 30 + dirX, 2, 5, 2, colors.teal)
      fillPixel(image, 32 + dirX, 1, colors.cyan)
    end
  end
end

local function drawReference(image, poseIndex, directionIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 31, 58, 3, 3, colors.cyan)
  if poseIndex == 1 or poseIndex == 5 or poseIndex == 11 or poseIndex == 17 or poseIndex == 22 or poseIndex == 25 then
    fillRect(image, 2, 2, 8, 2, colors.gold)
  end
  fillRect(image, 2 + directionIndex * 3, 6, 2, 2, colors.teal)
end

for directionIndex, direction in ipairs(directions) do
  for poseIndex = 1, BASE_FRAME_COUNT do
    local frameNumber = (directionIndex - 1) * BASE_FRAME_COUNT + poseIndex
    local shadowImage = newImage()
    local bodyImage = newImage()
    local robeImage = newImage()
    local clockImage = newImage()
    local accentImage = newImage()
    local referenceImage = newImage()
    local pose = directedPose(basePoses[poseIndex], direction)

    drawShadow(shadowImage, pose)
    drawBody(bodyImage, pose)
    drawRobe(robeImage, pose)
    drawClock(clockImage, pose, poseIndex)
    drawAccent(accentImage, pose, poseIndex)
    drawReference(referenceImage, poseIndex, directionIndex)

    local frame = sprite.frames[frameNumber]
    sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
    sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
    sprite:newCel(robeLayer, frame, robeImage, Point(0, 0))
    sprite:newCel(clockLayer, frame, clockImage, Point(0, 0))
    sprite:newCel(accentLayer, frame, accentImage, Point(0, 0))
    sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
  end
end

local function addTag(name, fromFrame, toFrame, color)
  local tag = sprite:newTag(sprite.frames[fromFrame], sprite.frames[toFrame])
  tag.name = name
  tag.color = color
end

for directionIndex, direction in ipairs(directions) do
  local frameOffset = (directionIndex - 1) * BASE_FRAME_COUNT
  for _, motionTag in ipairs(motionTags) do
    addTag(
      motionTag.name .. "_" .. direction.id,
      frameOffset + motionTag.from,
      frameOffset + motionTag.to,
      motionTag.color
    )
  end
end

app.command.SaveFileAs { filename = outputPath }
