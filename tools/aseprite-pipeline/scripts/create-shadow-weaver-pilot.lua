local outputPath = app.params["output"]
local palettePath = app.params["palette"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local FRAME_SIZE = 64
local BASE_FRAME_COUNT = 40
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

-- shadow_weaver visual identity (kept from the pilot): hooded figure, long dark
-- cloak, dark-gray silhouette with a deep crimson hood ridge, plus a
-- violet-magenta shadow accent that reads as a shadow caster rather than an
-- archer. shadowViolet / shadowMagenta / veil are the new dark-violet accents.
local colors = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 8, g = 7, b = 13, a = 132 },
  cloakDark = Color { r = 17, g = 18, b = 24, a = 255 },
  cloak = Color { r = 43, g = 44, b = 54, a = 255 },
  cloakLight = Color { r = 73, g = 75, b = 86, a = 255 },
  hoodRedDark = Color { r = 86, g = 14, b = 16, a = 255 },
  hoodRed = Color { r = 174, g = 39, b = 36, a = 255 },
  scarf = Color { r = 204, g = 47, b = 38, a = 255 },
  armorDark = Color { r = 35, g = 35, b = 42, a = 255 },
  armor = Color { r = 71, g = 75, b = 86, a = 255 },
  armorLight = Color { r = 113, g = 118, b = 129, a = 255 },
  leatherDark = Color { r = 67, g = 36, b = 24, a = 255 },
  leather = Color { r = 129, g = 70, b = 39, a = 255 },
  skin = Color { r = 198, g = 132, b = 106, a = 255 },
  skinDark = Color { r = 126, g = 72, b = 67, a = 255 },
  poison = Color { r = 77, g = 202, b = 108, a = 255 },
  poisonDim = Color { r = 29, g = 104, b = 55, a = 255 },
  purple = Color { r = 90, g = 48, b = 126, a = 255 },
  bow = Color { r = 91, g = 48, b = 30, a = 255 },
  string = Color { r = 171, g = 154, b = 122, a = 255 },
  metal = Color { r = 148, g = 143, b = 132, a = 255 },
  -- New dark-violet / shadow accents for the promoted caster.
  shadowViolet = Color { r = 124, g = 58, b = 173, a = 255 },
  shadowMagenta = Color { r = 186, g = 72, b = 196, a = 255 },
  veil = Color { r = 36, g = 20, b = 54, a = 200 },
  veilEdge = Color { r = 70, g = 38, b = 100, a = 160 },
  reference = Color { r = 77, g = 202, b = 108, a = 96 },
}

-- Five production directions. Mirrors the ether_knight / memory_weaver full
-- template so the promoted shadow_weaver shares the exact direction vocabulary.
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
cloakLayer.name = "cloak"

