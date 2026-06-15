local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local npcKey = app.params["npc"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if npcKey == nil or npcKey == "" then
  error("Missing required --script-param npc=<npc-id>")
end

local SIZE = 512
local keyLower = string.lower(npcKey)

local colors = {
  ink = Color { r = 5, g = 7, b = 16, a = 255 },
  outline = Color { r = 19, g = 22, b = 38, a = 245 },
  shadow = Color { r = 6, g = 8, b = 18, a = 120 },
  skin = Color { r = 237, g = 164, b = 133, a = 255 },
  skinLight = Color { r = 255, g = 199, b = 169, a = 255 },
  skinShade = Color { r = 174, g = 94, b = 83, a = 255 },
  white = Color { r = 238, g = 246, b = 246, a = 255 },
  leather = Color { r = 91, g = 55, b = 42, a = 255 },
  gold = Color { r = 237, g = 188, b = 76, a = 255 },
  steel = Color { r = 128, g = 146, b = 166, a = 255 },
  steelLight = Color { r = 212, g = 229, b = 236, a = 255 },
}

local palettes = {
  ice = {
    hair = Color { r = 84, g = 174, b = 236, a = 255 },
    hairLight = Color { r = 190, g = 245, b = 255, a = 255 },
    cloth = Color { r = 37, g = 78, b = 153, a = 255 },
    clothLight = Color { r = 104, g = 200, b = 240, a = 255 },
    accent = Color { r = 235, g = 255, b = 255, a = 255 },
  },
  memory = {
    hair = Color { r = 68, g = 202, b = 177, a = 255 },
    hairLight = Color { r = 177, g = 255, b = 222, a = 255 },
    cloth = Color { r = 46, g = 116, b = 105, a = 255 },
    clothLight = Color { r = 112, g = 220, b = 188, a = 255 },
    accent = Color { r = 255, g = 214, b = 97, a = 255 },
  },
  ember = {
    hair = Color { r = 218, g = 84, b = 59, a = 255 },
    hairLight = Color { r = 255, g = 172, b = 76, a = 255 },
    cloth = Color { r = 121, g = 44, b = 41, a = 255 },
    clothLight = Color { r = 224, g = 92, b = 67, a = 255 },
    accent = Color { r = 255, g = 214, b = 87, a = 255 },
  },
  shadow = {
    hair = Color { r = 64, g = 46, b = 104, a = 255 },
    hairLight = Color { r = 154, g = 105, b = 220, a = 255 },
    cloth = Color { r = 35, g = 32, b = 58, a = 255 },
    clothLight = Color { r = 99, g = 78, b = 148, a = 255 },
    accent = Color { r = 255, g = 91, b = 172, a = 255 },
  },
  nature = {
    hair = Color { r = 86, g = 128, b = 62, a = 255 },
    hairLight = Color { r = 154, g = 219, b = 95, a = 255 },
    cloth = Color { r = 48, g = 104, b = 64, a = 255 },
    clothLight = Color { r = 116, g = 206, b = 101, a = 255 },
    accent = Color { r = 236, g = 191, b = 77, a = 255 },
  },
  gear = {
    hair = Color { r = 112, g = 93, b = 78, a = 255 },
    hairLight = Color { r = 196, g = 162, b = 112, a = 255 },
    cloth = Color { r = 101, g = 79, b = 55, a = 255 },
    clothLight = Color { r = 196, g = 143, b = 72, a = 255 },
    accent = Color { r = 78, g = 205, b = 232, a = 255 },
  },
}

local function contains(value, needle)
  return string.find(value, needle, 1, true) ~= nil
end

local function hashKey(value)
  local hash = 37
  for i = 1, #value do
    hash = (hash * 47 + string.byte(value, i)) % 2147483647
  end
  return hash
end

local function resolvePalette()
  if contains(keyLower, "cryo") or contains(keyLower, "frost") or contains(keyLower, "siren") then return palettes.ice end
  if contains(keyLower, "ifrita") or contains(keyLower, "ember") or contains(keyLower, "drakun") or contains(keyLower, "phoenix") then return palettes.ember end
  if contains(keyLower, "shadow") or contains(keyLower, "dark") or contains(keyLower, "nyx") or contains(keyLower, "void") then return palettes.shadow end
  if contains(keyLower, "grove") or contains(keyLower, "gaia") or contains(keyLower, "fiona") or contains(keyLower, "naila") then return palettes.nature end
  if contains(keyLower, "gears") or contains(keyLower, "bolt") or contains(keyLower, "cipher") or contains(keyLower, "kalen") then return palettes.gear end
  return palettes.memory
end

math.randomseed(hashKey(keyLower))
local palette = resolvePalette()
local variant = hashKey(keyLower) % 6

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
layer.name = "npcPortrait"

local image = Image(SIZE, SIZE, ColorMode.RGB)
image:clear()

local function fillPixel(x, y, color)
  if x >= 0 and x < SIZE and y >= 0 and y < SIZE then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  local x0 = math.max(0, x)
  local y0 = math.max(0, y)
  local x1 = math.min(SIZE - 1, x + w - 1)
  local y1 = math.min(SIZE - 1, y + h - 1)
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

local function strokeEllipse(cx, cy, rx, ry, thickness, color)
  for y = -ry - thickness, ry + thickness do
    for x = -rx - thickness, rx + thickness do
      local outer = ((x * x) / ((rx + thickness) * (rx + thickness)) + (y * y) / ((ry + thickness) * (ry + thickness))) <= 1
      local inner = ((x * x) / ((rx - thickness) * (rx - thickness)) + (y * y) / ((ry - thickness) * (ry - thickness))) <= 1
      if outer and not inner then
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

local function fillTriangle(x1, y1, x2, y2, x3, y3, color)
  local minY = math.max(0, math.min(y1, y2, y3))
  local maxY = math.min(SIZE - 1, math.max(y1, y2, y3))

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
        fillRect(nodes[i], y, nodes[i + 1] - nodes[i] + 1, 1, color)
      end
    end
  end
end

local function tint(color, dr, dg, db, alpha)
  return Color {
    r = math.max(0, math.min(255, color.red + dr)),
    g = math.max(0, math.min(255, color.green + dg)),
    b = math.max(0, math.min(255, color.blue + db)),
    a = alpha or color.alpha,
  }
end

local function drawSpark(cx, cy, color)
  drawLine(cx - 16, cy, cx + 16, cy, 4, color)
  drawLine(cx, cy - 16, cx, cy + 16, 4, color)
  fillDiamond(cx, cy, 7, colors.white)
end

local function drawBust()
  fillEllipse(256, 460, 142, 24, colors.shadow)
  fillEllipse(256, 390, 130, 104, colors.ink)
  fillEllipse(256, 398, 111, 88, palette.cloth)
  fillTriangle(144, 450, 368, 450, 256, 317, colors.ink)
  fillTriangle(162, 444, 350, 444, 256, 328, palette.clothLight)
  fillRect(204, 314, 104, 72, colors.skin)
  fillRect(220, 360, 72, 28, colors.skinShade)
  fillDiamond(256, 389, 24, palette.accent)
end

local function drawHair()
  fillEllipse(256, 192, 104, 105, colors.ink)
  fillEllipse(256, 192, 88, 91, palette.hair)
  fillEllipse(214, 190, 44, 100, colors.ink)
  fillEllipse(298, 190, 44, 100, colors.ink)
  fillEllipse(213, 191, 33, 86, palette.hair)
  fillEllipse(299, 191, 33, 86, palette.hair)
  fillRect(181, 188, 34, 150, colors.ink)
  fillRect(297, 188, 34, 150, colors.ink)
  fillRect(190, 196, 22, 132, palette.hair)
  fillRect(300, 196, 22, 132, palette.hair)
  drawLine(215, 122, 179, 237, 17, palette.hairLight)
  drawLine(301, 122, 338, 237, 17, palette.hairLight)

  if variant % 2 == 0 then
    fillTriangle(176, 148, 256, 72, 337, 148, colors.ink)
    fillTriangle(194, 148, 256, 88, 319, 148, palette.hairLight)
  else
    fillRect(181, 124, 150, 34, colors.ink)
    fillRect(194, 127, 124, 22, palette.hairLight)
  end
end

local function drawFace()
  fillEllipse(256, 218, 75, 88, colors.ink)
  fillEllipse(256, 220, 62, 74, colors.skin)
  fillEllipse(236, 213, 8, 10, colors.ink)
  fillEllipse(276, 213, 8, 10, colors.ink)
  fillRect(231, 211, 9, 5, colors.white)
  fillRect(271, 211, 9, 5, colors.white)
  fillRect(240, 252, 32, 5, colors.skinShade)
  fillRect(252, 228, 9, 16, tint(colors.skinShade, 20, 8, 6))
  fillEllipse(214, 230, 10, 16, colors.skinShade)
  fillEllipse(298, 230, 10, 16, colors.skinShade)
end

local function drawAccessories()
  strokeEllipse(256, 224, 82, 96, 5, palette.accent)

  if contains(keyLower, "memory") or contains(keyLower, "echo") or contains(keyLower, "time") then
    fillDiamond(256, 94, 21, colors.ink)
    fillDiamond(256, 94, 14, palette.accent)
    drawSpark(392, 126, palette.accent)
  elseif contains(keyLower, "gears") or contains(keyLower, "bolt") or contains(keyLower, "cipher") then
    fillEllipse(173, 196, 34, 34, colors.ink)
    fillEllipse(173, 196, 24, 24, colors.steel)
    fillEllipse(173, 196, 10, 10, palette.accent)
    for i = 0, 5 do
      local angle = i * 1.047
      fillRect(173 + math.floor(math.cos(angle) * 31) - 4, 196 + math.floor(math.sin(angle) * 31) - 4, 8, 8, colors.ink)
    end
  elseif contains(keyLower, "cryo") or contains(keyLower, "frost") then
    fillDiamond(148, 147, 20, palette.accent)
    fillDiamond(364, 147, 20, palette.accent)
  elseif contains(keyLower, "ifrita") or contains(keyLower, "ember") then
    fillTriangle(152, 166, 188, 94, 210, 177, colors.ink)
    fillTriangle(158, 163, 188, 111, 203, 172, palette.accent)
    fillTriangle(303, 177, 326, 94, 361, 166, colors.ink)
    fillTriangle(310, 172, 326, 111, 355, 163, palette.accent)
  else
    drawSpark(142, 117, palette.accent)
    drawSpark(369, 119, palette.hairLight)
  end

  if variant >= 3 then
    fillRect(196, 134, 121, 15, colors.ink)
    fillRect(204, 136, 105, 9, colors.gold)
    fillDiamond(256, 132, 14, palette.accent)
  end
end

local function drawFrameHints()
  for i = 1, 8 do
    local x = math.random(58, 454)
    local y = math.random(62, 430)
    if i % 2 == 0 then
      fillDiamond(x, y, math.random(4, 8), Color { r = palette.accent.red, g = palette.accent.green, b = palette.accent.blue, a = 150 })
    else
      fillRect(x, y, math.random(9, 18), math.random(4, 8), Color { r = palette.hairLight.red, g = palette.hairLight.green, b = palette.hairLight.blue, a = 118 })
    end
  end
end

drawFrameHints()
drawBust()
drawHair()
drawFace()
drawAccessories()

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
