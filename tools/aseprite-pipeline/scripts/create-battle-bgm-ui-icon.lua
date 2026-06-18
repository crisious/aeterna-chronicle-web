local outputPath = app.params["output"]
local mode = app.params["mode"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if mode ~= "playing" and mode ~= "missing" then
  error("mode must be playing or missing")
end

local SIZE = 32
local colors = {
  transparent = Color { r = 0, g = 0, b = 0, a = 0 },
  ink = Color { r = 4, g = 7, b = 16, a = 255 },
  panel = Color { r = 15, g = 24, b = 39, a = 244 },
  panelLight = Color { r = 32, g = 48, b = 73, a = 245 },
  cyan = Color { r = 93, g = 211, b = 255, a = 255 },
  cyanDark = Color { r = 31, g = 124, b = 179, a = 255 },
  gold = Color { r = 255, g = 211, b = 92, a = 255 },
  white = Color { r = 235, g = 248, b = 255, a = 255 },
  red = Color { r = 247, g = 74, b = 89, a = 255 },
  redDark = Color { r = 130, g = 28, b = 42, a = 255 },
}

local sprite = Sprite(SIZE, SIZE, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, SIZE, SIZE)
end)

local layer = sprite.layers[1]
layer.name = "battleBgmUiIcon"

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

local function drawBase(accent)
  fillEllipse(16, 16, 15, 15, colors.ink)
  fillEllipse(16, 16, 13, 13, colors.panel)
  fillEllipse(16, 16, 10, 10, colors.panelLight)
  drawLine(8, 24, 24, 8, 2, accent)
end

local function drawNote(accent)
  fillRect(17, 7, 4, 15, colors.ink)
  fillRect(20, 7, 7, 3, colors.ink)
  fillRect(19, 10, 5, 2, colors.ink)
  fillEllipse(13, 22, 6, 4, colors.ink)
  fillRect(18, 8, 2, 14, accent)
  fillRect(20, 8, 6, 1, colors.gold)
  fillRect(20, 10, 4, 1, colors.cyan)
  fillEllipse(13, 22, 4, 3, accent)
  fillPixel(12, 20, colors.white)
end

local function drawMissingSlash()
  drawLine(8, 25, 25, 8, 5, colors.ink)
  drawLine(8, 25, 25, 8, 3, colors.red)
  drawLine(10, 25, 25, 10, 1, colors.redDark)
end

if mode == "playing" then
  drawBase(colors.cyanDark)
  drawNote(colors.cyan)
else
  drawBase(colors.redDark)
  drawNote(colors.cyanDark)
  drawMissingSlash()
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
