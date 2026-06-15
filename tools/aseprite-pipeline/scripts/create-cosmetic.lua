local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local cosmeticId = app.params["cosmetic"]
local seasonValue = tonumber(app.params["season"] or "1")

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if cosmeticId == nil or cosmeticId == "" then
  error("Missing required --script-param cosmetic=<cosmetic-id>")
end

local SIZE = 512

local colors = {
  ink = Color { r = 8, g = 10, b = 20, a = 255 },
  deep = Color { r = 23, g = 24, b = 44, a = 255 },
  shadow = Color { r = 6, g = 8, b = 16, a = 112 },
  white = Color { r = 239, g = 246, b = 245, a = 255 },
  skin = Color { r = 236, g = 177, b = 131, a = 255 },
  skinShade = Color { r = 173, g = 103, b = 82, a = 255 },
  leather = Color { r = 105, g = 67, b = 47, a = 255 },
  steel = Color { r = 136, g = 154, b = 173, a = 255 },
  steelLight = Color { r = 217, g = 231, b = 236, a = 255 },
  gold = Color { r = 236, g = 190, b = 83, a = 255 },
  ember = Color { r = 228, g = 94, b = 66, a = 255 },
  memory = Color { r = 74, g = 220, b = 168, a = 255 },
  memoryLight = Color { r = 175, g = 255, b = 220, a = 255 },
  rift = Color { r = 93, g = 92, b = 225, a = 255 },
  riftLight = Color { r = 164, g = 161, b = 255, a = 255 },
  abyss = Color { r = 117, g = 72, b = 184, a = 255 },
  abyssLight = Color { r = 209, g = 156, b = 255, a = 255 },
  coral = Color { r = 238, g = 92, b = 142, a = 255 },
  teal = Color { r = 72, g = 197, b = 211, a = 255 },
}

local function hashKey(value)
  local hash = 31
  for i = 1, #value do
    hash = (hash * 43 + string.byte(value, i)) % 2147483647
  end
  return hash
end

math.randomseed(hashKey(cosmeticId .. ":" .. tostring(seasonValue)))

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
layer.name = "cosmetic"

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

local function drawSparkle(cx, cy, color)
  drawLine(cx - 15, cy, cx + 15, cy, 4, color)
  drawLine(cx, cy - 15, cx, cy + 15, 4, color)
  fillDiamond(cx, cy, 7, colors.white)
end

local function has(fragment)
  return string.find(cosmeticId, fragment, 1, true) ~= nil
end

local function seasonPalette()
  if seasonValue == 2 then
    return colors.rift, colors.riftLight, colors.abyssLight
  elseif seasonValue == 3 then
    return colors.abyss, colors.coral, colors.gold
  end

  return colors.memory, colors.memoryLight, colors.gold
end

local base, light, accent = seasonPalette()
local variant = hashKey(cosmeticId) % 5

local function drawBaseGlow()
  fillEllipse(256, 426, 126, 25, colors.shadow)
  strokeEllipse(256, 256, 176 + variant * 5, 176 + variant * 3, 7, Color { r = base.red, g = base.green, b = base.blue, a = 92 })
  for i = 1, 11 do
    drawSparkle(math.random(86, 426), math.random(75, 397), i % 2 == 0 and light or accent)
  end
end

local function drawWeapon()
  drawBaseGlow()
  drawLine(165, 373, 345, 193, 34, colors.ink)
  drawLine(170, 368, 340, 198, 22, colors.steel)
  drawLine(214, 326, 344, 196, 9, colors.steelLight)
  fillDiamond(353, 185, 27, colors.ink)
  fillDiamond(353, 185, 18, light)
  drawLine(149, 389, 203, 335, 23, colors.ink)
  drawLine(154, 384, 198, 340, 13, colors.leather)
  drawLine(132, 342, 210, 420, 18, colors.ink)
  drawLine(138, 348, 204, 414, 10, accent)
end

local function drawSkin()
  drawBaseGlow()
  fillEllipse(256, 330, 91, 107, colors.ink)
  fillEllipse(256, 333, 77, 94, base)
  fillRect(222, 205, 68, 73, colors.skin)
  fillEllipse(256, 186, 62, 68, colors.ink)
  fillEllipse(256, 192, 51, 56, colors.skin)
  fillRect(203, 130, 106, 42, variant % 2 == 0 and base or light)
  fillRect(211, 252, 90, 23, colors.ink)
  fillRect(221, 257, 70, 12, accent)
  fillRect(236, 187, 10, 8, colors.ink)
  fillRect(275, 187, 10, 8, colors.ink)
  fillRect(241, 223, 35, 7, colors.skinShade)
  drawLine(206, 285, 164, 352, 18, colors.ink)
  drawLine(306, 285, 348, 352, 18, colors.ink)
  drawLine(210, 287, 172, 348, 10, light)
  drawLine(302, 287, 340, 348, 10, light)
