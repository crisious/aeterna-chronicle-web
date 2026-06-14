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
  shadow = Color { r = 12, g = 11, b = 24, a = 128 },
  hairDark = Color { r = 94, g = 54, b = 47, a = 255 },
  hair = Color { r = 151, g = 88, b = 65, a = 255 },
  hairLight = Color { r = 235, g = 174, b = 79, a = 255 },
  robeDark = Color { r = 57, g = 43, b = 103, a = 255 },
  robe = Color { r = 126, g = 85, b = 181, a = 255 },
  robeLight = Color { r = 167, g = 120, b = 217, a = 255 },
  tunic = Color { r = 151, g = 183, b = 207, a = 255 },
  tunicLight = Color { r = 212, g = 230, b = 240, a = 255 },
  skin = Color { r = 198, g = 142, b = 116, a = 255 },
  skinDark = Color { r = 128, g = 76, b = 72, a = 255 },
  memoryCyan = Color { r = 137, g = 207, b = 240, a = 255 },
  cyanDim = Color { r = 62, g = 146, b = 178, a = 255 },
  magic = Color { r = 184, g = 124, b = 255, a = 255 },
  bookCover = Color { r = 48, g = 35, b = 91, a = 255 },
  bookPage = Color { r = 230, g = 222, b = 194, a = 255 },
  gold = Color { r = 255, g = 215, b = 0, a = 255 },
  reference = Color { r = 255, g = 215, b = 0, a = 96 },
}

-- Five production directions. Mirrors the ether_knight full template so the
-- promoted memory_weaver shares the exact direction/profile vocabulary.
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

local clothLayer = sprite:newLayer()
clothLayer.name = "cloth"

local bookLayer = sprite:newLayer()
bookLayer.name = "floating_books"

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

-- Thirty base poses: idle(4) walk(6) attack_melee(6) cast(5) hit(3) death(6).
-- memory_weaver is a caster, so "attack_melee" is a tome thrust + memory-thread
-- lash and "cast" is the books rising with a growing glow.
local basePoses = {
  { motion = "idle", bob = 0, sway = 0, book = 0, robe = 0 },
  { motion = "idle", bob = -1, sway = 0, book = 1, robe = 0 },
  { motion = "idle", bob = 0, sway = 1, book = 0, robe = 1 },
  { motion = "idle", bob = 1, sway = 0, book = -1, robe = 0 },

  { motion = "walk", bob = 0, sway = -1, book = 1, robe = -1, leftStep = -2, rightStep = 2 },
  { motion = "walk", bob = -1, sway = 0, book = 2, robe = 0, leftStep = -1, rightStep = 1 },
  { motion = "walk", bob = 0, sway = 1, book = 1, robe = 1, leftStep = 0, rightStep = 0 },
  { motion = "walk", bob = 1, sway = 0, book = 0, robe = 0, leftStep = 1, rightStep = -1 },
  { motion = "walk", bob = 0, sway = -1, book = -1, robe = -1, leftStep = 2, rightStep = -2 },
  { motion = "walk", bob = -1, sway = 0, book = 0, robe = 0, leftStep = 0, rightStep = 0 },

  { motion = "attack_melee", bob = 0, sway = -1, book = -1, robe = -1, torso = -1, strike = 0, leftStep = -1, rightStep = 1 },
  { motion = "attack_melee", bob = -1, sway = -1, book = -2, robe = -1, torso = -2, strike = 0, leftStep = -2, rightStep = 2 },
  { motion = "attack_melee", bob = 0, sway = 1, book = 4, robe = 1, torso = 2, strike = 1, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 1, sway = 1, book = 5, robe = 2, torso = 2, strike = 2, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 0, sway = 0, book = 3, robe = 1, torso = 1, strike = 1, leftStep = 1, rightStep = -1 },
  { motion = "attack_melee", bob = 0, sway = 0, book = 0, robe = 0, torso = 0, strike = 0, leftStep = 0, rightStep = 0 },

  { motion = "cast", bob = 0, sway = 0, book = 1, robe = 0, glow = 1 },
  { motion = "cast", bob = -1, sway = 0, book = 2, robe = 0, glow = 2 },
  { motion = "cast", bob = -2, sway = 0, book = 3, robe = 1, glow = 3 },
  { motion = "cast", bob = -1, sway = 0, book = 2, robe = 0, glow = 4 },
  { motion = "cast", bob = 0, sway = 0, book = 1, robe = 0, glow = 2 },

  { motion = "hit", bob = -1, sway = 0, book = -2, robe = -1, torso = -3, hit = 1, leftStep = 1, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, book = -1, robe = -1, torso = -2, hit = 2, leftStep = 2, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, book = 0, robe = 0, torso = 0, hit = 0, leftStep = 0, rightStep = 0 },

  { motion = "death", death = 1 },
  { motion = "death", death = 2 },
  { motion = "death", death = 3 },
  { motion = "death", death = 4 },
  { motion = "death", death = 5 },
  { motion = "death", death = 6 },

  { motion = "ready", bob = 0, sway = 0, book = 1, robe = 0, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, book = 2, robe = 0, ready = 1 },
  { motion = "ready", bob = 0, sway = 0, book = 1, robe = 0, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, book = 2, robe = 0, ready = 1 },

  { motion = "victory", bob = 0, sway = 0, book = 2, robe = 0, vic = 1 },
  { motion = "victory", bob = -1, sway = 0, book = 3, robe = 0, vic = 2 },
  { motion = "victory", bob = -2, sway = 0, book = 4, robe = 1, vic = 3 },
  { motion = "victory", bob = -1, sway = 0, book = 3, robe = 0, vic = 3 },
  { motion = "victory", bob = 0, sway = 0, book = 2, robe = 0, vic = 2 },
  { motion = "victory", bob = -1, sway = 0, book = 3, robe = 0, vic = 3 },
}

