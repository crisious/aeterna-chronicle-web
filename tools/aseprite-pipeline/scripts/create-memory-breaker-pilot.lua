local outputPath = app.params["output"]
local palettePath = app.params["palette"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local FRAME_SIZE = 64
local BASE_FRAME_COUNT = 40
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

-- memory_breaker (B9): an aggressive striker with a sharp, angular, shattering
-- silhouette. Crimson + black mood, asymmetric profile, warhammer that throws
-- broken-memory shards on impact. Palette/identity kept verbatim from the pilot;
-- crimson/black shard accents added for the promoted motions.
local colors = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 10, g = 7, b = 9, a = 142 },
  hoodDark = Color { r = 92, g = 5, b = 9, a = 255 },
  hood = Color { r = 160, g = 22, b = 28, a = 255 },
  hoodLight = Color { r = 215, g = 51, b = 45, a = 255 },
  armorDark = Color { r = 36, g = 45, b = 50, a = 255 },
  armor = Color { r = 74, g = 85, b = 92, a = 255 },
  armorLight = Color { r = 149, g = 157, b = 164, a = 255 },
  redPlateDark = Color { r = 83, g = 18, b = 22, a = 255 },
  redPlate = Color { r = 141, g = 31, b = 36, a = 255 },
  leatherDark = Color { r = 60, g = 31, b = 22, a = 255 },
  leather = Color { r = 122, g = 64, b = 38, a = 255 },
  skin = Color { r = 202, g = 118, b = 83, a = 255 },
  skinDark = Color { r = 130, g = 61, b = 54, a = 255 },
  gold = Color { r = 185, g = 129, b = 38, a = 255 },
  ether = Color { r = 137, g = 207, b = 240, a = 255 },
  etherDim = Color { r = 45, g = 125, b = 165, a = 255 },
  hammerDark = Color { r = 58, g = 59, b = 64, a = 255 },
  hammer = Color { r = 157, g = 160, b = 164, a = 255 },
  handle = Color { r = 92, g = 42, b = 26, a = 255 },
  crimson = Color { r = 198, g = 38, b = 44, a = 255 },
  crimsonDark = Color { r = 110, g = 16, b = 20, a = 255 },
  reference = Color { r = 137, g = 207, b = 240, a = 96 },
}

-- Five production directions. Mirrors the ether_knight/memory_weaver full
-- template so the promoted memory_breaker shares the exact direction vocabulary.
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

local armorLayer = sprite:newLayer()
armorLayer.name = "armor_shard"

local weaponLayer = sprite:newLayer()
weaponLayer.name = "warhammer"

local accentLayer = sprite:newLayer()
accentLayer.name = "memory_cracks"

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

-- A jagged broken-memory shard: angular crimson/black splinter used to read the
-- "shattering" motif on strikes and casts. Drawn around an oriented anchor.
local function drawShard(image, x, y, size, color)
  fillPixel(image, x, y, color)
  fillPixel(image, x + size, y - size, color)
  fillPixel(image, x + size - 1, y - size + 1, color)
  fillPixel(image, x - size, y - size + 1, color)
  fillPixel(image, x + 1, y - size - 1, color)
  fillPixel(image, x - size + 1, y + size - 1, color)
end

