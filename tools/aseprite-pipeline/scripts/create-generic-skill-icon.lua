local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local skillKey = app.params["skill"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if skillKey == nil or skillKey == "" then
  error("Missing required --script-param skill=<skill-key>")
end

local skillFamily = "CMN"
local skillIndex = tonumber(string.match(skillKey, "^CMN%-SKL%-(%d%d%d)$"))
if skillIndex == nil then
  local parsedFamily, parsedIndex = string.match(skillKey, "^SKL%-(%u+)%-(%d%d%d)$")
  skillFamily = parsedFamily or skillFamily
  skillIndex = tonumber(parsedIndex)
end

if skillIndex == nil then
  error("skill must match CMN-SKL-### or SKL-XXX-###: " .. skillKey)
end

local SIZE = 64

local colors = {
  outline = Color { r = 5, g = 7, b = 18, a = 255 },
  panel = Color { r = 18, g = 28, b = 49, a = 255 },
  panelLight = Color { r = 38, g = 56, b = 92, a = 255 },
  ether = Color { r = 85, g = 178, b = 255, a = 255 },
  etherLight = Color { r = 188, g = 244, b = 255, a = 255 },
  gold = Color { r = 255, g = 211, b = 91, a = 255 },
  red = Color { r = 239, g = 82, b = 103, a = 255 },
  green = Color { r = 102, g = 224, b = 139, a = 255 },
  violet = Color { r = 151, g = 100, b = 243, a = 255 },
  shadow = Color { r = 54, g = 43, b = 94, a = 255 },
  steel = Color { r = 155, g = 174, b = 197, a = 255 },
  steelDark = Color { r = 78, g = 93, b = 125, a = 255 },
  orange = Color { r = 246, g = 142, b = 68, a = 255 },
  earth = Color { r = 148, g = 103, b = 70, a = 255 },
  water = Color { r = 66, g = 157, b = 201, a = 255 },
  pale = Color { r = 229, g = 242, b = 218, a = 255 },
}

local palettes = {
  { colors.ether, colors.etherLight, colors.gold },
  { colors.red, colors.orange, colors.gold },
  { colors.green, colors.pale, colors.ether },
  { colors.violet, colors.etherLight, colors.shadow },
  { colors.steel, colors.ether, colors.gold },
  { colors.earth, colors.orange, colors.steel },
  { colors.water, colors.etherLight, colors.green },
}

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
layer.name = "genericSkillIcon"

local image = Image(SIZE, SIZE, ColorMode.RGB)
image:clear()

local function fillPixel(x, y, color)
  if x >= 0 and x < SIZE and y >= 0 and y < SIZE then
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

local function drawBase(primary, secondary)
  fillEllipse(32, 32, 29, 29, colors.outline)
  fillEllipse(32, 32, 26, 26, colors.panel)
  fillDiamond(32, 32, 25, primary)
  fillDiamond(32, 32, 21, colors.panel)
  fillEllipse(32, 32, 17, 17, colors.panelLight)
  fillRect(12, 12, 40, 3, secondary)
  fillRect(12, 49, 40, 3, colors.outline)
end

local function drawBlade(primary, secondary, accent)
  drawLine(20, 45, 45, 18, 6, colors.outline)
  drawLine(22, 43, 43, 20, 3, secondary)
  fillRect(17, 43, 12, 5, colors.outline)
  fillRect(19, 41, 8, 4, accent)
  fillDiamond(47, 16, 5, primary)
end

local function drawShield(primary, secondary, accent)
  fillDiamond(32, 29, 18, colors.outline)
  fillDiamond(32, 30, 15, primary)
  fillDiamond(32, 30, 10, secondary)
  fillRect(30, 16, 4, 30, colors.outline)
  fillRect(31, 19, 2, 24, accent)
end

local function drawBurst(primary, secondary, accent)
  fillDiamond(32, 32, 22, colors.outline)
  fillDiamond(32, 32, 18, primary)
  fillDiamond(32, 32, 12, secondary)
  fillDiamond(32, 32, 6, accent)
  fillRect(31, 8, 3, 14, colors.outline)
  fillRect(31, 43, 3, 14, colors.outline)
  fillRect(8, 31, 14, 3, colors.outline)
  fillRect(43, 31, 14, 3, colors.outline)
end

local function drawOrb(primary, secondary, accent)
  fillEllipse(32, 32, 20, 20, colors.outline)
  fillEllipse(32, 32, 16, 16, primary)
  fillEllipse(32, 32, 9, 9, secondary)
  fillDiamond(32, 32, 7, accent)
  fillPixel(24, 21, colors.pale)
  fillPixel(41, 43, colors.etherLight)
end

local function drawArrow(primary, secondary, accent)
  fillRect(15, 31, 29, 5, colors.outline)
  fillRect(18, 32, 24, 2, secondary)
  fillDiamond(46, 33, 10, colors.outline)
  fillDiamond(46, 33, 7, primary)
  fillRect(15, 24, 8, 4, accent)
  fillRect(15, 40, 8, 4, accent)
end

local function drawRune(primary, secondary, accent)
  fillEllipse(32, 32, 21, 21, colors.outline)
  fillEllipse(32, 32, 17, 17, primary)
  fillRect(19, 21, 26, 4, accent)
  fillRect(19, 39, 26, 4, accent)
  fillRect(21, 19, 4, 26, secondary)
  fillRect(39, 19, 4, 26, secondary)
  fillDiamond(32, 32, 6, colors.panel)
end

local function drawWave(primary, secondary, accent)
  fillEllipse(31, 33, 20, 14, colors.outline)
  fillEllipse(28, 33, 15, 9, primary)
  fillEllipse(40, 29, 10, 7, secondary)
  fillRect(16, 45, 28, 4, colors.outline)
  fillRect(20, 47, 24, 2, accent)
end

local familyOffsets = {
  CMN = 0,
  ETH = 0,
  MNE = 1,
  SHA = 3,
  MEM = 5,
  TIM = 2,
  VOI = 4,
}
local palette = palettes[((skillIndex + (familyOffsets[skillFamily] or 0) - 1) % #palettes) + 1]
local primary = palette[1]
local secondary = palette[2]
local accent = palette[3]
local motif = ((skillIndex + (familyOffsets[skillFamily] or 0) - 1) % 7) + 1

drawBase(primary, secondary)

if motif == 1 then
  drawBlade(primary, secondary, accent)
elseif motif == 2 then
  drawShield(primary, secondary, accent)
elseif motif == 3 then
  drawBurst(primary, secondary, accent)
elseif motif == 4 then
  drawOrb(primary, secondary, accent)
elseif motif == 5 then
  drawArrow(primary, secondary, accent)
elseif motif == 6 then
  drawRune(primary, secondary, accent)
else
  drawWave(primary, secondary, accent)
end

local marker = skillIndex % 10
fillRect(12 + marker * 4, 54, 2, 3, accent)
if skillIndex % 3 == 0 then
  fillPixel(51, 14, colors.gold)
end
if skillIndex % 5 == 0 then
  fillPixel(13, 46, colors.etherLight)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