local veilLayer = sprite:newLayer()
veilLayer.name = "shadow_veil"

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
-- shadow_weaver is a shadow caster/rogue: "attack_melee" is a shadow-dagger /
-- shadow-whip lash (strike ramp), "cast" is shadow coalescing with a growing
-- dark glow (glow ramp), idle is the cloak sway.
local basePoses = {
  { motion = "idle", bob = 0, sway = 0, cloak = 0, veil = 0 },
  { motion = "idle", bob = -1, sway = 0, cloak = 1, veil = 1 },
  { motion = "idle", bob = 0, sway = 1, cloak = 0, veil = 0 },
  { motion = "idle", bob = 1, sway = 0, cloak = -1, veil = 1 },

  { motion = "walk", bob = 0, sway = -1, cloak = -2, veil = 0, leftStep = -2, rightStep = 2 },
  { motion = "walk", bob = -1, sway = 0, cloak = -1, veil = 1, leftStep = -1, rightStep = 1 },
  { motion = "walk", bob = 0, sway = 1, cloak = 0, veil = 0, leftStep = 0, rightStep = 0 },
  { motion = "walk", bob = 1, sway = 0, cloak = 1, veil = 1, leftStep = 1, rightStep = -1 },
  { motion = "walk", bob = 0, sway = -1, cloak = 2, veil = 0, leftStep = 2, rightStep = -2 },
  { motion = "walk", bob = -1, sway = 0, cloak = 0, veil = 1, leftStep = 0, rightStep = 0 },

  { motion = "attack_melee", bob = 0, sway = -1, cloak = -1, veil = 0, torso = -1, strike = 0, leftStep = -1, rightStep = 1 },
  { motion = "attack_melee", bob = -1, sway = -1, cloak = -1, veil = 0, torso = -2, strike = 0, leftStep = -2, rightStep = 2 },
  { motion = "attack_melee", bob = 0, sway = 1, cloak = 1, veil = 2, torso = 2, strike = 1, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 1, sway = 1, cloak = 2, veil = 2, torso = 2, strike = 2, leftStep = 2, rightStep = -2 },
  { motion = "attack_melee", bob = 0, sway = 0, cloak = 1, veil = 1, torso = 1, strike = 1, leftStep = 1, rightStep = -1 },
  { motion = "attack_melee", bob = 0, sway = 0, cloak = 0, veil = 0, torso = 0, strike = 0, leftStep = 0, rightStep = 0 },

  { motion = "cast", bob = 0, sway = 0, cloak = 0, veil = 1, glow = 1 },
  { motion = "cast", bob = -1, sway = 0, cloak = 0, veil = 2, glow = 2 },
  { motion = "cast", bob = -2, sway = 0, cloak = 1, veil = 3, glow = 3 },
  { motion = "cast", bob = -1, sway = 0, cloak = 0, veil = 2, glow = 4 },
  { motion = "cast", bob = 0, sway = 0, cloak = 0, veil = 1, glow = 2 },

  { motion = "hit", bob = -1, sway = 0, cloak = -1, veil = 0, torso = -3, hit = 1, leftStep = 1, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, cloak = -1, veil = 0, torso = -2, hit = 2, leftStep = 2, rightStep = 1 },
  { motion = "hit", bob = 0, sway = 0, cloak = 0, veil = 0, torso = 0, hit = 0, leftStep = 0, rightStep = 0 },

  { motion = "death", death = 1 },
  { motion = "death", death = 2 },
  { motion = "death", death = 3 },
  { motion = "death", death = 4 },
  { motion = "death", death = 5 },
  { motion = "death", death = 6 },

  { motion = "ready", bob = 0, sway = 0, cloak = 0, veil = 1, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, cloak = 0, veil = 1, ready = 1 },
  { motion = "ready", bob = 0, sway = 0, cloak = 0, veil = 1, ready = 1 },
  { motion = "ready", bob = -1, sway = 0, cloak = 0, veil = 1, ready = 1 },

  { motion = "victory", bob = 0, sway = 0, cloak = 0, veil = 1, vic = 1 },
  { motion = "victory", bob = -1, sway = 0, cloak = 1, veil = 2, vic = 2 },
  { motion = "victory", bob = -2, sway = 0, cloak = 1, veil = 2, vic = 3 },
  { motion = "victory", bob = -1, sway = 0, cloak = 1, veil = 2, vic = 3 },
  { motion = "victory", bob = 0, sway = 0, cloak = 0, veil = 1, vic = 2 },
  { motion = "victory", bob = -1, sway = 0, cloak = 1, veil = 2, vic = 3 },
}

