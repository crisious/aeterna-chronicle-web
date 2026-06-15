local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local itemKey = app.params["item"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if itemKey == nil or itemKey == "" then
  error("Missing required --script-param item=<item-key>")
end

local groupKey, indexText = string.match(itemKey, "^ITM%-(%u+)%-(%d+)$")
if groupKey == nil then
  error("item must match ITM-XXX-000: " .. itemKey)
end

local itemIndex = tonumber(indexText)
local FRAME_SIZE = 64
local colors = {
  outline = Color { r = 4, g = 7, b = 18, a = 255 },
  panel = Color { r = 18, g = 25, b = 42, a = 245 },
  panelLight = Color { r = 38, g = 49, b = 78, a = 245 },
  common = Color { r = 128, g = 128, b = 128, a = 245 },
  uncommon = Color { r = 70, g = 178, b = 98, a = 245 },
  rare = Color { r = 70, g = 135, b = 235, a = 245 },
  epic = Color { r = 154, g = 82, b = 220, a = 245 },
  legendary = Color { r = 239, g = 143, b = 55, a = 245 },
  mythic = Color { r = 242, g = 65, b = 71, a = 245 },
  aether = Color { r = 89, g = 190, b = 255, a = 245 },
  aetherLight = Color { r = 198, g = 243, b = 255, a = 245 },
  gold = Color { r = 255, g = 214, b = 83, a = 245 },
  steel = Color { r = 163, g = 178, b = 202, a = 245 },
  steelDark = Color { r = 79, g = 91, b = 119, a = 245 },
  leather = Color { r = 150, g = 92, b = 54, a = 245 },
  wood = Color { r = 119, g = 75, b = 45, a = 245 },
  red = Color { r = 239, g = 73, b = 83, a = 245 },
  blue = Color { r = 76, g = 154, b = 255, a = 245 },
  green = Color { r = 92, g = 218, b = 130, a = 245 },
  violet = Color { r = 148, g = 98, b = 238, a = 245 },
  dark = Color { r = 40, g = 35, b = 58, a = 245 },
  parchment = Color { r = 220, g = 184, b = 123, a = 245 },
  herb = Color { r = 76, g = 188, b = 91, a = 245 },
  cloth = Color { r = 192, g = 178, b = 154, a = 245 },
  food = Color { r = 216, g = 134, b = 72, a = 245 },
  white = Color { r = 236, g = 246, b = 255, a = 245 },
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
layer.name = "itemIcon"

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

local function rarityColor(index)
  local tier = ((index - 1) % 6) + 1
  if tier == 1 then return colors.common end
  if tier == 2 then return colors.uncommon end
  if tier == 3 then return colors.rare end
  if tier == 4 then return colors.epic end
  if tier == 5 then return colors.legendary end
  return colors.mythic
end

local function accentColor(index)
  local palette = { colors.aether, colors.green, colors.violet, colors.gold, colors.red, colors.blue }
  return palette[((index - 1) % #palette) + 1]
end

local function drawBase(borderColor)
  fillRect(4, 4, 56, 56, colors.outline)
  fillRect(6, 6, 52, 52, borderColor)
  fillRect(9, 9, 46, 46, colors.panel)
  fillRect(12, 12, 40, 20, colors.panelLight)
  fillRect(12, 34, 40, 18, colors.panel)
  fillRect(6, 52, 52, 3, borderColor)
end

local function drawSword(accent)
  drawLine(21, 48, 45, 16, 7, colors.outline)
  drawLine(22, 47, 44, 17, 3, colors.steel)
  drawLine(27, 42, 16, 51, 4, colors.wood)
  drawLine(18, 37, 32, 51, 4, colors.gold)
  fillPixel(44, 15, accent)
end

local function drawStaff(accent)
  drawLine(28, 50, 38, 17, 5, colors.outline)
  drawLine(29, 49, 37, 18, 2, colors.wood)
  fillEllipse(39, 16, 8, 8, colors.outline)
  fillEllipse(39, 16, 5, 5, accent)
  fillPixel(41, 14, colors.white)
end

local function drawBow(accent)
  drawLine(20, 16, 20, 49, 4, colors.outline)
  drawLine(22, 17, 32, 29, 3, colors.wood)
  drawLine(22, 48, 32, 35, 3, colors.wood)
  drawLine(22, 17, 22, 48, 1, colors.white)
  drawLine(24, 33, 46, 33, 3, accent)
  fillDiamond(47, 33, 5, colors.steel)
end

local function drawSpear(accent)
  drawLine(19, 50, 43, 18, 4, colors.outline)
  drawLine(20, 49, 42, 19, 2, colors.wood)
  fillDiamond(45, 15, 9, colors.outline)
  fillDiamond(45, 15, 6, colors.steel)
  fillPixel(45, 12, accent)
end

local function drawWeapon()
  local accent = accentColor(itemIndex)
  local mode = ((itemIndex - 1) % 5) + 1
  if mode == 1 then drawSword(accent)
  elseif mode == 2 then drawStaff(accent)
  elseif mode == 3 then drawBow(accent)
  elseif mode == 4 then drawSpear(accent)
  else
    drawLine(22, 45, 42, 22, 6, colors.outline)
    drawLine(23, 44, 41, 23, 3, colors.steel)
    fillRect(18, 43, 10, 5, colors.leather)
    fillPixel(42, 21, accent)
  end
end

local function drawArmor()
  local accent = accentColor(itemIndex)
  local mode = ((itemIndex - 1) % 5) + 1
  if mode == 1 then
    fillEllipse(32, 31, 17, 14, colors.outline)
    fillEllipse(32, 31, 13, 10, colors.steel)
    fillRect(18, 30, 28, 7, colors.outline)
    fillRect(21, 31, 22, 4, accent)
  elseif mode == 2 then
    fillDiamond(32, 32, 19, colors.outline)
    fillDiamond(32, 33, 15, colors.steelDark)
    fillRect(25, 22, 14, 23, colors.steel)
    fillRect(31, 20, 3, 27, accent)
  elseif mode == 3 then
    fillRect(20, 26, 24, 17, colors.outline)
    fillRect(23, 28, 18, 13, colors.leather)
    fillRect(20, 43, 24, 5, colors.steelDark)
    fillRect(27, 24, 10, 4, accent)
  elseif mode == 4 then
    fillDiamond(32, 30, 19, colors.outline)
    fillDiamond(32, 31, 15, colors.steel)
    fillDiamond(32, 31, 10, accent)
    fillRect(31, 18, 3, 28, colors.white)
  else
    fillRect(22, 18, 20, 32, colors.outline)
    fillRect(24, 20, 16, 28, colors.dark)
    drawLine(24, 20, 40, 48, 2, accent)
    drawLine(40, 20, 24, 48, 2, accent)
  end
end

local function drawAccessory()
  local accent = accentColor(itemIndex)
  local mode = ((itemIndex - 1) % 5) + 1
  if mode == 1 then
    fillEllipse(32, 34, 15, 15, colors.outline)
    fillEllipse(32, 34, 10, 10, colors.panel)
    fillDiamond(32, 24, 8, colors.outline)
    fillDiamond(32, 24, 5, accent)
  elseif mode == 2 then
    fillEllipse(32, 33, 16, 12, colors.outline)
    fillEllipse(32, 33, 11, 8, colors.gold)
    fillEllipse(32, 33, 7, 5, colors.panel)
    fillPixel(32, 25, accent)
  elseif mode == 3 then
    fillDiamond(32, 32, 18, colors.outline)
    fillDiamond(32, 32, 14, accent)
    fillDiamond(32, 32, 7, colors.white)
  elseif mode == 4 then
    fillEllipse(32, 32, 16, 16, colors.outline)
    fillEllipse(32, 32, 12, 12, colors.gold)
    drawLine(32, 32, 32, 22, 2, colors.panel)
    drawLine(32, 32, 39, 35, 2, colors.panel)
  else
    fillRect(22, 18, 20, 26, colors.outline)
    fillRect(24, 20, 16, 22, colors.steelDark)
    fillEllipse(32, 31, 6, 8, accent)
    fillRect(28, 44, 8, 5, colors.gold)
  end
end

local function drawPotion(accent)
  fillRect(27, 15, 10, 8, colors.outline)
  fillRect(29, 16, 6, 6, colors.gold)
  fillEllipse(32, 37, 15, 18, colors.outline)
  fillEllipse(32, 38, 11, 14, accent)
  fillRect(26, 28, 12, 4, colors.white)
  fillPixel(36, 34, colors.white)
end

local function drawConsumable()
  local mode = ((itemIndex - 1) % 5) + 1
  if mode == 1 then drawPotion(colors.red)
  elseif mode == 2 then drawPotion(colors.blue)
  elseif mode == 3 then drawPotion(colors.green)
  elseif mode == 4 then
    fillRect(19, 22, 26, 27, colors.outline)
    fillRect(22, 24, 20, 22, colors.parchment)
    fillRect(18, 21, 28, 5, colors.gold)
    drawLine(25, 31, 39, 31, 2, colors.dark)
    drawLine(25, 38, 36, 38, 2, colors.dark)
  else
    fillEllipse(32, 39, 16, 9, colors.outline)
    fillEllipse(32, 39, 12, 6, colors.food)
    fillRect(22, 27, 20, 8, colors.outline)
    fillRect(24, 28, 16, 5, colors.parchment)
    fillPixel(36, 36, colors.green)
  end
end

local function drawMaterial()
  local accent = accentColor(itemIndex)
  local mode = ((itemIndex - 1) % 5) + 1
  if mode == 1 then
    fillDiamond(31, 32, 18, colors.outline)
    fillDiamond(31, 32, 14, accent)
    fillDiamond(36, 27, 6, colors.white)
  elseif mode == 2 then
    fillEllipse(29, 36, 8, 15, colors.outline)
    fillEllipse(29, 36, 5, 12, colors.herb)
    fillEllipse(38, 30, 7, 12, colors.herb)
    drawLine(24, 48, 43, 18, 2, colors.wood)
  elseif mode == 3 then
    fillRect(20, 27, 25, 18, colors.outline)
    fillRect(22, 29, 21, 14, colors.leather)
    drawLine(23, 29, 42, 42, 2, colors.gold)
  elseif mode == 4 then
    fillRect(18, 24, 28, 22, colors.outline)
    fillRect(20, 26, 24, 18, colors.cloth)
    drawLine(21, 31, 43, 31, 1, colors.panel)
    drawLine(21, 38, 43, 38, 1, colors.panel)
  else
    fillEllipse(32, 33, 16, 14, colors.outline)
    fillEllipse(32, 33, 12, 10, colors.steelDark)
    fillDiamond(36, 29, 8, accent)
  end
end

local function drawQuest()
  local accent = accentColor(itemIndex)
  local mode = ((itemIndex - 1) % 5) + 1
  if mode == 1 then
    fillDiamond(32, 32, 19, colors.outline)
    fillDiamond(32, 32, 15, accent)
    fillDiamond(32, 32, 7, colors.white)
  elseif mode == 2 then
    fillEllipse(25, 35, 8, 8, colors.outline)
    fillEllipse(25, 35, 5, 5, colors.gold)
    fillRect(31, 32, 18, 5, colors.outline)
    fillRect(31, 33, 16, 3, colors.gold)
    fillRect(43, 37, 4, 6, colors.gold)
  elseif mode == 3 then
    fillRect(18, 22, 28, 26, colors.outline)
    fillRect(21, 24, 22, 20, colors.parchment)
    fillDiamond(32, 34, 9, accent)
  elseif mode == 4 then
    fillEllipse(29, 38, 14, 10, colors.outline)
    fillEllipse(29, 38, 10, 7, colors.leather)
    fillEllipse(39, 30, 8, 8, colors.gold)
    fillRect(25, 31, 18, 4, colors.gold)
  else
    fillRect(19, 26, 28, 19, colors.outline)
    fillRect(22, 28, 22, 15, colors.wood)
    fillRect(24, 22, 18, 9, colors.outline)
    fillRect(27, 24, 12, 5, accent)
    fillRect(30, 33, 5, 6, colors.gold)
  end
end

drawBase(rarityColor(itemIndex))

if groupKey == "WPN" then
  drawWeapon()
elseif groupKey == "ARM" then
  drawArmor()
elseif groupKey == "ACC" then
  drawAccessory()
elseif groupKey == "CON" then
  drawConsumable()
elseif groupKey == "MAT" then
  drawMaterial()
elseif groupKey == "QST" then
  drawQuest()
else
  error("Unknown item group: " .. groupKey)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
