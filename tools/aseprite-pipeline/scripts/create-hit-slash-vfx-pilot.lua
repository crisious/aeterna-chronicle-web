local outputPath = app.params["output"]
local palettePath = app.params["palette"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local FRAME_SIZE = 64
local FRAME_COUNT = 8
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

local colors = {
  white = Color { r = 245, g = 247, b = 255, a = 235 },
  core = Color { r = 189, g = 238, b = 255, a = 235 },
  cyan = Color { r = 97, g = 232, b = 215, a = 220 },
  blue = Color { r = 91, g = 144, b = 245, a = 190 },
  gold = Color { r = 255, g = 204, b = 80, a = 210 },
  shadow = Color { r = 40, g = 52, b = 92, a = 105 },
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

local slashLayer = sprite.layers[1]
slashLayer.name = "slash"

local glowLayer = sprite:newLayer()
glowLayer.name = "glow"

local particleLayer = sprite:newLayer()
particleLayer.name = "particles"

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

local function drawSlash(image, frameIndex, color, thickness, offset)
  local grow = math.min(frameIndex, 4)
  local shrink = math.max(0, frameIndex - 5)
  local x0 = 17 - grow + shrink * 2
  local y0 = 45 - grow
  local x1 = 46 + grow - shrink * 3
  local y1 = 17 + grow
  drawLine(image, x0 + offset, y0, x1 + offset, y1, color, thickness)
end

local function drawParticles(image, frameIndex)
  local spread = frameIndex * 2
  fillPixel(image, 23 - spread, 39 + math.floor(frameIndex / 2), colors.gold)
  fillPixel(image, 45 + spread, 23 - math.floor(frameIndex / 2), colors.cyan)
  fillPixel(image, 33 + math.floor(spread / 2), 13 - frameIndex, colors.white)
  fillPixel(image, 29 - math.floor(spread / 2), 51 + frameIndex, colors.core)
  if frameIndex >= 3 then
    fillPixel(image, 50 + frameIndex, 29, colors.blue)
    fillPixel(image, 15 - frameIndex, 35, colors.gold)
  end
end

local function drawReference(image, frameIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  if frameIndex == 0 or frameIndex == 2 or frameIndex == 6 then
    fillRect(image, 2, 2, 8, 2, colors.cyan)
  end
end

for frameNumber = 1, FRAME_COUNT do
  local frameIndex = frameNumber - 1
  local slashImage = newImage()
  local glowImage = newImage()
  local particleImage = newImage()
  local referenceImage = newImage()

  if frameIndex < 7 then
    drawSlash(glowImage, frameIndex, colors.shadow, 5, 1)
    drawSlash(glowImage, frameIndex, colors.blue, 3, 0)
    drawSlash(slashImage, frameIndex, colors.core, 3, 0)
    drawSlash(slashImage, frameIndex, colors.white, 1, 0)
  end
  drawParticles(particleImage, frameIndex)
  drawReference(referenceImage, frameIndex)

  local frame = sprite.frames[frameNumber]
  sprite:newCel(glowLayer, frame, glowImage, Point(0, 0))
  sprite:newCel(slashLayer, frame, slashImage, Point(0, 0))
  sprite:newCel(particleLayer, frame, particleImage, Point(0, 0))
  sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
end

local function addTag(name, fromFrame, toFrame, color)
  local tag = sprite:newTag(sprite.frames[fromFrame], sprite.frames[toFrame])
  tag.name = name
  tag.color = color
end

addTag("start", 1, 2, colors.core)
addTag("loop", 3, 6, colors.cyan)
addTag("end", 7, 8, colors.gold)

app.command.SaveFileAs { filename = outputPath }