local motionTags = {
  { name = "idle", from = 1, to = 4, color = colors.shadowMagenta },
  { name = "walk", from = 5, to = 10, color = colors.hoodRed },
  { name = "attack_melee", from = 11, to = 16, color = colors.shadowViolet },
  { name = "cast", from = 17, to = 21, color = colors.purple },
  { name = "hit", from = 22, to = 24, color = colors.scarf },
  { name = "death", from = 25, to = 30, color = colors.cloakDark },
  { name = "ready", from = 31, to = 34, color = colors.veilEdge },
  { name = "victory", from = 35, to = 40, color = colors.shadowMagenta },
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
    -- Hooded head + torso tipping over.
    fillRect(image, 23 + dirX + bodyShift, 12 + drop * 6, 18, 16, colors.outline)
    fillRect(image, 26 + dirX + bodyShift, 11 + drop * 6, 12, 5, colors.hoodRedDark)
    fillRect(image, 25 + dirX + bodyShift, 15 + drop * 6, 14, 11, colors.skin)
    fillRect(image, 21 + dirX + bodyShift, 31 + drop * 4, 23, 19, colors.outline)
    fillRect(image, 24 + dirX + bodyShift, 33 + drop * 4, 17, 15, colors.armor)
  else
    fillRect(image, 17 + dirX + bodyShift, 47, 32, 10, colors.outline)
    fillRect(image, 21 + dirX + bodyShift, 49, 24, 6, colors.armor)
    fillRect(image, 20 + dirX + bodyShift, 42, 19, 7, colors.outline)
    fillRect(image, 23 + dirX + bodyShift, 44, 13, 4, colors.hoodRedDark)
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
  local torsoW = profileWidth(pose, 23, 19, 14)
  local headX = centeredX(23 + sway + lean, 18, headW, pose)
  local torsoX = centeredX(21 + sway + torso, 23, torsoW, pose)

  -- Hooded head: dark hood frame + crimson hood ridge; face only when not back.
  fillRect(image, headX, 12 + bob, headW, 16, colors.outline)
  fillRect(image, headX + 1, 10 + bob, math.max(8, headW - 2), 5, colors.hoodRedDark)
  fillRect(image, headX + 3, 11 + bob, math.max(4, headW - 6), 3, colors.hoodRed)
  if backView == 0 then
    fillRect(image, headX + 2, 15 + bob, math.max(8, headW - 4), 11, colors.skin)
    fillRect(image, headX + 4, 15 + bob, math.max(6, headW - 8), 4, colors.skinDark)
    fillRect(image, headX + 4, 17 + bob, 2, 2, colors.shadowMagenta)
    fillRect(image, headX + headW - 6, 17 + bob, 2, 2, colors.shadowMagenta)
  else
    -- Back of the hood: dark with a crimson ridge, no face.
    fillRect(image, headX + 2, 15 + bob, math.max(8, headW - 4), 10, colors.cloakDark)
    fillRect(image, headX + 3, 16 + bob, math.max(6, headW - 6), 3, colors.hoodRedDark)
  end

  -- Scarf at the neckline.
  local scarfW = profileWidth(pose, 23, 19, 14)
  local scarfX = centeredX(21 + sway + torso, 23, scarfW, pose)
  fillRect(image, scarfX, 24 + bob, scarfW, 7, colors.outline)
  fillRect(image, scarfX + 2, 25 + bob, scarfW - 4, 5, colors.scarf)
  fillRect(image, scarfX + 4, 27 + bob, math.max(5, scarfW - 9), 3, colors.hoodRedDark)

  -- Torso / leather-armor chest.
  fillRect(image, torsoX, 31 + bob, torsoW, 19, colors.outline)
  fillRect(image, torsoX + 3, 33 + bob, math.max(8, torsoW - 6), 15, colors.armor)
  fillRect(image, torsoX + 5, 34 + bob, math.max(5, math.floor(torsoW / 3)), 4, colors.armorLight)
  fillRect(image, torsoX + 1, 40 + bob, math.max(8, torsoW - 2), 4, colors.armorDark)
  fillRect(image, torsoX + 3, 44 + bob, math.max(8, torsoW - 6), 3, colors.leather)
  fillRect(image, torsoX + math.floor(torsoW / 2) - 1, 44 + bob, 3, 3, colors.metal)

  -- Arms.
  if (pose.profile or 0) >= 2 then
    fillRect(image, torsoX + 1, 34 + bob, 5, 12, colors.outline)
    fillRect(image, torsoX + 2, 36 + bob, 3, 8, colors.leather)
  else
    fillRect(image, 18 + torso + dirX, 34 + bob, 7, 12, colors.outline)
    fillRect(image, 41 + torso + dirX, 34 + bob, 7, 12, colors.outline)
    fillRect(image, 20 + torso + dirX, 36 + bob, 4, 8, colors.leather)
    fillRect(image, 42 + torso + dirX, 36 + bob, 4, 8, colors.leather)
  end

  -- Legs / boots.
  fillRect(image, 24 + leftStep + dirX, 49, 7, 10, colors.outline)
  fillRect(image, 36 + rightStep + dirX, 49, 7, 10, colors.outline)
  fillRect(image, 26 + leftStep + dirX, 50, 3, 7, colors.armorDark)
  fillRect(image, 38 + rightStep + dirX, 50, 3, 7, colors.armorDark)
end

local function drawDeathCloak(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  if drop <= 2 then
    fillRect(image, 19 + dirX, 28 + drop * 4, 29, 9, colors.outline)
    fillRect(image, 21 + dirX, 29 + drop * 4, 25, 7, colors.cloakDark)
    fillRect(image, 24 + dirX, 30 + drop * 4, 17, 4, colors.cloak)
  else
    -- Cloak pooled across the ground.
    fillRect(image, 14 + dirX, 51, 38, 7, colors.outline)
    fillRect(image, 17 + dirX, 52, 32, 5, colors.cloakDark)
    fillRect(image, 22 + dirX, 53, 20, 3, colors.cloak)
  end
end

local function drawCloak(image, pose)
  if pose.motion == "death" then
    drawDeathCloak(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local cloak = pose.cloak or 0
  local dirX = pose.dirX or 0
  local backView = pose.backView or 0
  local hoodW = profileWidth(pose, 30, 26, 19)
  local hoodX = centeredX(17 + sway, 30, hoodW, pose)

  -- Hood / shoulder mantle.
  fillRect(image, hoodX, 12 + bob, hoodW, 18, colors.outline)
  fillRect(image, hoodX + 2, 14 + bob, hoodW - 4, 15, colors.cloakDark)
  fillRect(image, hoodX + 6, 16 + bob, math.max(8, hoodW - 12), 10, colors.cloak)
  fillRect(image, hoodX + 8, 17 + bob, 6, 2, colors.cloakLight)
  if backView > 0 then
    -- Back of the cloak gets a deeper ridge and no opening.
    fillRect(image, hoodX + 4, 14 + bob, hoodW - 8, 4, colors.cloakDark)
  end

  -- Long cloak body, draping wide and to the floor.
  local bodyW = profileWidth(pose, 33, 28, 21)
  local bodyX = centeredX(16 + sway + cloak, 33, bodyW, pose)
  fillRect(image, bodyX, 28 + bob, bodyW, 24, colors.outline)
  fillRect(image, bodyX + 2, 29 + bob, bodyW - 4, 21, colors.cloakDark)
  fillRect(image, bodyX + 5, 31 + bob, math.max(10, bodyW - 10), 16, colors.cloak)
  fillRect(image, bodyX + 7, 33 + bob, 7, 4, colors.cloakLight)

  -- Trailing cloak hems on each side (narrower in profile).
  if (pose.profile or 0) < 2 then
    fillRect(image, 14 + sway + cloak + dirX, 41 + bob, 10, 13, colors.outline)
    fillRect(image, 16 + sway + cloak + dirX, 42 + bob, 7, 11, colors.cloakDark)
    fillRect(image, 42 + sway + cloak + dirX, 40 + bob, 9, 14, colors.outline)
    fillRect(image, 43 + sway + cloak + dirX, 41 + bob, 6, 12, colors.cloakDark)
  else
    -- Single trailing edge behind the figure when side-on.
    fillRect(image, bodyX - 3, 40 + bob, 8, 14, colors.outline)
    fillRect(image, bodyX - 2, 41 + bob, 5, 12, colors.cloakDark)
  end
end

local function drawShadowVeil(image, pose)
  if pose.motion == "death" then
    -- Veil dissipates: a fading violet smudge that sinks as the body drops.
    if pose.death <= 4 then
      local y = 30 + pose.death * 4
      fillRect(image, 22 + (pose.dirX or 0), y, 20, 3, colors.veil)
      fillRect(image, 26 + (pose.dirX or 0), y + 3, 12, 2, colors.veilEdge)
    end
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local veil = pose.veil or 0
  local strike = pose.strike or 0
  local glow = pose.glow or 0
  local dirX = pose.dirX or 0

  -- Soft / blurred silhouette edge: a violet veil hugging the cloak hem that
  -- breathes with the idle/walk `veil` ramp.
  fillRect(image, 18 + sway + dirX, 48 + bob, 28, 3 + veil, colors.veil)
  fillRect(image, 16 + sway + dirX, 50 + bob + veil, 8, 2, colors.veilEdge)
  fillRect(image, 40 + sway + dirX, 50 + bob + veil, 8, 2, colors.veilEdge)
  if veil >= 1 then
    fillRect(image, 22 + sway + dirX, 44 + bob, 20, 2, colors.veilEdge)
  end

  -- Shadow whip / dagger trail on attack strike frames.
  if strike > 0 then
    local handX = orientedX(pose, 40 + strike * 4)
    -- Shadow dagger blade.
    drawOrientedLine(image, pose, 38 + strike * 2, 32 + bob, 50 + strike * 4, 22 + bob - strike, colors.shadowViolet, 3)
    drawOrientedLine(image, pose, 38 + strike * 2, 32 + bob, 49 + strike * 4, 23 + bob - strike, colors.shadowMagenta, 1)
    -- Lashing whip arc behind the strike.
    drawOrientedLine(image, pose, 30, 38 + bob, handX, 30 + bob - strike, colors.veilEdge, 2)
    fillRect(image, handX - 1, 30 + bob - strike, 3, 3, colors.shadowViolet)
  end

  -- Cast: shadow coalescing into a growing dark glow overhead.
  if glow > 0 then
    local gx = 32 + dirX
    local gy = 8 + bob
    drawPlus(image, gx, gy, colors.shadowMagenta)
    fillRect(image, gx - 2, gy - 1, 4, 3, colors.veil)
    if glow >= 2 then
      drawPlus(image, gx - 7, gy + 8, colors.shadowViolet)
      drawPlus(image, gx + 6, gy + 10, colors.purple)
    end
    if glow >= 3 then
      fillRect(image, gx - 6, 3, 13, 3, colors.veil)
      fillRect(image, gx - 7, 13, 15, 2, colors.shadowViolet)
    end
    if glow >= 4 then
      drawLine(image, gx - 10, 19, gx + 8, 19, colors.shadowMagenta, 2)
      fillRect(image, gx - 12, 22, 25, 2, colors.veil)
    end
  end
end

local function drawDeathAccent(image, pose)
  if pose.death <= 3 then
    fillRect(image, 31 + (pose.dirX or 0), 44 + pose.death, 4, 1, colors.shadowViolet)
  end
end

local function drawAccent(image, pose)
  if pose.motion == "death" then
    drawDeathAccent(image, pose)
    return
  end

  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local dirX = pose.dirX or 0
  local backView = pose.backView or 0

  -- Drifting shadow sparks around the weaver.
  drawSpark(image, 32 + sway + dirX, 21 + bob, colors.shadowMagenta)
  drawSpark(image, 15 + sway + dirX, 24 + bob, colors.shadowViolet)
  drawSpark(image, 50 + sway + dirX, 26 + bob, colors.purple)
  fillRect(image, 28 + sway + dirX, 39 + bob, 10, 2, colors.shadowViolet)

  if backView == 0 then
    fillPixel(image, 30 + sway + dirX, 33 + bob, colors.shadowMagenta)
    fillPixel(image, 34 + sway + dirX, 33 + bob, colors.shadowMagenta)
  end

  if (pose.profile or 0) >= 1 then
    fillRect(image, 26 + dirX, 22 + bob, 2, 2, colors.purple)
  end

  -- Shadow-thread lash on attack strike frames.
  if (pose.strike or 0) > 0 then
    drawOrientedLine(image, pose, 34, 22 + pose.strike * 4, 60, 16 + pose.strike * 7, colors.shadowMagenta, 1)
    drawOrientedLine(image, pose, 40, 18 + pose.strike * 5, 62, 22 + pose.strike * 8, colors.shadowViolet, 1)
  end

  -- Cast glow ramp sparkle (paired with the veil's overhead glow).
  if (pose.glow or 0) > 0 then
    local gx = 32 + dirX
    local gy = 6 + bob
    drawSpark(image, gx, gy, colors.shadowMagenta)
    if pose.glow >= 3 then
      drawSpark(image, gx - 9, gy + 4, colors.shadowViolet)
      drawSpark(image, gx + 8, gy + 6, colors.purple)
    end
  end

  -- Hit flash on recoil frames.
  if (pose.hit or 0) > 0 then
    fillRect(image, 18 + dirX, 20, 4, 2, colors.shadowMagenta)
    fillRect(image, 15 + dirX, 25, 5, 2, colors.scarf)
    fillRect(image, 20 + dirX, 18, 2, 4, colors.shadowViolet)
  end

  -- Ready stance: a focused dark shadow glow gathered at the chest.
  if (pose.ready or 0) > 0 then
    fillRect(image, 28 + sway + dirX, 35 + bob, 9, 1, colors.shadowViolet)
    drawSpark(image, 32 + sway + dirX, 34 + bob, colors.shadowMagenta)
    fillPixel(image, 32 + sway + dirX, 36 + bob, colors.veilEdge)
  end

  -- Victory: shadow motes rising in a celebration burst above the figure,
  -- scaling with pose.vic (1 -> 3).
  if (pose.vic or 0) > 0 then
    drawSpark(image, 32 + dirX, 8 - pose.vic + bob, colors.shadowMagenta)
    drawSpark(image, 22 + dirX, 14 + bob, colors.shadowViolet)
    drawSpark(image, 42 + dirX, 14 + bob, colors.purple)
    if pose.vic >= 2 then
      fillRect(image, 26 + dirX, 4, 13, 1, colors.shadowMagenta)
      drawSpark(image, 16 + dirX, 20 + bob, colors.shadowViolet)
      drawSpark(image, 48 + dirX, 20 + bob, colors.shadowViolet)
    end
    if pose.vic >= 3 then
      fillRect(image, 30 + dirX, 2, 5, 2, colors.shadowViolet)
      drawSpark(image, 12 + dirX, 26 + bob, colors.veilEdge)
      drawSpark(image, 52 + dirX, 26 + bob, colors.veilEdge)
    end
  end
end

local function drawReference(image, poseIndex, directionIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 31, 58, 3, 3, colors.shadowMagenta)
  if poseIndex == 1 or poseIndex == 5 or poseIndex == 11 or poseIndex == 17 or poseIndex == 22 or poseIndex == 25 then
    fillRect(image, 2, 2, 8, 2, colors.hoodRed)
  end
  fillRect(image, 2 + directionIndex * 3, 6, 2, 2, colors.shadowViolet)
end

for directionIndex, direction in ipairs(directions) do
  for poseIndex = 1, BASE_FRAME_COUNT do
    local frameNumber = (directionIndex - 1) * BASE_FRAME_COUNT + poseIndex
    local shadowImage = newImage()
    local bodyImage = newImage()
    local cloakImage = newImage()
    local veilImage = newImage()
    local accentImage = newImage()
    local referenceImage = newImage()
    local pose = directedPose(basePoses[poseIndex], direction)

    drawShadow(shadowImage, pose)
    drawCloak(cloakImage, pose)
    drawBody(bodyImage, pose)
    drawShadowVeil(veilImage, pose)
    drawAccent(accentImage, pose)
    drawReference(referenceImage, poseIndex, directionIndex)

    local frame = sprite.frames[frameNumber]
    sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
    sprite:newCel(cloakLayer, frame, cloakImage, Point(0, 0))
    sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
    sprite:newCel(veilLayer, frame, veilImage, Point(0, 0))
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