-- Thirty base poses: idle(4) walk(6) attack_melee(6) cast(5) hit(3) death(6).
-- memory_breaker is an aggressive striker: "attack_melee" is a shattering
-- overhead smash that throws shards; "cast" is a cracking debuff fracture;
-- "idle" is a menacing asymmetric stance (hammer cocked to one side).
local basePoses = {
  { motion = "idle", bob = 0, sway = -1, torso = -1, hammer = 0, crack = 0 },
  { motion = "idle", bob = -1, sway = -1, torso = -1, hammer = -1, crack = 1 },
  { motion = "idle", bob = 0, sway = -1, torso = -2, hammer = 0, crack = 0 },
  { motion = "idle", bob = 1, sway = -1, torso = -1, hammer = 1, crack = -1 },

  { motion = "walk", bob = 0, sway = -1, hammer = -1, crack = 1, leftStep = -2, rightStep = 2 },
  { motion = "walk", bob = -1, sway = 0, hammer = -1, crack = 0, leftStep = -1, rightStep = 1 },
  { motion = "walk", bob = 0, sway = 1, hammer = 0, crack = -1, leftStep = 0, rightStep = 0 },
  { motion = "walk", bob = 1, sway = 0, hammer = 1, crack = 0, leftStep = 1, rightStep = -1 },
  { motion = "walk", bob = 0, sway = -1, hammer = 1, crack = 1, leftStep = 2, rightStep = -2 },
  { motion = "walk", bob = -1, sway = 0, hammer = 0, crack = 0, leftStep = 0, rightStep = 0 },

  { motion = "attack_melee", bob = -1, sway = -2, hammer = -3, crack = 0, torso = -2, strike = 0, leftStep = -1, rightStep = 1 },
  { motion = "attack_melee", bob = -2, sway = -2, hammer = -5, crack = 0, torso = -3, strike = 0, leftStep = -2, rightStep = 2 },
  { motion = "attack_melee", bob = 1, sway = 2, hammer = 6, crack = 2, torso = 2, strike = 1, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 2, sway = 2, hammer = 9, crack = 3, torso = 3, strike = 2, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 1, sway = 1, hammer = 5, crack = 2, torso = 1, strike = 1, leftStep = 1, rightStep = -1 },
  { motion = "attack_melee", bob = 0, sway = 0, hammer = 0, crack = 0, torso = 0, strike = 0, leftStep = 0, rightStep = 0 },

  { motion = "cast", bob = 0, sway = -1, hammer = -1, crack = 1, glow = 1 },
  { motion = "cast", bob = -1, sway = -1, hammer = -2, crack = 2, glow = 2 },
  { motion = "cast", bob = -2, sway = 0, hammer = -2, crack = 3, glow = 3 },
  { motion = "cast", bob = -1, sway = 0, hammer = -1, crack = 2, glow = 4 },
  { motion = "cast", bob = 0, sway = 0, hammer = 0, crack = 1, glow = 2 },

  { motion = "hit", bob = -1, sway = 0, hammer = -1, crack = 0, torso = -3, hit = 1, leftStep = 1, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, hammer = 0, crack = 0, torso = -2, hit = 2, leftStep = 2, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, hammer = 0, crack = 0, torso = 0, hit = 0, leftStep = 0, rightStep = 0 },

  { motion = "death", death = 1 },
  { motion = "death", death = 2 },
  { motion = "death", death = 3 },
  { motion = "death", death = 4 },
  { motion = "death", death = 5 },
  { motion = "death", death = 6 },

  { motion = "ready", bob = 0, sway = -1, torso = -1, hammer = 0, crack = 1, ready = 1 },
  { motion = "ready", bob = -1, sway = -1, torso = -1, hammer = -1, crack = 1, ready = 1 },
  { motion = "ready", bob = 0, sway = -1, torso = -1, hammer = 0, crack = 1, ready = 1 },
  { motion = "ready", bob = -1, sway = -1, torso = -1, hammer = -1, crack = 1, ready = 1 },

  { motion = "victory", bob = 0, sway = 0, torso = 0, hammer = 1, crack = 1, vic = 1 },
  { motion = "victory", bob = -1, sway = 0, torso = 1, hammer = 2, crack = 2, vic = 2 },
  { motion = "victory", bob = -2, sway = 0, torso = 1, hammer = 3, crack = 3, vic = 3 },
  { motion = "victory", bob = -1, sway = 0, torso = 1, hammer = 3, crack = 3, vic = 3 },
  { motion = "victory", bob = 0, sway = 0, torso = 0, hammer = 2, crack = 2, vic = 2 },
  { motion = "victory", bob = -1, sway = 0, torso = 1, hammer = 3, crack = 3, vic = 3 },
}

