local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local tileKey = app.params["tile"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if tileKey == nil or tileKey == "" then
  error("Missing required --script-param tile=<tile-key>")
end

local SIZE = 256

local colors = {
  ink = Color { r = 5, g = 8, b = 18, a = 255 },
  grass = Color { r = 77, g = 157, b = 66, a = 255 },
  grassLight = Color { r = 112, g = 204, b = 86, a = 255 },
  moss = Color { r = 48, g = 132, b = 90, a = 255 },
  mossLight = Color { r = 84, g = 190, b = 119, a = 255 },
  sand = Color { r = 196, g = 147, b = 80, a = 255 },
  sandLight = Color { r = 227, g = 183, b = 112, a = 255 },
  snow = Color { r = 168, g = 203, b = 215, a = 255 },
  ice = Color { r = 103, g = 190, b = 218, a = 255 },
  brass = Color { r = 151, g = 105, b = 64, a = 255 },
  brassLight = Color { r = 209, g = 154, b = 83, a = 255 },
  stone = Color { r = 97, g = 91, b = 118, a = 255 },
  stoneLight = Color { r = 147, g = 140, b = 166, a = 255 },
  void = Color { r = 54, g = 42, b = 91, a = 255 },
  voidLight = Color { r = 111, g = 70, b = 156, a = 255 },
  water = Color { r = 48, g = 118, b = 158, a = 255 },
  waterLight = Color { r = 86, g = 178, b = 205, a = 255 },
  chrono = Color { r = 76, g = 153, b = 178, a = 255 },
  chronoLight = Color { r = 241, g = 194, b = 90, a = 255 },
  flower = Color { r = 224, g = 87, b = 128, a = 255 },
  crystal = Color { r = 78, g = 225, b = 222, a = 255 },
}

local function hashKey(value)
  local hash = 23
  for i = 1, #value do
    hash = (hash * 37 + string.byte(value, i)) % 2147483647
  end
  return hash
end

math.randomseed(hashKey(tileKey))

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
layer.name = "environmentTile"

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

local function paletteFor(key)
  if key == "aether_ground_tile" then return colors.grass, colors.grassLight, colors.stone end
  local lowerRegion = string.match(key, "^(%l+)_ground_tile$")
  local regionAliases = {
    erb = "ERB",
    syl = "SYL",
    sol = "SOL",
    nor = "NTH",
    arg = "ARG",
    aby = "ABY",
    bri = "BRT",
    obl = "OBL",
    tem = "TMP",
  }
  local prefix = regionAliases[lowerRegion] or string.match(key, "^(%u+)")
  if prefix == "SYL" then return colors.moss, colors.mossLight, colors.flower end
  if prefix == "SOL" then return colors.sand, colors.sandLight, colors.stone end
  if prefix == "NTH" then return colors.snow, colors.ice, colors.crystal end
  if prefix == "ARG" then return colors.brass, colors.brassLight, colors.stone end
  if prefix == "ABY" then return colors.void, colors.voidLight, colors.crystal end
  if prefix == "BRT" then return colors.water, colors.waterLight, colors.sand end
  if prefix == "OBL" then return colors.stone, colors.stoneLight, colors.voidLight end
  if prefix == "TMP" then return colors.chrono, colors.chronoLight, colors.crystal end
  if prefix == "FOG" then return colors.water, colors.mossLight, colors.crystal end
  return colors.grass, colors.grassLight, colors.stone
end

local function drawBase(base, light)
  for y = 0, SIZE - 1, 8 do
    for x = 0, SIZE - 1, 8 do
      local shade = math.random(-18, 18)
      local c = Color {
        r = math.max(0, math.min(255, base.red + shade)),
        g = math.max(0, math.min(255, base.green + shade)),
        b = math.max(0, math.min(255, base.blue + shade)),
        a = 255,
      }
      fillRect(x, y, 8, 8, c)
    end
  end

  for i = 1, 150 do
    local x = math.random(0, SIZE - 4)
    local y = math.random(0, SIZE - 4)
    fillRect(x, y, math.random(2, 8), math.random(1, 4), light)
  end
end

local function drawPebbles(accent)
  for i = 1, 42 do
    local x = math.random(4, SIZE - 8)
    local y = math.random(4, SIZE - 8)
    fillDiamond(x, y, math.random(2, 6), colors.ink)
    fillDiamond(x, y, math.random(1, 4), accent)
  end
end

local function drawCracks()
  for i = 1, 18 do
    local x = math.random(0, SIZE)
    local y = math.random(0, SIZE)
    drawLine(x, y, x + math.random(-42, 42), y + math.random(-24, 24), 2, colors.ink)
  end
end

local function drawGrass(light)
  for i = 1, 80 do
    local x = math.random(2, SIZE - 3)
    local y = math.random(6, SIZE - 3)
    drawLine(x, y, x + math.random(-4, 4), y - math.random(4, 10), 2, light)
  end
end

local function drawWater(light)
  for y = 12, SIZE - 12, 28 do
    for x = math.random(-20, 8), SIZE, 54 do
      fillRect(x, y + math.random(-4, 4), math.random(22, 44), 3, light)
    end
  end
end

local base, light, accent = paletteFor(tileKey)
local lowerRegion = string.match(tileKey, "^(%l+)_ground_tile$")
local normalizedPrefix = ({
  erb = "ERB",
  syl = "SYL",
  sol = "SOL",
  nor = "NTH",
  arg = "ARG",
  aby = "ABY",
  bri = "BRT",
  obl = "OBL",
  tem = "TMP",
})[lowerRegion] or string.match(tileKey, "^(%u+)")

drawBase(base, light)

if normalizedPrefix == "BRT" or normalizedPrefix == "FOG" then
  drawWater(light)
elseif normalizedPrefix == "SYL" or tileKey == "aether_ground_tile" then
  drawGrass(light)
  drawPebbles(accent)
elseif normalizedPrefix == "ABY" or normalizedPrefix == "OBL" then
  drawCracks()
  drawPebbles(accent)
elseif normalizedPrefix == "TMP" then
  drawCracks()
  for i = 1, 24 do
    fillDiamond(math.random(8, SIZE - 8), math.random(8, SIZE - 8), math.random(3, 9), accent)
  end
else
  drawPebbles(accent)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
