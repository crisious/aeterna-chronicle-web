local outputPath = app.params["output"]
local palettePath = app.params["palette"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local FRAME_SIZE = 64
local FRAME_COUNT = 12
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

local colors = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 8, g = 9, b = 18, a = 115 },
  coreDark = Color { r = 41, g = 31, b = 64, a = 245 },
  core = Color { r = 83, g = 67, b = 130, a = 245 },
  coreLight = Color { r = 154, g = 110, b = 218, a = 245 },
  memory = Color { r = 96, g = 229, b = 222, a = 245 },
  memoryLight = Color { r = 186, g = 255, b = 235, a = 245 },
  gold = Color { r = 255, g = 204, b = 80, a = 245 },
  hit = Color { r = 255, g = 106, b = 142, a = 245 },
  reference = Color { r = 255, g = 0, b = 255, a = 90 },
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

local particleLayer = sprite:newLayer()
particleLayer.name = "particles"

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
  { motion = "idle", bob = 0, spread = 0, pulse = 0 },
  { motion = "idle", bob = -1, spread = 1, pulse = 1 },
  { motion = "idle", bob = 0, spread = 0, pulse = 0 },
  { motion = "idle", bob = 1, spread = -1, pulse = -1 },
  { motion = "attack", bob = -2, spread = 3, pulse = 2, lance = 1 },
  { motion = "attack", bob = -3, spread = 5, pulse = 3, lance = 2 },
  { motion = "attack", bob = -1, spread = 4, pulse = 2, lance = 3 },
  { motion = "attack", bob = 0, spread = 2, pulse = 1, lance = 1 },
  { motion = "hit", bob = 1, spread = 2, pulse = 0, flash = 1 },
  { motion = "hit", bob = 0, spread = -1, pulse = -1, flash = 2 },
  { motion = "death", bob = 2, spread = 6, pulse = -2, fade = 1 },
  { motion = "death", bob = 4, spread = 9, pulse = -4, fade = 2 },
}

local function drawShadow(image, pose)
  local spread = pose.spread or 0
  fillRect(image, 22 - spread, 57, 20 + spread * 2, 2, colors.shadow)
  fillRect(image, 26 - spread, 59, 12 + spread * 2, 1, colors.shadow)
end

local function drawCore(image, pose)
  local bob = pose.bob or 0
  local spread = pose.spread or 0
  local pulse = pose.pulse or 0
  local fade = pose.fade or 0
  local colorCore = pose.flash and colors.hit or colors.core
  local colorLight = pose.flash and colors.memoryLight or colors.coreLight

  if fade < 2 then
    fillEllipse(image, 32, 34 + bob, 12 + pulse, 11 + pulse, colors.outline)
    fillEllipse(image, 32, 34 + bob, 10 + pulse, 9 + pulse, colors.coreDark)
    fillEllipse(image, 31, 32 + bob, 8 + pulse, 6 + pulse, colorCore)
    fillEllipse(image, 29, 29 + bob, 4 + pulse, 3 + pulse, colorLight)
  end

  fillDiamond(image, 19 - spread, 29 + bob, 5, colors.outline)
  fillDiamond(image, 19 - spread, 29 + bob, 3, colors.memory)
  fillDiamond(image, 45 + spread, 28 + bob, 5, colors.outline)
  fillDiamond(image, 45 + spread, 28 + bob, 3, colors.memoryLight)
  fillDiamond(image, 25 - math.floor(spread / 2), 45 + bob, 4, colors.outline)
  fillDiamond(image, 25 - math.floor(spread / 2), 45 + bob, 2, colors.gold)
  fillDiamond(image, 40 + math.floor(spread / 2), 45 + bob, 4, colors.outline)
  fillDiamond(image, 40 + math.floor(spread / 2), 45 + bob, 2, colors.coreLight)
end

local function drawParticles(image, pose)
  local bob = pose.bob or 0
  local spread = pose.spread or 0
  local lance = pose.lance or 0
  local fade = pose.fade or 0

  fillPixel(image, 16 - spread, 21 + bob, colors.memoryLight)
  fillPixel(image, 48 + spread, 20 + bob, colors.memory)
  fillPixel(image, 14 - spread, 39 + bob, colors.gold)
  fillPixel(image, 52 + spread, 39 + bob, colors.coreLight)
  fillPixel(image, 31, 17 + bob - spread, colors.memoryLight)
  fillPixel(image, 33, 51 + bob + spread, colors.memory)

  if lance > 0 then
    fillRect(image, 50 + lance, 31 + bob, 8 + lance * 3, 2, colors.memoryLight)
    fillRect(image, 51 + lance, 34 + bob, 6 + lance * 2, 1, colors.memory)
    fillPixel(image, 60, 30 + bob, colors.gold)
    fillPixel(image, 61, 35 + bob, colors.gold)
  end

  if fade > 0 then
    fillPixel(image, 20 - spread, 51 + bob, colors.coreLight)
    fillPixel(image, 45 + spread, 53 + bob, colors.memory)
    fillPixel(image, 32, 55 + bob, colors.gold)
  end
end

local function drawAccent(image, pose)
  local bob = pose.bob or 0
  local pulse = pose.pulse or 0
  local flash = pose.flash or 0

  fillRect(image, 28 - pulse, 35 + bob, 8 + pulse * 2, 1, colors.memoryLight)
  fillPixel(image, 30, 31 + bob, colors.gold)
  fillPixel(image, 35, 31 + bob, colors.memoryLight)

  if flash > 0 then
    fillRect(image, 24, 25 + bob, 16, 2, colors.hit)
    fillRect(image, 24, 43 + bob, 16, 2, colors.hit)
  end
end

local function drawReference(image, frameIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  if frameIndex == 0 or frameIndex == 4 or frameIndex == 8 or frameIndex == 10 then
    fillRect(image, 2, 2, 8, 2, colors.memory)
  end
end

for frameNumber = 1, FRAME_COUNT do
  local shadowImage = newImage()
  local bodyImage = newImage()
  local particleImage = newImage()
  local accentImage = newImage()
  local referenceImage = newImage()
  local pose = poses[frameNumber]

  drawShadow(shadowImage, pose)
  drawCore(bodyImage, pose)
  drawParticles(particleImage, pose)
  drawAccent(accentImage, pose)
  drawReference(referenceImage, frameNumber - 1)

  local frame = sprite.frames[frameNumber]
  sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
  sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
  sprite:newCel(particleLayer, frame, particleImage, Point(0, 0))
  sprite:newCel(accentLayer, frame, accentImage, Point(0, 0))
  sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
end

local function addTag(name, fromFrame, toFrame, color)
  local tag = sprite:newTag(sprite.frames[fromFrame], sprite.frames[toFrame])
  tag.name = name
  tag.color = color
end

addTag("idle", 1, 4, colors.memory)
addTag("attack", 5, 8, colors.gold)
addTag("hit", 9, 10, colors.hit)
addTag("death", 11, 12, colors.coreLight)

app.command.SaveFileAs { filename = outputPath }