local motionTags = {
  { name = "idle", from = 1, to = 4, color = colors.memoryCyan },
  { name = "walk", from = 5, to = 10, color = colors.gold },
  { name = "attack_melee", from = 11, to = 16, color = colors.magic },
  { name = "cast", from = 17, to = 21, color = colors.robeLight },
  { name = "hit", from = 22, to = 24, color = colors.cyanDim },
  { name = "death", from = 25, to = 30, color = colors.robeDark },
  { name = "ready", from = 31, to = 34, color = colors.tunicLight },
  { name = "victory", from = 35, to = 40, color = colors.gold },
}

local function directedPose(basePose, direction)
  local pose = {}
  for key, value in pairs(basePose) do
    pose[key] = value
  end
  pose.direction = direction.id
  pose.dirX = direction.x
  pose.bookSide = direction.side
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
  if (pose.bookSide or 1) < 0 then
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
  if drop <= 2 then
    fillRect(image, 22 + dirX, 12 + drop * 6, 20, 18, colors.outline)
    fillRect(image, 24 + dirX, 15 + drop * 6, 16, 13, colors.hairDark)
    fillRect(image, 25 + dirX, 17 + drop * 6, 14, 9, colors.skin)
    fillRect(image, 21 + dirX, 27 + drop * 4, 23, 22, colors.outline)
    fillRect(image, 24 + dirX, 31 + drop * 4, 17, 16, colors.tunic)
  else
    fillRect(image, 17 + dirX, 47, 32, 10, colors.outline)
    fillRect(image, 21 + dirX, 49, 24, 6, colors.tunic)
    fillRect(image, 20 + dirX, 42, 19, 7, colors.outline)
    fillRect(image, 23 + dirX, 44, 13, 4, colors.hairDark)
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
  local headW = profileWidth(pose, 16, 14, 11)
  local torsoW = profileWidth(pose, 20, 17, 13)
  local headX = centeredX(24 + sway + lean, 16, headW, pose)
  local torsoX = centeredX(22 + sway + torso, 20, torsoW, pose)

  -- Head: hood/hair frame + face (cyan eyes only when not viewed from behind).
  fillRect(image, headX, 10 + bob, headW, 18, colors.outline)
  fillRect(image, headX + 2, 13 + bob, math.max(8, headW - 4), 13, colors.hairDark)
  if backView == 0 then
    fillRect(image, headX + 3, 15 + bob, math.max(8, headW - 6), 10, colors.skin)
    fillRect(image, headX + 5, 17 + bob, math.max(4, headW - 10), 2, colors.skinDark)
    fillRect(image, headX + 4, 16 + bob, 2, 2, colors.memoryCyan)
    fillRect(image, headX + headW - 6, 16 + bob, 2, 2, colors.memoryCyan)
  else
    fillRect(image, headX + 3, 14 + bob, math.max(8, headW - 6), 4, colors.hairLight)
  end

  -- Side hair locks.
  fillRect(image, headX - 4, 18 + bob, 6, 20, colors.outline)
  fillRect(image, headX + headW - 2, 18 + bob, 6, 20, colors.outline)
  fillRect(image, headX - 3, 20 + bob, 4, 16, colors.hair)
  fillRect(image, headX + headW - 1, 20 + bob, 5, 16, colors.hair)

  -- Torso (tunic under robe) + arms.
  fillRect(image, torsoX, 27 + bob, torsoW, 23, colors.outline)
  fillRect(image, torsoX + 3, 31 + bob, math.max(8, torsoW - 6), 16, colors.tunic)
  fillRect(image, torsoX + 5, 32 + bob, math.max(4, math.floor(torsoW / 3)), 3, colors.tunicLight)

  if (pose.profile or 0) >= 2 then
    fillRect(image, torsoX + 1, 32 + bob, 5, 11, colors.outline)
    fillRect(image, torsoX + 2, 34 + bob, 3, 8, colors.skin)
  else
    fillRect(image, 18 + torso + dirX, 32 + bob, 7, 12, colors.outline)
    fillRect(image, 41 + torso + dirX, 32 + bob, 7, 12, colors.outline)
    fillRect(image, 20 + torso + dirX, 34 + bob, 4, 8, colors.skin)
    fillRect(image, 42 + torso + dirX, 34 + bob, 4, 8, colors.skin)
  end

  -- Legs / hem-feet.
  fillRect(image, 24 + leftStep + dirX, 48, 7, 11, colors.outline)
  fillRect(image, 36 + rightStep + dirX, 48, 7, 11, colors.outline)
  fillRect(image, 26 + leftStep + dirX, 50, 3, 7, colors.robeDark)
  fillRect(image, 38 + rightStep + dirX, 50, 3, 7, colors.robeDark)
