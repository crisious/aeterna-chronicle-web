local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local frameKey = app.params["frame"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if frameKey == nil or frameKey == "" then
  error("Missing required --script-param frame=<ui-frame-id>")
end

local family, indexText, theme = string.match(frameKey, "^UI%-(%u+)%-(%d%d%d)%-(%u+)$")
if family == nil then
  error("frame must match UI-XXX-###-THEME: " .. frameKey)
end

local index = tonumber(indexText)
local SIZE = 512
local GRID = 64
local SCALE = SIZE / GRID

local baseColors = {
  transparent = Color { r = 0, g = 0, b = 0, a = 0 },
  ink = Color { r = 5, g = 7, b = 16, a = 255 },
  shadow = Color { r = 4, g = 6, b = 12, a = 130 },
  pearl = Color { r = 222, g = 242, b = 239, a = 255 },
}

local palettes = {
  DEF = {
    panel = Color { r = 21, g = 35, b = 58, a = 220 },
    panelDark = Color { r = 12, g = 20, b = 34, a = 235 },
    trim = Color { r = 73, g = 127, b = 177, a = 255 },
    trimLight = Color { r = 154, g = 214, b = 238, a = 255 },
    accent = Color { r = 242, g = 200, b = 91, a = 255 },
  },
  DAR = {
    panel = Color { r = 22, g = 18, b = 36, a = 224 },
    panelDark = Color { r = 10, g = 9, b = 20, a = 238 },
    trim = Color { r = 93, g = 72, b = 150, a = 255 },
    trimLight = Color { r = 183, g = 137, b = 237, a = 255 },
    accent = Color { r = 255, g = 96, b = 164, a = 255 },
  },
  SEA = {
    panel = Color { r = 17, g = 50, b = 58, a = 220 },
    panelDark = Color { r = 8, g = 23, b = 30, a = 236 },
    trim = Color { r = 54, g = 155, b = 166, a = 255 },
    trimLight = Color { r = 155, g = 234, b = 221, a = 255 },
    accent = Color { r = 255, g = 174, b = 111, a = 255 },
  },
}

local palette = palettes[theme] or palettes.DEF

local sprite = Sprite(SIZE, SIZE, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

if palettePath ~= nil and palettePath ~= "" then
  pcall(function()
    app.command.LoadPalette { filename = palettePath }
  end)
end

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, SIZE, SIZE)
end)

local layer = sprite.layers[1]
layer.name = "uiFrame"

local image = Image(SIZE, SIZE, ColorMode.RGB)
image:clear()

local function pixel(value)
  return math.floor(value * SCALE + 0.5)
end

local function fillPixel(x, y, color)
  if x >= 0 and x < SIZE and y >= 0 and y < SIZE then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  local x0 = pixel(x)
  local y0 = pixel(y)
  local x1 = pixel(x + w) - 1
  local y1 = pixel(y + h) - 1

  for py = y0, y1 do
    for px = x0, x1 do
      fillPixel(px, py, color)
    end
  end
end

local function strokeRect(x, y, w, h, thickness, color)
  fillRect(x, y, w, thickness, color)
  fillRect(x, y + h - thickness, w, thickness, color)
  fillRect(x, y, thickness, h, color)
  fillRect(x + w - thickness, y, thickness, h, color)
end

local function fillDiamond(cx, cy, radius, color)
  for dy = -radius, radius do
    local width = radius - math.abs(dy)
    fillRect(cx - width, cy + dy, width * 2 + 1, 1, color)
  end
end

local function fillEllipse(cx, cy, rx, ry, color)
  local cxp = pixel(cx)
  local cyp = pixel(cy)
  local rxp = math.max(1, pixel(rx))
  local ryp = math.max(1, pixel(ry))

  for y = -ryp, ryp do
    for x = -rxp, rxp do
      if ((x * x) / (rxp * rxp) + (y * y) / (ryp * ryp)) <= 1 then
        fillPixel(cxp + x, cyp + y, color)
      end
    end
  end
end

local function drawCornerMarks(offset, size)
  fillDiamond(offset, offset, size, palette.trimLight)
  fillDiamond(64 - offset, offset, size, palette.trimLight)
  fillDiamond(offset, 64 - offset, size, palette.trimLight)
  fillDiamond(64 - offset, 64 - offset, size, palette.trimLight)
  fillDiamond(offset, offset, math.max(1, size - 2), palette.accent)
  fillDiamond(64 - offset, offset, math.max(1, size - 2), palette.accent)
  fillDiamond(offset, 64 - offset, math.max(1, size - 2), palette.accent)
  fillDiamond(64 - offset, 64 - offset, math.max(1, size - 2), palette.accent)
