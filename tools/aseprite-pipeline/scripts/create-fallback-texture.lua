local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local textureKey = app.params["texture"]
local sizeParam = app.params["size"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if textureKey == nil or textureKey == "" then
  error("Missing required --script-param texture=<texture-key>")
end

local FRAME_SIZE = tonumber(sizeParam) or 64
if FRAME_SIZE ~= 32 and FRAME_SIZE ~= 64 then
  error("Unsupported fallback texture size: " .. tostring(sizeParam))
end

local colors = {
  transparent = Color { r = 0, g = 0, b = 0, a = 0 },
  ink = Color { r = 5, g = 7, b = 14, a = 255 },
  panel = Color { r = 18, g = 24, b = 38, a = 255 },
  panelSoft = Color { r = 33, g = 44, b = 64, a = 255 },
  magenta = Color { r = 232, g = 61, b = 255, a = 255 },
  cyan = Color { r = 70, g = 227, b = 255, a = 255 },
  gold = Color { r = 255, g = 207, b = 82, a = 255 },
  white = Color { r = 236, g = 246, b = 255, a = 255 },
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

local layer = sprite.layers[1]
layer.name = "fallbackTexture"

local image = Image(FRAME_SIZE, FRAME_SIZE, ColorMode.RGB)
image:clear()

local function fillPixel(x, y, color)
  if x >= 0 and x < FRAME_SIZE and y >= 0 and y < FRAME_SIZE then
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

local margin = math.max(2, math.floor(FRAME_SIZE / 16))
local border = math.max(1, math.floor(FRAME_SIZE / 32))
local crossThickness = math.max(2, math.floor(FRAME_SIZE / 16))

fillRect(0, 0, FRAME_SIZE, FRAME_SIZE, colors.transparent)
fillRect(margin, margin, FRAME_SIZE - margin * 2, FRAME_SIZE - margin * 2, colors.panel)
fillRect(margin + border, margin + border, FRAME_SIZE - (margin + border) * 2, FRAME_SIZE - (margin + border) * 2, colors.panelSoft)
strokeRect(margin, margin, FRAME_SIZE - margin * 2, FRAME_SIZE - margin * 2, border, colors.ink)
strokeRect(margin + border, margin + border, FRAME_SIZE - (margin + border) * 2, FRAME_SIZE - (margin + border) * 2, border, colors.magenta)

drawLine(margin + border * 2, margin + border * 2, FRAME_SIZE - margin - border * 2 - 1, FRAME_SIZE - margin - border * 2 - 1, crossThickness, colors.cyan)
drawLine(FRAME_SIZE - margin - border * 2 - 1, margin + border * 2, margin + border * 2, FRAME_SIZE - margin - border * 2 - 1, crossThickness, colors.magenta)

local center = math.floor(FRAME_SIZE / 2)
local radius = math.max(6, math.floor(FRAME_SIZE / 5))
fillDiamond(center, center, radius + border, colors.ink)
fillDiamond(center, center, radius, colors.gold)

if FRAME_SIZE == 64 then
  fillRect(center - 2, center - 11, 4, 16, colors.ink)
  fillRect(center - 2, center + 8, 4, 4, colors.ink)
  fillRect(center - 1, center - 10, 2, 14, colors.white)
  fillRect(center - 1, center + 9, 2, 2, colors.white)
else
  fillRect(center - 1, center - 6, 2, 9, colors.ink)
  fillRect(center - 1, center + 5, 2, 2, colors.ink)
  fillPixel(center, center - 5, colors.white)
  fillPixel(center, center + 5, colors.white)
end

sprite.cels[1].image = image
app.command.SaveFileAs { filename = outputPath }
