local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local statusKey = app.params["status"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if statusKey == nil or statusKey == "" then
  error("Missing required --script-param status=<status-key>")
end

local FRAME_SIZE = 32
local colors = {
  outline = Color { r = 5, g = 7, b = 14, a = 255 },
  panel = Color { r = 17, g = 24, b = 39, a = 245 },
  panelLight = Color { r = 39, g = 50, b = 74, a = 245 },
  poison = Color { r = 89, g = 214, b = 93, a = 245 },
  burn = Color { r = 255, g = 102, b = 36, a = 245 },
  fireLight = Color { r = 255, g = 216, b = 89, a = 245 },
  ice = Color { r = 119, g = 222, b = 255, a = 245 },
  iceDark = Color { r = 57, g = 134, b = 219, a = 245 },
  lightning = Color { r = 255, g = 232, b = 77, a = 245 },
  violet = Color { r = 150, g = 101, b = 255, a = 245 },
  purpleDark = Color { r = 74, g = 45, b = 130, a = 245 },
  blue = Color { r = 91, g = 145, b = 255, a = 245 },
  smoke = Color { r = 119, g = 130, b = 148, a = 245 },
  dark = Color { r = 28, g = 29, b = 40, a = 245 },
  blood = Color { r = 224, g = 40, b = 53, a = 245 },
  pink = Color { r = 255, g = 111, b = 190, a = 245 },
  gold = Color { r = 255, g = 210, b = 85, a = 245 },
  green = Color { r = 110, g = 235, b = 152, a = 245 },
  steel = Color { r = 170, g = 188, b = 214, a = 245 },
  white = Color { r = 233, g = 246, b = 255, a = 245 },
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
layer.name = "statusIcon"

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

local function drawBase(accent)
  fillEllipse(16, 16, 15, 15, colors.outline)
  fillEllipse(16, 16, 13, 13, colors.panel)
  fillEllipse(16, 16, 10, 10, colors.panelLight)
  fillDiamond(16, 16, 14, accent)
  fillDiamond(16, 16, 11, colors.panel)
end

local function drawPoison()
  fillEllipse(13, 18, 5, 7, colors.outline)
  fillEllipse(13, 18, 3, 5, colors.poison)
  fillEllipse(19, 13, 4, 4, colors.poison)
  fillEllipse(21, 21, 3, 3, colors.green)
  fillPixel(18, 10, colors.white)
end

local function drawBurn()
  fillDiamond(16, 17, 9, colors.outline)
  fillDiamond(16, 18, 7, colors.burn)
  fillDiamond(17, 18, 4, colors.fireLight)
  drawLine(13, 8, 16, 20, 3, colors.burn)
  drawLine(20, 9, 17, 20, 2, colors.fireLight)
end

local function drawFreeze()
  drawLine(16, 6, 16, 26, 2, colors.ice)
  drawLine(6, 16, 26, 16, 2, colors.ice)
  drawLine(9, 9, 23, 23, 2, colors.iceDark)
  drawLine(23, 9, 9, 23, 2, colors.iceDark)
  fillEllipse(16, 16, 3, 3, colors.white)
end

local function drawStun()
  fillRect(16, 6, 4, 10, colors.outline)
  fillRect(12, 15, 7, 4, colors.outline)
  fillRect(10, 18, 5, 9, colors.outline)
  fillRect(17, 7, 2, 9, colors.lightning)
  fillRect(13, 16, 5, 2, colors.gold)
  fillRect(11, 19, 3, 7, colors.lightning)
end

local function drawSilence()
  fillRect(8, 14, 5, 6, colors.outline)
  fillDiamond(15, 17, 6, colors.outline)
  fillRect(9, 15, 4, 4, colors.violet)
  fillDiamond(15, 17, 4, colors.violet)
  drawLine(9, 8, 24, 24, 3, colors.outline)
  drawLine(10, 8, 24, 22, 2, colors.pink)
end

local function drawSlow()
  fillEllipse(16, 16, 10, 10, colors.outline)
  fillEllipse(16, 16, 7, 7, colors.blue)
  drawLine(16, 16, 16, 10, 2, colors.white)
  drawLine(16, 16, 20, 18, 2, colors.white)
  drawLine(23, 23, 27, 27, 2, colors.outline)
end

local function drawBlind()
  fillEllipse(16, 16, 11, 6, colors.outline)
  fillEllipse(16, 16, 8, 4, colors.smoke)
  fillEllipse(16, 16, 3, 3, colors.dark)
  drawLine(7, 24, 25, 8, 3, colors.outline)
  drawLine(8, 23, 24, 9, 1, colors.blood)
end

local function drawBleed()
  fillDiamond(16, 18, 8, colors.outline)
  fillDiamond(16, 19, 6, colors.blood)
  fillEllipse(16, 21, 5, 5, colors.blood)
  fillPixel(14, 17, colors.white)
end

local function drawCurse()
  fillEllipse(16, 16, 9, 9, colors.outline)
  fillEllipse(17, 16, 6, 8, colors.purpleDark)
  fillDiamond(16, 16, 5, colors.violet)
  drawLine(9, 8, 23, 24, 2, colors.violet)
  drawLine(23, 8, 9, 24, 2, colors.violet)
end

local function drawCharm()
  fillEllipse(12, 13, 5, 5, colors.outline)
  fillEllipse(20, 13, 5, 5, colors.outline)
  fillDiamond(16, 19, 8, colors.outline)
  fillEllipse(12, 13, 3, 3, colors.pink)
  fillEllipse(20, 13, 3, 3, colors.pink)
  fillDiamond(16, 19, 6, colors.pink)
end

local function drawAttackUp()
  drawLine(10, 23, 22, 11, 4, colors.outline)
  drawLine(11, 22, 22, 11, 2, colors.steel)
  fillRect(9, 22, 7, 3, colors.gold)
  drawLine(22, 23, 22, 8, 2, colors.burn)
  drawLine(17, 13, 22, 8, 2, colors.burn)
  drawLine(27, 13, 22, 8, 2, colors.burn)
end

local function drawDefenseUp()
  fillDiamond(16, 15, 10, colors.outline)
  fillDiamond(16, 16, 8, colors.steel)
  fillDiamond(16, 16, 5, colors.blue)
  drawLine(16, 24, 16, 8, 2, colors.white)
end

local function drawHaste()
  drawLine(9, 22, 18, 8, 3, colors.outline)
  drawLine(10, 21, 18, 8, 1, colors.lightning)
  fillRect(17, 11, 9, 3, colors.green)
  fillRect(16, 16, 11, 3, colors.green)
  fillRect(14, 21, 8, 3, colors.green)
end

local function drawRegen()
  fillRect(14, 8, 5, 17, colors.outline)
  fillRect(8, 14, 17, 5, colors.outline)
  fillRect(15, 9, 3, 15, colors.green)
  fillRect(9, 15, 15, 3, colors.green)
  fillEllipse(22, 22, 4, 3, colors.poison)
end

local function drawShield()
  fillEllipse(16, 16, 11, 11, colors.outline)
  fillEllipse(16, 16, 8, 8, colors.gold)
  fillDiamond(16, 16, 6, colors.steel)
  fillRect(15, 9, 2, 14, colors.white)
end

local function drawLegacyBuff(index)
  local accents = { colors.green, colors.gold, colors.blue, colors.poison, colors.steel }
  local accent = accents[((index - 1) % #accents) + 1]
  local mode = ((index - 1) % 5) + 1

  drawBase(accent)

  if mode == 1 then
    drawLine(16, 24, 16, 8, 3, colors.outline)
    drawLine(16, 23, 16, 9, 1, colors.white)
    drawLine(10, 14, 16, 8, 3, colors.outline)
    drawLine(22, 14, 16, 8, 3, colors.outline)
    drawLine(11, 14, 16, 9, 1, accent)
    drawLine(21, 14, 16, 9, 1, accent)
  elseif mode == 2 then
    fillEllipse(16, 16, 9, 9, colors.outline)
    fillEllipse(16, 16, 6, 6, accent)
    fillDiamond(16, 16, 4, colors.white)
    fillPixel(20, 12, colors.gold)
  elseif mode == 3 then
    fillRect(14, 8, 5, 17, colors.outline)
    fillRect(8, 14, 17, 5, colors.outline)
    fillRect(15, 9, 3, 15, accent)
    fillRect(9, 15, 15, 3, accent)
  elseif mode == 4 then
    fillDiamond(16, 15, 10, colors.outline)
    fillDiamond(16, 16, 7, accent)
    drawLine(16, 24, 16, 8, 2, colors.white)
  else
    drawLine(9, 22, 18, 8, 3, colors.outline)
    drawLine(10, 21, 18, 8, 1, accent)
    fillRect(17, 11, 9, 3, colors.white)
    fillRect(16, 16, 10, 3, accent)
    fillRect(14, 21, 8, 3, colors.white)
  end
end

local function drawLegacyDebuff(index)
  local accents = { colors.blood, colors.violet, colors.smoke, colors.burn, colors.iceDark, colors.pink }
  local accent = accents[((index - 1) % #accents) + 1]
  local mode = ((index - 1) % 6) + 1

  drawBase(accent)

  if mode == 1 then
    fillDiamond(16, 18, 8, colors.outline)
    fillDiamond(16, 19, 6, accent)
    fillEllipse(16, 21, 5, 5, accent)
    fillPixel(14, 17, colors.white)
  elseif mode == 2 then
    fillEllipse(16, 16, 10, 7, colors.outline)
    fillEllipse(16, 16, 7, 4, accent)
    drawLine(8, 24, 24, 8, 3, colors.outline)
    drawLine(9, 23, 23, 9, 1, colors.white)
  elseif mode == 3 then
    drawLine(9, 8, 23, 24, 3, colors.outline)
    drawLine(23, 8, 9, 24, 3, colors.outline)
    drawLine(10, 8, 23, 21, 1, accent)
    drawLine(22, 8, 9, 21, 1, accent)
  elseif mode == 4 then
    fillEllipse(16, 16, 8, 8, colors.outline)
    fillEllipse(16, 16, 5, 5, accent)
    fillRect(12, 7, 9, 4, colors.outline)
    fillRect(13, 8, 7, 2, colors.white)
  elseif mode == 5 then
    drawLine(16, 6, 16, 26, 2, accent)
    drawLine(7, 16, 25, 16, 2, accent)
    drawLine(10, 10, 22, 22, 2, colors.outline)
    drawLine(22, 10, 10, 22, 2, colors.outline)
  else
    fillEllipse(12, 13, 5, 5, colors.outline)
    fillEllipse(20, 13, 5, 5, colors.outline)
    fillDiamond(16, 20, 7, colors.outline)
    fillEllipse(12, 13, 3, 3, accent)
    fillEllipse(20, 13, 3, 3, accent)
    fillDiamond(16, 20, 5, accent)
  end
end

if statusKey == "poison" then
  drawBase(colors.poison)
  drawPoison()
elseif statusKey == "burn" then
  drawBase(colors.burn)
  drawBurn()
elseif statusKey == "freeze" then
  drawBase(colors.ice)
  drawFreeze()
elseif statusKey == "stun" then
  drawBase(colors.lightning)
  drawStun()
elseif statusKey == "silence" then
  drawBase(colors.violet)
  drawSilence()
elseif statusKey == "slow" then
  drawBase(colors.blue)
  drawSlow()
elseif statusKey == "blind" then
  drawBase(colors.smoke)
  drawBlind()
elseif statusKey == "bleed" then
  drawBase(colors.blood)
  drawBleed()
elseif statusKey == "curse" then
  drawBase(colors.purpleDark)
  drawCurse()
elseif statusKey == "charm" then
  drawBase(colors.pink)
  drawCharm()
elseif statusKey == "attack_up" then
  drawBase(colors.burn)
  drawAttackUp()
elseif statusKey == "defense_up" then
  drawBase(colors.blue)
  drawDefenseUp()
elseif statusKey == "haste" then
  drawBase(colors.green)
  drawHaste()
elseif statusKey == "regen" then
  drawBase(colors.poison)
  drawRegen()
elseif statusKey == "shield" then
  drawBase(colors.gold)
  drawShield()
else
  local legacyBuffIndex = string.match(statusKey, "^STS%-BUF%-(%d+)$")
  local legacyDebuffIndex = string.match(statusKey, "^STS%-DBF%-(%d+)$")

  if legacyBuffIndex ~= nil then
    drawLegacyBuff(tonumber(legacyBuffIndex))
  elseif legacyDebuffIndex ~= nil then
    drawLegacyDebuff(tonumber(legacyDebuffIndex))
  else
    error("Unknown status: " .. statusKey)
  end
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