end

local function drawBasePanel(margin, thickness)
  fillRect(margin + 1, margin + 2, 64 - margin * 2, 64 - margin * 2, baseColors.shadow)
  fillRect(margin, margin, 64 - margin * 2, 64 - margin * 2, palette.panel)
  strokeRect(margin, margin, 64 - margin * 2, 64 - margin * 2, thickness, baseColors.ink)
  strokeRect(margin + thickness, margin + thickness, 64 - (margin + thickness) * 2, 64 - (margin + thickness) * 2, 1, palette.trim)
  strokeRect(margin + thickness + 2, margin + thickness + 2, 64 - (margin + thickness + 2) * 2, 64 - (margin + thickness + 2) * 2, 1, palette.trimLight)
end

local function drawButton()
  drawBasePanel(8, 2)
  fillRect(13, 24, 38, 14, palette.panelDark)
  strokeRect(13, 24, 38, 14, 2, palette.trim)
  fillRect(17, 28, 30, 3, palette.trimLight)
  fillRect(18, 34, 28, 2, palette.accent)
  drawCornerMarks(11, 3)
end

local function drawHud()
  drawBasePanel(5, 2)
  fillRect(11, 12, 42, 8, palette.panelDark)
  fillRect(12, 13, 26 + (index % 5), 6, palette.trim)
  fillRect(12, 24, 40, 6, palette.panelDark)
  fillRect(12, 33, 34, 5, palette.panelDark)
  fillRect(12, 42, 28, 5, palette.panelDark)
  fillRect(14, 25, 24, 2, palette.trimLight)
  fillRect(14, 34, 18, 2, palette.accent)
  fillRect(14, 43, 14, 2, palette.trim)
  drawCornerMarks(8, 2)
end

local function drawInventory()
  drawBasePanel(6, 2)
  for gy = 0, 3 do
    for gx = 0, 3 do
      local x = 13 + gx * 10
      local y = 13 + gy * 10
      fillRect(x, y, 7, 7, palette.panelDark)
      strokeRect(x, y, 7, 7, 1, palette.trim)
      if ((gx + gy + index) % 3) == 0 then
        fillRect(x + 2, y + 2, 3, 3, palette.accent)
      end
    end
  end
  drawCornerMarks(9, 2)
end

local function drawSettings()
  drawBasePanel(7, 2)
  fillEllipse(32, 31, 13, 13, baseColors.ink)
  fillEllipse(32, 31, 10, 10, palette.panelDark)
  fillEllipse(32, 31, 5, 5, palette.trim)
  for i = 0, 7 do
    local cx = 32 + math.floor(math.cos(i * 0.785) * 17 + 0.5)
    local cy = 31 + math.floor(math.sin(i * 0.785) * 17 + 0.5)
    fillRect(cx - 2, cy - 2, 4, 4, palette.accent)
  end
  fillRect(18, 47, 28, 3, palette.trimLight)
  drawCornerMarks(10, 2)
end

local function drawShop()
  drawBasePanel(6, 2)
  fillRect(14, 15, 36, 8, palette.panelDark)
  strokeRect(14, 15, 36, 8, 1, palette.trim)
  fillRect(18, 23, 4, 20, palette.trim)
  fillRect(42, 23, 4, 20, palette.trim)
  fillRect(16, 39, 32, 7, palette.panelDark)
  fillRect(18, 41, 28, 2, palette.accent)
  fillDiamond(32, 31, 7, palette.trimLight)
  fillDiamond(32, 31, 4, palette.accent)
  drawCornerMarks(9, 2)
end

if family == "BTN" then
  drawButton()
elseif family == "HUD" then
  drawHud()
elseif family == "INV" then
  drawInventory()
elseif family == "SET" then
  drawSettings()
elseif family == "SHP" then
  drawShop()
else
  drawBasePanel(7, 2)
  drawCornerMarks(10, 2)
end

fillRect(6, 59, 8 + (index % 6) * 2, 1, palette.accent)
fillPixel(pixel(58), pixel(6), baseColors.pearl)

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
