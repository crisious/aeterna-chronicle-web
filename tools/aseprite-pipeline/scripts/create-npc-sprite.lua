local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local npcKey = app.params["npc"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if npcKey == nil or npcKey == "" then
  error("Missing required --script-param npc=<npc-id>")
end

local WIDTH = 256
local HEIGHT = 384
local SCALE = 4
local keyLower = string.lower(npcKey)

local colors = {
  ink = Color { r = 5, g = 7, b = 16, a = 255 },
  outline = Color { r = 18, g = 22, b = 38, a = 245 },
  shadow = Color { r = 6, g = 8, b = 18, a = 118 },
  skin = Color { r = 232, g = 154, b = 126, a = 255 },
  skinLight = Color { r = 255, g = 202, b = 164, a = 255 },
  leather = Color { r = 82, g = 51, b = 39, a = 255 },
  leatherLight = Color { r = 148, g = 91, b = 54, a = 255 },
  steel = Color { r = 121, g = 140, b = 160, a = 255 },
  steelLight = Color { r = 210, g = 226, b = 232, a = 255 },
  white = Color { r = 236, g = 246, b = 246, a = 255 },
}

local palettes = {
  ice = {
    cloth = Color { r = 35, g = 78, b = 151, a = 255 },
    clothLight = Color { r = 101, g = 204, b = 238, a = 255 },
    accent = Color { r = 232, g = 255, b = 255, a = 255 },
    hair = Color { r = 78, g = 174, b = 236, a = 255 },
    dark = Color { r = 18, g = 36, b = 78, a = 255 },
  },
  memory = {
    cloth = Color { r = 42, g = 116, b = 104, a = 255 },
    clothLight = Color { r = 111, g = 218, b = 188, a = 255 },
    accent = Color { r = 255, g = 214, b = 98, a = 255 },
    hair = Color { r = 176, g = 244, b = 221, a = 255 },
    dark = Color { r = 20, g = 48, b = 63, a = 255 },
  },
  ember = {
    cloth = Color { r = 118, g = 43, b = 40, a = 255 },
    clothLight = Color { r = 224, g = 91, b = 66, a = 255 },
    accent = Color { r = 255, g = 208, b = 82, a = 255 },
    hair = Color { r = 217, g = 84, b = 58, a = 255 },
    dark = Color { r = 52, g = 24, b = 24, a = 255 },
  },
  shadow = {
    cloth = Color { r = 38, g = 34, b = 63, a = 255 },
    clothLight = Color { r = 100, g = 78, b = 148, a = 255 },
    accent = Color { r = 255, g = 91, b = 172, a = 255 },
    hair = Color { r = 154, g = 105, b = 220, a = 255 },
    dark = Color { r = 14, g = 14, b = 29, a = 255 },
  },
  nature = {
    cloth = Color { r = 49, g = 104, b = 64, a = 255 },
    clothLight = Color { r = 116, g = 206, b = 101, a = 255 },
    accent = Color { r = 236, g = 191, b = 77, a = 255 },
    hair = Color { r = 98, g = 137, b = 70, a = 255 },
    dark = Color { r = 27, g = 58, b = 40, a = 255 },
  },
  gear = {
    cloth = Color { r = 101, g = 79, b = 55, a = 255 },
    clothLight = Color { r = 196, g = 143, b = 72, a = 255 },
    accent = Color { r = 78, g = 205, b = 232, a = 255 },
    hair = Color { r = 196, g = 162, b = 112, a = 255 },
    dark = Color { r = 47, g = 39, b = 34, a = 255 },
  },
}

local function contains(value, needle)
  return string.find(value, needle, 1, true) ~= nil
end

local function hashKey(value)
  local hash = 53
  for i = 1, #value do
    hash = (hash * 43 + string.byte(value, i)) % 2147483647
  end
  return hash
end

local function resolvePalette()
  if contains(keyLower, "cryo") or contains(keyLower, "siren") or contains(keyLower, "frost") then return palettes.ice end
  if contains(keyLower, "ifrita") or contains(keyLower, "drakun") or contains(keyLower, "ember") then return palettes.ember end
  if contains(keyLower, "shadow") or contains(keyLower, "dark") or contains(keyLower, "nyx") or contains(keyLower, "void") then return palettes.shadow end
  if contains(keyLower, "grove") or contains(keyLower, "gaia") or contains(keyLower, "fiona") or contains(keyLower, "naila") then return palettes.nature end
  if contains(keyLower, "gears") or contains(keyLower, "bolt") or contains(keyLower, "cipher") or contains(keyLower, "kalen") then return palettes.gear end
  return palettes.memory
end

math.randomseed(hashKey(keyLower))
local palette = resolvePalette()
local variant = hashKey(keyLower) % 6

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
layer.name = "npcSprite"

local image = Image(WIDTH, HEIGHT, ColorMode.RGB)
image:clear()

local function px(value)
  return math.floor((value * SCALE) + 0.5)
end

local function clamp(value)
  return math.max(0, math.min(255, value))
end

local function tint(color, dr, dg, db, alpha)
  return Color {
    r = clamp(color.red + dr),
    g = clamp(color.green + dg),
    b = clamp(color.blue + db),
    a = alpha or color.alpha,
  }
end

local function fillPixel(x, y, color)
  if x >= 0 and x < WIDTH and y >= 0 and y < HEIGHT then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  local x0 = math.max(0, px(x))
  local y0 = math.max(0, px(y))
  local x1 = math.min(WIDTH - 1, px(x + w) - 1)
  local y1 = math.min(HEIGHT - 1, px(y + h) - 1)

  for py = y0, y1 do
    for px0 = x0, x1 do
      image:drawPixel(px0, py, color)
    end
  end
end

local function fillEllipse(cx, cy, rx, ry, color)
  local pcx = px(cx)
  local pcy = px(cy)
  local prx = math.max(1, px(rx))
  local pry = math.max(1, px(ry))

  for y = -pry, pry do
    for x = -prx, prx do
      if ((x * x) / (prx * prx) + (y * y) / (pry * pry)) <= 1 then
        fillPixel(pcx + x, pcy + y, color)
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

local function fillTriangle(x1, y1, x2, y2, x3, y3, color)
  local points = {
    { x = px(x1), y = px(y1) },
    { x = px(x2), y = px(y2) },
    { x = px(x3), y = px(y3) },
  }
  local minY = math.max(0, math.min(points[1].y, points[2].y, points[3].y))
  local maxY = math.min(HEIGHT - 1, math.max(points[1].y, points[2].y, points[3].y))

  for y = minY, maxY do
    local nodes = {}
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
        local xStart = math.max(0, nodes[i])
        local xEnd = math.min(WIDTH - 1, nodes[i + 1])
        for x = xStart, xEnd do
          image:drawPixel(x, y, color)
        end
      end
    end
  end
end

local function drawSpark(cx, cy, color)
  drawLine(cx - 2, cy, cx + 2, cy, 1, color)
  drawLine(cx, cy - 2, cx, cy + 2, 1, color)
  fillDiamond(cx, cy, 1, colors.white)
end

local function drawLegs()
  fillRect(23, 62, 8, 23, colors.ink)
  fillRect(25, 62, 5, 20, palette.cloth)
  fillRect(36, 62, 8, 23, colors.ink)
  fillRect(38, 62, 5, 20, palette.cloth)
  fillRect(21, 82, 12, 5, colors.ink)
  fillRect(35, 82, 12, 5, colors.ink)
  fillRect(23, 81, 9, 4, colors.leather)
  fillRect(37, 81, 9, 4, colors.leather)
  fillRect(28, 66, 2, 11, palette.clothLight)
  fillRect(41, 66, 2, 11, palette.clothLight)
end

local function drawTorso()
  fillTriangle(18, 36, 49, 36, 43, 65, colors.ink)
  fillTriangle(21, 38, 46, 38, 40, 63, palette.dark)
  fillDiamond(33, 45, 13, colors.ink)
  fillDiamond(33, 45, 9, palette.cloth)
  fillRect(25, 53, 17, 12, colors.ink)
  fillRect(28, 53, 12, 10, palette.clothLight)
  fillDiamond(33, 44, 4, palette.accent)

  if variant % 2 == 0 then
    fillRect(23, 56, 21, 3, colors.leather)
    fillRect(31, 55, 5, 5, colors.steelLight)
  else
    drawLine(24, 39, 43, 57, 2, tint(palette.accent, -20, 0, 0))
  end
end

local function drawArms()
  drawLine(22, 39, 14, 58, 5, colors.ink)
  drawLine(22, 39, 16, 57, 3, palette.cloth)
  drawLine(44, 39, 52, 58, 5, colors.ink)
  drawLine(44, 39, 50, 57, 3, palette.cloth)
  fillEllipse(14, 59, 3, 3, colors.skin)
  fillEllipse(52, 59, 3, 3, colors.skin)

  if contains(keyLower, "gears") or contains(keyLower, "bolt") then
    fillEllipse(52, 58, 5, 5, colors.ink)
    fillEllipse(52, 58, 3, 3, colors.steelLight)
  end
end

local function drawHead()
  fillEllipse(33, 22, 9, 10, colors.ink)
  fillEllipse(33, 23, 6, 7, colors.skin)
  fillTriangle(21, 20, 33, 9, 45, 20, colors.ink)
  fillTriangle(24, 20, 33, 11, 42, 20, palette.hair)
  fillRect(28, 18, 2, 2, colors.ink)
  fillRect(37, 18, 2, 2, colors.ink)
  fillRect(31, 24, 6, 1, tint(colors.skin, -50, -40, -35))

  if variant >= 3 then
    fillRect(26, 13, 15, 3, colors.ink)
    fillRect(28, 13, 11, 1, palette.accent)
    fillDiamond(33, 12, 2, colors.white)
  end
end

local function drawSignatureProp()
  if contains(keyLower, "memory") or contains(keyLower, "echo") or contains(keyLower, "time") then
    fillEllipse(53, 31, 7, 7, tint(palette.accent, 0, 0, 0, 98))
    fillDiamond(53, 31, 4, palette.accent)
    drawSpark(51, 23, colors.white)
  elseif contains(keyLower, "gears") or contains(keyLower, "bolt") or contains(keyLower, "cipher") then
    fillEllipse(12, 33, 6, 6, colors.ink)
    fillEllipse(12, 33, 4, 4, colors.steel)
    fillEllipse(12, 33, 2, 2, palette.accent)
    drawLine(12, 40, 12, 82, 3, colors.ink)
    drawLine(12, 41, 12, 80, 1, colors.steelLight)
  elseif contains(keyLower, "ifrita") or contains(keyLower, "drakun") then
    fillTriangle(52, 24, 59, 38, 48, 38, colors.ink)
    fillTriangle(53, 27, 57, 37, 50, 37, palette.accent)
    drawLine(52, 39, 48, 82, 3, colors.ink)
  elseif contains(keyLower, "cryo") or contains(keyLower, "siren") then
    fillDiamond(13, 30, 6, colors.ink)
    fillDiamond(13, 30, 4, palette.accent)
    drawLine(13, 36, 13, 82, 3, colors.ink)
  else
    drawLine(52, 33, 52, 82, 3, colors.ink)
    drawLine(52, 35, 52, 80, 1, colors.steelLight)
    fillDiamond(52, 52, 3, palette.accent)
  end
end

fillEllipse(33, 87, 24, 4, colors.shadow)
fillEllipse(33, 55, 28 + variant, 35, tint(palette.accent, 0, 0, 0, 34))
drawLegs()
drawTorso()
drawArms()
drawHead()
drawSignatureProp()
drawSpark(18 + (variant * 2), 18 + variant, tint(palette.accent, 12, 12, 12))

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
