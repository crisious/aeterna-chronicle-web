local outputPath = app.params["output"]
local mode = app.params["mode"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if mode ~= nil and mode ~= "" and mode ~= "chat_system" then
  error("mode must be chat_system when provided")
end

local SIZE = 32
local colors = {
  ink = Color { r = 5, g = 8, b = 18, a = 255 },
  shadow = Color { r = 18, g = 24, b = 42, a = 255 },
  panel = Color { r = 34, g = 43, b = 72, a = 250 },
  panelLight = Color { r = 61, g = 75, b = 111, a = 245 },
  cyan = Color { r = 91, g = 216, b = 255, a = 255 },
  cyanDark = Color { r = 27, g = 122, b = 175, a = 255 },
  gold = Color { r = 255, g = 207, b = 82, a = 255 },
  white = Color { r = 236, g = 249, b = 255, a = 255 },
}

local sprite = Sprite(SIZE, SIZE, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, SIZE, SIZE)
end)

local layer = sprite.layers[1]
layer.name = "chatSystemUiIcon"

local image = Image(SIZE, SIZE, ColorMode.RGB)
image:clear()

local function fillPixel(x, y, color)
  if x >= 0 and x < SIZE and y >= 0 and y < SIZE then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  for py = y, y + h - 1 do
    for px = x, x + w - 1 do
      fillPixel(px, py, color)
    end
  end
end

local function fillEllipse(cx, cy, rx, ry, color)
  for y = -ry, ry do
    for x = -rx, rx do
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry)) <= 1 then
        fillPixel(cx + x, cy + y, color)
      end
    end
  end
end

local function drawLine(x0, y0, x1, y1, thickness, color)
  local dx = math.abs(x1 - x0)
  local sx = x0 < x1 and 1 or -1
  local dy = -math.abs(y1 - y0)
  local sy = y0 < y1 and 1 or -1
  local err = dx + dy

  while true do
    fillRect(x0 - math.floor(thickness / 2), y0 - math.floor(thickness / 2), thickness, thickness, color)
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

local function drawBubble()
  fillEllipse(16, 16, 15, 13, colors.ink)
  fillEllipse(16, 15, 13, 10, colors.panel)
  fillEllipse(16, 15, 10, 7, colors.panelLight)
  fillRect(11, 24, 6, 3, colors.ink)
  drawLine(14, 24, 10, 28, 2, colors.ink)
  drawLine(14, 24, 10, 27, 1, colors.panel)
  fillRect(8, 8, 16, 2, colors.cyan)
  fillPixel(9, 10, colors.white)
end

local function drawSystemMark()
  fillEllipse(22, 20, 6, 6, colors.ink)
  fillEllipse(22, 20, 4, 4, colors.gold)
  fillRect(21, 16, 2, 6, colors.ink)
  fillRect(21, 16, 2, 4, colors.white)
  fillRect(21, 23, 2, 2, colors.ink)
  fillPixel(21, 23, colors.white)
  fillPixel(22, 23, colors.white)
end

drawBubble()
drawLine(10, 14, 20, 14, 1, colors.white)
drawLine(10, 18, 17, 18, 1, colors.cyan)
drawLine(10, 21, 15, 21, 1, colors.cyanDark)
drawSystemMark()

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
