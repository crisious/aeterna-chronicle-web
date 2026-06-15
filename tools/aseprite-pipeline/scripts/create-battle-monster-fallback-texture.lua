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

local FRAME_SIZE = tonumber(sizeParam) or 60
if FRAME_SIZE ~= 60 and FRAME_SIZE ~= 90 then
  error("Unsupported battle monster fallback texture size: " .. tostring(sizeParam))
end

local BASE_SIZE = 60
local colors = {
  transparent = Color { r = 0, g = 0, b = 0, a = 0 },
  shadow = Color { r = 6, g = 8, b = 13, a = 145 },
  outline = Color { r = 17, g = 19, b = 31, a = 255 },
  bodyDark = Color { r = 56, g = 38, b = 83, a = 255 },
  body = Color { r = 99, g = 70, b = 142, a = 255 },
  bodyLight = Color { r = 151, g = 119, b = 194, a = 255 },
  horn = Color { r = 210, g = 211, b = 204, a = 255 },
  eye = Color { r = 113, g = 238, b = 255, a = 255 },
  eyeHot = Color { r = 234, g = 255, b = 251, a = 255 },
  bossDark = Color { r = 53, g = 18, b = 30, a = 255 },
  boss = Color { r = 128, g = 42, b = 64, a = 255 },
  bossLight = Color { r = 215, g = 87, b = 105, a = 255 },
  bossEye = Color { r = 255, g = 207, b = 84, a = 255 },
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
layer.name = "battleMonsterFallbackTexture"

local image = Image(FRAME_SIZE, FRAME_SIZE, ColorMode.RGB)
image:clear()

local function s(value)
  return math.floor(value * FRAME_SIZE / BASE_SIZE + 0.5)
end

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
  local sxStep = x0 < x1 and 1 or -1
  local dy = -math.abs(y1 - y0)
  local syStep = y0 < y1 and 1 or -1
  local err = dx + dy
  local half = math.floor(thickness / 2)

  while true do
    fillRect(x0 - half, y0 - half, thickness, thickness, color)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then
      err = err + dy
      x0 = x0 + sxStep
    end
    if e2 <= dx then
      err = err + dx
      y0 = y0 + syStep
    end
  end
end

local function fillEllipse(cx, cy, rx, ry, color)
  local rx2 = rx * rx
  local ry2 = ry * ry
  local limit = rx2 * ry2

  for y = -ry, ry do
    for x = -rx, rx do
      if x * x * ry2 + y * y * rx2 <= limit then
        fillPixel(cx + x, cy + y, color)
      end
    end
  end
end

local function fillCircle(cx, cy, radius, color)
  fillEllipse(cx, cy, radius, radius, color)
end

local function drawEye(cx, cy, color)
  fillRect(cx - s(2), cy - s(1), s(4), s(3), color)
  fillPixel(cx + s(1), cy, colors.eyeHot)
end

local function drawNormal()
  fillEllipse(s(30), s(49), s(18), s(5), colors.shadow)
  fillCircle(s(30), s(30), s(18), colors.outline)
  fillCircle(s(30), s(31), s(16), colors.bodyDark)
  fillCircle(s(30), s(27), s(13), colors.body)
  fillCircle(s(25), s(23), s(4), colors.bodyLight)
  drawLine(s(17), s(16), s(10), s(6), s(3), colors.outline)
  drawLine(s(43), s(16), s(50), s(6), s(3), colors.outline)
  drawLine(s(18), s(15), s(11), s(7), s(2), colors.horn)
  drawLine(s(42), s(15), s(49), s(7), s(2), colors.horn)
  drawEye(s(24), s(28), colors.eye)
  drawEye(s(36), s(28), colors.eye)
  fillRect(s(27), s(37), s(7), s(2), colors.outline)
  drawLine(s(17), s(39), s(10), s(45), s(3), colors.bodyDark)
  drawLine(s(43), s(39), s(50), s(45), s(3), colors.bodyDark)
end

local function drawBoss()
  fillEllipse(s(30), s(50), s(23), s(6), colors.shadow)
  fillCircle(s(30), s(30), s(22), colors.outline)
  fillCircle(s(30), s(31), s(20), colors.bossDark)
  fillCircle(s(30), s(26), s(16), colors.boss)
  fillCircle(s(23), s(20), s(5), colors.bossLight)
  drawLine(s(13), s(16), s(5), s(4), s(4), colors.outline)
  drawLine(s(47), s(16), s(55), s(4), s(4), colors.outline)
  drawLine(s(19), s(12), s(16), s(1), s(3), colors.outline)
  drawLine(s(41), s(12), s(44), s(1), s(3), colors.outline)
  drawLine(s(13), s(15), s(6), s(5), s(2), colors.horn)
  drawLine(s(47), s(15), s(54), s(5), s(2), colors.horn)
  drawLine(s(20), s(11), s(17), s(2), s(2), colors.horn)
  drawLine(s(40), s(11), s(43), s(2), s(2), colors.horn)
  drawEye(s(22), s(28), colors.bossEye)
  drawEye(s(30), s(26), colors.bossEye)
  drawEye(s(38), s(28), colors.bossEye)
  fillRect(s(24), s(39), s(12), s(3), colors.outline)
  drawLine(s(14), s(38), s(6), s(46), s(4), colors.bossDark)
  drawLine(s(46), s(38), s(54), s(46), s(4), colors.bossDark)
end

if textureKey == "battle_monster_fallback" then
  drawNormal()
elseif textureKey == "battle_boss_fallback" then
  drawBoss()
else
  error("Unsupported battle monster fallback texture: " .. tostring(textureKey))
end

sprite.cels[1].image = image
app.command.SaveFileAs { filename = outputPath }
