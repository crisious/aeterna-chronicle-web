local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local zoneKey = app.params["zone"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if zoneKey == nil or zoneKey == "" then
  error("Missing required --script-param zone=<zone-key>")
end

local FRAME_SIZE = 64
local colors = {
  outline = Color { r = 5, g = 8, b = 18, a = 255 },
  shadow = Color { r = 8, g = 9, b = 18, a = 120 },
  stone = Color { r = 127, g = 118, b = 150, a = 245 },
  stoneLight = Color { r = 199, g = 177, b = 210, a = 245 },
  grass = Color { r = 100, g = 201, b = 93, a = 245 },
  forest = Color { r = 49, g = 142, b = 104, a = 245 },
  sanctuary = Color { r = 126, g = 216, b = 168, a = 245 },
  crystal = Color { r = 89, g = 231, b = 231, a = 245 },
  crystalLight = Color { r = 193, g = 255, b = 246, a = 245 },
  shadowPurple = Color { r = 71, g = 48, b = 119, a = 245 },
  citadel = Color { r = 199, g = 132, b = 72, a = 245 },
  chrono = Color { r = 255, g = 85, b = 148, a = 245 },
  gold = Color { r = 255, g = 209, b = 91, a = 245 },
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
layer.name = "icon"

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

local function drawBase(fillColor)
  fillEllipse(32, 48, 22, 6, colors.shadow)
  fillEllipse(32, 34, 25, 20, colors.outline)
  fillEllipse(32, 34, 22, 17, fillColor)
end

local function drawRuins()
  fillRect(21, 27, 6, 18, colors.outline)
  fillRect(22, 28, 4, 16, colors.stone)
  fillRect(36, 24, 7, 21, colors.outline)
  fillRect(37, 25, 5, 19, colors.stoneLight)
  fillRect(28, 35, 9, 10, colors.outline)
  fillRect(29, 36, 7, 8, colors.stone)
  fillRect(23, 24, 3, 2, colors.gold)
  fillRect(38, 22, 3, 2, colors.gold)
end

local function drawTrees()
  fillRect(19, 38, 3, 7, colors.outline)
  fillRect(20, 38, 1, 7, colors.citadel)
  fillDiamond(20, 29, 9, colors.outline)
  fillDiamond(20, 30, 7, colors.forest)
  fillRect(33, 37, 3, 8, colors.outline)
  fillRect(34, 37, 1, 8, colors.citadel)
  fillDiamond(34, 27, 10, colors.outline)
  fillDiamond(34, 28, 8, colors.grass)
  fillDiamond(45, 33, 7, colors.outline)
  fillDiamond(45, 34, 5, colors.forest)
end

local function drawGorge()
  fillDiamond(24, 34, 13, colors.outline)
  fillDiamond(24, 34, 10, colors.shadowPurple)
  fillDiamond(40, 31, 12, colors.outline)
  fillDiamond(40, 31, 9, colors.stone)
  fillRect(31, 21, 4, 28, colors.outline)
  fillRect(32, 23, 2, 24, colors.chrono)
  fillPixel(31, 28, colors.crystalLight)
  fillPixel(34, 39, colors.crystal)
end

local function drawSanctuary()
  fillRect(20, 37, 26, 10, colors.outline)
  fillRect(22, 36, 22, 10, colors.sanctuary)
  fillRect(24, 28, 4, 18, colors.outline)
  fillRect(25, 29, 2, 16, colors.stoneLight)
  fillRect(36, 28, 4, 18, colors.outline)
  fillRect(37, 29, 2, 16, colors.stoneLight)
  fillDiamond(32, 23, 10, colors.outline)
  fillDiamond(32, 24, 7, colors.sanctuary)
  fillDiamond(32, 33, 5, colors.crystalLight)
  fillPixel(32, 20, colors.gold)
  fillPixel(26, 25, colors.crystal)
  fillPixel(38, 25, colors.crystal)
end

local function drawCrystal()
  fillDiamond(30, 29, 15, colors.outline)
  fillDiamond(30, 29, 12, colors.crystal)
  fillDiamond(43, 36, 10, colors.outline)
  fillDiamond(43, 36, 7, colors.crystalLight)
  fillDiamond(21, 39, 8, colors.outline)
  fillDiamond(21, 39, 5, colors.shadowPurple)
  fillRect(30, 18, 2, 20, colors.crystalLight)
  fillPixel(37, 27, colors.gold)
end

local function drawCitadel()
  fillRect(18, 35, 30, 12, colors.outline)
  fillRect(20, 34, 26, 12, colors.citadel)
  fillRect(22, 25, 6, 22, colors.outline)
  fillRect(23, 26, 4, 20, colors.stone)
  fillRect(36, 23, 7, 24, colors.outline)
  fillRect(37, 24, 5, 22, colors.stoneLight)
  fillRect(30, 31, 7, 16, colors.outline)
  fillRect(31, 32, 5, 14, colors.citadel)
  fillRect(30, 39, 7, 8, colors.outline)
end

local function drawSpire()
  fillDiamond(32, 17, 8, colors.outline)
  fillDiamond(32, 17, 5, colors.chrono)
  fillRect(29, 23, 7, 25, colors.outline)
  fillRect(31, 24, 3, 23, colors.stoneLight)
  fillDiamond(32, 34, 11, colors.outline)
  fillDiamond(32, 34, 8, colors.shadowPurple)
  fillPixel(32, 14, colors.gold)
  fillPixel(25, 23, colors.crystalLight)
  fillPixel(39, 24, colors.crystal)
end

if zoneKey == "aether_plains" then
  drawBase(colors.grass)
  drawRuins()
elseif zoneKey == "memory_forest" then
  drawBase(colors.forest)
  drawTrees()
elseif zoneKey == "malatus_sanctuary" then
  drawBase(colors.sanctuary)
  drawSanctuary()
elseif zoneKey == "shadow_gorge" then
  drawBase(colors.shadowPurple)
  drawGorge()
elseif zoneKey == "crystal_cave" then
  drawBase(colors.crystal)
  drawCrystal()
elseif zoneKey == "forgotten_citadel" then
  drawBase(colors.citadel)
  drawCitadel()
elseif zoneKey == "chrono_spire" then
  drawBase(colors.shadowPurple)
  drawSpire()
else
  error("Unknown zone: " .. zoneKey)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
