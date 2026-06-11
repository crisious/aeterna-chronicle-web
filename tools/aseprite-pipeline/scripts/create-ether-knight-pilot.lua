local outputPath = app.params["output"]
local palettePath = app.params["palette"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local FRAME_SIZE = 64
local FRAME_COUNT = 10
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

local colors = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 13, g = 13, b = 26, a = 128 },
  deepNavy = Color { r = 26, g = 26, b = 46, a = 255 },
  memoryCyan = Color { r = 137, g = 207, b = 240, a = 255 },
  silver = Color { r = 192, g = 192, b = 192, a = 255 },
  steel = Color { r = 113, g = 121, b = 126, a = 255 },
  goldAccent = Color { r = 255, g = 215, b = 0, a = 255 },
  reference = Color { r = 255, g = 215, b = 0, a = 96 },
}

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

local function drawShadow(image, baseX)
  fillRect(image, baseX + 20, 58, 24, 2, colors.shadow)
  fillRect(image, baseX + 24, 60, 16, 1, colors.shadow)
end

local function drawBody(image, baseX, bob, leftStep, rightStep)
  fillRect(image, baseX + 24, 13 + bob, 16, 14, colors.outline)
  fillRect(image, baseX + 22, 26 + bob, 20, 23, colors.outline)
  fillRect(image, baseX + 18, 29 + bob, 7, 14, colors.outline)
  fillRect(image, baseX + 40, 29 + bob, 7, 14, colors.outline)
  fillRect(image, baseX + 22 + leftStep, 47, 8, 12, colors.outline)
  fillRect(image, baseX + 35 + rightStep, 47, 8, 12, colors.outline)
  fillRect(image, baseX + 26, 16 + bob, 12, 9, colors.deepNavy)
  fillRect(image, baseX + 25, 29 + bob, 14, 18, colors.deepNavy)
  fillRect(image, baseX + 21, 32 + bob, 3, 9, colors.deepNavy)
  fillRect(image, baseX + 42, 32 + bob, 3, 9, colors.deepNavy)
  fillRect(image, baseX + 25 + leftStep, 49, 3, 8, colors.deepNavy)
  fillRect(image, baseX + 38 + rightStep, 49, 3, 8, colors.deepNavy)
end

local function drawArmor(image, baseX, bob)
  fillRect(image, baseX + 25, 14 + bob, 14, 4, colors.steel)
  fillRect(image, baseX + 27, 18 + bob, 10, 7, colors.silver)
  fillRect(image, baseX + 24, 27 + bob, 17, 5, colors.steel)
  fillRect(image, baseX + 25, 32 + bob, 15, 10, colors.silver)
  fillRect(image, baseX + 27, 42 + bob, 11, 5, colors.steel)
  fillRect(image, baseX + 19, 30 + bob, 5, 5, colors.steel)
  fillRect(image, baseX + 41, 30 + bob, 5, 5, colors.steel)
end

local function drawWeapon(image, baseX, bob, tilt)
  local swordX = baseX + 48 + tilt
  fillRect(image, swordX - 2, 16 + bob, 5, 31, colors.outline)
  fillRect(image, swordX - 1, 18 + bob, 3, 27, colors.silver)
  fillRect(image, swordX - 5, 43 + bob, 11, 4, colors.outline)
  fillRect(image, swordX - 3, 43 + bob, 7, 2, colors.goldAccent)
  fillRect(image, swordX - 1, 47 + bob, 3, 7, colors.outline)
  fillRect(image, swordX, 48 + bob, 1, 5, colors.goldAccent)
end

local function drawAccent(image, baseX, bob)
  fillRect(image, baseX + 29, 20 + bob, 6, 2, colors.memoryCyan)
  fillRect(image, baseX + 31, 31 + bob, 3, 10, colors.memoryCyan)
  fillRect(image, baseX + 26, 38 + bob, 13, 2, colors.goldAccent)
  fillRect(image, baseX + 24, 55, 8, 2, colors.memoryCyan)
  fillRect(image, baseX + 35, 55, 8, 2, colors.memoryCyan)
end

local function drawReference(image, baseX, frameIndex)
  fillRect(image, baseX, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, baseX + FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, baseX, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, baseX, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  fillRect(image, baseX + 31, 58, 3, 3, colors.goldAccent)

  if frameIndex == 0 or frameIndex == 4 then
    fillRect(image, baseX + 2, 2, 8, 2, colors.memoryCyan)
  end
end

local function readPose(slotIndex)
  if slotIndex < 4 then
    local idleBob = ({ 0, -1, 0, 1 })[slotIndex + 1]
    return idleBob, 0, 0, 0
  end

  local walkFrame = slotIndex - 4
  local bob = ({ 0, -1, 0, 1, 0, -1 })[walkFrame + 1]
  local leftStep = ({ -2, -1, 0, 1, 2, 0 })[walkFrame + 1]
  local rightStep = ({ 2, 1, 0, -1, -2, 0 })[walkFrame + 1]
  local swordTilt = ({ 0, 1, 1, 0, -1, -1 })[walkFrame + 1]

  return bob, leftStep, rightStep, swordTilt
end

for frameNumber = 1, FRAME_COUNT do
  local shadowImage = newImage()
  local bodyImage = newImage()
  local armorImage = newImage()
  local weaponImage = newImage()
  local accentImage = newImage()
  local referenceImage = newImage()
  local slotIndex = frameNumber - 1
  local bob, leftStep, rightStep, swordTilt = readPose(slotIndex)

  drawShadow(shadowImage, 0)
  drawBody(bodyImage, 0, bob, leftStep, rightStep)
  drawArmor(armorImage, 0, bob)
  drawWeapon(weaponImage, 0, bob, swordTilt)
  drawAccent(accentImage, 0, bob)
  drawReference(referenceImage, 0, slotIndex)

  local frame = sprite.frames[frameNumber]
  sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
  sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
  sprite:newCel(armorLayer, frame, armorImage, Point(0, 0))
  sprite:newCel(weaponLayer, frame, weaponImage, Point(0, 0))
  sprite:newCel(accentLayer, frame, accentImage, Point(0, 0))
  sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
end

local idleTag = sprite:newTag(sprite.frames[1], sprite.frames[4])
idleTag.name = "idle_D"
idleTag.color = colors.memoryCyan

local walkTag = sprite:newTag(sprite.frames[5], sprite.frames[10])
walkTag.name = "walk_D"
walkTag.color = colors.goldAccent

app.command.SaveFileAs { filename = outputPath }