local motionTags = {
  { name = "idle", from = 1, to = 4, color = colors.ether },
  { name = "walk", from = 5, to = 10, color = colors.gold },
  { name = "attack_melee", from = 11, to = 16, color = colors.crimson },
  { name = "cast", from = 17, to = 21, color = colors.hoodLight },
  { name = "hit", from = 22, to = 24, color = colors.etherDim },
  { name = "death", from = 25, to = 30, color = colors.hoodDark },
  { name = "ready", from = 31, to = 34, color = colors.armorLight },
  { name = "victory", from = 35, to = 40, color = colors.crimson },
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
    fillRect(image, 16 + dirX, 58, 33, 2, colors.shadow)
    fillRect(image, 22 + dirX, 60, 23, 1, colors.shadow)
    return
  end
  local stretch = pose.motion == "attack_melee" and 5 or (pose.motion == "walk" and 3 or 1)
  local narrow = (pose.profile or 0) >= 2 and 4 or 0
  fillRect(image, 15 - stretch + dirX + narrow, 58, 34 + stretch * 2 - narrow * 2, 2, colors.shadow)
  fillRect(image, 23 - stretch + dirX + narrow, 60, 18 + stretch * 2 - narrow * 2, 1, colors.shadow)
end

local function drawDeathBody(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  local bodyShift = (pose.profile or 0) >= 2 and -2 or 0
  if drop <= 2 then
    fillRect(image, 22 + dirX + bodyShift, 8 + drop * 7, 17, 20, colors.outline)
    fillRect(image, 24 + dirX + bodyShift, 11 + drop * 7, 13, 15, colors.hoodDark)
    fillRect(image, 26 + dirX + bodyShift, 13 + drop * 7, 9, 9, colors.hood)
    fillRect(image, 20 + dirX + bodyShift, 30 + drop * 5, 24, 18, colors.outline)
    fillRect(image, 23 + dirX + bodyShift, 33 + drop * 5, 18, 12, colors.armorDark)
  else
    fillRect(image, 15 + dirX + bodyShift, 48, 34, 9, colors.outline)
    fillRect(image, 19 + dirX + bodyShift, 50, 26, 5, colors.armorDark)
    fillRect(image, 19 + dirX + bodyShift, 42, 19, 7, colors.outline)
    fillRect(image, 22 + dirX + bodyShift, 44, 13, 4, colors.hoodDark)
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
  local headW = profileWidth(pose, 17, 14, 11)
  local headX = centeredX(24 + sway + lean, 17, headW, pose)

  -- Hood: sharp angular crimson cowl, asymmetric peak pulled to the lead side.
  fillRect(image, headX, 8 + bob, headW, 20, colors.outline)
  fillRect(image, headX + 2, 11 + bob, math.max(8, headW - 4), 16, colors.hoodDark)
  -- Asymmetric jagged hood peak.
  fillRect(image, headX + headW - 4, 5 + bob, 3, 5, colors.outline)
  fillRect(image, headX + headW - 3, 6 + bob, 1, 4, colors.hood)

  if backView == 0 then
    fillRect(image, headX + 3, 13 + bob, math.max(7, headW - 7), 10, colors.skin)
    fillRect(image, headX + 3, 11 + bob, math.max(7, headW - 7), 4, colors.hood)
    fillRect(image, headX + 5, 10 + bob, 5, 3, colors.hoodLight)
    fillRect(image, headX + 4, 16 + bob, 2, 2, colors.ether)
    fillRect(image, headX + headW - 6, 16 + bob, 2, 2, colors.ether)
    fillRect(image, headX + 3, 20 + bob, math.max(7, headW - 7), 3, colors.hood)
  else
    fillRect(image, headX + 2, 11 + bob, math.max(9, headW - 3), 12, colors.hood)
    fillRect(image, headX + 3, 12 + bob, math.max(7, headW - 6), 4, colors.hoodLight)
  end

  -- Arms (asymmetric: lead arm forward for the cocked-hammer stance).
  if (pose.profile or 0) >= 2 then
    fillRect(image, 24 + torso + dirX, 31 + bob, 6, 14, colors.outline)
    fillRect(image, 25 + torso + dirX, 33 + bob, 4, 9, colors.skin)
  else
    fillRect(image, 16 + sway + torso + dirX, 31 + bob, 9, 15, colors.outline)
    fillRect(image, 41 + sway + torso + dirX, 31 + bob, 9, 15, colors.outline)
    fillRect(image, 18 + sway + torso + dirX, 33 + bob, 5, 10, colors.skin)
    fillRect(image, 43 + sway + torso + dirX, 33 + bob, 5, 10, colors.skin)
  end

  -- Legs / heavy boots (planted wide for the aggressive stance).
  fillRect(image, 22 + leftStep + dirX, 50, 9, 10, colors.outline)
  fillRect(image, 35 + rightStep + dirX, 50, 9, 10, colors.outline)
  fillRect(image, 24 + leftStep + dirX, 51, 5, 7, colors.redPlateDark)
  fillRect(image, 37 + rightStep + dirX, 51, 5, 7, colors.redPlateDark)
  fillRect(image, 22 + leftStep + dirX, 58, 10, 2, colors.leatherDark)
  fillRect(image, 35 + rightStep + dirX, 58, 10, 2, colors.leatherDark)
end

local function drawDeathArmor(image, pose)
  local dirX = pose.dirX or 0
  local bodyShift = (pose.profile or 0) >= 2 and -2 or 0
  if pose.death <= 2 then
    fillRect(image, 19 + dirX + bodyShift, 29 + pose.death * 5, 30, 9, colors.outline)
    fillRect(image, 21 + dirX + bodyShift, 30 + pose.death * 5, 26, 6, colors.armor)
    fillRect(image, 28 + dirX + bodyShift, 32 + pose.death * 5, 10, 4, colors.redPlate)
    fillRect(image, 31 + dirX + bodyShift, 33 + pose.death * 5, 4, 2, colors.gold)
  else
    -- Shattered plate scattered on the ground.
    fillRect(image, 16 + dirX + bodyShift, 51, 33, 5, colors.outline)
    fillRect(image, 19 + dirX + bodyShift, 52, 26, 3, colors.armor)
    fillRect(image, 28 + dirX + bodyShift, 52, 9, 3, colors.redPlate)
    fillRect(image, 14 + dirX + bodyShift, 47, 5, 3, colors.crimsonDark)
    fillRect(image, 46 + dirX + bodyShift, 48, 5, 3, colors.crimsonDark)
  end
end

local function drawArmor(image, pose)
  if pose.motion == "death" then
    drawDeathArmor(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local torso = pose.torso or 0
  local dirX = pose.dirX or 0
  local backView = pose.backView or 0
  local pauldW = profileWidth(pose, 39, 32, 22)
  local pauldX = centeredX(13 + sway, 39, pauldW, pose)

  -- Wide, angular pauldron band. Asymmetric: lead shoulder spike is larger.
  fillRect(image, pauldX, 24 + bob, pauldW, 11, colors.outline)
  fillRect(image, pauldX + 2, 25 + bob, pauldW - 4, 8, colors.armor)
  fillRect(image, pauldX + 2, 26 + bob, math.max(6, math.floor(pauldW / 4)), 4, colors.armorLight)
  fillRect(image, pauldX + pauldW - 9, 26 + bob, 7, 4, colors.armorLight)
  fillRect(image, pauldX + 4, 28 + bob, pauldW - 8, 4, colors.armorDark)
  -- Asymmetric jagged shoulder spike on the lead (oriented) side.
  fillRect(image, orientedX(pose, 50), 21 + bob, 4, 6, colors.outline)
  fillRect(image, orientedX(pose, 51), 22 + bob, 2, 4, colors.crimson)

  -- Central chestplate with crimson core.
  local chestW = profileWidth(pose, 25, 21, 15)
  local chestX = centeredX(20 + sway + torso, 25, chestW, pose)
  fillRect(image, chestX, 32 + bob, chestW, 19, colors.outline)
  fillRect(image, chestX + 3, 34 + bob, chestW - 6, 15, colors.armorDark)
  fillRect(image, chestX + 5, 35 + bob, math.max(8, chestW - 10), 4, colors.armor)
  if backView == 0 then
    fillRect(image, chestX + 8, 40 + bob, 10, 10, colors.redPlate)
    fillRect(image, chestX + 10, 42 + bob, 6, 6, colors.crimsonDark)
    fillRect(image, chestX + 11, 42 + bob, 4, 5, colors.gold)
  else
    fillRect(image, chestX + 6, 38 + bob, chestW - 12, 8, colors.crimsonDark)
  end

  -- Angular waist plate + belt.
  fillRect(image, chestX + 2, 43 + bob, chestW - 4, 4, colors.leather)
  fillRect(image, chestX + 5, 49 + bob, math.max(10, chestW - 10), 2, colors.armorLight)
end

local function drawDeathHammer(image, pose)
  -- The warhammer slips from the breaker's grip toward the ground.
  if pose.death <= 3 then
    drawOrientedLine(image, pose, 46, 26 + pose.death * 4, 52, 50, colors.handle, 3)
    fillRect(image, orientedX(pose, 42), 22 + pose.death * 5, 14, 10, colors.outline)
    fillRect(image, orientedX(pose, 44), 24 + pose.death * 5, 10, 6, colors.hammer)
  else
    fillRect(image, orientedX(pose, 44), 52, 16, 6, colors.outline)
    fillRect(image, orientedX(pose, 46), 53, 12, 4, colors.hammer)
    drawOrientedLine(image, pose, 38, 56, 44, 55, colors.handle, 3)
  end
end

local function drawHammer(image, pose)
  if pose.motion == "death" then
    drawDeathHammer(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local hammer = pose.hammer or 0
  local mode = pose.motion
  local strike = pose.strike or 0

  if mode == "attack_melee" and strike > 0 then
    -- Mid/late smash: hammer head crashes down at the oriented front.
    local hx = orientedX(pose, 44 + strike * 3)
    local hy = 30 + strike * 6 + bob
    drawOrientedLine(image, pose, 26 + sway, 30 + bob, 44 + strike * 3, 28 + strike * 6 + bob, colors.handle, 3)
    fillRect(image, hx - 9, hy, 18, 13, colors.outline)
    fillRect(image, hx - 7, hy + 2, 14, 9, colors.hammer)
    fillRect(image, hx - 6, hy + 3, 5, 3, colors.armorLight)
    fillRect(image, hx + 4, hy + 4, 4, 5, colors.hammerDark)
    fillPixel(image, hx, hy + 4, colors.ether)
  elseif mode == "attack_melee" then
    -- Windup: hammer raised high overhead behind the lead shoulder.
    drawOrientedLine(image, pose, 40 + sway, 30 + bob, 50 + sway, 6 + bob + hammer, colors.handle, 3)
    fillRect(image, orientedX(pose, 42), 2 + bob + hammer, 18, 12, colors.outline)
    fillRect(image, orientedX(pose, 44), 4 + bob + hammer, 14, 8, colors.hammer)
    fillRect(image, orientedX(pose, 45), 5 + bob + hammer, 5, 3, colors.armorLight)
    fillPixel(image, orientedX(pose, 51), 6 + bob + hammer, colors.ether)
  else
    -- Idle / walk / cast / hit: hammer cocked low to the lead side (asymmetric).
    local handleX = orientedX(pose, 12 + sway)
    drawLine(image, handleX, 24 + bob + hammer, handleX + 1, 57 + bob, colors.handle, 3)
    drawLine(image, handleX + 2, 26 + bob + hammer, handleX + 2, 55 + bob, colors.gold, 1)
    fillRect(image, orientedX(pose, 4 + sway), 18 + bob + hammer, 18, 12, colors.outline)
    fillRect(image, orientedX(pose, 6 + sway), 20 + bob + hammer, 14, 8, colors.hammer)
    fillRect(image, orientedX(pose, 7 + sway), 21 + bob + hammer, 5, 3, colors.armorLight)
    fillRect(image, orientedX(pose, 15 + sway), 22 + bob + hammer, 4, 5, colors.hammerDark)
    fillRect(image, orientedX(pose, 4 + sway), 21 + bob + hammer, 3, 6, colors.armorLight)
    fillRect(image, orientedX(pose, 20 + sway), 21 + bob + hammer, 3, 6, colors.armorLight)
    fillPixel(image, orientedX(pose, 12 + sway), 22 + bob + hammer, colors.ether)
    fillPixel(image, orientedX(pose, 13 + sway), 24 + bob + hammer, colors.etherDim)
  end
end

local function drawDeathAccent(image, pose)
  if pose.death <= 3 then
    fillRect(image, 31 + (pose.dirX or 0), 44 + pose.death, 4, 1, colors.crimson)
    drawShard(image, 20 + (pose.dirX or 0), 40 + pose.death * 2, 2, colors.crimsonDark)
  end
end

local function drawAccent(image, pose)
  if pose.motion == "death" then
    drawDeathAccent(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local torso = pose.torso or 0
  local crack = pose.crack or 0
  local dirX = pose.dirX or 0

  -- Eye/ether glints + chest ether ember (the breaker's bound memory).
  fillPixel(image, 31 + sway + dirX, 14 + bob, colors.gold)
  fillPixel(image, 35 + sway + dirX, 14 + bob, colors.gold)
  drawSpark(image, 32 + sway + torso + dirX, 30 + bob, colors.ether)

  -- Always-on jagged fracture lines fanning from the chest (shattering motif).
  drawLine(image, 28 + sway + dirX, 36 + bob, 33 + sway + dirX, 42 + bob + crack, colors.crimson, 1)
  drawLine(image, 38 + sway + dirX, 36 + bob, 35 + sway + dirX, 45 + bob - crack, colors.crimsonDark, 1)
  drawLine(image, 19 + sway + dirX, 35 + bob, 23 + sway + dirX, 42 + bob, colors.etherDim, 1)
  drawLine(image, 46 + sway + dirX, 35 + bob, 42 + sway + dirX, 42 + bob, colors.etherDim, 1)

  -- Shattering shard burst on the smash impact frames.
  if (pose.strike or 0) > 0 then
    local sx = orientedX(pose, 46 + pose.strike * 3)
    local sy = 34 + pose.strike * 5 + bob
    drawShard(image, sx, sy, 2 + pose.strike, colors.crimson)
    drawShard(image, sx + 6, sy - 4, 2, colors.crimsonDark)
    drawShard(image, sx - 5, sy + 3, 2, colors.ether)
    drawOrientedLine(image, pose, 34, 22 + pose.strike * 4, 60, 16 + pose.strike * 7, colors.crimson, 1)
    drawOrientedLine(image, pose, 40, 18 + pose.strike * 5, 62, 22 + pose.strike * 8, colors.crimsonDark, 1)
  end

  -- Cast: a cracking fracture that splinters outward (debuff motif).
  if (pose.glow or 0) > 0 then
    local gx = 32 + dirX
    local gy = 32 + bob
    drawShard(image, gx, gy, 2, colors.crimson)
    drawLine(image, gx, gy, gx - 6 - pose.glow, gy + 4 + pose.glow, colors.crimsonDark, 1)
    drawLine(image, gx, gy, gx + 6 + pose.glow, gy + 3 + pose.glow, colors.crimson, 1)
    if pose.glow >= 2 then
      drawShard(image, gx - 8, gy + 6, 2, colors.crimsonDark)
      drawShard(image, gx + 7, gy + 7, 2, colors.ether)
    end
    if pose.glow >= 3 then
      drawLine(image, gx - 10, gy - 4, gx + 10, gy - 4, colors.crimson, 1)
      fillRect(image, gx - 7, gy - 7, 15, 1, colors.crimsonDark)
    end
    if pose.glow >= 4 then
      drawShard(image, gx - 11, gy + 2, 2, colors.crimson)
      drawShard(image, gx + 11, gy + 1, 2, colors.crimson)
    end
  end

  -- Hit flash: crimson recoil sparks + a stray shard.
  if (pose.hit or 0) > 0 then
    fillRect(image, 18 + dirX, 20, 4, 2, colors.crimson)
    fillRect(image, 15 + dirX, 25, 5, 2, colors.hoodLight)
    fillRect(image, 20 + dirX, 18, 2, 4, colors.gold)
    drawShard(image, 16 + dirX, 28, 2, colors.crimsonDark)
  end

  -- Ready stance: a focused crimson battle-focus glow gathering at the chest,
  -- with a low menacing ether ember at the planted core.
  if (pose.ready or 0) > 0 then
    drawShard(image, 32 + dirX, 33 + bob, 2, colors.crimson)
    fillRect(image, 27 + dirX, 31 + bob, 11, 1, colors.crimsonDark)
    drawSpark(image, 32 + dirX, 38 + bob, colors.ether)
    fillPixel(image, 28 + dirX, 33 + bob, colors.crimson)
    fillPixel(image, 36 + dirX, 33 + bob, colors.crimson)
  end

  -- Victory: a rising crimson shard burst exploding upward, scaling with vic.
  if (pose.vic or 0) > 0 then
    drawShard(image, 32 + dirX, 8 - pose.vic + bob, 2 + pose.vic, colors.crimson)
    drawShard(image, 22 + dirX, 14 + bob, 2, colors.crimsonDark)
    drawShard(image, 42 + dirX, 14 + bob, 2, colors.crimson)
    fillPixel(image, 32 + dirX, 4 - pose.vic + bob, colors.gold)
    if pose.vic >= 2 then
      drawShard(image, 16 + dirX, 20 + bob, 2, colors.crimsonDark)
      drawShard(image, 48 + dirX, 20 + bob, 2, colors.crimson)
      fillRect(image, 26 + dirX, 4, 13, 1, colors.crimson)
    end
    if pose.vic >= 3 then
      drawShard(image, 12 + dirX, 26 + bob, 2, colors.ether)
      drawShard(image, 52 + dirX, 26 + bob, 2, colors.ether)
      fillRect(image, 30 + dirX, 1, 5, 2, colors.crimsonDark)
    end
  end
end

local function drawReference(image, poseIndex, directionIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 31, 58, 3, 3, colors.ether)
  if poseIndex == 1 or poseIndex == 5 or poseIndex == 11 or poseIndex == 17 or poseIndex == 22 or poseIndex == 25 then
    fillRect(image, 2, 2, 8, 2, colors.redPlate)
  end
  fillRect(image, 2 + directionIndex * 3, 6, 2, 2, colors.crimson)
end

for directionIndex, direction in ipairs(directions) do
  for poseIndex = 1, BASE_FRAME_COUNT do
    local frameNumber = (directionIndex - 1) * BASE_FRAME_COUNT + poseIndex
    local shadowImage = newImage()
    local bodyImage = newImage()
    local armorImage = newImage()
    local weaponImage = newImage()
    local accentImage = newImage()
    local referenceImage = newImage()
    local pose = directedPose(basePoses[poseIndex], direction)

    drawShadow(shadowImage, pose)
    drawBody(bodyImage, pose)
    drawArmor(armorImage, pose)
    drawHammer(weaponImage, pose)
    drawAccent(accentImage, pose)
    drawReference(referenceImage, poseIndex, directionIndex)

    local frame = sprite.frames[frameNumber]
    sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
    sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
    sprite:newCel(armorLayer, frame, armorImage, Point(0, 0))
    sprite:newCel(weaponLayer, frame, weaponImage, Point(0, 0))
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
