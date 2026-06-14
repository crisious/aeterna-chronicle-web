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
  shadow = Color { r = 9, g = 6, b = 16, a = 140 },
  voidBlack = Color { r = 13, g = 13, b = 26, a = 255 },
  midnight = Color { r = 26, g = 26, b = 46, a = 255 },
  hoodDark = Color { r = 55, g = 31, b = 84, a = 255 },
  hood = Color { r = 102, g = 54, b = 139, a = 255 },
  hoodLight = Color { r = 154, g = 86, b = 180, a = 255 },
  overcoat = Color { r = 45, g = 72, b = 89, a = 255 },
  silverBlue = Color { r = 186, g = 210, b = 235, a = 255 },
  skin = Color { r = 191, g = 118, b = 91, a = 255 },
  skinDark = Color { r = 113, g = 65, b = 69, a = 255 },
  cyan = Color { r = 0, g = 206, b = 209, a = 255 },
  cyanDim = Color { r = 41, g = 122, b = 140, a = 255 },
  magenta = Color { r = 255, g = 0, b = 255, a = 255 },
  magentaDim = Color { r = 130, g = 39, b = 164, a = 255 },
  star = Color { r = 255, g = 190, b = 62, a = 255 },
  starLight = Color { r = 255, g = 238, b = 136, a = 255 },
  blade = Color { r = 218, g = 224, b = 255, a = 255 },
  hitRed = Color { r = 255, g = 91, b = 91, a = 255 },
  reference = Color { r = 255, g = 0, b = 255, a = 96 },
}

-- Five production directions. Mirrors the ether_knight / memory_weaver full
-- template so the promoted void_wanderer shares the exact direction/profile
-- vocabulary (front, diagonal, side, back-diagonal, back).
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

local cloakLayer = sprite:newLayer()
cloakLayer.name = "drifting_cloak"

local voidLayer = sprite:newLayer()
voidLayer.name = "void_rift"

