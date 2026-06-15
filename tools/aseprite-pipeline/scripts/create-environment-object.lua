local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local objectKey = app.params["object"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if objectKey == nil or objectKey == "" then
  error("Missing required --script-param object=<object-key>")
end

local SIZE = 256

local colors = {
  ink = Color { r = 8, g = 10, b = 20, a = 255 },
  shadow = Color { r = 6, g = 8, b = 16, a = 110 },
  bark = Color { r = 91, g = 62, b = 43, a = 255 },
  barkLight = Color { r = 143, g = 96, b = 58, a = 255 },
  leaf = Color { r = 48, g = 132, b = 72, a = 255 },
  leafLight = Color { r = 94, g = 202, b = 94, a = 255 },
  moss = Color { r = 84, g = 190, b = 119, a = 255 },
  sand = Color { r = 203, g = 151, b = 79, a = 255 },
  sandLight = Color { r = 238, g = 193, b = 115, a = 255 },
  stone = Color { r = 91, g = 89, b = 110, a = 255 },
  stoneLight = Color { r = 154, g = 147, b = 167, a = 255 },
  ice = Color { r = 118, g = 204, b = 229, a = 255 },
  iceLight = Color { r = 207, g = 248, b = 255, a = 255 },
  void = Color { r = 57, g = 42, b = 94, a = 255 },
  voidLight = Color { r = 136, g = 80, b = 191, a = 255 },
  crystal = Color { r = 79, g = 229, b = 224, a = 255 },
  crystalLight = Color { r = 189, g = 255, b = 249, a = 255 },
  gold = Color { r = 235, g = 188, b = 78, a = 255 },
  brass = Color { r = 166, g = 111, b = 61, a = 255 },
  brassLight = Color { r = 224, g = 164, b = 85, a = 255 },
  water = Color { r = 50, g = 125, b = 165, a = 255 },
  waterLight = Color { r = 104, g = 195, b = 221, a = 255 },
  flower = Color { r = 225, g = 87, b = 132, a = 255 },
  white = Color { r = 238, g = 244, b = 247, a = 255 },
  steam = Color { r = 194, g = 220, b = 214, a = 150 },
}

local function hashKey(value)
  local hash = 29
  for i = 1, #value do
    hash = (hash * 41 + string.byte(value, i)) % 2147483647
  end
  return hash
end

math.randomseed(hashKey(objectKey))

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
layer.name = "environmentObject"

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

local function tintColor(color, dr, dg, db)
  return Color {
    r = math.max(0, math.min(255, color.red + dr)),
    g = math.max(0, math.min(255, color.green + dg)),
    b = math.max(0, math.min(255, color.blue + db)),
    a = color.alpha,
  }
end

local function has(fragment)
  return string.find(objectKey, fragment, 1, true) ~= nil
end

local function regionPalette()
  if has("sol_") then return colors.sand, colors.sandLight, colors.gold end
  if has("nor_") then return colors.ice, colors.iceLight, colors.crystal end
  if has("arg_") then return colors.brass, colors.brassLight, colors.steam end
  if has("aby_") or has("obl_") then return colors.void, colors.voidLight, colors.crystal end
  if has("bri_") or has("fog_") then return colors.water, colors.waterLight, colors.gold end
  if has("syl_") or has("aether_") then return colors.leaf, colors.leafLight, colors.crystal end
  if has("tem_") then return colors.water, colors.gold, colors.crystal end
  return colors.stone, colors.stoneLight, colors.crystal
end

local base, light, accent = regionPalette()

local function drawShadow(width, y)
  fillEllipse(128, y, width, 12, colors.shadow)
end

local function drawSparkle(cx, cy, color)
  drawLine(cx - 7, cy, cx + 7, cy, 2, color)
  drawLine(cx, cy - 7, cx, cy + 7, 2, color)
  fillDiamond(cx, cy, 3, colors.white)
end

local function drawTree()
  drawShadow(46, 224)
  local trunkX = 118
  drawLine(trunkX + 4, 207, trunkX + 12, 130, 18, colors.ink)
  drawLine(trunkX + 4, 207, trunkX + 12, 130, 12, colors.bark)
  drawLine(trunkX + 12, 164, 91, 132, 8, colors.bark)
  drawLine(trunkX + 15, 151, 158, 119, 8, colors.bark)
  local leafA = base
  local leafB = light
  if has("dead_tree") then
    leafA = colors.stone
    leafB = colors.stoneLight
  elseif has("snow_tree") then
    leafA = colors.ice
    leafB = colors.white
  end
  for i = 1, 14 do
    local x = math.random(74, 177)
    local y = math.random(68, 150)
    local r = math.random(15, 30)
    fillEllipse(x + 2, y + 3, r + 4, math.floor(r * 0.7), colors.ink)
    fillEllipse(x, y, r, math.floor(r * 0.65), i % 3 == 0 and leafB or leafA)
  end
  for i = 1, 16 do
    fillRect(math.random(86, 169), math.random(76, 158), 7, 5, leafB)
  end
end

local function drawRock()
  drawShadow(42, 219)
  for i = 1, 4 do
    local cx = 83 + i * 18 + math.random(-10, 8)
    local cy = 185 + math.random(-15, 12)
    local r = math.random(19, 33)
    fillDiamond(cx + 4, cy + 5, r + 5, colors.ink)
    fillDiamond(cx, cy, r, i % 2 == 0 and base or colors.stone)
    fillDiamond(cx - 5, cy - 5, math.floor(r * 0.42), i % 2 == 0 and light or colors.stoneLight)
  end
  if has("cracked") then
    drawLine(118, 155, 132, 187, 3, colors.ink)
    drawLine(132, 187, 116, 209, 3, colors.ink)
  end
end

local function drawCrystal()
  drawShadow(42, 222)
  local positions = {
    { 106, 205, 58 },
    { 136, 210, 74 },
    { 160, 216, 45 },
    { 83, 216, 38 },
  }
  for _, shard in ipairs(positions) do
    local x = shard[1]
    local bottom = shard[2]
    local h = shard[3]
    fillTriangle(x - 14, bottom, x + 14, bottom, x, bottom - h, colors.ink)
    fillTriangle(x - 10, bottom - 2, x + 10, bottom - 2, x, bottom - h + 8, accent)
    fillTriangle(x - 4, bottom - 4, x + 7, bottom - 4, x, bottom - h + 16, colors.crystalLight)
  end
  drawSparkle(146, 128, colors.crystalLight)
end

local function drawPillar()
  drawShadow(34, 224)
  local x = 107
  local top = has("stalactite") and 43 or 92
  local bottom = has("stalactite") and 202 or 220
  if has("stalactite") then
    fillTriangle(93, top, 164, top, 128, bottom, colors.ink)
    fillTriangle(101, top + 5, 155, top + 5, 128, bottom - 10, base)
    fillTriangle(122, top + 8, 145, top + 8, 131, bottom - 35, light)
    return
  end
  fillRect(x - 8, top - 8, 74, 15, colors.ink)
  fillRect(x - 3, top - 5, 64, 9, light)
  fillRect(x, top, 58, bottom - top, colors.ink)
  fillRect(x + 7, top + 4, 44, bottom - top - 8, base)
  for y = top + 18, bottom - 8, 30 do
    fillRect(x + 5, y, 48, 4, colors.ink)
    fillRect(x + 9, y + 1, 38, 2, light)
  end
end

local function drawLantern()
  drawShadow(26, 225)
  drawLine(126, 220, 126, 102, 8, colors.ink)
  drawLine(126, 220, 126, 102, 4, colors.bark)
  drawLine(126, 104, 154, 112, 6, colors.ink)
  drawLine(126, 104, 154, 112, 3, colors.barkLight)
  fillEllipse(160, 140, 25, 31, Color { r = accent.red, g = accent.green, b = accent.blue, a = 75 })
  fillRect(143, 118, 34, 43, colors.ink)
  fillRect(148, 123, 24, 32, colors.gold)
  fillRect(154, 128, 12, 21, colors.white)
end

local function drawFlowerBed()
  drawShadow(48, 222)
  for i = 1, 30 do
    local x = math.random(72, 181)
    local y = math.random(175, 214)
    drawLine(x, y + 12, x + math.random(-4, 4), y, 2, base)
    fillDiamond(x, y, math.random(3, 7), i % 3 == 0 and colors.flower or light)
  end
end

local function drawMushrooms()
  drawShadow(38, 224)
  for i = 1, 8 do
    local x = math.random(73, 178)
    local y = math.random(156, 212)
    local h = math.random(18, 38)
    fillRect(x - 4, y - h + 9, 8, h, colors.white)
    fillEllipse(x, y - h + 6, math.random(11, 20), math.random(7, 13), colors.ink)
    fillEllipse(x, y - h + 3, math.random(8, 16), math.random(5, 10), i % 2 == 0 and colors.flower or light)
  end
end

local function drawCactus()
  drawShadow(30, 224)
  drawLine(128, 221, 128, 100, 24, colors.ink)
  drawLine(128, 221, 128, 100, 17, base)
  drawLine(128, 152, 94, 141, 14, colors.ink)
  drawLine(94, 141, 94, 113, 14, colors.ink)
  drawLine(128, 152, 98, 142, 9, base)
  drawLine(98, 142, 98, 116, 9, base)
  drawLine(131, 138, 163, 127, 14, colors.ink)
  drawLine(163, 127, 163, 103, 14, colors.ink)
  drawLine(131, 138, 159, 129, 9, base)
  drawLine(159, 129, 159, 106, 9, base)
  for y = 110, 210, 18 do
    fillRect(127, y, 3, 8, light)
  end
end

local function drawGearPost()
  drawShadow(32, 224)
  drawLine(128, 222, 128, 94, 10, colors.ink)
  drawLine(128, 222, 128, 94, 6, colors.brass)
  fillEllipse(128, 91, 38, 38, colors.ink)
  fillEllipse(128, 91, 27, 27, colors.brassLight)
  fillEllipse(128, 91, 10, 10, colors.ink)
  for i = 0, 7 do
    local angle = i * 0.785
    local x = 128 + math.floor(math.cos(angle) * 41)
    local y = 91 + math.floor(math.sin(angle) * 41)
    fillRect(x - 5, y - 5, 10, 10, colors.ink)
  end
end

local function drawSteamVent()
  drawShadow(36, 224)
  fillRect(86, 195, 84, 26, colors.ink)
  fillRect(94, 199, 68, 16, colors.brass)
  for x = 100, 150, 16 do
    fillRect(x, 195, 7, 28, colors.brassLight)
  end
  for i = 1, 5 do
    local x = 86 + i * 18
    drawLine(x, 188, x + math.random(-14, 16), 126 + math.random(-18, 8), 6, colors.steam)
  end
end

local function drawCrates()
  drawShadow(42, 224)
  local boxes = {
    { 82, 170, 43, 43 },
    { 126, 170, 43, 43 },
    { 104, 128, 43, 43 },
  }
  for _, box in ipairs(boxes) do
    fillRect(box[1] - 4, box[2] - 4, box[3] + 8, box[4] + 8, colors.ink)
    fillRect(box[1], box[2], box[3], box[4], colors.bark)
    drawLine(box[1], box[2], box[1] + box[3], box[2] + box[4], 3, colors.barkLight)
    drawLine(box[1] + box[3], box[2], box[1], box[2] + box[4], 3, colors.barkLight)
  end
end

local function drawBarrel()
  drawShadow(30, 224)
  fillEllipse(128, 161, 38, 56, colors.ink)
  fillEllipse(128, 162, 30, 49, colors.bark)
  fillRect(96, 133, 64, 8, colors.brass)
  fillRect(96, 181, 64, 8, colors.brass)
  drawLine(115, 122, 111, 203, 3, colors.barkLight)
  drawLine(141, 122, 145, 203, 3, colors.barkLight)
end

local function drawAnchor()
  drawShadow(37, 224)
  drawLine(128, 210, 128, 92, 10, colors.ink)
  drawLine(128, 210, 128, 92, 5, colors.stoneLight)
  fillEllipse(128, 86, 18, 18, colors.ink)
  fillEllipse(128, 86, 10, 10, colors.water)
  drawLine(81, 182, 175, 182, 8, colors.ink)
  drawLine(81, 182, 175, 182, 4, colors.stoneLight)
  drawLine(86, 181, 61, 151, 8, colors.ink)
  drawLine(170, 181, 195, 151, 8, colors.ink)
  drawLine(86, 181, 64, 155, 4, colors.stoneLight)
  drawLine(170, 181, 192, 155, 4, colors.stoneLight)
end

local function drawNet()
  drawShadow(44, 224)
  for i = 0, 6 do
    drawLine(76 + i * 16, 135, 109 + i * 13, 215, 3, colors.barkLight)
    drawLine(178 - i * 16, 135, 145 - i * 13, 215, 3, colors.barkLight)
  end
  fillEllipse(124, 178, 63, 13, Color { r = colors.waterLight.red, g = colors.waterLight.green, b = colors.waterLight.blue, a = 90 })
end

local function drawWisp()
  drawShadow(22, 224)
  for i = 1, 4 do
    local x = 100 + i * 14 + math.random(-8, 9)
    local y = 137 + math.random(-20, 28)
    fillEllipse(x, y, 17, 24, Color { r = accent.red, g = accent.green, b = accent.blue, a = 90 })
    fillEllipse(x, y, 8, 13, colors.white)
  end
  drawLine(128, 206, 133, 161, 4, colors.crystal)
end

local function drawClock()
  drawShadow(42, 224)
  fillEllipse(128, 153, 52, 52, colors.ink)
  fillEllipse(128, 153, 43, 43, colors.brass)
  fillEllipse(128, 153, 34, 34, colors.stone)
  drawLine(128, 153, 128, 126, 4, colors.gold)
  drawLine(128, 153, 154, 163, 4, colors.gold)
  fillRect(91, 203, 74, 14, colors.ink)
  fillRect(99, 204, 58, 8, colors.brass)
  drawLine(96, 118, 75, 94, 7, colors.ink)
  drawLine(160, 118, 181, 94, 7, colors.ink)
end

local function drawDriftwood()
  drawShadow(46, 224)
  drawLine(78, 195, 178, 166, 18, colors.ink)
  drawLine(82, 194, 174, 168, 12, colors.bark)
  drawLine(118, 180, 102, 144, 8, colors.ink)
  drawLine(118, 180, 105, 147, 4, colors.barkLight)
  for i = 1, 5 do
    fillRect(math.random(91, 161), math.random(165, 195), 14, 3, colors.barkLight)
  end
end

if has("crystal") or has("shard") then
  drawCrystal()
elseif has("tree") then
  drawTree()
elseif has("rock") or has("stone") then
  drawRock()
elseif has("pillar") or has("stalactite") then
  drawPillar()
elseif has("lantern") then
  drawLantern()
elseif has("flower") or has("moss") then
  drawFlowerBed()
elseif has("mushroom") then
  drawMushrooms()
elseif has("cactus") then
  drawCactus()
elseif has("gear") then
  drawGearPost()
elseif has("steam") then
  drawSteamVent()
elseif has("crate") then
  drawCrates()
elseif has("barrel") then
  drawBarrel()
elseif has("anchor") then
  drawAnchor()
elseif has("net") then
  drawNet()
elseif has("wisp") then
  drawWisp()
elseif has("clock") then
  drawClock()
elseif has("driftwood") then
  drawDriftwood()
else
  drawRock()
end

for i = 1, 7 do
  local x = math.random(52, 202)
  local y = math.random(92, 205)
  fillRect(x, y, math.random(3, 8), math.random(2, 5), tintColor(light, 18, 18, 18))
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
