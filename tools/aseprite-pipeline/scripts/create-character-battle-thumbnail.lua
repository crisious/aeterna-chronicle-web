local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local classId = app.params["class"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if classId == nil or classId == "" then
  error("Missing required --script-param class=<class-id>")
end

local WIDTH = 64
local HEIGHT = 96

local colors = {
  ink = Color { r = 5, g = 7, b = 16, a = 255 },
  shadow = Color { r = 6, g = 8, b = 18, a = 120 },
  skin = Color { r = 240, g = 160, b = 130, a = 255 },
  skinDark = Color { r = 171, g = 92, b = 82, a = 255 },
  white = Color { r = 236, g = 246, b = 246, a = 255 },
  leather = Color { r = 86, g = 50, b = 36, a = 255 },
  leatherLight = Color { r = 143, g = 84, b = 47, a = 255 },
}

local palettes = {
  ether_knight = {
    cloth = Color { r = 31, g = 92, b = 173, a = 255 },
    light = Color { r = 69, g = 185, b = 232, a = 255 },
    metal = Color { r = 222, g = 145, b = 32, a = 255 },
    metalLight = Color { r = 255, g = 220, b = 86, a = 255 },
    accent = Color { r = 83, g = 242, b = 255, a = 255 },
    hair = Color { r = 255, g = 187, b = 66, a = 255 },
  },
  memory_weaver = {
    cloth = Color { r = 38, g = 123, b = 131, a = 255 },
    light = Color { r = 105, g = 220, b = 204, a = 255 },
    metal = Color { r = 94, g = 70, b = 168, a = 255 },
    metalLight = Color { r = 180, g = 145, b = 245, a = 255 },
    accent = Color { r = 255, g = 213, b = 104, a = 255 },
    hair = Color { r = 196, g = 242, b = 224, a = 255 },
  },
  shadow_weaver = {
    cloth = Color { r = 54, g = 38, b = 91, a = 255 },
    light = Color { r = 132, g = 76, b = 194, a = 255 },
    metal = Color { r = 30, g = 32, b = 49, a = 255 },
    metalLight = Color { r = 88, g = 92, b = 119, a = 255 },
    accent = Color { r = 255, g = 83, b = 171, a = 255 },
    hair = Color { r = 225, g = 214, b = 255, a = 255 },
  },
  memory_breaker = {
    cloth = Color { r = 113, g = 39, b = 39, a = 255 },
    light = Color { r = 215, g = 85, b = 57, a = 255 },
    metal = Color { r = 94, g = 94, b = 111, a = 255 },
    metalLight = Color { r = 184, g = 180, b = 171, a = 255 },
    accent = Color { r = 255, g = 191, b = 75, a = 255 },
    hair = Color { r = 94, g = 58, b = 42, a = 255 },
  },
  time_guardian = {
    cloth = Color { r = 47, g = 52, b = 130, a = 255 },
    light = Color { r = 121, g = 133, b = 232, a = 255 },
    metal = Color { r = 178, g = 125, b = 54, a = 255 },
    metalLight = Color { r = 247, g = 204, b = 89, a = 255 },
    accent = Color { r = 94, g = 236, b = 255, a = 255 },
    hair = Color { r = 201, g = 214, b = 255, a = 255 },
  },
  void_wanderer = {
    cloth = Color { r = 45, g = 36, b = 92, a = 255 },
    light = Color { r = 106, g = 82, b = 190, a = 255 },
    metal = Color { r = 40, g = 84, b = 77, a = 255 },
    metalLight = Color { r = 83, g = 209, b = 167, a = 255 },
    accent = Color { r = 185, g = 255, b = 120, a = 255 },
    hair = Color { r = 226, g = 249, b = 232, a = 255 },
  },
}

local palette = palettes[classId] or palettes.ether_knight

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
layer.name = "characterBattleThumbnail"

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

local function drawWeapon()
  if classId == "ether_knight" then
    drawLine(49, 23, 49, 78, 3, colors.ink)
    drawLine(49, 25, 49, 75, 1, colors.white)
    fillRect(46, 54, 7, 2, palette.metalLight)
  elseif classId == "memory_weaver" then
    drawLine(13, 21, 13, 80, 3, colors.ink)
    drawLine(13, 23, 13, 78, 1, palette.metalLight)
    fillEllipse(13, 18, 5, 5, colors.ink)
    fillEllipse(13, 18, 3, 3, palette.accent)
  elseif classId == "shadow_weaver" then
    drawLine(13, 54, 6, 68, 3, colors.ink)
    drawLine(51, 54, 58, 68, 3, colors.ink)
    drawLine(13, 54, 7, 67, 1, palette.accent)
    drawLine(51, 54, 57, 67, 1, palette.accent)
  elseif classId == "memory_breaker" then
    drawLine(49, 24, 44, 78, 4, colors.ink)
    drawLine(49, 27, 44, 76, 2, colors.leatherLight)
    fillRect(43, 20, 15, 8, colors.ink)
    fillRect(45, 22, 11, 4, palette.metalLight)
  elseif classId == "time_guardian" then
    fillEllipse(50, 21, 8, 8, colors.ink)
    fillEllipse(50, 21, 5, 5, palette.metalLight)
    drawLine(50, 21, 50, 16, 1, palette.accent)
    drawLine(50, 21, 54, 24, 1, palette.accent)
  elseif classId == "void_wanderer" then
    fillEllipse(50, 28, 7, 7, Color { r = palette.accent.red, g = palette.accent.green, b = palette.accent.blue, a = 105 })
    fillEllipse(50, 28, 3, 3, palette.accent)
    drawLine(48, 35, 44, 78, 3, colors.ink)
    drawLine(48, 35, 45, 76, 1, palette.light)
  end
end

fillEllipse(32, 87, 21, 4, colors.shadow)

fillRect(21, 35, 22, 37, colors.ink)
fillRect(23, 37, 18, 33, palette.cloth)
fillRect(31, 39, 3, 29, palette.light)

fillDiamond(32, 38, 14, colors.ink)
fillDiamond(32, 38, 10, palette.metal)
fillDiamond(32, 39, 5, palette.accent)

drawLine(21, 38, 14, 57, 5, colors.ink)
drawLine(21, 39, 16, 56, 3, palette.metal)
drawLine(43, 38, 50, 57, 5, colors.ink)
drawLine(43, 39, 48, 56, 3, palette.metal)
fillEllipse(14, 58, 3, 3, colors.skin)
fillEllipse(50, 58, 3, 3, colors.skin)

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
fillRect(25, 16, 14, 5, colors.ink)
fillDiamond(32, 16, 8, colors.ink)
fillDiamond(32, 16, 5, palette.hair)
fillRect(28, 22, 2, 2, colors.skinDark)
fillRect(36, 22, 2, 2, colors.skinDark)
fillRect(30, 27, 5, 1, colors.skinDark)

fillRect(29, 52, 9, 3, colors.leather)
fillRect(32, 51, 3, 5, palette.metalLight)
drawWeapon()

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
