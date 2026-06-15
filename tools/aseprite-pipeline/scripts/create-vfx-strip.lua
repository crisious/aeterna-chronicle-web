local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local vfxId = app.params["vfx"]
local groupId = app.params["group"] or "common"

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if vfxId == nil or vfxId == "" then
  error("Missing required --script-param vfx=<vfx-id>")
end

local FRAME_SIZE = 64
local FRAME_COUNT = 8

local colors = {
  ink = Color { r = 6, g = 8, b = 18, a = 255 },
  white = Color { r = 246, g = 249, b = 255, a = 238 },
  cyan = Color { r = 76, g = 232, b = 220, a = 226 },
  cyanLight = Color { r = 180, g = 255, b = 247, a = 235 },
  gold = Color { r = 248, g = 198, b = 76, a = 228 },
  orange = Color { r = 239, g = 113, b = 55, a = 220 },
  red = Color { r = 220, g = 59, b = 71, a = 220 },
  green = Color { r = 80, g = 222, b = 132, a = 222 },
  purple = Color { r = 151, g = 92, b = 232, a = 226 },
  purpleLight = Color { r = 212, g = 172, b = 255, a = 235 },
  blue = Color { r = 88, g = 140, b = 245, a = 220 },
  shadow = Color { r = 38, g = 45, b = 91, a = 104 },
  reference = Color { r = 255, g = 0, b = 255, a = 80 },
}

local function hashKey(value)
  local hash = 37
  for i = 1, #value do
    hash = (hash * 47 + string.byte(value, i)) % 2147483647
  end
  return hash
end

local seed = hashKey(groupId .. ":" .. vfxId)
math.randomseed(seed)

local function paletteForGroup()
  if groupId == "ether_knight" then return colors.gold, colors.cyanLight, colors.white end
  if groupId == "memory_weaver" then return colors.cyan, colors.green, colors.white end
  if groupId == "shadow_weaver" then return colors.purple, colors.purpleLight, colors.cyan end
  if groupId == "memory_breaker" then return colors.orange, colors.red, colors.gold end
  if groupId == "time_guardian" then return colors.gold, colors.cyan, colors.white end
  if groupId == "void_wanderer" then return colors.purple, colors.blue, colors.purpleLight end
  return colors.green, colors.cyan, colors.gold
end

local primary, secondary, highlight = paletteForGroup()
local motif = seed % 6

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

local glowLayer = sprite.layers[1]
glowLayer.name = "glow"

local coreLayer = sprite:newLayer()
coreLayer.name = "core"

local particleLayer = sprite:newLayer()
particleLayer.name = "particles"

local referenceLayer = sprite:newLayer()
referenceLayer.name = "reference"
referenceLayer.isVisible = false

local function newImage()
  local image = Image(FRAME_SIZE, FRAME_SIZE, ColorMode.RGB)
  image:clear()
  return image
end

local function fillPixel(image, x, y, color)
  if x >= 0 and x < FRAME_SIZE and y >= 0 and y < FRAME_SIZE then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(image, x, y, w, h, color)
  local x0 = math.max(0, x)
  local y0 = math.max(0, y)
  local x1 = math.min(FRAME_SIZE - 1, x + w - 1)
  local y1 = math.min(FRAME_SIZE - 1, y + h - 1)
  for py = y0, y1 do
    for px = x0, x1 do
      image:drawPixel(px, py, color)
    end
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

local function strokeEllipse(image, cx, cy, rx, ry, thickness, color)
  local outerRx = rx + thickness
  local outerRy = ry + thickness
  local innerRx = math.max(1, rx - thickness)
  local innerRy = math.max(1, ry - thickness)
  for y = -outerRy, outerRy do
    for x = -outerRx, outerRx do
      local outer = ((x * x) / (outerRx * outerRx) + (y * y) / (outerRy * outerRy)) <= 1
      local inner = ((x * x) / (innerRx * innerRx) + (y * y) / (innerRy * innerRy)) <= 1
      if outer and not inner then
        fillPixel(image, cx + x, cy + y, color)
      end
    end
  end
end

local function fillDiamond(image, cx, cy, radius, color)
  for dy = -radius, radius do
    local width = radius - math.abs(dy)
    fillRect(image, cx - width, cy + dy, width * 2 + 1, 1, color)
  end
end

local function drawLine(image, x0, y0, x1, y1, thickness, color)
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

