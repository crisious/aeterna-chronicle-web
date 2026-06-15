local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local monsterKey = app.params["monster"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if monsterKey == nil or monsterKey == "" then
  error("Missing required --script-param monster=<fog_rat|memory_beetle>")
end

local FRAME_SIZE = 64
local FRAME_COUNT = 12
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

local baseColors = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 8, g = 9, b = 18, a = 115 },
  reference = Color { r = 255, g = 0, b = 255, a = 90 },
  hit = Color { r = 255, g = 106, b = 142, a = 245 },
}

local variants = {
  fog_rat = {
    kind = "rat",
    bodyDark = Color { r = 24, g = 31, b = 42, a = 245 },
    body = Color { r = 54, g = 69, b = 83, a = 245 },
    bodyLight = Color { r = 105, g = 135, b = 145, a = 245 },
    accent = Color { r = 76, g = 226, b = 218, a = 245 },
    accentLight = Color { r = 181, g = 255, b = 239, a = 245 },
    eye = Color { r = 255, g = 204, b = 80, a = 245 },
    danger = Color { r = 224, g = 72, b = 105, a = 245 },
  },
  memory_beetle = {
    kind = "beetle",
    bodyDark = Color { r = 31, g = 26, b = 60, a = 245 },
    body = Color { r = 74, g = 53, b = 125, a = 245 },
    bodyLight = Color { r = 150, g = 93, b = 210, a = 245 },
    accent = Color { r = 78, g = 230, b = 218, a = 245 },
    accentLight = Color { r = 186, g = 255, b = 238, a = 245 },
    eye = Color { r = 255, g = 204, b = 80, a = 245 },
    danger = Color { r = 255, g = 106, b = 142, a = 245 },
  },
}

local variant = variants[monsterKey]
if variant == nil then
  error("Unknown monster: " .. monsterKey)
end

local colors = {}
for key, value in pairs(baseColors) do
  colors[key] = value
end
for key, value in pairs(variant) do
  colors[key] = value
end

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

local accentLayer = sprite:newLayer()
accentLayer.name = "accent"

local effectLayer = sprite:newLayer()
effectLayer.name = "effects"

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

local function fillDiamond(image, cx, cy, radius, color)
  for dy = -radius, radius do
    local width = radius - math.abs(dy)
    fillRect(image, cx - width, cy + dy, width * 2 + 1, 1, color)
  end
end

local function fillEllipse(image, cx, cy, rx, ry, color)
  for y = -ry, ry do
    for x = -rx, rx do
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry)) <= 1 then
        fillPixel(image, cx + x, cy + y, color)
      end
    end
  end
end

local poses = {
  { motion = "idle", bob = 0, spread = 0, lunge = 0, wing = 0 },
  { motion = "idle", bob = -1, spread = 1, lunge = 0, wing = 1 },
  { motion = "idle", bob = 0, spread = 0, lunge = 0, wing = 0 },
  { motion = "idle", bob = 1, spread = -1, lunge = 0, wing = -1 },
  { motion = "attack", bob = -1, spread = 2, lunge = 2, wing = 2, strike = 1 },
  { motion = "attack", bob = -2, spread = 4, lunge = 5, wing = 4, strike = 2 },
  { motion = "attack", bob = -1, spread = 3, lunge = 4, wing = 3, strike = 3 },
  { motion = "attack", bob = 0, spread = 1, lunge = 1, wing = 1, strike = 1 },
  { motion = "hit", bob = 1, spread = 2, lunge = -1, wing = 1, flash = 1 },
  { motion = "hit", bob = 0, spread = -1, lunge = 0, wing = -1, flash = 2 },
  { motion = "death", bob = 3, spread = 4, lunge = -2, wing = -2, fade = 1 },
  { motion = "death", bob = 5, spread = 7, lunge = -3, wing = -3, fade = 2 },
}

local function drawShadow(image, pose)
  local spread = pose.spread or 0
  if variant.kind == "rat" then
    fillRect(image, 14 - spread, 55, 36 + spread * 2, 3, colors.shadow)
    fillRect(image, 20 - spread, 58, 22 + spread * 2, 1, colors.shadow)
    return
  end

  fillRect(image, 18 - spread, 56, 28 + spread * 2, 2, colors.shadow)
  fillRect(image, 24 - spread, 58, 16 + spread * 2, 1, colors.shadow)
