local outputPath = app.params["output"]
local mode = app.params["mode"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local validModes = {
  settings_title = true,
  settings_sound = true,
  settings_language = true,
  settings_accessibility = true,
  settings_keybind = true,
}

if not validModes[mode] then
  error("mode must be one of settings_title, settings_sound, settings_language, settings_accessibility, settings_keybind")
end

local SIZE = 32
local colors = {
  ink = Color { r = 5, g = 8, b = 18, a = 255 },
  shadow = Color { r = 20, g = 25, b = 43, a = 255 },
  panel = Color { r = 31, g = 39, b = 64, a = 250 },
  panelLight = Color { r = 57, g = 70, b = 104, a = 245 },
  lavender = Color { r = 195, g = 155, b = 255, a = 255 },
  violet = Color { r = 111, g = 76, b = 188, a = 255 },
  cyan = Color { r = 93, g = 211, b = 255, a = 255 },
  cyanDark = Color { r = 31, g = 124, b = 179, a = 255 },
  gold = Color { r = 255, g = 211, b = 92, a = 255 },
  green = Color { r = 111, g = 226, b = 152, a = 255 },
  greenDark = Color { r = 42, g = 137, b = 94, a = 255 },
  white = Color { r = 235, g = 248, b = 255, a = 255 },
}

local sprite = Sprite(SIZE, SIZE, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, SIZE, SIZE)
end)

local layer = sprite.layers[1]
layer.name = "settingsUiIcon"

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

local function drawFrame(accent)
  fillEllipse(16, 16, 15, 15, colors.ink)
  fillEllipse(16, 16, 13, 13, colors.panel)
  fillEllipse(16, 16, 10, 10, colors.panelLight)
  fillRect(7, 6, 18, 2, accent)
  fillPixel(8, 8, colors.white)
end

local function drawGear()
  drawFrame(colors.lavender)
  for _, p in ipairs({
    {15, 5, 3, 5}, {15, 22, 3, 5}, {5, 15, 5, 3}, {22, 15, 5, 3},
    {8, 8, 4, 4}, {20, 8, 4, 4}, {8, 20, 4, 4}, {20, 20, 4, 4},
  }) do
    fillRect(p[1], p[2], p[3], p[4], colors.ink)
  end
  fillEllipse(16, 16, 8, 8, colors.violet)
  fillEllipse(16, 16, 5, 5, colors.lavender)
  fillEllipse(16, 16, 2, 2, colors.panel)
  fillPixel(15, 13, colors.white)
end

local function drawSound()
  drawFrame(colors.cyan)
  fillRect(8, 14, 4, 6, colors.ink)
  fillRect(12, 12, 4, 10, colors.ink)
  fillRect(9, 15, 3, 4, colors.cyan)
  fillRect(12, 13, 2, 8, colors.cyan)
  fillRect(14, 11, 2, 12, colors.cyanDark)
  drawLine(19, 13, 22, 10, 2, colors.ink)
  drawLine(19, 19, 22, 22, 2, colors.ink)
  drawLine(21, 12, 25, 8, 1, colors.cyan)
  drawLine(21, 20, 25, 24, 1, colors.cyan)
  drawLine(23, 15, 25, 13, 1, colors.white)
  drawLine(23, 17, 25, 19, 1, colors.white)
end

local function drawLanguage()
  drawFrame(colors.green)
  fillEllipse(16, 16, 9, 9, colors.ink)
  fillEllipse(16, 16, 7, 7, colors.greenDark)
  fillRect(8, 15, 16, 2, colors.green)
  fillRect(15, 8, 2, 16, colors.green)
  drawLine(10, 12, 22, 12, 1, colors.white)
  drawLine(10, 20, 22, 20, 1, colors.white)
  drawLine(12, 9, 12, 23, 1, colors.cyan)
  drawLine(20, 9, 20, 23, 1, colors.cyan)
end

local function drawAccessibility()
  drawFrame(colors.gold)
  fillEllipse(16, 8, 3, 3, colors.ink)
  fillEllipse(16, 8, 2, 2, colors.gold)
  drawLine(16, 11, 16, 19, 3, colors.ink)
  drawLine(16, 12, 16, 18, 1, colors.gold)
  drawLine(9, 13, 23, 13, 3, colors.ink)
  drawLine(10, 13, 22, 13, 1, colors.gold)
  drawLine(16, 18, 10, 25, 3, colors.ink)
  drawLine(16, 18, 22, 25, 3, colors.ink)
  drawLine(16, 18, 10, 24, 1, colors.gold)
  drawLine(16, 18, 22, 24, 1, colors.gold)
  fillPixel(15, 7, colors.white)
end

local function drawKeybind()
  drawFrame(colors.lavender)
  fillRect(7, 11, 18, 12, colors.ink)
  fillRect(8, 12, 16, 10, colors.shadow)
  fillRect(10, 14, 3, 2, colors.cyan)
  fillRect(15, 14, 3, 2, colors.lavender)
  fillRect(20, 14, 3, 2, colors.gold)
  fillRect(10, 18, 5, 2, colors.green)
  fillRect(17, 18, 6, 2, colors.white)
  fillPixel(9, 13, colors.white)
end

if mode == "settings_title" then
  drawGear()
elseif mode == "settings_sound" then
  drawSound()
elseif mode == "settings_language" then
  drawLanguage()
elseif mode == "settings_accessibility" then
  drawAccessibility()
else
  drawKeybind()
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