end

local function drawPet()
  drawBaseGlow()
  fillEllipse(256, 302, 89, 72, colors.ink)
  fillEllipse(256, 300, 76, 59, base)
  fillEllipse(211, 256, 27, 44, colors.ink)
  fillEllipse(301, 256, 27, 44, colors.ink)
  fillEllipse(211, 260, 18, 34, light)
  fillEllipse(301, 260, 18, 34, light)
  fillEllipse(232, 292, 11, 14, colors.ink)
  fillEllipse(280, 292, 11, 14, colors.ink)
  fillDiamond(256, 315, 9, accent)
  drawLine(211, 325, 174, 309, 5, colors.ink)
  drawLine(301, 325, 338, 309, 5, colors.ink)
  drawLine(211, 337, 174, 351, 5, colors.ink)
  drawLine(301, 337, 338, 351, 5, colors.ink)
  fillEllipse(311, 353, 44, 24, colors.ink)
  fillEllipse(309, 349, 34, 18, light)
end

local function drawMount()
  drawBaseGlow()
  fillEllipse(260, 325, 120, 61, colors.ink)
  fillEllipse(260, 320, 105, 48, base)
  fillEllipse(343, 277, 46, 45, colors.ink)
  fillEllipse(340, 275, 35, 35, light)
  fillTriangle(320, 239, 338, 196, 357, 243, colors.ink)
  fillTriangle(326, 239, 339, 210, 351, 242, accent)
  drawLine(205, 360, 190, 418, 15, colors.ink)
  drawLine(288, 360, 300, 418, 15, colors.ink)
  drawLine(214, 359, 200, 413, 8, light)
  drawLine(296, 359, 307, 413, 8, light)
  drawLine(159, 321, 99, 286, 16, colors.ink)
  drawLine(163, 318, 106, 289, 8, accent)
end

local function drawEmote()
  drawBaseGlow()
  fillEllipse(256, 245, 106, 106, colors.ink)
  fillEllipse(256, 245, 91, 91, accent)
  fillEllipse(222, 231, 12, 17, colors.ink)
  fillEllipse(290, 231, 12, 17, colors.ink)
  if variant % 2 == 0 then
    fillRect(217, 288, 78, 12, colors.ink)
    fillRect(225, 284, 62, 8, colors.white)
  else
    fillEllipse(256, 289, 43, 23, colors.ink)
    fillEllipse(256, 283, 33, 12, colors.white)
  end
  fillTriangle(300, 330, 351, 377, 312, 314, colors.ink)
  fillTriangle(303, 326, 333, 358, 312, 318, accent)
end

local function drawTitle()
  drawBaseGlow()
  fillRect(99, 202, 314, 100, colors.ink)
  fillRect(114, 216, 284, 70, base)
  fillRect(133, 232, 246, 12, light)
  fillRect(133, 257, 190 + variant * 9, 12, accent)
  fillTriangle(99, 202, 57, 252, 99, 302, colors.ink)
  fillTriangle(413, 202, 455, 252, 413, 302, colors.ink)
  fillDiamond(256, 202, 25, accent)
  fillDiamond(256, 302, 25, accent)
end

local function drawAura()
  drawBaseGlow()
  for i = 0, 4 do
    strokeEllipse(256, 264, 72 + i * 25, 112 + i * 20, 5, i % 2 == 0 and base or light)
  end
  fillEllipse(256, 267, 36, 76, Color { r = light.red, g = light.green, b = light.blue, a = 88 })
  for i = 1, 14 do
    fillDiamond(math.random(134, 378), math.random(119, 393), math.random(4, 10), i % 2 == 0 and accent or light)
  end
end

local function drawWing()
  drawBaseGlow()
  for side = -1, 1, 2 do
    local baseX = 256 + side * 28
    for i = 0, 5 do
      local x1 = baseX + side * (18 + i * 20)
      local y1 = 310 + i * 12
      local x2 = baseX + side * (70 + i * 32)
      local y2 = 145 + i * 24
      local x3 = baseX + side * (32 + i * 20)
      local y3 = 355 + i * 8
      fillTriangle(x1, y1, x2, y2, x3, y3, colors.ink)
      fillTriangle(x1 + side * 5, y1 - 4, x2 - side * 12, y2 + 14, x3 + side * 3, y3 - 7, i % 2 == 0 and base or light)
    end
  end
  fillDiamond(256, 314, 25, accent)
end

if has("WPN") then
  drawWeapon()
elseif has("SKIN") then
  drawSkin()
elseif has("PET") then
  drawPet()
elseif has("MOUNT") then
  drawMount()
elseif has("EMOTE") then
  drawEmote()
elseif has("TITLE") then
  drawTitle()
elseif has("AURA") then
  drawAura()
elseif has("WING") then
  drawWing()
else
  drawAura()
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
