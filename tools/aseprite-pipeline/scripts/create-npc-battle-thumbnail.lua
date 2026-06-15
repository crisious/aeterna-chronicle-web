local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local npcKey = app.params["npc"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if npcKey == nil or npcKey == "" then
  error("Missing required --script-param npc=<npc-id>")
end

local WIDTH = 64
local HEIGHT = 96
local keyLower = string.lower(npcKey)

local colors = {
  ink = Color { r = 5, g = 7, b = 16, a = 255 },
  shadow = Color { r = 6, g = 8, b = 18, a = 120 },
  skin = Color { r = 235, g = 154, b = 126, a = 255 },
  skinDark = Color { r = 166, g = 89, b = 80, a = 255 },
  white = Color { r = 236, g = 246, b = 246, a = 255 },
  leather = Color { r = 82, g = 50, b = 36, a = 255 },
  leatherLight = Color { r = 146, g = 92, b = 54, a = 255 },
  steel = Color { r = 120, g = 141, b = 162, a = 255 },
  steelLight = Color { r = 209, g = 226, b = 232, a = 255 },
}

local palettes = {
  cryo = {
    cloth = Color { r = 31, g = 84, b = 170, a = 255 },
    light = Color { r = 91, g = 202, b = 238, a = 255 },
    metal = Color { r = 80, g = 151, b = 213, a = 255 },
    metalLight = Color { r = 219, g = 255, b = 255, a = 255 },
    accent = Color { r = 237, g = 255, b = 255, a = 255 },
    hair = Color { r = 89, g = 180, b = 235, a = 255 },
  },
  mateus = {
    cloth = Color { r = 64, g = 118, b = 96, a = 255 },
    light = Color { r = 142, g = 210, b = 145, a = 255 },
    metal = Color { r = 137, g = 101, b = 52, a = 255 },
    metalLight = Color { r = 236, g = 192, b = 89, a = 255 },
    accent = Color { r = 255, g = 221, b = 114, a = 255 },
    hair = Color { r = 199, g = 210, b = 188, a = 255 },
  },
  memory = {
    cloth = Color { r = 42, g = 116, b = 104, a = 255 },
    light = Color { r = 111, g = 218, b = 188, a = 255 },
    metal = Color { r = 90, g = 72, b = 154, a = 255 },
    metalLight = Color { r = 183, g = 150, b = 240, a = 255 },
    accent = Color { r = 255, g = 214, b = 98, a = 255 },
    hair = Color { r = 176, g = 244, b = 221, a = 255 },
  },
}

local function contains(value, needle)
  return string.find(value, needle, 1, true) ~= nil
end

local palette = palettes.memory
if contains(keyLower, "cryo") then
  palette = palettes.cryo
elseif contains(keyLower, "mateus") then
  palette = palettes.mateus
end

local sprite = Sprite(WIDTH, HEIGHT, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

if palettePath ~= nil and palettePath ~= "" then
  pcall(function()
    app.command.LoadPalette { filename = palettePath }
  end)
end

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, WIDTH, HEIGHT)
end)

local layer = sprite.layers[1]
layer.name = "npcBattleThumbnail"

local image = Image(WIDTH, HEIGHT, ColorMode.RGB)
image:clear()

local function fillPixel(x, y, color)
  if x >= 0 and x < WIDTH and y >= 0 and y < HEIGHT then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  local x0 = math.max(0, x)
  local y0 = math.max(0, y)
  local x1 = math.min(WIDTH - 1, x + w - 1)
  local y1 = math.min(HEIGHT - 1, y + h - 1)

  for py = y0, y1 do
    for px = x0, x1 do
      image:drawPixel(px, py, color)
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

local function fillDiamond(cx, cy, radius, color)
  for dy = -radius, radius do
    local width = radius - math.abs(dy)
    fillRect(cx - width, cy + dy, width * 2 + 1, 1, color)
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

local function drawStaff()
  drawLine(13, 20, 13, 82, 3, colors.ink)
  drawLine(13, 22, 13, 79, 1, palette.metalLight)
  fillDiamond(13, 18, 6, colors.ink)
  fillDiamond(13, 18, 4, palette.accent)
end

local function drawIceBlade()
  drawLine(49, 23, 49, 78, 3, colors.ink)
  drawLine(49, 25, 49, 75, 1, colors.white)
  fillDiamond(49, 50, 4, palette.accent)
end

fillEllipse(32, 87, 21, 4, colors.shadow)
fillEllipse(32, 51, 25, 34, Color { r = palette.accent.red, g = palette.accent.green, b = palette.accent.blue, a = 40 })

fillRect(21, 36, 22, 36, colors.ink)
fillRect(23, 38, 18, 32, palette.cloth)
fillRect(31, 40, 3, 28, palette.light)
fillDiamond(32, 39, 14, colors.ink)
fillDiamond(32, 39, 10, palette.metal)
fillDiamond(32, 40, 5, palette.accent)

drawLine(21, 39, 14, 58, 5, colors.ink)
drawLine(21, 40, 16, 57, 3, palette.metal)
drawLine(43, 39, 50, 58, 5, colors.ink)
drawLine(43, 40, 48, 57, 3, palette.metal)
fillEllipse(14, 59, 3, 3, colors.skin)
fillEllipse(50, 59, 3, 3, colors.skin)

fillRect(23, 66, 8, 18, colors.ink)
fillRect(25, 66, 5, 16, palette.cloth)
fillRect(36, 66, 8, 18, colors.ink)
fillRect(38, 66, 5, 16, palette.cloth)
fillRect(21, 82, 12, 5, colors.ink)
fillRect(35, 82, 12, 5, colors.ink)
fillRect(23, 82, 9, 3, colors.leather)
fillRect(37, 82, 9, 3, colors.leather)

fillEllipse(32, 22, 9, 10, colors.ink)
fillEllipse(32, 23, 6, 7, colors.skin)
fillDiamond(32, 15, 9, colors.ink)
fillDiamond(32, 15, 6, palette.hair)
fillRect(27, 22, 2, 2, colors.skinDark)
fillRect(36, 22, 2, 2, colors.skinDark)
fillRect(30, 27, 5, 1, colors.skinDark)

if contains(keyLower, "cryo") then
  drawIceBlade()
  fillDiamond(21, 33, 3, palette.accent)
  fillDiamond(43, 33, 3, palette.accent)
else
  drawStaff()
  fillRect(23, 54, 20, 3, colors.leather)
  fillRect(31, 53, 4, 5, palette.metalLight)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