local function fillTriangle(image, x1, y1, x2, y2, x3, y3, color)
  local minY = math.max(0, math.min(y1, y2, y3))
  local maxY = math.min(FRAME_SIZE - 1, math.max(y1, y2, y3))
  for y = minY, maxY do
    local nodes = {}
    local points = {
      { x = x1, y = y1 },
      { x = x2, y = y2 },
      { x = x3, y = y3 },
    }
    for i = 1, 3 do
      local a = points[i]
      local b = points[(i % 3) + 1]
      if (a.y < y and b.y >= y) or (b.y < y and a.y >= y) then
        nodes[#nodes + 1] = math.floor(a.x + (y - a.y) / (b.y - a.y) * (b.x - a.x))
      end
    end
    table.sort(nodes)
    for i = 1, #nodes, 2 do
      if nodes[i + 1] ~= nil then
        fillRect(image, nodes[i], y, nodes[i + 1] - nodes[i] + 1, 1, color)
      end
    end
  end
end

local function drawParticles(image, frameIndex)
  local spread = frameIndex * 3
  local shift = (seed % 9) - 4
  fillDiamond(image, 30 - spread + shift, 20 + frameIndex, 2, highlight)
  fillDiamond(image, 36 + spread - shift, 43 - frameIndex, 2, secondary)
  fillPixel(image, 20 + frameIndex * 2, 15 - math.floor(frameIndex / 2), primary)
  fillPixel(image, 44 - frameIndex * 2, 50 + math.floor(frameIndex / 2), highlight)
  if frameIndex >= 3 then
    fillRect(image, 12 + spread, 31, 3, 3, secondary)
    fillRect(image, 49 - spread, 28, 3, 3, highlight)
  end
end

local function drawReference(image, frameIndex)
  if frameIndex == 0 or frameIndex == 2 or frameIndex == 6 then
    fillRect(image, 1, 1, 6, 1, colors.reference)
  end
end

local function drawSlash(core, glow, frameIndex)
  local grow = math.min(frameIndex, 4)
  local shrink = math.max(0, frameIndex - 5)
  local x0 = 15 - grow + shrink * 2
  local y0 = 46 - grow
  local x1 = 48 + grow - shrink * 3
  local y1 = 17 + grow
  drawLine(glow, x0 + 1, y0, x1 + 1, y1, 7, colors.shadow)
  drawLine(glow, x0, y0, x1, y1, 5, secondary)
  drawLine(core, x0, y0, x1, y1, 3, primary)
  drawLine(core, x0 + 2, y0 - 1, x1 - 2, y1 + 1, 1, highlight)
end

local function drawBurst(core, glow, frameIndex)
  local radius = 5 + frameIndex * 4
  fillEllipse(glow, 32, 32, radius + 5, radius + 2, Color { r = secondary.red, g = secondary.green, b = secondary.blue, a = 90 })
  strokeEllipse(glow, 32, 32, radius + 2, radius + 1, 3, secondary)
  fillDiamond(core, 32, 32, math.max(3, 10 - frameIndex), highlight)
  for i = 0, 5 do
    local angle = (i * 1.047) + frameIndex * 0.18
    local x = 32 + math.floor(math.cos(angle) * radius)
    local y = 32 + math.floor(math.sin(angle) * radius)
    drawLine(core, 32, 32, x, y, 2, primary)
  end
end

local function drawRing(core, glow, frameIndex)
  local rx = 8 + frameIndex * 4
  local ry = 14 + frameIndex * 2
  strokeEllipse(glow, 32, 32, rx + 5, ry + 4, 4, colors.shadow)
  strokeEllipse(glow, 32, 32, rx + 2, ry + 2, 3, secondary)
  strokeEllipse(core, 32, 32, rx, ry, 2, primary)
  drawLine(core, 32 - rx, 32, 32 + rx, 32, 1, highlight)
end

local function drawWave(core, glow, frameIndex)
  local amplitude = 5 + (frameIndex % 4)
  local startX = 5 + frameIndex
  for x = startX, 59, 4 do
    local y = 32 + math.floor(math.sin((x + frameIndex * 5) / 7) * amplitude)
    fillRect(glow, x - 2, y - 4, 5, 9, colors.shadow)
    fillRect(glow, x - 1, y - 3, 3, 7, secondary)
    fillRect(core, x, y - 2, 2, 5, primary)
  end
end

local function drawPillar(core, glow, frameIndex)
  local height = math.min(50, 10 + frameIndex * 8)
  local width = math.max(4, 18 - frameIndex)
  fillEllipse(glow, 32, 55, 18, 5, colors.shadow)
  fillRect(glow, 32 - width, 55 - height, width * 2, height, Color { r = secondary.red, g = secondary.green, b = secondary.blue, a = 90 })
  fillRect(core, 32 - math.floor(width / 2), 55 - height, width, height, primary)
  fillRect(core, 31, 55 - height + 4, 3, math.max(0, height - 8), highlight)
end

local function drawShard(core, glow, frameIndex)
  local top = 14 + math.max(0, frameIndex - 4) * 4
  local bottom = 50 - math.max(0, frameIndex - 5) * 5
  fillTriangle(glow, 17, bottom, 47, bottom, 32, top, colors.shadow)
  fillTriangle(glow, 20, bottom - 2, 44, bottom - 2, 32, top + 3, secondary)
  fillTriangle(core, 24, bottom - 4, 40, bottom - 4, 32, top + 7, primary)
  fillTriangle(core, 31, bottom - 8, 38, bottom - 8, 33, top + 12, highlight)
end

local function drawMotif(core, glow, frameIndex)
  if motif == 0 then
    drawSlash(core, glow, frameIndex)
  elseif motif == 1 then
    drawBurst(core, glow, frameIndex)
  elseif motif == 2 then
    drawRing(core, glow, frameIndex)
  elseif motif == 3 then
    drawWave(core, glow, frameIndex)
  elseif motif == 4 then
    drawPillar(core, glow, frameIndex)
  else
    drawShard(core, glow, frameIndex)
  end
end

for frameNumber = 1, FRAME_COUNT do
  local frameIndex = frameNumber - 1
  local glowImage = newImage()
  local coreImage = newImage()
  local particleImage = newImage()
  local referenceImage = newImage()

  drawMotif(coreImage, glowImage, frameIndex)
  drawParticles(particleImage, frameIndex)
  drawReference(referenceImage, frameIndex)

  local frame = sprite.frames[frameNumber]
  sprite:newCel(glowLayer, frame, glowImage, Point(0, 0))
  sprite:newCel(coreLayer, frame, coreImage, Point(0, 0))
  sprite:newCel(particleLayer, frame, particleImage, Point(0, 0))
  sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
end

local function addTag(name, fromFrame, toFrame, color)
  local tag = sprite:newTag(sprite.frames[fromFrame], sprite.frames[toFrame])
  tag.name = name
  tag.color = color
end

addTag("start", 1, 2, primary)
addTag("loop", 3, 6, secondary)
addTag("end", 7, 8, highlight)

app.command.SaveFileAs { filename = outputPath }