local accentLayer = sprite:newLayer()
accentLayer.name = "nebula_accent"

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
-- void_wanderer is a gambler / void caster, so "attack_melee" is a void-touch
-- swipe with a fracture-blade lash, and "cast" is a void rift / nebula burst
-- with a growing glow. The drifting cloak (cape param) keeps the silhouette
-- irregular and amorphous frame-to-frame.
local basePoses = {
  { motion = "idle", bob = 0, sway = 0, void = 0, drift = 0, mote = 0 },
  { motion = "idle", bob = -1, sway = 0, void = 1, drift = -1, mote = 1 },
  { motion = "idle", bob = 0, sway = 1, void = 0, drift = 1, mote = 0 },
  { motion = "idle", bob = 1, sway = 0, void = -1, drift = -1, mote = -1 },

  { motion = "walk", bob = 0, sway = -1, void = -2, drift = -2, mote = 1, leftStep = -2, rightStep = 2 },
  { motion = "walk", bob = -1, sway = 0, void = -1, drift = -1, mote = 2, leftStep = -1, rightStep = 1 },
  { motion = "walk", bob = 0, sway = 1, void = 0, drift = 1, mote = 1, leftStep = 0, rightStep = 0 },
  { motion = "walk", bob = 1, sway = 0, void = 1, drift = 2, mote = 0, leftStep = 1, rightStep = -1 },
  { motion = "walk", bob = 0, sway = -1, void = 2, drift = 1, mote = -1, leftStep = 2, rightStep = -2 },
  { motion = "walk", bob = -1, sway = 0, void = 0, drift = 0, mote = 0, leftStep = 0, rightStep = 0 },

  { motion = "attack_melee", bob = 0, sway = -1, void = -1, drift = -1, torso = -1, swipe = 0, leftStep = -1, rightStep = 1 },
  { motion = "attack_melee", bob = -1, sway = -1, void = -2, drift = -2, torso = -2, swipe = 0, leftStep = -2, rightStep = 2 },
  { motion = "attack_melee", bob = 0, sway = 1, void = 2, drift = 2, torso = 2, swipe = 1, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 1, sway = 1, void = 3, drift = 2, torso = 2, swipe = 2, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 0, sway = 0, void = 1, drift = 1, torso = 1, swipe = 1, leftStep = 1, rightStep = -1 },
  { motion = "attack_melee", bob = 0, sway = 0, void = 0, drift = 0, torso = 0, swipe = 0, leftStep = 0, rightStep = 0 },

  { motion = "cast", bob = 0, sway = 0, void = 1, drift = 0, rift = 1 },
  { motion = "cast", bob = -1, sway = 0, void = 2, drift = 1, rift = 2 },
  { motion = "cast", bob = -2, sway = 0, void = 3, drift = 1, rift = 3 },
  { motion = "cast", bob = -1, sway = 0, void = 2, drift = 0, rift = 4 },
  { motion = "cast", bob = 0, sway = 0, void = 1, drift = 0, rift = 2 },

  { motion = "hit", bob = -1, sway = 0, void = -2, drift = -1, torso = -3, hit = 1, leftStep = 1, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, void = -1, drift = -1, torso = -2, hit = 2, leftStep = 2, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, void = 0, drift = 0, torso = 0, hit = 0, leftStep = 0, rightStep = 0 },

  { motion = "death", death = 1 },
  { motion = "death", death = 2 },
  { motion = "death", death = 3 },
  { motion = "death", death = 4 },
  { motion = "death", death = 5 },
  { motion = "death", death = 6 },

  { motion = "ready", bob = 0, sway = 0, void = 1, drift = 0, mote = 1, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, void = 2, drift = 1, mote = 2, ready = 1 },
  { motion = "ready", bob = 0, sway = 0, void = 1, drift = 0, mote = 1, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, void = 2, drift = 1, mote = 2, ready = 1 },

  { motion = "victory", bob = 0, sway = 0, void = 2, drift = 0, mote = 1, vic = 1 },
  { motion = "victory", bob = -1, sway = 0, void = 3, drift = 1, mote = 2, vic = 2 },
  { motion = "victory", bob = -2, sway = 0, void = 4, drift = 1, mote = 3, vic = 3 },
  { motion = "victory", bob = -1, sway = 0, void = 3, drift = 0, mote = 2, vic = 3 },
  { motion = "victory", bob = 0, sway = 0, void = 2, drift = 0, mote = 1, vic = 2 },
  { motion = "victory", bob = -1, sway = 0, void = 3, drift = 1, mote = 2, vic = 3 },
}

local motionTags = {
  { name = "idle", from = 1, to = 4, color = colors.magenta },
  { name = "walk", from = 5, to = 10, color = colors.cyan },
  { name = "attack_melee", from = 11, to = 16, color = colors.hitRed },
  { name = "cast", from = 17, to = 21, color = colors.magentaDim },
  { name = "hit", from = 22, to = 24, color = colors.silverBlue },
  { name = "death", from = 25, to = 30, color = colors.hoodDark },
  { name = "ready", from = 31, to = 34, color = colors.silverBlue },
  { name = "victory", from = 35, to = 40, color = colors.star },
}

local function directedPose(basePose, direction)
  local pose = {}
  for key, value in pairs(basePose) do
    pose[key] = value
  end
  pose.direction = direction.id
  pose.dirX = direction.x
  pose.weaponSide = direction.side
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
  if (pose.weaponSide or 1) < 0 then
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
  local stretch = pose.motion == "attack_melee" and 4 or (pose.motion == "walk" and 2 or 0)
  local narrow = (pose.profile or 0) >= 2 and 4 or 0
  fillRect(image, 20 - stretch + dirX + narrow, 58, 24 + stretch * 2 - narrow * 2, 2, colors.shadow)
  fillRect(image, 24 - stretch + dirX + narrow, 60, 16 + stretch * 2 - narrow * 2, 1, colors.shadow)
end

