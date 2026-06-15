local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local effectKey = app.params["effect"]
local sizeParam = app.params["size"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if effectKey == nil or effectKey == "" then
  error("Missing required --script-param effect=<effect-key>")
end

local FRAME_SIZE = tonumber(sizeParam) or 32
if FRAME_SIZE ~= 24 and FRAME_SIZE ~= 32 then
  error("Unsupported effect fallback texture size: " .. tostring(sizeParam))
end

local colors = {
  transparent = Color { r = 0, g = 0, b = 0, a = 0 },
  shadow = Color { r = 8, g = 10, b = 16, a = 180 },
  slashDark = Color { r = 80, g = 11, b = 28, a = 220 },
  slash = Color { r = 255, g = 82, b = 112, a = 255 },
  slashHot = Color { r = 255, g = 214, b = 168, a = 255 },
  bluntDark = Color { r = 82, g = 48, b = 10, a = 220 },
  blunt = Color { r = 255, g = 172, b = 54, a = 255 },
  bluntHot = Color { r = 255, g = 239, b = 146, a = 255 },
  magicDark = Color { r = 18, g = 37, b = 88, a = 220 },
  magic = Color { r = 78, g = 211, b = 255, a = 255 },
  magicHot = Color { r = 220, g = 250, b = 255, a = 255 },
  buffDark = Color { r = 14, g = 68, b = 42, a = 220 },
  buff = Color { r = 79, g = 230, b = 124, a = 255 },
  buffHot = Color { r = 225, g = 255, b = 205, a = 255 },
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
layer.name = "effectFallbackTexture"

local image = Image(FRAME_SIZE, FRAME_SIZE, ColorMode.RGB)
image:clear()

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

local function fillCircle(cx, cy, radius, color)
  for y = -radius, radius do
    for x = -radius, radius do
      if x * x + y * y <= radius * radius then
        fillPixel(cx + x, cy + y, color)
      end
    end
  end
end

local function strokeCircle(cx, cy, radius, thickness, color)
  local inner = math.max(0, radius - thickness)
  for y = -radius, radius do
    for x = -radius, radius do
      local d = x * x + y * y
      if d <= radius * radius and d >= inner * inner then
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

local function drawSpark(cx, cy, radius, color)
  drawLine(cx - radius, cy, cx + radius, cy, 1, color)
  drawLine(cx, cy - radius, cx, cy + radius, 1, color)
  fillPixel(cx - 1, cy - 1, color)
  fillPixel(cx + 1, cy - 1, color)
  fillPixel(cx - 1, cy + 1, color)
  fillPixel(cx + 1, cy + 1, color)
end

local function drawSlash()
  drawLine(4, 25, 25, 5, 5, colors.shadow)
  drawLine(5, 24, 26, 4, 3, colors.slashDark)
  drawLine(7, 22, 27, 4, 2, colors.slash)
  drawLine(10, 20, 25, 6, 1, colors.slashHot)
  drawLine(5, 17, 13, 9, 1, colors.slash)
  drawLine(18, 26, 25, 19, 1, colors.slashHot)
end

local function drawBlunt()
  fillCircle(16, 16, 13, colors.shadow)
  fillCircle(15, 15, 11, colors.bluntDark)
  fillCircle(16, 16, 8, colors.blunt)
  fillCircle(13, 12, 3, colors.bluntHot)
  drawLine(16, 3, 16, 8, 2, colors.bluntHot)
  drawLine(16, 24, 16, 29, 2, colors.blunt)
  drawLine(3, 16, 8, 16, 2, colors.blunt)
  drawLine(24, 16, 29, 16, 2, colors.bluntHot)
end

local function drawMagic()
  strokeCircle(16, 16, 12, 3, colors.magicDark)
  strokeCircle(16, 16, 9, 2, colors.magic)
  fillDiamond(16, 16, 5, colors.magicHot)
  drawSpark(7, 8, 2, colors.magic)
  drawSpark(25, 10, 2, colors.magicHot)
  drawSpark(9, 24, 2, colors.magicHot)
  drawSpark(24, 23, 2, colors.magic)
end

local function drawBuff()
  fillCircle(12, 12, 11, colors.shadow)
  fillCircle(12, 12, 9, colors.buffDark)
  fillDiamond(12, 12, 7, colors.buff)
  fillDiamond(12, 12, 3, colors.buffHot)
  drawLine(12, 4, 12, 20, 1, colors.buffHot)
  drawLine(4, 12, 20, 12, 1, colors.buffHot)
end

if effectKey == "hit_fallback_slash" then
  drawSlash()
elseif effectKey == "hit_fallback_blunt" then
  drawBlunt()
elseif effectKey == "hit_fallback_magic" then
  drawMagic()
elseif effectKey == "buff_fallback" then
  drawBuff()
else
  error("Unsupported effect fallback texture: " .. tostring(effectKey))
end

sprite.cels[1].image = image
app.command.SaveFileAs { filename = outputPath }
