local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local backgroundKey = app.params["background"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if backgroundKey == nil or backgroundKey == "" then
  error("Missing required --script-param background=<background-key>")
end

local WIDTH = 1280
local HEIGHT = 720

local colors = {
  ink = Color { r = 7, g = 9, b = 20, a = 255 },
  night = Color { r = 15, g = 18, b = 40, a = 255 },
  star = Color { r = 212, g = 235, b = 255, a = 245 },
  moon = Color { r = 197, g = 228, b = 247, a = 245 },
  fog = Color { r = 126, g = 154, b = 174, a = 118 },
  erbSky = Color { r = 95, g = 171, b = 86, a = 255 },
  erbDeep = Color { r = 38, g = 86, b = 54, a = 255 },
  sylSky = Color { r = 80, g = 161, b = 130, a = 255 },
  sylDeep = Color { r = 31, g = 87, b = 75, a = 255 },
  abySky = Color { r = 62, g = 51, b = 105, a = 255 },
  abyDeep = Color { r = 28, g = 23, b = 55, a = 255 },
  argSky = Color { r = 198, g = 135, b = 73, a = 255 },
  argDeep = Color { r = 92, g = 64, b = 48, a = 255 },
  temSky = Color { r = 114, g = 204, b = 177, a = 255 },
  temDeep = Color { r = 61, g = 77, b = 116, a = 255 },
  norSky = Color { r = 130, g = 187, b = 205, a = 255 },
  norDeep = Color { r = 55, g = 90, b = 123, a = 255 },
  briSky = Color { r = 83, g = 166, b = 213, a = 255 },
  briDeep = Color { r = 45, g = 87, b = 126, a = 255 },
  solSky = Color { r = 229, g = 171, b = 91, a = 255 },
  solDeep = Color { r = 119, g = 78, b = 47, a = 255 },
  fogSky = Color { r = 96, g = 153, b = 162, a = 255 },
  fogDeep = Color { r = 39, g = 83, b = 94, a = 255 },
  oblSky = Color { r = 70, g = 55, b = 105, a = 255 },
  oblDeep = Color { r = 29, g = 24, b = 51, a = 255 },
  grass = Color { r = 83, g = 170, b = 74, a = 255 },
  forest = Color { r = 35, g = 127, b = 89, a = 255 },
  crystal = Color { r = 88, g = 230, b = 228, a = 245 },
  crystalDim = Color { r = 77, g = 129, b = 180, a = 245 },
  stone = Color { r = 102, g = 95, b = 120, a = 255 },
  stoneLight = Color { r = 163, g = 150, b = 171, a = 245 },
  gold = Color { r = 241, g = 195, b = 83, a = 245 },
  brass = Color { r = 173, g = 118, b = 66, a = 245 },
  water = Color { r = 49, g = 125, b = 166, a = 220 },
  wood = Color { r = 93, g = 62, b = 43, a = 255 },
  sand = Color { r = 196, g = 147, b = 80, a = 255 },
}

local function hashKey(value)
  local hash = 17
  for i = 1, #value do
    hash = (hash * 31 + string.byte(value, i)) % 2147483647
  end
  return hash
end

math.randomseed(hashKey(backgroundKey))

local function colorFor(prefix, deep)
  if prefix == "SYL" then return deep and colors.sylDeep or colors.sylSky end
  if prefix == "ABY" then return deep and colors.abyDeep or colors.abySky end
  if prefix == "ARG" then return deep and colors.argDeep or colors.argSky end
  if prefix == "TEM" then return deep and colors.temDeep or colors.temSky end
  if prefix == "NOR" then return deep and colors.norDeep or colors.norSky end
  if prefix == "BRI" then return deep and colors.briDeep or colors.briSky end
  if prefix == "SOL" then return deep and colors.solDeep or colors.solSky end
  if prefix == "FOG" then return deep and colors.fogDeep or colors.fogSky end
  if prefix == "OBL" then return deep and colors.oblDeep or colors.oblSky end
  return deep and colors.erbDeep or colors.erbSky
end

local function tintColor(color, dr, dg, db)
  return Color {
    r = math.max(0, math.min(255, color.red + dr)),
    g = math.max(0, math.min(255, color.green + dg)),
    b = math.max(0, math.min(255, color.blue + db)),
    a = color.alpha,
  }
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
layer.name = "environmentBackground"

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

local function drawSkyGradient(prefix, phase)
  local top = colorFor(prefix, false)
  local bottom = colorFor(prefix, true)
  if phase == "DUSK" then
    top = tintColor(top, 34, -22, 20)
    bottom = tintColor(bottom, 42, -18, 2)
  elseif phase == "NIGHT" or phase == "MIDNIGHT" then
    top = colors.night
    bottom = tintColor(colorFor(prefix, true), -20, -24, 10)
  end

  local bands = 24
  local bandHeight = math.ceil(HEIGHT / bands)
  for i = 0, bands - 1 do
    local t = i / (bands - 1)
    local r = math.floor(top.red * (1 - t) + bottom.red * t)
    local g = math.floor(top.green * (1 - t) + bottom.green * t)
    local b = math.floor(top.blue * (1 - t) + bottom.blue * t)
    fillRect(0, i * bandHeight, WIDTH, bandHeight, Color { r = r, g = g, b = b, a = 255 })
  end
end

local function drawClouds(prefix, count, yMin, yMax)
  local cloudColor = prefix == "ABY" and tintColor(colors.fog, -30, -25, 15) or tintColor(colors.fog, 35, 35, 35)
  for i = 1, count do
    local cx = math.random(80, WIDTH - 80)
    local cy = math.random(yMin, yMax)
    local scale = math.random(2, 5)
    fillEllipse(cx, cy, 18 * scale, 6 * scale, cloudColor)
    fillEllipse(cx - 22 * scale, cy + 4, 13 * scale, 5 * scale, cloudColor)
    fillEllipse(cx + 24 * scale, cy + 3, 14 * scale, 5 * scale, cloudColor)
  end
end

local function drawStars()
  for i = 1, 95 do
    local x = math.random(8, WIDTH - 8)
    local y = math.random(16, 300)
    fillRect(x, y, 2, 2, colors.star)
    if i % 8 == 0 then
      fillPixel(x - 1, y, colors.star)
      fillPixel(x + 2, y, colors.star)
      fillPixel(x, y - 1, colors.star)
      fillPixel(x, y + 2, colors.star)
    end
  end
  fillEllipse(1050, 112, 34, 34, colors.moon)
  fillEllipse(1038, 105, 27, 28, colors.night)
end

local function drawHills(prefix, baseY, color, count)
  for i = 1, count do
    local cx = math.floor((i - 1) * WIDTH / count) + math.random(-60, 60)
    local rx = math.random(180, 310)
    local ry = math.random(70, 130)
    fillEllipse(cx, baseY + ry, rx, ry, color)
  end
end

local function drawTrees(baseY, color, count)
  for i = 1, count do
    local x = math.random(-40, WIDTH + 40)
    local h = math.random(90, 190)
    local trunk = math.random(8, 18)
    fillRect(x - trunk / 2, baseY - h + 42, trunk, h, colors.wood)
    fillDiamond(x, baseY - h + 42, math.random(44, 74), color)
    fillDiamond(x - 28, baseY - h + 74, math.random(34, 58), color)
    fillDiamond(x + 30, baseY - h + 78, math.random(34, 58), tintColor(color, -14, 8, -10))
  end
end

local function drawRuins(baseY, prefix)
  local stoneColor = prefix == "ARG" and colors.brass or colors.stone
  for i = 1, 12 do
    local x = math.random(20, WIDTH - 90)
    local h = math.random(60, 160)
    fillRect(x, baseY - h, 24, h, colors.ink)
    fillRect(x + 4, baseY - h + 4, 16, h - 4, stoneColor)
    if i % 3 == 0 then
      fillRect(x - 16, baseY - h + 8, 56, 14, colors.ink)
      fillRect(x - 10, baseY - h + 10, 44, 10, colors.stoneLight)
    end
  end
end

local function drawCrystals(baseY, prefix)
  local primary = prefix == "TEM" and colors.gold or colors.crystal
  for i = 1, 18 do
    local x = math.random(40, WIDTH - 40)
    local y = baseY - math.random(18, 96)
    local r = math.random(12, 32)
    fillDiamond(x, y, r + 4, colors.ink)
    fillDiamond(x, y, r, primary)
    fillRect(x - 2, y - r, 4, r * 2, colors.crystalDim)
  end
end

local function drawWaterline(baseY)
  fillRect(0, baseY + 28, WIDTH, HEIGHT - baseY - 28, tintColor(colors.water, -24, -16, -12))
  for y = baseY + 42, HEIGHT - 20, 34 do
    for x = math.random(-80, 0), WIDTH, 140 do
      fillRect(x, y, math.random(38, 96), 3, tintColor(colors.water, 40, 45, 35))
    end
  end
end

local function drawDungeon()
  fillRect(0, 0, WIDTH, HEIGHT, Color { r = 15, g = 13, b = 28, a = 255 })
  for y = 0, HEIGHT, 48 do
    fillRect(0, y, WIDTH, 2, Color { r = 33, g = 30, b = 48, a = 255 })
  end
  for x = 0, WIDTH, 96 do
    drawLine(x, 0, x + math.random(-30, 30), HEIGHT, 2, Color { r = 29, g = 25, b = 44, a = 255 })
  end
  drawHills("ABY", 580, Color { r = 34, g = 29, b = 52, a = 255 }, 7)
  for i = 1, 34 do
    local x = math.random(20, WIDTH - 20)
    local top = math.random(0, 260)
    drawLine(x, top, x + math.random(-40, 40), top + math.random(90, 260), math.random(12, 28), colors.ink)
  end
  drawCrystals(640, "ABY")
  fillRect(0, 610, WIDTH, 110, Color { r = 23, g = 20, b = 34, a = 255 })
end

local function drawScene(prefix, kind, phase)
  drawSkyGradient(prefix, phase)
  if phase == "NIGHT" or phase == "MIDNIGHT" then
    drawStars()
  else
    drawClouds(prefix, kind == "SKY" and 10 or 5, 40, 220)
  end

  if kind == "SKY" then
    drawHills(prefix, 560, tintColor(colorFor(prefix, true), -18, -18, -10), 6)
    drawHills(prefix, 640, tintColor(colorFor(prefix, true), -6, -8, -4), 8)
    return
  end

  drawHills(prefix, 430, tintColor(colorFor(prefix, true), -36, -28, -22), 5)
  drawHills(prefix, 520, tintColor(colorFor(prefix, true), -18, -14, -10), 7)

  if prefix == "SYL" then
    drawTrees(660, colors.forest, kind == "MID" and 18 or 10)
  elseif prefix == "ABY" then
    drawCrystals(650, "ABY")
    drawRuins(640, "ABY")
  elseif prefix == "ARG" then
    drawRuins(650, "ARG")
    for i = 1, 8 do
      fillEllipse(math.random(80, WIDTH - 80), math.random(390, 540), math.random(32, 58), math.random(32, 58), colors.brass)
    end
  elseif prefix == "TEM" then
    drawCrystals(645, "TEM")
    drawRuins(650, "TEM")
  elseif prefix == "NOR" then
    drawCrystals(655, "NOR")
    fillRect(0, 626, WIDTH, 94, Color { r = 159, g = 194, b = 208, a = 255 })
  elseif prefix == "BRI" then
    drawWaterline(520)
    for i = 1, 10 do
      local x = math.random(40, WIDTH - 140)
      fillRect(x, 500 + math.random(-40, 25), 120, 18, colors.wood)
      fillRect(x + 18, 452 + math.random(-30, 20), 8, 72, colors.wood)
    end
  elseif prefix == "SOL" then
    drawRuins(648, "ARG")
    for i = 1, 14 do
      fillEllipse(math.random(70, WIDTH - 70), math.random(420, 610), math.random(24, 64), math.random(10, 28), tintColor(colors.sand, math.random(-10, 18), math.random(-8, 12), math.random(-14, 8)))
    end
  elseif prefix == "FOG" then
    drawWaterline(500)
    drawClouds(prefix, kind == "NEAR" and 12 or 8, 250, 470)
    drawCrystals(650, "NOR")
  elseif prefix == "OBL" then
    drawRuins(642, "ABY")
    drawCrystals(650, "ABY")
    for i = 1, 9 do
      drawLine(math.random(40, WIDTH - 40), math.random(390, 610), math.random(40, WIDTH - 40), math.random(440, 650), math.random(4, 10), tintColor(colors.abyDeep, 25, 6, 42))
    end
  else
    drawTrees(660, colors.grass, kind == "MID" and 12 or 6)
    drawRuins(650, "ERB")
  end

  fillRect(0, 674, WIDTH, 46, tintColor(colorFor(prefix, true), -26, -18, -18))
  for x = 0, WIDTH, 48 do
    fillRect(x + math.random(0, 16), 684 + math.random(0, 20), math.random(18, 54), 5, colors.fog)
  end
end

local prefix, kind, phase = string.match(backgroundKey, "^(%u+)%-BG%-(%u+)%-([A-Z]+)$")
local aetherKind = string.match(backgroundKey, "^aether_bg_(%l+)$")
if backgroundKey == "DUNGEON-BG-FAR" then
  drawDungeon()
elseif aetherKind ~= nil then
  drawScene("ERB", string.upper(aetherKind), "DAY")
elseif prefix ~= nil then
  drawScene(prefix, kind, phase)
else
  error("background must match XXX-BG-KIND-PHASE, DUNGEON-BG-FAR, or aether_bg_<kind>: " .. backgroundKey)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