end

local function drawRat(image, pose)
  local bob = pose.bob or 0
  local spread = pose.spread or 0
  local lunge = pose.lunge or 0
  local fade = pose.fade or 0
  local bodyColor = pose.flash and colors.hit or colors.body
  local lightColor = pose.flash and colors.accentLight or colors.bodyLight

  if fade < 2 then
    fillRect(image, 15 + lunge - spread, 40 + bob, 9 + spread, 2, colors.outline)
    fillRect(image, 12 + lunge - spread, 38 + bob, 7, 2, colors.bodyDark)
    fillRect(image, 10 + lunge - spread, 36 + bob, 5, 2, colors.accent)

    fillEllipse(image, 31 + lunge, 39 + bob, 18, 10, colors.outline)
    fillEllipse(image, 31 + lunge, 39 + bob, 16, 8, colors.bodyDark)
    fillEllipse(image, 33 + lunge, 37 + bob, 12, 6, bodyColor)
    fillEllipse(image, 24 + lunge, 35 + bob, 5, 3, lightColor)

    fillEllipse(image, 46 + lunge, 35 + bob, 9, 8, colors.outline)
    fillEllipse(image, 46 + lunge, 35 + bob, 7, 6, bodyColor)
    fillDiamond(image, 42 + lunge, 27 + bob, 4, colors.outline)
    fillDiamond(image, 42 + lunge, 28 + bob, 2, colors.bodyLight)
    fillDiamond(image, 51 + lunge, 27 + bob, 4, colors.outline)
    fillDiamond(image, 51 + lunge, 28 + bob, 2, colors.bodyLight)
    fillRect(image, 52 + lunge, 36 + bob, 5, 3, colors.outline)
    fillRect(image, 53 + lunge, 36 + bob, 3, 2, colors.bodyLight)
    fillPixel(image, 49 + lunge, 33 + bob, colors.eye)
    fillPixel(image, 50 + lunge, 33 + bob, colors.eye)
  end

  fillRect(image, 23 + lunge, 48 + bob, 4, 4, colors.outline)
  fillRect(image, 36 + lunge, 48 + bob, 4, 4, colors.outline)
  fillRect(image, 24 + lunge, 49 + bob, 3, 3, colors.bodyDark)
  fillRect(image, 37 + lunge, 49 + bob, 3, 3, colors.bodyDark)

  if pose.strike then
    fillRect(image, 55 + lunge, 33 + bob, 6 + pose.strike * 2, 1, colors.accentLight)
    fillRect(image, 56 + lunge, 37 + bob, 5 + pose.strike, 1, colors.accent)
    fillPixel(image, 61, 35 + bob, colors.danger)
  end
end