local function drawDeathBody(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  local bodyShift = (pose.profile or 0) >= 2 and -2 or 0
  if drop <= 2 then
    -- Head + hood collapsing down.
    fillRect(image, 21 + dirX + bodyShift, 8 + drop * 6, 22, 22, colors.outline)
    fillRect(image, 23 + dirX + bodyShift, 10 + drop * 6, 18, 18, colors.hoodDark)
    fillRect(image, 25 + dirX + bodyShift, 12 + drop * 6, 14, 13, colors.hood)
    fillRect(image, 29 + dirX + bodyShift, 14 + drop * 6, 7, 8, colors.skin)
    fillRect(image, 20 + dirX + bodyShift, 27 + drop * 4, 23, 22, colors.outline)
    fillRect(image, 24 + dirX + bodyShift, 31 + drop * 4, 16, 16, colors.midnight)
  else
    -- Crumpled, dissolving into the void on the floor.
    fillRect(image, 17 + dirX + bodyShift, 48, 32, 9, colors.outline)
    fillRect(image, 21 + dirX + bodyShift, 50, 24, 5, colors.midnight)
    fillRect(image, 20 + dirX + bodyShift, 42, 19, 7, colors.outline)
    fillRect(image, 23 + dirX + bodyShift, 44, 13, 4, colors.hoodDark)
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
  local headW = profileWidth(pose, 22, 18, 14)
  local headX = centeredX(21 + sway + lean, 22, headW, pose)

  -- Hood + cowl. The peaked hood reads as the irregular silhouette top.
  fillRect(image, headX, 8 + bob, headW, 22, colors.outline)
  fillRect(image, headX + 2, 10 + bob, math.max(10, headW - 4), 19, colors.hoodDark)
  fillRect(image, headX + 4, 12 + bob, math.max(8, headW - 8), 15, colors.hood)
  fillRect(image, headX + 4, 8 + bob, math.max(8, headW - 8), 7, colors.hoodLight)
  fillPixel(image, headX + math.floor(headW / 2), 9 + bob, colors.starLight)

  -- Face inside the cowl (only when not viewed from behind).
  if backView == 0 then
    fillRect(image, headX + 8, 14 + bob, 7, 10, colors.skin)
    fillRect(image, headX + 8, 17 + bob, 7, 3, colors.skinDark)
    fillRect(image, headX + 7, 13 + bob, 10, 3, colors.voidBlack)
    fillRect(image, headX + 7, 16 + bob, 3, 3, colors.cyan)
    fillRect(image, headX + 14, 16 + bob, 3, 3, colors.cyan)
  else
    fillRect(image, headX + 5, 12 + bob, math.max(8, headW - 10), 5, colors.hoodLight)
  end

  -- Arms / sleeve stubs flanking the torso.
  if (pose.profile or 0) >= 2 then
    fillRect(image, 23 + sway + dirX, 31 + bob, 8, 13, colors.outline)
    fillRect(image, 25 + sway + dirX, 33 + bob, 5, 9, colors.silverBlue)
  else
    fillRect(image, 19 + sway + torso + dirX, 31 + bob, 8, 13, colors.outline)
    fillRect(image, 21 + sway + torso + dirX, 33 + bob, 5, 9, colors.silverBlue)
    fillRect(image, 38 + sway + torso + dirX, 31 + bob, 8, 13, colors.outline)
    fillRect(image, 39 + sway + torso + dirX, 33 + bob, 5, 9, colors.silverBlue)
  end

  -- Legs / boots.
  fillRect(image, 24 + leftStep + dirX, 49, 8, 10, colors.outline)
  fillRect(image, 36 + rightStep + dirX, 49, 8, 10, colors.outline)
  fillRect(image, 26 + leftStep + dirX, 51, 4, 6, colors.midnight)
  fillRect(image, 38 + rightStep + dirX, 51, 4, 6, colors.midnight)
end

local function drawDeathCloak(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  if drop <= 2 then
    fillRect(image, 16 + dirX, 26 + drop * 4, 33, 8, colors.outline)
    fillRect(image, 18 + dirX, 27 + drop * 4, 29, 6, colors.hood)
    fillRect(image, 30 + dirX, 28 + drop * 4, 4, 5, colors.magentaDim)
  else
    -- Cloak pooled / dispersing on the ground.
    fillRect(image, 15 + dirX, 51, 36, 7, colors.outline)
    fillRect(image, 18 + dirX, 52, 30, 5, colors.midnight)
    fillRect(image, 23 + dirX, 53, 18, 3, colors.overcoat)
    fillRect(image, 30 + dirX, 53, 4, 3, colors.magentaDim)
  end
end

local function drawCloak(image, pose)
  if pose.motion == "death" then
    drawDeathCloak(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local drift = pose.drift or 0
  local dirX = pose.dirX or 0
  local backView = pose.backView or 0
  local capeShift = pose.capeShift or 0

  -- Shoulder mantle — wide, irregular drifting collar.
  local mantleW = profileWidth(pose, 33, 28, 20)
  local mantleX = centeredX(16 + sway + drift, 33, mantleW, pose)
  fillRect(image, mantleX, 26 + bob, mantleW, 8, colors.outline)
  fillRect(image, mantleX + 2, 27 + bob, mantleW - 4, 6, colors.hood)
  fillRect(image, mantleX + 2, 28 + bob, math.max(6, math.floor(mantleW / 4)), 3, colors.hoodLight)
  fillRect(image, mantleX + mantleW - 10, 28 + bob, 8, 3, colors.magentaDim)

  -- Main overcoat body.
  local coatW = profileWidth(pose, 28, 24, 17)
  local coatX = centeredX(18 + sway + drift, 28, coatW, pose)
  fillRect(image, coatX, 33 + bob, coatW, 19, colors.outline)
  fillRect(image, coatX + 3, 35 + bob, coatW - 6, 15, colors.midnight)
  fillRect(image, coatX + 6, 36 + bob, math.max(8, coatW - 12), 12, colors.overcoat)
  fillRect(image, coatX + 9, 38 + bob, math.max(4, math.floor(coatW / 3)), 5, colors.silverBlue)
  -- Magenta seam running down the front keeps the nebula read.
  fillRect(image, coatX + math.floor(coatW / 2), 35 + bob, 4, 16, colors.magentaDim)

  -- Drifting hem flaps — asymmetric, amorphous tatters at the sides.
  fillRect(image, coatX - 1 + capeShift, 43 + bob, 7, 11, colors.hoodDark)
  fillRect(image, coatX + coatW - 6, 42 + bob, 7, 12, colors.hoodDark)
  fillPixel(image, coatX + 4, 31 + bob, colors.star)
  fillPixel(image, coatX + coatW - 3, 31 + bob, colors.starLight)
  if backView == 0 then
    fillRect(image, centeredX(31 + sway, 4, 4, pose), 44 + bob, 4, 4, colors.cyan)
  end
end

local function drawDeathVoid(image, pose)
  -- Fracture-blade slips from the grip as the wanderer falls.
  if pose.death <= 3 then
    drawOrientedLine(image, pose, 12, 36 + pose.death * 4, 20, 50, colors.voidBlack, 2)
    drawOrientedLine(image, pose, 13, 37 + pose.death * 4, 19, 49, colors.magenta, 1)
  else
    drawOrientedLine(image, pose, 14, 55, 26, 58, colors.voidBlack, 2)
    drawOrientedLine(image, pose, 15, 55, 25, 57, colors.magenta, 1)
  end
end

local function drawVoid(image, pose)
  if pose.motion == "death" then
    drawDeathVoid(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local torso = pose.torso or 0
  local swipe = pose.swipe or 0
  local rift = pose.rift or 0
  local dirX = pose.dirX or 0

  if swipe > 0 then
    -- Void-touch swipe: a fracture-blade arc sweeping across the front.
    local arcEnd = orientedX(pose, 54 + swipe * 3)
    drawOrientedLine(image, pose, 30 + torso, 24 + bob, 56 + swipe * 3, 18 + bob + swipe * 2, colors.voidBlack, 3)
    drawOrientedLine(image, pose, 31 + torso, 24 + bob, 55 + swipe * 3, 19 + bob + swipe * 2, colors.magenta, 2)
    drawOrientedLine(image, pose, 32 + torso, 25 + bob, 54 + swipe * 3, 20 + bob + swipe * 2, colors.blade, 1)
    fillPixel(image, orientedX(pose, 56 + swipe * 3), 18 + bob + swipe * 2, colors.starLight)
  else
    -- Idle/guard: fracture-blade held low to the oriented side.
    drawOrientedLine(image, pose, 11, 35 + bob, 18, 47 + bob, colors.voidBlack, 2)
    drawOrientedLine(image, pose, 9, 26 + bob, 20, 43 + bob, colors.magenta, 2)
    drawOrientedLine(image, pose, 11, 28 + bob, 19, 42 + bob, colors.blade, 1)
    fillPixel(image, orientedX(pose, 9), 25 + bob, colors.magenta)
    fillPixel(image, orientedX(pose, 13), 30 + bob, colors.cyan)
  end

  -- Cast: a void rift opening overhead with a growing nebula burst.
  if rift > 0 then
    local rx = 32 + dirX
    local ry = 18 - rift * 2 + bob
    -- Rift core — a vertical tear of voidBlack edged with nebula color.
    fillRect(image, rx - 1, ry, 3, 4 + rift * 2, colors.voidBlack)
    fillRect(image, rx, ry, 1, 4 + rift * 2, colors.magenta)
    drawSpark(image, rx, ry - 1, colors.cyan)
    if rift >= 2 then
      drawSpark(image, rx - 7, ry + 6, colors.magenta)
      drawSpark(image, rx + 6, ry + 8, colors.cyan)
    end
    if rift >= 3 then
      fillRect(image, rx - 6, ry - 4, 13, 2, colors.magentaDim)
      fillRect(image, rx - 8, ry + 10, 17, 1, colors.cyanDim)
    end
    if rift >= 4 then
      drawLine(image, rx - 11, ry + 14, rx + 9, ry + 14, colors.magenta, 1)
      drawSpark(image, rx, ry + 4, colors.starLight)
    end
  end
end

local function drawDeathAccent(image, pose)
  -- Nebula motes scatter as the figure dissolves.
  if pose.death <= 4 then
    local dirX = pose.dirX or 0
    fillPixel(image, 28 + dirX, 44 + pose.death, colors.cyanDim)
    fillPixel(image, 36 + dirX, 42 + pose.death, colors.magentaDim)
  end
end

local function drawAccent(image, pose)
  if pose.motion == "death" then
    drawDeathAccent(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local void = pose.void or 0
  local mote = pose.mote or 0
  local dirX = pose.dirX or 0

  -- Drifting nebula motes orbiting the cloak — the idle signature.
  drawSpark(image, 51, 21 + mote + bob, colors.cyan)
  drawSpark(image, 13 + sway + dirX, 23 - mote + bob, colors.magentaDim)
  drawSpark(image, 32 + sway + dirX, 46 + bob, colors.magenta)
  fillPixel(image, 23 + sway + void + dirX, 38 + bob, colors.starLight)
  fillPixel(image, 41 + sway + void + dirX, 38 + bob, colors.magenta)
  fillRect(image, 25 + sway + void + dirX, 56, 16, 1, colors.magentaDim)
  fillRect(image, 28 + sway - void + dirX, 58, 10, 1, colors.cyanDim)

  -- Void-touch trail on attack swipe frames.
  if (pose.swipe or 0) > 0 then
    drawOrientedLine(image, pose, 34, 22 + pose.swipe * 3, 60, 16 + pose.swipe * 6, colors.magenta, 1)
    drawOrientedLine(image, pose, 40, 18 + pose.swipe * 4, 62, 22 + pose.swipe * 7, colors.cyan, 1)
  end

  -- Nebula burst sparks around the rift on cast frames.
  if (pose.rift or 0) > 0 then
    local gx = 32 + dirX
    local gy = 8 + bob
    drawSpark(image, gx, gy, colors.cyan)
    if pose.rift >= 2 then
      drawSpark(image, gx - 8, gy + 9, colors.magenta)
      drawSpark(image, gx + 7, gy + 11, colors.magentaDim)
    end
    if pose.rift >= 3 then
      fillRect(image, gx - 7, 2, 15, 2, colors.magenta)
      fillRect(image, gx - 8, 13, 17, 1, colors.cyan)
    end
    if pose.rift >= 4 then
      drawLine(image, gx - 11, 19, gx + 9, 19, colors.magenta, 1)
    end
  end

  -- Hit flash sparks on recoil frames.
  if (pose.hit or 0) > 0 then
    fillRect(image, 18 + dirX, 20, 4, 2, colors.hitRed)
    fillRect(image, 15 + dirX, 25, 5, 2, colors.magenta)
    fillRect(image, 20 + dirX, 18, 2, 4, colors.star)
  end

  -- Ready stance: a focused void glow gathered at the chest, nebula-edged.
  if (pose.ready or 0) > 0 then
    drawSpark(image, 32 + dirX, 34 + bob, colors.cyan)
    fillRect(image, 28 + dirX, 33 + bob, 9, 1, colors.magenta)
    fillPixel(image, 30 + dirX, 32 + bob, colors.starLight)
    fillPixel(image, 34 + dirX, 32 + bob, colors.starLight)
  end

  -- Victory: a rising nebula-mote burst spiraling up out of the void cloak.
  if (pose.vic or 0) > 0 then
    drawSpark(image, 32 + dirX, 8 - pose.vic + bob, colors.starLight)
    drawSpark(image, 24 + dirX - pose.vic, 16 + bob, colors.cyan)
    drawSpark(image, 40 + dirX + pose.vic, 16 + bob, colors.magenta)
    if pose.vic >= 2 then
      fillRect(image, 26 + dirX, 4, 13, 1, colors.magenta)
      drawSpark(image, 18 + dirX, 22 + bob, colors.magentaDim)
      drawSpark(image, 46 + dirX, 22 + bob, colors.cyanDim)
    end
    if pose.vic >= 3 then
      fillRect(image, 30 + dirX, 2, 5, 2, colors.cyan)
      drawSpark(image, 32 + dirX, 12 + bob, colors.magenta)
    end
  end
end

local function drawReference(image, poseIndex, directionIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 31, 58, 3, 3, colors.magenta)
  if poseIndex == 1 or poseIndex == 5 or poseIndex == 11 or poseIndex == 17 or poseIndex == 22 or poseIndex == 25 then
    fillRect(image, 2, 2, 8, 2, colors.cyan)
  end
  fillRect(image, 2 + directionIndex * 3, 6, 2, 2, colors.magenta)
end

for directionIndex, direction in ipairs(directions) do
  for poseIndex = 1, BASE_FRAME_COUNT do
    local frameNumber = (directionIndex - 1) * BASE_FRAME_COUNT + poseIndex
    local shadowImage = newImage()
    local bodyImage = newImage()
    local cloakImage = newImage()
    local voidImage = newImage()
    local accentImage = newImage()
    local referenceImage = newImage()
    local pose = directedPose(basePoses[poseIndex], direction)

    drawShadow(shadowImage, pose)
    drawBody(bodyImage, pose)
    drawCloak(cloakImage, pose)
    drawVoid(voidImage, pose)
    drawAccent(accentImage, pose)
    drawReference(referenceImage, poseIndex, directionIndex)

    local frame = sprite.frames[frameNumber]
    sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
    sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
    sprite:newCel(cloakLayer, frame, cloakImage, Point(0, 0))
    sprite:newCel(voidLayer, frame, voidImage, Point(0, 0))
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
