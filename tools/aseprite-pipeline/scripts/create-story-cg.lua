local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local storyKey = app.params["story"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if storyKey == nil or storyKey == "" then
  error("Missing required --script-param story=<story-cg-id>")
end

local WIDTH = 1216
local HEIGHT = 832

local colors = {
  ink = Color { r = 7, g = 8, b = 18, a = 255 },
  night = Color { r = 12, g = 14, b = 34, a = 255 },
  white = Color { r = 230, g = 244, b = 247, a = 255 },
  mist = Color { r = 142, g = 166, b = 181, a = 135 },
  erbSky = Color { r = 83, g = 155, b = 87, a = 255 },
  erbDeep = Color { r = 28, g = 76, b = 48, a = 255 },
  sylSky = Color { r = 70, g = 160, b = 126, a = 255 },
  sylDeep = Color { r = 22, g = 88, b = 70, a = 255 },
  solSky = Color { r = 231, g = 166, b = 78, a = 255 },
  solDeep = Color { r = 119, g = 67, b = 45, a = 255 },
  argSky = Color { r = 188, g = 124, b = 74, a = 255 },
  argDeep = Color { r = 83, g = 57, b = 50, a = 255 },
  oblSky = Color { r = 76, g = 55, b = 112, a = 255 },
  oblDeep = Color { r = 24, g = 18, b = 48, a = 255 },
  divineSky = Color { r = 151, g = 112, b = 205, a = 255 },
  divineDeep = Color { r = 42, g = 32, b = 94, a = 255 },
  grass = Color { r = 79, g = 166, b = 74, a = 255 },
  forest = Color { r = 38, g = 119, b = 83, a = 255 },
  sand = Color { r = 199, g = 145, b = 78, a = 255 },
  stone = Color { r = 103, g = 96, b = 119, a = 255 },
  stoneLight = Color { r = 166, g = 153, b = 176, a = 255 },
  crystal = Color { r = 85, g = 228, b = 225, a = 240 },
  crystalDim = Color { r = 64, g = 132, b = 176, a = 230 },
  gold = Color { r = 242, g = 198, b = 83, a = 255 },
  brass = Color { r = 170, g = 111, b = 60, a = 255 },
  ember = Color { r = 224, g = 82, b = 74, a = 230 },
  water = Color { r = 49, g = 121, b = 163, a = 240 },
  void = Color { r = 61, g = 42, b = 93, a = 245 },
}

local function hashKey(value)
  local hash = 37
  for i = 1, #value do
    hash = (hash * 43 + string.byte(value, i)) % 2147483647
  end
  return hash
end

math.randomseed(hashKey(storyKey))

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
layer.name = "storyCg"

local image = Image(WIDTH, HEIGHT, ColorMode.RGB)
image:clear()

local function tintColor(color, dr, dg, db)
  return Color {
    r = math.max(0, math.min(255, color.red + dr)),
    g = math.max(0, math.min(255, color.green + dg)),
    b = math.max(0, math.min(255, color.blue + db)),
    a = color.alpha,
  }
end

local function fillPixel(x, y, color)
  if x >= 0 and x < WIDTH and y >= 0 and y < HEIGHT then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  local x0 = math.max(0, math.floor(x))
  local y0 = math.max(0, math.floor(y))
  local x1 = math.min(WIDTH - 1, math.floor(x + w - 1))
  local y1 = math.min(HEIGHT - 1, math.floor(y + h - 1))
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

local function fillTriangle(x1, y1, x2, y2, x3, y3, color)
  local minY = math.max(0, math.min(y1, y2, y3))
  local maxY = math.min(HEIGHT - 1, math.max(y1, y2, y3))
  local points = {
    { x = x1, y = y1 },
    { x = x2, y = y2 },
    { x = x3, y = y3 },
  }

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
        fillRect(nodes[i], y, nodes[i + 1] - nodes[i] + 1, 1, color)
      end
    end
  end
end

local function drawGradient(top, bottom)
  local bands = 32
  local bandHeight = math.ceil(HEIGHT / bands)
  for i = 0, bands - 1 do
    local t = i / (bands - 1)
    local r = math.floor(top.red * (1 - t) + bottom.red * t)
    local g = math.floor(top.green * (1 - t) + bottom.green * t)
    local b = math.floor(top.blue * (1 - t) + bottom.blue * t)
    fillRect(0, i * bandHeight, WIDTH, bandHeight, Color { r = r, g = g, b = b, a = 255 })
  end
end

local function drawStars(count, color)
  for i = 1, count do
    local x = math.random(20, WIDTH - 20)
    local y = math.random(20, 350)
    fillRect(x, y, 2, 2, color)
    if i % 7 == 0 then
      fillPixel(x - 1, y, color)
      fillPixel(x + 2, y, color)
      fillPixel(x, y - 1, color)
      fillPixel(x, y + 2, color)
    end
  end
end

local function drawClouds(count, color)
  for i = 1, count do
    local cx = math.random(70, WIDTH - 70)
    local cy = math.random(62, 278)
    local scale = math.random(2, 5)
    fillEllipse(cx, cy, 18 * scale, 6 * scale, color)
    fillEllipse(cx - 24 * scale, cy + 5, 12 * scale, 5 * scale, color)
    fillEllipse(cx + 25 * scale, cy + 3, 13 * scale, 5 * scale, color)
  end
end

local function drawHills(baseY, color, count)
  for i = 1, count do
    local cx = math.floor((i - 1) * WIDTH / count) + math.random(-70, 70)
    local rx = math.random(190, 340)
    local ry = math.random(70, 135)
    fillEllipse(cx, baseY + ry, rx, ry, color)
  end
end

local function drawForest(baseY, color, count)
  for i = 1, count do
    local x = math.random(-30, WIDTH + 30)
    local h = math.random(110, 230)
    fillRect(x - 7, baseY - h + 62, 14, h, colors.ink)
    fillRect(x - 4, baseY - h + 66, 8, h - 8, tintColor(colors.brass, -70, -42, -28))
    fillDiamond(x, baseY - h + 58, math.random(48, 82), color)
    fillDiamond(x - 32, baseY - h + 92, math.random(34, 58), tintColor(color, -20, 8, -8))
    fillDiamond(x + 34, baseY - h + 98, math.random(34, 58), tintColor(color, 16, 20, 5))
  end
end

local function drawRuins(baseY, color)
  for i = 1, 11 do
    local x = math.random(30, WIDTH - 110)
    local h = math.random(70, 190)
    fillRect(x, baseY - h, 30, h, colors.ink)
    fillRect(x + 5, baseY - h + 5, 20, h - 5, color)
    if i % 3 == 0 then
      fillRect(x - 18, baseY - h + 12, 66, 16, colors.ink)
      fillRect(x - 10, baseY - h + 15, 50, 9, colors.stoneLight)
    end
  end
end

local function drawCrystals(baseY, color, count)
  for i = 1, count do
    local x = math.random(55, WIDTH - 55)
    local bottom = baseY - math.random(0, 84)
    local h = math.random(52, 142)
    local w = math.random(18, 40)
    fillTriangle(x - w, bottom, x + w, bottom, x, bottom - h, colors.ink)
    fillTriangle(x - w + 6, bottom - 5, x + w - 6, bottom - 5, x, bottom - h + 15, color)
    fillTriangle(x - 5, bottom - 8, x + 12, bottom - 8, x, bottom - h + 32, colors.white)
  end
end

local function drawWater(baseY)
  fillRect(0, baseY, WIDTH, HEIGHT - baseY, tintColor(colors.water, -23, -15, -8))
  for y = baseY + 20, HEIGHT - 12, 34 do
    for x = math.random(-70, 0), WIDTH, 136 do
      fillRect(x, y, math.random(38, 102), 3, tintColor(colors.water, 45, 48, 32))
    end
  end
end

local function drawSpire(cx, baseY, height, color)
  fillTriangle(cx - 70, baseY, cx + 70, baseY, cx, baseY - height, colors.ink)
  fillTriangle(cx - 48, baseY - 8, cx + 48, baseY - 8, cx, baseY - height + 42, color)
  fillDiamond(cx, baseY - height + 98, 28, colors.crystal)
end

local function drawPortal(cx, cy, rx, ry, color)
  fillEllipse(cx, cy, rx + 18, ry + 18, colors.ink)
  fillEllipse(cx, cy, rx, ry, color)
  fillEllipse(cx, cy, math.floor(rx * 0.62), math.floor(ry * 0.62), colors.void)
  for i = 1, 14 do
    local angle = i * 0.45
    local x = cx + math.floor(math.cos(angle) * rx)
    local y = cy + math.floor(math.sin(angle) * ry)
    fillDiamond(x, y, math.random(5, 12), colors.white)
  end
end

local function drawChapter(prefix)
  if prefix == "SYL" then
    drawGradient(colors.sylSky, colors.sylDeep)
    drawClouds(8, tintColor(colors.mist, 38, 42, 35))
    drawHills(520, tintColor(colors.sylDeep, -38, -18, -14), 5)
    drawHills(642, tintColor(colors.sylDeep, -12, -5, -3), 7)
    drawForest(770, colors.forest, 20)
    drawCrystals(750, colors.crystal, 10)
  elseif prefix == "SOL" then
    drawGradient(colors.solSky, colors.solDeep)
    drawClouds(5, tintColor(colors.mist, 54, 28, -15))
    drawHills(530, tintColor(colors.solDeep, -12, -22, -24), 5)
    drawHills(670, colors.sand, 8)
    drawRuins(745, colors.stone)
    for i = 1, 22 do
      fillEllipse(math.random(30, WIDTH - 30), math.random(620, 805), math.random(35, 90), math.random(10, 26), tintColor(colors.sand, math.random(-18, 22), math.random(-10, 14), math.random(-16, 8)))
    end
  elseif prefix == "ARG" then
    drawGradient(colors.argSky, colors.argDeep)
    drawClouds(7, tintColor(colors.mist, 38, 16, -8))
    drawHills(520, tintColor(colors.argDeep, -30, -22, -20), 5)
    drawRuins(725, colors.brass)
    for i = 1, 10 do
      fillEllipse(math.random(80, WIDTH - 80), math.random(470, 670), math.random(35, 60), math.random(35, 60), colors.brass)
      drawLine(math.random(80, WIDTH - 80), 520, math.random(80, WIDTH - 80), 735, 6, tintColor(colors.brass, 30, 20, 6))
    end
  elseif prefix == "OBL" then
    drawGradient(colors.oblSky, colors.oblDeep)
    drawStars(90, tintColor(colors.crystal, 20, 20, 35))
    drawHills(530, tintColor(colors.oblDeep, -8, -8, -5), 6)
    drawRuins(735, colors.stone)
    drawCrystals(755, colors.crystal, 18)
    drawPortal(920, 282, 96, 128, tintColor(colors.void, 80, 40, 118))
  else
    drawGradient(colors.erbSky, colors.erbDeep)
    drawClouds(7, tintColor(colors.mist, 28, 38, 18))
    drawHills(520, tintColor(colors.erbDeep, -28, -22, -18), 5)
    drawHills(650, tintColor(colors.erbDeep, -8, -8, -6), 8)
    drawForest(780, colors.grass, 12)
    drawRuins(735, colors.stone)
    drawCrystals(760, colors.crystal, 8)
  end
end

local function drawEnding(kind)
  if kind == "guardian" then
    drawGradient(tintColor(colors.sylSky, 35, 30, 28), tintColor(colors.sylDeep, -10, -8, -5))
    drawClouds(9, tintColor(colors.mist, 58, 54, 35))
    drawHills(540, tintColor(colors.sylDeep, -32, -18, -10), 5)
    drawForest(790, colors.forest, 22)
    drawCrystals(748, colors.crystal, 12)
    fillEllipse(608, 290, 120, 120, Color { r = 255, g = 232, b = 140, a = 210 })
  elseif kind == "witness" then
    drawGradient(tintColor(colors.oblSky, -8, 4, 40), tintColor(colors.oblDeep, -6, -4, 8))
    drawStars(130, colors.white)
    drawHills(580, tintColor(colors.oblDeep, 8, 8, 26), 6)
    drawSpire(608, 735, 440, tintColor(colors.crystalDim, 30, 50, 80))
    drawWater(705)
  elseif kind == "oblivion" then
    drawGradient(tintColor(colors.oblSky, -28, -18, -2), tintColor(colors.oblDeep, -15, -12, -8))
    drawStars(65, tintColor(colors.ember, 20, -15, -12))
    drawHills(550, tintColor(colors.oblDeep, -8, -7, -4), 7)
    drawPortal(608, 318, 145, 175, tintColor(colors.ember, -8, -25, 12))
    drawRuins(740, tintColor(colors.stone, -30, -22, -18))
    drawCrystals(765, tintColor(colors.void, 20, 8, 45), 10)
  elseif kind == "return" then
    drawGradient(colors.divineSky, colors.divineDeep)
    drawStars(120, colors.gold)
    drawClouds(6, tintColor(colors.mist, 70, 42, 45))
    drawPortal(608, 295, 132, 155, tintColor(colors.gold, 8, 16, 22))
    for i = 1, 12 do
      local x = 160 + i * 76
      drawLine(x, 140, x + math.random(-35, 35), 760, math.random(5, 11), Color { r = 244, g = 214, b = 112, a = 190 })
    end
    drawHills(662, tintColor(colors.divineDeep, -5, -10, -12), 6)
    drawCrystals(775, colors.gold, 14)
  else
    drawGradient(colors.night, tintColor(colors.oblDeep, -18, -14, -8))
    drawStars(45, tintColor(colors.mist, -20, -18, 0))
    drawHills(555, tintColor(colors.oblDeep, -12, -12, -8), 7)
    drawRuins(740, tintColor(colors.stone, -48, -42, -35))
    drawPortal(910, 260, 105, 140, tintColor(colors.void, 10, -8, 45))
    fillRect(0, 744, WIDTH, 88, Color { r = 9, g = 9, b = 16, a = 255 })
  end
end

if storyKey == "ch2_sylvanheim" then
  drawChapter("SYL")
elseif storyKey == "ch3_solaris" then
  drawChapter("SOL")
elseif storyKey == "ch4_argentium" then
  drawChapter("ARG")
elseif storyKey == "ch5_plateau" then
  drawChapter("OBL")
elseif storyKey == "ending_a_guardian" then
  drawEnding("guardian")
elseif storyKey == "ending_b_witness" then
  drawEnding("witness")
elseif storyKey == "ending_c_oblivion" then
  drawEnding("oblivion")
elseif storyKey == "ending_d_return" then
  drawEnding("return")
elseif storyKey == "defeat_oblivion" then
  drawEnding("defeat")
else
  drawChapter("ERB")
end

fillRect(0, 0, WIDTH, 16, Color { r = colors.ink.red, g = colors.ink.green, b = colors.ink.blue, a = 180 })
fillRect(0, HEIGHT - 18, WIDTH, 18, Color { r = colors.ink.red, g = colors.ink.green, b = colors.ink.blue, a = 190 })
for i = 1, 40 do
  fillRect(math.random(0, WIDTH - 8), math.random(0, HEIGHT - 8), math.random(2, 7), math.random(2, 7), Color { r = 255, g = 255, b = 255, a = math.random(38, 88) })
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
