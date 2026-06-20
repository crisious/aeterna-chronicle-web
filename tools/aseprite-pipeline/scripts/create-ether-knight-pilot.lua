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
  shadow = Color { r = 13, g = 13, b = 26, a = 128 },
  deepNavy = Color { r = 26, g = 26, b = 46, a = 255 },
  navyShade = Color { r = 16, g = 17, b = 32, a = 255 },
  memoryCyan = Color { r = 137, g = 207, b = 240, a = 255 },
  cyanDim = Color { r = 62, g = 146, b = 178, a = 255 },
  silver = Color { r = 192, g = 192, b = 192, a = 255 },
  silverHi = Color { r = 224, g = 232, b = 236, a = 255 },
  steel = Color { r = 113, g = 121, b = 126, a = 255 },
  steelDark = Color { r = 68, g = 76, b = 82, a = 255 },
  goldAccent = Color { r = 255, g = 215, b = 0, a = 255 },
  hitRed = Color { r = 255, g = 91, b = 91, a = 255 },
  magic = Color { r = 142, g = 104, b = 255, a = 255 },
  reference = Color { r = 255, g = 215, b = 0, a = 96 },
}

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
armorLayer.name = "armor"

local weaponLayer = sprite:newLayer()
weaponLayer.name = "weapon"

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

local function drawPlus(image, x, y, color)
  fillPixel(image, x, y, color)
  fillPixel(image, x - 1, y, color)
  fillPixel(image, x + 1, y, color)
  fillPixel(image, x, y - 1, color)
  fillPixel(image, x, y + 1, color)
end

local basePoses = {
  { motion = "idle", bob = 0, leftStep = 0, rightStep = 0, sword = "guard" },
  { motion = "idle", bob = -1, leftStep = 0, rightStep = 0, sword = "guard" },
  { motion = "idle", bob = 0, leftStep = 0, rightStep = 0, sword = "guard" },
  { motion = "idle", bob = 1, leftStep = 0, rightStep = 0, sword = "guard" },

  { motion = "walk", bob = 0, leftStep = -2, rightStep = 2, sword = "guard", cape = -1 },
  { motion = "walk", bob = -1, leftStep = -1, rightStep = 1, sword = "guard", cape = 0 },
  { motion = "walk", bob = 0, leftStep = 0, rightStep = 0, sword = "guard", cape = 1 },
  { motion = "walk", bob = 1, leftStep = 1, rightStep = -1, sword = "guard", cape = 0 },
  { motion = "walk", bob = 0, leftStep = 2, rightStep = -2, sword = "guard", cape = -1 },
  { motion = "walk", bob = -1, leftStep = 0, rightStep = 0, sword = "guard", cape = 0 },

  { motion = "attack_melee", bob = 0, leftStep = -1, rightStep = 1, sword = "windup", torso = -1, slash = 0 },
  { motion = "attack_melee", bob = -1, leftStep = -2, rightStep = 2, sword = "windup", torso = -2, slash = 0 },
  { motion = "attack_melee", bob = 0, leftStep = 2, rightStep = -2, sword = "slash_high", torso = 2, slash = 1 },
  { motion = "attack_melee", bob = 1, leftStep = 2, rightStep = -2, sword = "slash_mid", torso = 2, slash = 2 },
  { motion = "attack_melee", bob = 0, leftStep = 1, rightStep = -1, sword = "slash_low", torso = 1, slash = 1 },
  { motion = "attack_melee", bob = 0, leftStep = 0, rightStep = 0, sword = "guard", torso = 0, slash = 0 },

  { motion = "cast", bob = 0, leftStep = 0, rightStep = 0, sword = "raise", glow = 1 },
  { motion = "cast", bob = -1, leftStep = 0, rightStep = 0, sword = "raise", glow = 2 },
  { motion = "cast", bob = -2, leftStep = 0, rightStep = 0, sword = "raise", glow = 3 },
  { motion = "cast", bob = -1, leftStep = 0, rightStep = 0, sword = "raise", glow = 4 },
  { motion = "cast", bob = 0, leftStep = 0, rightStep = 0, sword = "guard", glow = 2 },

  { motion = "hit", bob = -1, leftStep = 1, rightStep = 1, sword = "guard", torso = -3, hit = 1 },
  { motion = "hit", bob = 0, leftStep = 2, rightStep = 1, sword = "guard", torso = -2, hit = 2 },
  { motion = "hit", bob = 0, leftStep = 0, rightStep = 0, sword = "guard", torso = 0, hit = 0 },

  { motion = "death", death = 1 },
  { motion = "death", death = 2 },
  { motion = "death", death = 3 },
  { motion = "death", death = 4 },
  { motion = "death", death = 5 },
  { motion = "death", death = 6 },

  { motion = "ready", bob = 0, leftStep = 0, rightStep = 0, sword = "guard", ready = 1 },
  { motion = "ready", bob = -1, leftStep = 0, rightStep = 0, sword = "guard", ready = 1 },
  { motion = "ready", bob = 0, leftStep = 0, rightStep = 0, sword = "guard", ready = 1 },
  { motion = "ready", bob = -1, leftStep = 0, rightStep = 0, sword = "guard", ready = 1 },

  { motion = "victory", bob = 0, leftStep = 0, rightStep = 0, sword = "raise", vic = 1 },
  { motion = "victory", bob = -1, leftStep = 0, rightStep = 0, sword = "raise", vic = 2 },
  { motion = "victory", bob = -2, leftStep = 0, rightStep = 0, sword = "raise", vic = 3 },
  { motion = "victory", bob = -1, leftStep = 0, rightStep = 0, sword = "raise", vic = 3 },
  { motion = "victory", bob = 0, leftStep = 0, rightStep = 0, sword = "raise", vic = 2 },
  { motion = "victory", bob = -1, leftStep = 0, rightStep = 0, sword = "raise", vic = 3 },
}

