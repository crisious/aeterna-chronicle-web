local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local classId = app.params["class"]
local view = app.params["view"] or "front"
local advancement = tonumber(app.params["advancement"] or "0") or 0

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if classId == nil or classId == "" then
  error("Missing required --script-param class=<class-id>")
end

local WIDTH = 256
local HEIGHT = 384
local SCALE = 4

local colors = {
  ink = Color { r = 5, g = 7, b = 16, a = 255 },
  outlineSoft = Color { r = 21, g = 25, b = 42, a = 235 },
  shadow = Color { r = 6, g = 8, b = 18, a = 120 },
  skin = Color { r = 240, g = 160, b = 130, a = 255 },
  skinLight = Color { r = 255, g = 198, b = 164, a = 255 },
  white = Color { r = 236, g = 246, b = 246, a = 255 },
  pearl = Color { r = 184, g = 255, b = 248, a = 255 },
  leather = Color { r = 86, g = 50, b = 36, a = 255 },
  leatherLight = Color { r = 143, g = 84, b = 47, a = 255 },
}

local palettes = {
  ether_knight = {
    cloth = Color { r = 31, g = 92, b = 173, a = 255 },
    clothLight = Color { r = 69, g = 185, b = 232, a = 255 },
    armor = Color { r = 222, g = 145, b = 32, a = 255 },
    armorLight = Color { r = 255, g = 220, b = 86, a = 255 },
    accent = Color { r = 83, g = 242, b = 255, a = 255 },
    hair = Color { r = 255, g = 187, b = 66, a = 255 },
    dark = Color { r = 16, g = 33, b = 79, a = 255 },
  },
  memory_weaver = {
    cloth = Color { r = 38, g = 123, b = 131, a = 255 },
    clothLight = Color { r = 105, g = 220, b = 204, a = 255 },
    armor = Color { r = 94, g = 70, b = 168, a = 255 },
    armorLight = Color { r = 180, g = 145, b = 245, a = 255 },
    accent = Color { r = 255, g = 213, b = 104, a = 255 },
    hair = Color { r = 196, g = 242, b = 224, a = 255 },
    dark = Color { r = 23, g = 45, b = 70, a = 255 },
  },
  shadow_weaver = {
    cloth = Color { r = 54, g = 38, b = 91, a = 255 },
    clothLight = Color { r = 132, g = 76, b = 194, a = 255 },
    armor = Color { r = 30, g = 32, b = 49, a = 255 },
    armorLight = Color { r = 88, g = 92, b = 119, a = 255 },
    accent = Color { r = 255, g = 83, b = 171, a = 255 },
    hair = Color { r = 225, g = 214, b = 255, a = 255 },
    dark = Color { r = 15, g = 15, b = 28, a = 255 },
  },
  memory_breaker = {
    cloth = Color { r = 113, g = 39, b = 39, a = 255 },
    clothLight = Color { r = 215, g = 85, b = 57, a = 255 },
    armor = Color { r = 94, g = 94, b = 111, a = 255 },
    armorLight = Color { r = 184, g = 180, b = 171, a = 255 },
    accent = Color { r = 255, g = 191, b = 75, a = 255 },
    hair = Color { r = 94, g = 58, b = 42, a = 255 },
    dark = Color { r = 48, g = 23, b = 24, a = 255 },
  },
  time_guardian = {
    cloth = Color { r = 47, g = 52, b = 130, a = 255 },
    clothLight = Color { r = 121, g = 133, b = 232, a = 255 },
    armor = Color { r = 178, g = 125, b = 54, a = 255 },
    armorLight = Color { r = 247, g = 204, b = 89, a = 255 },
    accent = Color { r = 94, g = 236, b = 255, a = 255 },
    hair = Color { r = 201, g = 214, b = 255, a = 255 },
    dark = Color { r = 30, g = 31, b = 82, a = 255 },
  },
  void_wanderer = {
    cloth = Color { r = 45, g = 36, b = 92, a = 255 },
    clothLight = Color { r = 106, g = 82, b = 190, a = 255 },
    armor = Color { r = 40, g = 84, b = 77, a = 255 },
    armorLight = Color { r = 83, g = 209, b = 167, a = 255 },
    accent = Color { r = 185, g = 255, b = 120, a = 255 },
    hair = Color { r = 226, g = 249, b = 232, a = 255 },
    dark = Color { r = 20, g = 16, b = 44, a = 255 },
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
layer.name = "characterIllustration"

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

local function drawAura()
  if advancement <= 0 then
    return
  end

  local aura = tint(palette.accent, 20, 20, 20, 88)
  fillEllipse(32, 52, 24 + advancement * 2, 34 + advancement * 3, aura)

  if advancement >= 2 then
    fillTriangle(14, 48, 4, 22, 25, 39, tint(palette.accent, -20, 10, 12, 92))
    fillTriangle(50, 48, 60, 22, 39, 39, tint(palette.accent, -20, 10, 12, 92))
  end

  if advancement >= 3 then
    drawLine(32, 13, 32, 7, 2, palette.accent)
    fillDiamond(32, 6, 3, colors.white)
    drawSpark(13, 19, palette.accent)
    drawSpark(51, 19, palette.accent)
  end
end

local function drawCape()
  local capeColor = view == "back" and palette.dark or tint(palette.dark, 8, 6, 12)
  local capeLight = tint(capeColor, 32, 28, 42)

  if view == "side" then
    fillTriangle(28, 33, 51, 45, 43, 87, colors.ink)
    fillTriangle(30, 35, 48, 46, 41, 83, capeColor)
    drawLine(38, 42, 43, 78, 2, capeLight)
    return
  end

  fillTriangle(17, 34, 47, 34, 54, 86, colors.ink)
  fillTriangle(20, 36, 44, 36, 50, 82, capeColor)
  drawLine(27, 39, 23, 76, 2, capeLight)
  drawLine(38, 39, 44, 78, 2, capeLight)
end

local function drawLegs()
  local leftX = view == "side" and 29 or 22
  local rightX = view == "side" and 34 or 37

  fillRect(leftX - 2, 61, 8, 24, colors.ink)
  fillRect(leftX, 61, 5, 21, palette.cloth)
  fillRect(rightX - 2, 61, 8, 24, colors.ink)
  fillRect(rightX, 61, 5, 21, palette.cloth)
  fillRect(leftX - 4, 82, 11, 5, colors.ink)
  fillRect(rightX - 2, 82, 11, 5, colors.ink)
  fillRect(leftX - 2, 81, 8, 4, colors.leather)
  fillRect(rightX, 81, 8, 4, colors.leather)
  fillRect(leftX + 1, 65, 2, 11, palette.clothLight)
  fillRect(rightX + 1, 65, 2, 11, palette.clothLight)
end

local function drawTorso()
  if view == "side" then
    fillEllipse(32, 40, 10, 12, colors.ink)
    fillEllipse(33, 40, 7, 10, palette.armor)
    fillRect(30, 47, 9, 18, colors.ink)
    fillRect(32, 47, 6, 16, palette.cloth)
    fillRect(36, 49, 2, 11, palette.clothLight)
    return
  end

  fillDiamond(32, 43, 15, colors.ink)
  fillDiamond(32, 43, 11, palette.armor)
  fillDiamond(32, 43, 7, palette.cloth)
  fillRect(24, 51, 16, 14, colors.ink)
  fillRect(27, 51, 11, 12, palette.cloth)
  fillRect(31, 35, 3, 27, palette.clothLight)

  if view == "back" then
    fillDiamond(32, 44, 5, palette.accent)
    drawLine(25, 37, 39, 51, 1, palette.armorLight)
    drawLine(39, 37, 25, 51, 1, palette.armorLight)
  else
    fillDiamond(32, 42, 4, palette.accent)
    fillRect(24, 55, 16, 3, colors.leather)
    fillRect(31, 54, 3, 5, palette.armorLight)
  end
end

local function drawArms()
  if view == "side" then
    drawLine(31, 45, 22, 58, 4, colors.ink)
    drawLine(32, 45, 24, 58, 2, palette.armorLight)
    drawLine(36, 45, 46, 58, 4, colors.ink)
    drawLine(36, 45, 45, 58, 2, palette.armor)
    fillEllipse(22, 59, 3, 3, colors.skin)
    fillEllipse(46, 59, 3, 3, colors.skin)
    return
  end

  drawLine(22, 38, 15, 57, 5, colors.ink)
  drawLine(22, 38, 17, 56, 3, palette.armor)
  drawLine(42, 38, 49, 57, 5, colors.ink)
  drawLine(42, 38, 47, 56, 3, palette.armor)
  fillEllipse(15, 58, 3, 3, colors.skin)
  fillEllipse(49, 58, 3, 3, colors.skin)

  if advancement >= 2 then
    fillDiamond(16, 47, 3, palette.accent)
    fillDiamond(48, 47, 3, palette.accent)
  end
end

local function drawHead()
  local headX = view == "side" and 35 or 32

  fillEllipse(headX, 22, 8, 9, colors.ink)
  fillEllipse(headX, 22, 6, 7, view == "back" and palette.hair or colors.skin)

  if view == "back" then
    fillTriangle(24, 20, 40, 20, 36, 35, colors.ink)
    fillTriangle(26, 20, 38, 20, 35, 32, palette.hair)
    fillRect(28, 28, 8, 5, tint(palette.hair, -26, -20, -18))
  elseif view == "side" then
    fillTriangle(29, 14, 42, 21, 31, 29, colors.ink)
    fillTriangle(30, 15, 39, 21, 31, 27, palette.hair)
    fillPixel(px(38), px(21), palette.accent)
    fillRect(37, 25, 4, 1, tint(colors.skin, -48, -42, -36))
  else
    fillTriangle(21, 20, 32, 9, 43, 20, colors.ink)
    fillTriangle(24, 20, 32, 11, 40, 20, palette.hair)
    fillRect(27, 18, 2, 2, tint(colors.skin, -70, -50, -45))
    fillRect(35, 18, 2, 2, tint(colors.skin, -70, -50, -45))
    fillRect(30, 24, 5, 1, tint(colors.skin, -45, -38, -34))
  end

  if advancement >= 1 then
    fillRect(headX - 6, 13, 12, 3, colors.ink)
    fillRect(headX - 4, 13, 8, 1, palette.armorLight)
    fillDiamond(headX, 12, 2, palette.accent)
  end
end

local function drawWeapon()
  if classId == "ether_knight" then
    drawLine(52, 32, 52, 83, 3, colors.ink)
    drawLine(52, 34, 52, 80, 1, colors.white)
    fillDiamond(52, 56, 3, palette.accent)
    fillRect(49, 59, 7, 2, palette.armorLight)
  elseif classId == "memory_weaver" then
    drawLine(12, 24, 12, 84, 3, colors.ink)
    drawLine(12, 25, 12, 82, 1, palette.armorLight)
    fillEllipse(12, 20, 6, 6, colors.ink)
    fillEllipse(12, 20, 4, 4, palette.accent)
    fillRect(43, 55, 10, 7, colors.ink)
    fillRect(44, 56, 8, 5, palette.clothLight)
  elseif classId == "shadow_weaver" then
    drawLine(12, 55, 6, 67, 3, colors.ink)
    drawLine(52, 55, 58, 67, 3, colors.ink)
    drawLine(12, 55, 7, 66, 1, palette.accent)
    drawLine(52, 55, 57, 66, 1, palette.accent)
  elseif classId == "memory_breaker" then
    drawLine(52, 30, 45, 80, 5, colors.ink)
    drawLine(51, 33, 45, 78, 2, colors.leatherLight)
    fillRect(45, 25, 14, 10, colors.ink)
    fillRect(47, 27, 10, 6, palette.armorLight)
  elseif classId == "time_guardian" then
    fillEllipse(52, 24, 9, 9, colors.ink)
    fillEllipse(52, 24, 6, 6, palette.armorLight)
    drawLine(52, 24, 52, 18, 1, palette.accent)
    drawLine(52, 24, 57, 27, 1, palette.accent)
    drawLine(52, 34, 52, 83, 3, colors.ink)
    drawLine(52, 36, 52, 80, 1, palette.armorLight)
  elseif classId == "void_wanderer" then
    fillEllipse(53, 31, 8, 8, tint(palette.accent, 0, 0, 0, 95))
    fillEllipse(53, 31, 4, 4, palette.accent)
    drawLine(50, 37, 44, 83, 3, colors.ink)
    drawLine(50, 37, 45, 81, 1, palette.clothLight)
  end
end

local function drawAdvancedMarks()
  if advancement <= 0 then
    return
  end

  fillDiamond(32, 35, 3 + advancement, tint(palette.accent, 15, 12, 8))
  drawSpark(22, 30 + advancement, palette.accent)
  drawSpark(42, 31 + advancement, palette.accent)

  if advancement >= 2 then
    fillRect(19, 59, 6, 2, palette.accent)
    fillRect(39, 59, 6, 2, palette.accent)
  end

  if advancement >= 3 then
    fillDiamond(32, 72, 5, tint(palette.accent, 20, 20, 20, 150))
  end
end

fillEllipse(32, 87, 22, 4, colors.shadow)
drawAura()
drawCape()
drawLegs()
drawTorso()
drawArms()
drawHead()
drawWeapon()
drawAdvancedMarks()

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