end

local function drawDeathCloth(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  if drop <= 2 then
    fillRect(image, 19 + dirX, 26 + drop * 4, 27, 7, colors.outline)
    fillRect(image, 21 + dirX, 27 + drop * 4, 23, 5, colors.robe)
    fillRect(image, 24 + dirX, 28 + drop * 4, 15, 3, colors.gold)
  else
    -- Robe pooled on the ground.
    fillRect(image, 16 + dirX, 52, 34, 6, colors.outline)
    fillRect(image, 19 + dirX, 53, 28, 4, colors.robe)
    fillRect(image, 24 + dirX, 54, 16, 2, colors.robeDark)
  end
end

local function drawCloth(image, pose)
  if pose.motion == "death" then
    drawDeathCloth(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local torso = pose.torso or 0
  local robe = pose.robe or 0
  local dirX = pose.dirX or 0
  local backView = pose.backView or 0
  local mantleW = profileWidth(pose, 29, 25, 18)
  local mantleX = centeredX(18 + sway + robe, 29, mantleW, pose)

  -- Shoulder mantle + gold collar trim.
  fillRect(image, mantleX, 26 + bob, mantleW, 7, colors.outline)
  fillRect(image, mantleX + 2, 27 + bob, mantleW - 4, 5, colors.robe)
  fillRect(image, mantleX + 4, 28 + bob, math.max(6, math.floor(mantleW / 3)), 2, colors.robeLight)
  if backView == 0 then
    fillRect(image, centeredX(25 + sway, 15, profileWidth(pose, 15, 12, 8), pose), 29 + bob, profileWidth(pose, 15, 12, 8), 3, colors.gold)
    fillRect(image, centeredX(30 + sway, 5, 5, pose), 29 + bob, 5, 5, colors.outline)
    fillRect(image, centeredX(31 + sway, 3, 3, pose), 30 + bob, 3, 3, colors.magic)
  else
    -- Back hood ridge.
    fillRect(image, centeredX(24 + sway, 17, profileWidth(pose, 17, 14, 9), pose), 27 + bob, profileWidth(pose, 17, 14, 9), 2, colors.robeDark)
  end

  -- Lower robe skirt.
  local skirtW = profileWidth(pose, 22, 19, 14)
  local skirtX = centeredX(21 + sway + robe, 22, skirtW, pose)
  fillRect(image, skirtX, 38 + bob, skirtW, 13, colors.outline)
  fillRect(image, skirtX + 3, 40 + bob, skirtW - 6, 9, colors.robeDark)
  fillRect(image, skirtX + 5, 41 + bob, math.max(3, math.floor(skirtW / 4)), 3, colors.robeLight)
end

local function drawBook(image, pose, x, y, openSide)
  fillRect(image, x, y, 11, 12, colors.outline)
  fillRect(image, x + 1, y + 1, 9, 10, colors.bookCover)
  fillRect(image, x + 2, y + 2, 3, 8, colors.bookPage)
  fillRect(image, x + 6, y + 2, 3, 8, colors.bookPage)
  fillRect(image, x + 5, y + 1, 1, 10, colors.gold)
  if openSide < 0 then
    fillPixel(image, x - 2, y + 4, colors.memoryCyan)
  else
    fillPixel(image, x + 12, y + 4, colors.memoryCyan)
  end
end

local function drawFloatingBooks(image, pose)
  if pose.motion == "death" then
    -- Books tumble down and out as the weaver falls.
    local drop = pose.death
    drawBook(image, pose, 8, math.min(50, 26 + drop * 5), -1)
    drawBook(image, pose, 46, math.min(52, 24 + drop * 6), 1)
    return
  end

  local bob = pose.bob or 0
  local book = pose.book or 0
  local strike = pose.strike or 0

  if strike > 0 then
    -- Lead book thrusts forward (front of the oriented side) on the strike.
    local thrustX = orientedX(pose, 40 + strike * 4)
    drawBook(image, pose, thrustX, 28 + bob - strike, (pose.bookSide or 1) < 0 and -1 or 1)
    drawBook(image, pose, orientedX(pose, 8), 30 - book + bob, (pose.bookSide or 1) < 0 and 1 or -1)
    drawOrientedLine(image, pose, 30, 40 + bob, 44 + strike * 4, 33 + bob - strike, colors.cyanDim, 1)
  else
    drawBook(image, pose, orientedX(pose, 9), 28 + book, (pose.bookSide or 1) < 0 and 1 or -1)
    drawBook(image, pose, orientedX(pose, 44), 25 - book + bob, (pose.bookSide or 1) < 0 and -1 or 1)
    drawOrientedLine(image, pose, 14, 42 + book, 22, 45 + bob, colors.cyanDim, 1)
    drawOrientedLine(image, pose, 50, 39 - book, 42, 45 + bob, colors.cyanDim, 1)
  end
end

local function drawDeathAccent(image, pose)
  if pose.death <= 3 then
    fillRect(image, 31 + (pose.dirX or 0), 44 + pose.death, 4, 1, colors.cyanDim)
  end
end

local function drawAccent(image, pose)
  if pose.motion == "death" then
    drawDeathAccent(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local book = pose.book or 0
  local dirX = pose.dirX or 0

  drawSpark(image, 32 + sway + dirX, 38 + bob, colors.memoryCyan)
  fillRect(image, 27 + sway + dirX, 45 + bob, 12, 2, colors.memoryCyan)
  fillPixel(image, 30 + sway + dirX, 33 + bob, colors.gold)
  fillPixel(image, 34 + sway + dirX, 33 + bob, colors.gold)

  -- Memory-thread lash on attack strike frames.
  if (pose.strike or 0) > 0 then
    drawOrientedLine(image, pose, 34, 22 + pose.strike * 4, 60, 16 + pose.strike * 7, colors.memoryCyan, 1)
    drawOrientedLine(image, pose, 40, 18 + pose.strike * 5, 62, 22 + pose.strike * 8, colors.magic, 1)
  end

  -- Cast glow ramp above the rising books.
  if (pose.glow or 0) > 0 then
    local gx = 32 + dirX
    local gy = 6 + bob
    drawSpark(image, gx, gy, colors.memoryCyan)
    if pose.glow >= 2 then
      drawSpark(image, gx - 7, gy + 8, colors.magic)
      drawSpark(image, gx + 6, gy + 10, colors.cyanDim)
    end
    if pose.glow >= 3 then
      fillRect(image, gx - 6, 2, 13, 2, colors.magic)
      fillRect(image, gx - 7, 12, 15, 1, colors.memoryCyan)
    end
    if pose.glow >= 4 then
      drawLine(image, gx - 10, 18, gx + 8, 18, colors.magic, 1)
    end
  end

  -- Hit flash sparks on recoil frames.
  if (pose.hit or 0) > 0 then
    fillRect(image, 18 + dirX, 20, 4, 2, colors.magic)
    fillRect(image, 15 + dirX, 25, 5, 2, colors.memoryCyan)
    fillRect(image, 20 + dirX, 18, 2, 4, colors.gold)
  end

  -- Ready stance: focused memory glow at the chest.
  if (pose.ready or 0) > 0 then
    drawSpark(image, 32 + dirX, 34 + bob, colors.gold)
    fillRect(image, 28 + dirX, 33 + bob, 9, 1, colors.memoryCyan)
  end

  -- Victory: rising sparkle burst above the weaver.
  if (pose.vic or 0) > 0 then
    drawSpark(image, 32 + dirX, 8 - pose.vic + bob, colors.gold)
    drawSpark(image, 22 + dirX, 14 + bob, colors.memoryCyan)
    drawSpark(image, 42 + dirX, 14 + bob, colors.magic)
    if pose.vic >= 2 then
      fillRect(image, 26 + dirX, 4, 13, 1, colors.gold)
      drawSpark(image, 16 + dirX, 20 + bob, colors.cyanDim)
      drawSpark(image, 48 + dirX, 20 + bob, colors.cyanDim)
    end
    if pose.vic >= 3 then
      fillRect(image, 30 + dirX, 2, 5, 2, colors.memoryCyan)
    end
  end
end

local function drawReference(image, poseIndex, directionIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 31, 58, 3, 3, colors.gold)
  if poseIndex == 1 or poseIndex == 5 or poseIndex == 11 or poseIndex == 17 or poseIndex == 22 or poseIndex == 25 then
    fillRect(image, 2, 2, 8, 2, colors.memoryCyan)
  end
  fillRect(image, 2 + directionIndex * 3, 6, 2, 2, colors.gold)
end

for directionIndex, direction in ipairs(directions) do
  for poseIndex = 1, BASE_FRAME_COUNT do
    local frameNumber = (directionIndex - 1) * BASE_FRAME_COUNT + poseIndex
    local shadowImage = newImage()
    local bodyImage = newImage()
    local clothImage = newImage()
    local bookImage = newImage()
    local accentImage = newImage()
    local referenceImage = newImage()
    local pose = directedPose(basePoses[poseIndex], direction)

    drawShadow(shadowImage, pose)
    drawBody(bodyImage, pose)
    drawCloth(clothImage, pose)
    drawFloatingBooks(bookImage, pose)
    drawAccent(accentImage, pose)
    drawReference(referenceImage, poseIndex, directionIndex)

    local frame = sprite.frames[frameNumber]
    sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
    sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
    sprite:newCel(clothLayer, frame, clothImage, Point(0, 0))
    sprite:newCel(bookLayer, frame, bookImage, Point(0, 0))
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