local motionTags = {
  { name = "idle", from = 1, to = 4, color = colors.memoryCyan },
  { name = "walk", from = 5, to = 10, color = colors.goldAccent },
  { name = "attack_melee", from = 11, to = 16, color = colors.hitRed },
  { name = "cast", from = 17, to = 21, color = colors.magic },
  { name = "hit", from = 22, to = 24, color = colors.silver },
  { name = "death", from = 25, to = 30, color = colors.steelDark },
  { name = "ready", from = 31, to = 34, color = colors.silver },
  { name = "victory", from = 35, to = 40, color = colors.goldAccent },
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

local function drawWeaponLine(image, pose, x0, y0, x1, y1, color, thickness)
  drawLine(image, orientedX(pose, x0), y0, orientedX(pose, x1), y1, color, thickness)
end

local function drawShadow(image, pose)
  local dirX = pose.dirX or 0
  if pose.motion == "death" then
    fillRect(image, 18 + dirX, 58, 31, 2, colors.shadow)
    fillRect(image, 22 + dirX, 60, 23, 1, colors.shadow)
    return
  end
  local stretch = pose.motion == "attack_melee" and 4 or 0
  local narrow = (pose.profile or 0) >= 2 and 4 or 0
  fillRect(image, 20 - stretch + dirX + narrow, 58, 24 + stretch * 2 - narrow * 2, 2, colors.shadow)
  fillRect(image, 24 - stretch + dirX + narrow, 60, 16 + stretch * 2 - narrow * 2, 1, colors.shadow)
end

local function drawDeathBody(image, pose)
  local drop = pose.death
  local dirX = pose.dirX or 0
  local bodyShift = (pose.profile or 0) >= 2 and -2 or 0
  if drop <= 2 then
    fillRect(image, 21 + dirX + bodyShift, 20 + drop * 6, 24, 24, colors.outline)
    fillRect(image, 24 + dirX + bodyShift, 23 + drop * 6, 18, 18, colors.deepNavy)
    fillRect(image, 20 + dirX + bodyShift, 45 + drop * 2, 30, 10, colors.outline)
    fillRect(image, 24 + dirX + bodyShift, 47 + drop * 2, 20, 6, colors.navyShade)
  else
    fillRect(image, 17 + dirX + bodyShift, 48, 32, 9, colors.outline)
    fillRect(image, 21 + dirX + bodyShift, 50, 24, 5, colors.navyShade)
    fillRect(image, 20 + dirX + bodyShift, 42, 19, 8, colors.outline)
    fillRect(image, 23 + dirX + bodyShift, 44, 13, 4, colors.deepNavy)
  end
end

local function drawDeathArmor(image, pose)
  local dirX = pose.dirX or 0
  local bodyShift = (pose.profile or 0) >= 2 and -2 or 0
  if pose.death <= 2 then
    fillRect(image, 24 + dirX + bodyShift, 23 + pose.death * 6, 18, 4, colors.steel)
    fillRect(image, 26 + dirX + bodyShift, 28 + pose.death * 6, 14, 9, colors.silver)
    fillRect(image, 27 + dirX + bodyShift, 29 + pose.death * 6, 4, 2, colors.silverHi)
  else
    fillRect(image, 22 + dirX + bodyShift, 44, 18, 4, colors.steel)
    fillRect(image, 25 + dirX + bodyShift, 49, 20, 3, colors.silver)
    fillRect(image, 31 + dirX + bodyShift, 45, 4, 2, colors.silverHi)
  end
end

local function drawDeathWeapon(image, pose)
  if pose.death <= 3 then
    drawWeaponLine(image, pose, 48, 34 + pose.death * 4, 55, 52, colors.outline, 3)
    drawWeaponLine(image, pose, 49, 35 + pose.death * 4, 54, 51, colors.silver, 1)
  else
    drawWeaponLine(image, pose, 44, 55, 57, 59, colors.outline, 3)
    drawWeaponLine(image, pose, 45, 55, 56, 58, colors.silver, 1)
    fillRect(image, orientedX(pose, 41), 54, 7, 3, colors.goldAccent)
  end
end

local function drawBody(image, pose)
  if pose.motion == "death" then
    drawDeathBody(image, pose)
    return
  end

  local bob = pose.bob or 0
  local torso = pose.torso or 0
  local leftStep = pose.leftStep or 0
  local rightStep = pose.rightStep or 0
  local lean = math.floor(torso / 2)
  local backView = pose.backView or 0
  local dirX = pose.dirX or 0
  local headW = profileWidth(pose, 18, 15, 12)
  local torsoW = profileWidth(pose, 22, 19, 15)
  local headX = centeredX(23 + lean, 18, headW, pose)
  local torsoX = centeredX(21 + torso, 22, torsoW, pose)

  if backView > 0 then
    local capeW = backView >= 2 and 29 or 25
    fillRect(image, centeredX(18 + (pose.capeShift or 0), 29, capeW, pose), 28 + bob, capeW, 22, colors.outline)
    fillRect(image, centeredX(21 + (pose.capeShift or 0), 23, capeW - 6, pose), 31 + bob, capeW - 6, 17, colors.navyShade)
  end

  fillRect(image, headX, 12 + bob, headW, 15, colors.outline)
  fillRect(image, torsoX, 26 + bob, torsoW, 24, colors.outline)

  if (pose.profile or 0) >= 2 then
    fillRect(image, torsoX + 1, 30 + bob, 6, 15, colors.outline)
    fillRect(image, torsoX + torsoW - 2, 31 + bob, 4, 13, colors.outline)
  else
    fillRect(image, 17 + torso + dirX, 29 + bob, 7, 15, colors.outline)
    fillRect(image, 42 + torso + dirX, 29 + bob, 7, 15, colors.outline)
  end

  local legW = profileWidth(pose, 8, 7, 6)
  fillRect(image, 22 + leftStep + dirX, 47, legW, 12, colors.outline)
  fillRect(image, 36 + rightStep + dirX, 47, legW, 12, colors.outline)

  fillRect(image, headX + 3, 16 + bob, math.max(6, headW - 6), 8, colors.deepNavy)
  fillRect(image, torsoX + 3, 30 + bob, math.max(8, torsoW - 7), 17, colors.deepNavy)

  if (pose.profile or 0) >= 2 then
    fillRect(image, torsoX + 3, 32 + bob, 2, 9, colors.deepNavy)
  else
    fillRect(image, 21 + torso + dirX, 32 + bob, 3, 9, colors.deepNavy)
    fillRect(image, 45 + torso + dirX, 32 + bob, 2, 9, colors.deepNavy)
  end

  fillRect(image, 25 + leftStep + dirX, 49, 3, 8, colors.deepNavy)
  fillRect(image, 39 + rightStep + dirX, 49, 3, 8, colors.deepNavy)

  if backView == 0 then
    local cape = pose.cape ~= nil and pose.cape or 0
    fillRect(image, 20 + cape + (pose.capeShift or 0) + dirX, 31 + bob, 5, 17, colors.navyShade)
  end
end

local function drawArmor(image, pose)
  if pose.motion == "death" then
    drawDeathArmor(image, pose)
    return
  end

  local bob = pose.bob or 0
  local torso = pose.torso or 0
  local lean = math.floor(torso / 2)
  local dirX = pose.dirX or 0
  local headW = profileWidth(pose, 14, 12, 9)
  local chestW = profileWidth(pose, 18, 15, 11)
  local helmX = centeredX(25 + lean, 14, headW, pose)
  local chestX = centeredX(24 + torso, 18, chestW, pose)

  fillRect(image, helmX, 13 + bob, headW, 4, colors.steelDark)
  fillRect(image, helmX + 1, 14 + bob, math.max(4, headW - 2), 3, colors.steel)
  fillRect(image, centeredX(28 + lean, 8, profileWidth(pose, 8, 7, 5), pose), 17 + bob, profileWidth(pose, 8, 7, 5), 8, colors.silver)

  if (pose.backView or 0) > 0 then
    fillRect(image, centeredX(27 + lean, 10, profileWidth(pose, 10, 9, 7), pose), 18 + bob, profileWidth(pose, 10, 9, 7), 2, colors.steelDark)
  else
    fillRect(image, centeredX(30 + lean, 4, profileWidth(pose, 4, 3, 2), pose), 18 + bob, profileWidth(pose, 4, 3, 2), 2, colors.silverHi)
  end

  fillRect(image, chestX, 27 + bob, chestW, 5, colors.steel)
  fillRect(image, chestX + 1, 32 + bob, math.max(6, chestW - 2), 11, colors.silver)
  fillRect(image, chestX + 4, 33 + bob, math.max(2, math.floor(chestW / 3)), 3, colors.silverHi)
  fillRect(image, chestX + 3, 43 + bob, math.max(5, chestW - 6), 5, colors.steel)

  if (pose.profile or 0) >= 2 then
    fillRect(image, chestX - 2, 29 + bob, 5, 6, colors.steel)
  else
    fillRect(image, 18 + torso + dirX, 29 + bob, 6, 6, colors.steel)
    fillRect(image, 43 + torso + dirX, 29 + bob, 6, 6, colors.steel)
  end
  fillRect(image, 26 + (pose.leftStep or 0) + dirX, 55, 5, 2, colors.steel)
  fillRect(image, 37 + (pose.rightStep or 0) + dirX, 55, 5, 2, colors.steel)
end

local function drawWeapon(image, pose)
  if pose.motion == "death" then
    drawDeathWeapon(image, pose)
    return
  end

  local bob = pose.bob or 0
  local torso = pose.torso or 0
  local mode = pose.sword or "guard"
  local side = pose.weaponSide or 1
  local dirX = pose.dirX or 0

  if mode == "guard" then
    local swordX = side < 0 and 16 + torso + dirX or 49 + torso + dirX
    fillRect(image, swordX - 2, 15 + bob, 5, 32, colors.outline)
    fillRect(image, swordX - 1, 17 + bob, 3, 28, colors.silver)
    fillRect(image, swordX, 18 + bob, 1, 8, colors.silverHi)
    fillRect(image, swordX - 5, 43 + bob, 11, 4, colors.outline)
    fillRect(image, swordX - 3, 43 + bob, 7, 2, colors.goldAccent)
    fillRect(image, swordX - 1, 47 + bob, 3, 7, colors.outline)
    fillRect(image, swordX, 48 + bob, 1, 5, colors.goldAccent)
  elseif mode == "windup" then
    drawWeaponLine(image, pose, 46 + torso, 38 + bob, 34 + torso, 11 + bob, colors.outline, 5)
    drawWeaponLine(image, pose, 46 + torso, 38 + bob, 35 + torso, 12 + bob, colors.silver, 3)
    fillRect(image, orientedX(pose, 40 + torso), 39 + bob, 11, 4, colors.outline)
    fillRect(image, orientedX(pose, 42 + torso), 39 + bob, 7, 2, colors.goldAccent)
  elseif mode == "slash_high" then
    drawWeaponLine(image, pose, 34 + torso, 24 + bob, 58, 14 + bob, colors.outline, 5)
    drawWeaponLine(image, pose, 35 + torso, 24 + bob, 57, 15 + bob, colors.silver, 3)
    fillRect(image, orientedX(pose, 38 + torso), 39 + bob, 12, 4, colors.outline)
    fillRect(image, orientedX(pose, 40 + torso), 39 + bob, 8, 2, colors.goldAccent)
  elseif mode == "slash_mid" then
    drawWeaponLine(image, pose, 31 + torso, 31 + bob, 60, 33 + bob, colors.outline, 5)
    drawWeaponLine(image, pose, 33 + torso, 31 + bob, 59, 33 + bob, colors.silver, 3)
    fillRect(image, orientedX(pose, 39 + torso), 40 + bob, 10, 4, colors.outline)
    fillRect(image, orientedX(pose, 41 + torso), 40 + bob, 6, 2, colors.goldAccent)
  elseif mode == "slash_low" then
    drawWeaponLine(image, pose, 34 + torso, 38 + bob, 57, 48 + bob, colors.outline, 5)
    drawWeaponLine(image, pose, 35 + torso, 38 + bob, 56, 47 + bob, colors.silver, 3)
    fillRect(image, orientedX(pose, 39 + torso), 41 + bob, 10, 4, colors.outline)
    fillRect(image, orientedX(pose, 41 + torso), 41 + bob, 6, 2, colors.goldAccent)
  elseif mode == "raise" then
    local swordX = side < 0 and 16 + dirX or 48 + dirX
    drawLine(image, swordX, 36 + bob, swordX, 5 + bob, colors.outline, 5)
    drawLine(image, swordX, 35 + bob, swordX, 7 + bob, colors.silver, 3)
    fillRect(image, swordX - 6, 36 + bob, 12, 4, colors.outline)
    fillRect(image, swordX - 4, 36 + bob, 8, 2, colors.goldAccent)
  end
end

local function drawAccent(image, pose)
  if pose.motion == "death" then
    if pose.death <= 3 then
      fillRect(image, 31 + (pose.dirX or 0), 45 + pose.death, 4, 1, colors.cyanDim)
    end
    return
  end

  local bob = pose.bob or 0
  local torso = pose.torso or 0
  local lean = math.floor(torso / 2)
  local dirX = pose.dirX or 0
  local backView = pose.backView or 0

  if backView > 0 then
    -- Rear view uses small armor rivets and a muted back plate line instead
    -- of the front cyan/gold chest crest.
    fillPixel(image, 29 + lean + dirX, 32 + bob, colors.memoryCyan)
    fillPixel(image, 35 + lean + dirX, 32 + bob, colors.memoryCyan)
    fillRect(image, 28 + torso + dirX, 40 + bob, 10, 2, colors.steelDark)
  else
    fillRect(image, 29 + lean + dirX, 20 + bob, 6, 2, colors.memoryCyan)
    fillRect(image, 31 + torso + dirX, 31 + bob, 3, 10, colors.memoryCyan)
    fillRect(image, 27 + torso + dirX, 38 + bob, 12, 2, colors.goldAccent)
  end

  fillRect(image, 25 + (pose.leftStep or 0) + dirX, 55, 7, 2, colors.memoryCyan)
  fillRect(image, 36 + (pose.rightStep or 0) + dirX, 55, 7, 2, colors.memoryCyan)

  if (pose.profile or 0) >= 1 then
    fillRect(image, 26 + dirX, 21 + bob, 2, 2, colors.cyanDim)
  end

  if pose.slash ~= nil and pose.slash > 0 then
    drawWeaponLine(image, pose, 32, 21 + pose.slash * 4, 58, 15 + pose.slash * 7, colors.memoryCyan, 1)
    drawWeaponLine(image, pose, 38, 17 + pose.slash * 5, 61, 20 + pose.slash * 8, colors.cyanDim, 1)
  end

  if pose.glow ~= nil and pose.glow > 0 then
    local gx = (pose.weaponSide or 1) < 0 and 16 + dirX or 48 + dirX
    local gy = 7 + bob
    drawPlus(image, gx, gy, colors.memoryCyan)
    if pose.glow >= 2 then
      drawPlus(image, gx - 6, gy + 8, colors.magic)
      drawPlus(image, gx + 5, gy + 10, colors.cyanDim)
    end
    if pose.glow >= 3 then
      fillRect(image, gx - 5, 2, 11, 2, colors.magic)
      fillRect(image, gx - 6, 13, 13, 1, colors.memoryCyan)
    end
    if pose.glow >= 4 then
      drawLine(image, gx - 9, 18, gx + 7, 18, colors.magic, 1)
    end
  end

  if pose.hit ~= nil and pose.hit > 0 then
    fillRect(image, 18 + dirX, 20, 4, 2, colors.hitRed)
    fillRect(image, 15 + dirX, 25, 5, 2, colors.hitRed)
    fillRect(image, 20 + dirX, 18, 2, 4, colors.goldAccent)
  end

  -- Ready stance: a focused cyan glint at the blade-side with a steady chest spark.
  if (pose.ready or 0) > 0 then
    local rx = (pose.weaponSide or 1) < 0 and 16 + dirX or 48 + dirX
    drawPlus(image, rx, 20 + bob, colors.memoryCyan)
    fillRect(image, 30 + dirX, 33 + bob, 4, 2, colors.goldAccent)
  end

  -- Victory: a rising sparkle/celebration burst scaling with pose.vic.
  if (pose.vic or 0) > 0 then
    local vy = 10 - pose.vic * 2 + bob
    drawPlus(image, 32 + dirX, vy, colors.goldAccent)
    drawPlus(image, 24 + dirX, vy + 6, colors.memoryCyan)
    drawPlus(image, 40 + dirX, vy + 6, colors.magic)
    if pose.vic >= 2 then
      fillRect(image, 27 + dirX, vy - 3, 11, 2, colors.goldAccent)
      drawPlus(image, 18 + dirX, vy + 12, colors.cyanDim)
      drawPlus(image, 46 + dirX, vy + 12, colors.cyanDim)
    end
    if pose.vic >= 3 then
      fillRect(image, 30 + dirX, vy - 6, 5, 2, colors.memoryCyan)
      fillRect(image, 22 + dirX, vy + 2, 21, 1, colors.magic)
    end
  end
end

local function drawReference(image, poseIndex, directionIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 31, 58, 3, 3, colors.goldAccent)

  if poseIndex == 1 or poseIndex == 5 or poseIndex == 11 or poseIndex == 17 or poseIndex == 22 or poseIndex == 25 then
    fillRect(image, 2, 2, 8, 2, colors.memoryCyan)
  end
  fillRect(image, 2 + directionIndex * 3, 6, 2, 2, colors.goldAccent)
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
    drawWeapon(weaponImage, pose)
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