local function drawBeetle(image, pose)
  local bob = pose.bob or 0
  local spread = pose.spread or 0
  local wing = pose.wing or 0
  local lunge = pose.lunge or 0
  local fade = pose.fade or 0
  local bodyColor = pose.flash and colors.hit or colors.body
  local lightColor = pose.flash and colors.accentLight or colors.bodyLight

  fillEllipse(image, 20 - spread, 35 + bob - wing, 10 + math.max(wing, 0), 7, colors.outline)
  fillEllipse(image, 44 + spread, 35 + bob - wing, 10 + math.max(wing, 0), 7, colors.outline)
  fillEllipse(image, 20 - spread, 35 + bob - wing, 8 + math.max(wing, 0), 5, colors.bodyDark)
  fillEllipse(image, 44 + spread, 35 + bob - wing, 8 + math.max(wing, 0), 5, colors.bodyDark)
  fillPixel(image, 17 - spread, 32 + bob - wing, colors.accent)
  fillPixel(image, 47 + spread, 32 + bob - wing, colors.accent)

  if fade < 2 then
    fillEllipse(image, 32 + lunge, 37 + bob, 13, 15, colors.outline)
    fillEllipse(image, 32 + lunge, 37 + bob, 11, 13, colors.bodyDark)
    fillEllipse(image, 32 + lunge, 35 + bob, 9, 10, bodyColor)
    fillRect(image, 31 + lunge, 24 + bob, 3, 21, colors.outline)
    fillRect(image, 32 + lunge, 25 + bob, 1, 18, lightColor)
    fillDiamond(image, 32 + lunge, 30 + bob, 4, colors.accent)

    fillEllipse(image, 42 + lunge, 36 + bob, 8, 7, colors.outline)
    fillEllipse(image, 42 + lunge, 36 + bob, 6, 5, bodyColor)
    fillPixel(image, 44 + lunge, 34 + bob, colors.eye)
    fillPixel(image, 45 + lunge, 34 + bob, colors.eye)
    fillRect(image, 48 + lunge, 36 + bob, 5, 2, colors.outline)
    fillRect(image, 49 + lunge, 36 + bob, 3, 1, colors.accentLight)
  end

  fillRect(image, 20 + lunge, 48 + bob, 5, 2, colors.outline)
  fillRect(image, 28 + lunge, 50 + bob, 4, 2, colors.outline)
  fillRect(image, 39 + lunge, 48 + bob, 5, 2, colors.outline)
  fillRect(image, 19 + lunge, 49 + bob, 4, 1, colors.accent)
  fillRect(image, 40 + lunge, 49 + bob, 4, 1, colors.accent)

  if pose.strike then
    fillRect(image, 52 + lunge, 33 + bob, 6 + pose.strike * 2, 2, colors.accentLight)
    fillRect(image, 53 + lunge, 37 + bob, 5 + pose.strike, 1, colors.accent)
    fillPixel(image, 61, 32 + bob, colors.danger)
  end
end

local function drawAccent(image, pose)
  local bob = pose.bob or 0
  local spread = pose.spread or 0

  fillDiamond(image, 18 - spread, 23 + bob, 2, colors.accent)
  fillDiamond(image, 50 + spread, 22 + bob, 2, colors.accentLight)
  fillPixel(image, 24 - spread, 53 + bob, colors.eye)
  fillPixel(image, 40 + spread, 53 + bob, colors.accent)

  if pose.flash then
    fillRect(image, 22, 27 + bob, 20, 2, colors.hit)
    fillRect(image, 24, 45 + bob, 16, 2, colors.hit)
  end

  if pose.fade then
    fillPixel(image, 14 - spread, 50 + bob, colors.accentLight)
    fillPixel(image, 50 + spread, 52 + bob, colors.accent)
    fillPixel(image, 32, 56 + bob, colors.eye)
  end
end

local function drawReference(image, frameIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  if frameIndex == 0 or frameIndex == 4 or frameIndex == 8 or frameIndex == 10 then
    fillRect(image, 2, 2, 8, 2, colors.accent)
  end
end

for frameNumber = 1, FRAME_COUNT do
  local shadowImage = newImage()
  local bodyImage = newImage()
  local accentImage = newImage()
  local effectImage = newImage()
  local referenceImage = newImage()
  local pose = poses[frameNumber]

  drawShadow(shadowImage, pose)
  if variant.kind == "rat" then
    drawRat(bodyImage, pose)
  else
    drawBeetle(bodyImage, pose)
  end
  drawAccent(accentImage, pose)
  drawReference(referenceImage, frameNumber - 1)

  local frame = sprite.frames[frameNumber]
  sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
  sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
  sprite:newCel(accentLayer, frame, accentImage, Point(0, 0))
  sprite:newCel(effectLayer, frame, effectImage, Point(0, 0))
  sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
end

local function addTag(name, fromFrame, toFrame, color)
  local tag = sprite:newTag(sprite.frames[fromFrame], sprite.frames[toFrame])
  tag.name = name
  tag.color = color
end

addTag("idle", 1, 4, colors.accent)
addTag("attack", 5, 8, colors.eye)
addTag("hit", 9, 10, colors.hit)
addTag("death", 11, 12, colors.bodyLight)

app.command.SaveFileAs { filename = outputPath }
