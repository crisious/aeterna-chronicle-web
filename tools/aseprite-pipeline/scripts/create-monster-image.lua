local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local monsterKey = app.params["monster"]
local variant = app.params["variant"] or "normal"
local requestedSize = tonumber(app.params["size"] or "")

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if monsterKey == nil or monsterKey == "" then
  error("Missing required --script-param monster=<monster-id>")
end

local SIZE = requestedSize
if SIZE == nil then
  SIZE = variant == "battle" and 64 or 256
end

if SIZE ~= 64 and SIZE ~= 256 and SIZE ~= 384 and SIZE ~= 512 then
  error("size must be 64, 256, 384, or 512")
end

local monsterKeyLower = string.lower(monsterKey)

local colors = {
  outline = Color { r = 5, g = 7, b = 16, a = 255 },
  outlineSoft = Color { r = 20, g = 22, b = 37, a = 230 },
  shadow = Color { r = 6, g = 7, b = 12, a = 120 },
  eye = Color { r = 255, g = 220, b = 90, a = 255 },
  eyeHot = Color { r = 255, g = 102, b = 119, a = 255 },
  pearl = Color { r = 225, g = 246, b = 244, a = 255 },
}

local palettes = {
  abyss = {
    dark = Color { r = 26, g = 20, b = 55, a = 255 },
    mid = Color { r = 75, g = 55, b = 137, a = 255 },
    light = Color { r = 165, g = 111, b = 235, a = 255 },
    accent = Color { r = 80, g = 226, b = 226, a = 255 },
  },
  argentium = {
    dark = Color { r = 57, g = 49, b = 43, a = 255 },
    mid = Color { r = 146, g = 106, b = 58, a = 255 },
    light = Color { r = 235, g = 181, b = 91, a = 255 },
    accent = Color { r = 88, g = 201, b = 231, a = 255 },
  },
  britalia = {
    dark = Color { r = 24, g = 45, b = 70, a = 255 },
    mid = Color { r = 52, g = 126, b = 164, a = 255 },
    light = Color { r = 115, g = 216, b = 225, a = 255 },
    accent = Color { r = 255, g = 146, b = 115, a = 255 },
  },
  erebos = {
    dark = Color { r = 28, g = 35, b = 48, a = 255 },
    mid = Color { r = 70, g = 88, b = 100, a = 255 },
    light = Color { r = 136, g = 170, b = 160, a = 255 },
    accent = Color { r = 101, g = 226, b = 184, a = 255 },
  },
  fog_sea = {
    dark = Color { r = 20, g = 42, b = 56, a = 255 },
    mid = Color { r = 38, g = 112, b = 132, a = 255 },
    light = Color { r = 109, g = 213, b = 210, a = 255 },
    accent = Color { r = 192, g = 241, b = 196, a = 255 },
  },
  northland = {
    dark = Color { r = 35, g = 53, b = 86, a = 255 },
    mid = Color { r = 76, g = 129, b = 179, a = 255 },
    light = Color { r = 181, g = 234, b = 255, a = 255 },
    accent = Color { r = 135, g = 255, b = 230, a = 255 },
  },
  silvanhime = {
    dark = Color { r = 29, g = 57, b = 35, a = 255 },
    mid = Color { r = 61, g = 132, b = 70, a = 255 },
    light = Color { r = 135, g = 217, b = 105, a = 255 },
    accent = Color { r = 239, g = 197, b = 81, a = 255 },
  },
  solaris = {
    dark = Color { r = 90, g = 48, b = 31, a = 255 },
    mid = Color { r = 190, g = 100, b = 45, a = 255 },
    light = Color { r = 255, g = 188, b = 84, a = 255 },
    accent = Color { r = 255, g = 232, b = 128, a = 255 },
  },
  temporal = {
    dark = Color { r = 42, g = 42, b = 84, a = 255 },
    mid = Color { r = 93, g = 87, b = 180, a = 255 },
    light = Color { r = 184, g = 176, b = 255, a = 255 },
    accent = Color { r = 104, g = 238, b = 255, a = 255 },
  },
  oblivion = {
    dark = Color { r = 25, g = 21, b = 37, a = 255 },
    mid = Color { r = 72, g = 58, b = 105, a = 255 },
    light = Color { r = 158, g = 119, b = 198, a = 255 },
    accent = Color { r = 255, g = 96, b = 164, a = 255 },
  },
}

local function contains(value, needle)
  return string.find(value, needle, 1, true) ~= nil
end

local function resolveRegion(key)
  if contains(key, "boss-tem") or contains(key, "tmp-") or contains(key, "temporal") or contains(key, "chrono") or contains(key, "time_") or contains(key, "time-") then return "temporal" end
  if contains(key, "fog_sea") then return "fog_sea" end
  if contains(key, "argentium") then return "argentium" end
  if contains(key, "britalia") then return "britalia" end
  if contains(key, "northland") then return "northland" end
  if contains(key, "silvanhime") then return "silvanhime" end
  if contains(key, "solaris") then return "solaris" end
  if contains(key, "oblivion") or contains(key, "void") or contains(key, "nebulos") then return "oblivion" end
  if contains(key, "boss-aby") then return "abyss" end
  if contains(key, "boss-arg") then return "argentium" end
  if contains(key, "boss-erb") then return "erebos" end
  if contains(key, "boss-fog") then return "fog_sea" end
  if contains(key, "boss-nor") then return "northland" end
  if contains(key, "boss-sol") then return "solaris" end
  if contains(key, "boss-syl") then return "silvanhime" end
  if contains(key, "abyss") then return "abyss" end
  if contains(key, "erebos") then return "erebos" end
  return "erebos"
end

local function resolveMotif(key)
  if contains(key, "worm") or contains(key, "serpent") or contains(key, "snake") or contains(key, "eel") or contains(key, "dragon") or contains(key, "wyrm") or contains(key, "leviathan") or contains(key, "hydra") or contains(key, "basilisk") then
    return "serpent"
  end
  if contains(key, "slime") or contains(key, "wisp") or contains(key, "orb") or contains(key, "core") or contains(key, "elemental") or contains(key, "sphere") or contains(key, "bloom") then
    return "orb"
  end
  if contains(key, "spider") or contains(key, "beetle") or contains(key, "scarab") or contains(key, "crab") or contains(key, "scorpion") or contains(key, "wasp") or contains(key, "moth") or contains(key, "bat") or contains(key, "raven") or contains(key, "gull") or contains(key, "bird") then
    return "insect"
  end
  if contains(key, "golem") or contains(key, "automaton") or contains(key, "soldier") or contains(key, "warrior") or contains(key, "knight") or contains(key, "skeleton") or contains(key, "sailor") or contains(key, "king") or contains(key, "queen") or contains(key, "titan") or contains(key, "colossus") or contains(key, "commander") or contains(key, "priest") or contains(key, "witch") or contains(key, "architect") or contains(key, "sentinel") then
    return "humanoid"
  end
  if contains(key, "ghost") or contains(key, "phantom") or contains(key, "shade") or contains(key, "wraith") or contains(key, "soul") or contains(key, "mirage") or contains(key, "afterimage") then
    return "ghost"
  end
  if contains(key, "flower") or contains(key, "vine") or contains(key, "root") or contains(key, "treant") or contains(key, "fungus") or contains(key, "moss") or contains(key, "spore") or contains(key, "lichen") or contains(key, "cactus") then
    return "plant"
  end
  return "beast"
end

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
layer.name = "monsterImage"

local image = Image(SIZE, SIZE, ColorMode.RGB)
image:clear()

local function scale(value)
  return math.floor((value * SIZE / 64) + 0.5)
end

local function fillPixel(x, y, color)
  if x >= 0 and x < SIZE and y >= 0 and y < SIZE then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  local x0 = scale(x)
  local y0 = scale(y)
  local x1 = scale(x + w) - 1
  local y1 = scale(y + h) - 1

  for py = y0, y1 do
    for px = x0, x1 do
      fillPixel(px, py, color)
    end
  end
end

local function fillEllipse(cx, cy, rx, ry, color)
  local pxCx = scale(cx)
  local pxCy = scale(cy)
  local pxRx = math.max(1, scale(rx))
  local pxRy = math.max(1, scale(ry))

  for y = -pxRy, pxRy do
    for x = -pxRx, pxRx do
      if ((x * x) / (pxRx * pxRx) + (y * y) / (pxRy * pxRy)) <= 1 then
        fillPixel(pxCx + x, pxCy + y, color)
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

local function drawShadow()
  fillEllipse(32, 54, 20, 4, colors.shadow)
  fillEllipse(32, 56, 13, 2, colors.shadow)
end

local function drawSerpent(palette)
  drawLine(12, 43, 24, 34, 9, colors.outline)
  drawLine(24, 34, 38, 39, 11, colors.outline)
  drawLine(38, 39, 51, 28, 9, colors.outline)
  drawLine(13, 43, 25, 35, 5, palette.dark)
  drawLine(25, 35, 38, 39, 7, palette.mid)
  drawLine(38, 39, 49, 29, 5, palette.light)
  fillEllipse(51, 27, 8, 7, colors.outline)
  fillEllipse(50, 27, 6, 5, palette.mid)
  fillDiamond(55, 26, 3, palette.accent)
  fillPixel(scale(52), scale(25), colors.eye)
  fillPixel(scale(53), scale(25), colors.eye)
  fillRect(21, 36, 5, 2, palette.accent)
  fillRect(35, 39, 5, 2, palette.accent)
end

local function drawOrb(palette)
  fillEllipse(32, 35, 18, 18, colors.outline)
  fillEllipse(32, 35, 15, 15, palette.dark)
  fillEllipse(33, 33, 11, 11, palette.mid)
  fillEllipse(28, 29, 5, 5, palette.light)
  fillDiamond(42, 39, 6, palette.accent)
  fillDiamond(22, 22, 3, palette.accent)
  fillDiamond(48, 21, 2, colors.pearl)
  fillRect(23, 48, 18, 3, colors.outlineSoft)
end

local function drawInsect(palette)
  fillEllipse(22, 33, 11, 8, colors.outline)
  fillEllipse(43, 33, 11, 8, colors.outline)
  fillEllipse(22, 33, 8, 6, palette.dark)
  fillEllipse(43, 33, 8, 6, palette.dark)
  fillEllipse(32, 38, 13, 15, colors.outline)
  fillEllipse(32, 38, 10, 12, palette.mid)
  fillRect(31, 26, 3, 22, colors.outline)
  fillRect(32, 27, 1, 19, palette.light)
  fillEllipse(43, 37, 8, 7, colors.outline)
  fillEllipse(43, 37, 5, 4, palette.mid)
  fillPixel(scale(45), scale(35), colors.eyeHot)
  fillRect(16, 47, 9, 2, colors.outline)
  fillRect(38, 47, 10, 2, colors.outline)
  fillDiamond(32, 33, 5, palette.accent)
end

local function drawHumanoid(palette)
  fillEllipse(32, 23, 10, 10, colors.outline)
  fillEllipse(32, 23, 7, 7, palette.mid)
  fillPixel(scale(29), scale(22), colors.eye)
  fillPixel(scale(35), scale(22), colors.eye)
  fillDiamond(32, 38, 17, colors.outline)
  fillDiamond(32, 38, 13, palette.dark)
  fillDiamond(32, 36, 9, palette.mid)
  fillRect(21, 33, 5, 18, colors.outline)
  fillRect(38, 33, 5, 18, colors.outline)
  fillRect(23, 35, 3, 14, palette.light)
  fillRect(38, 35, 3, 14, palette.light)
  fillRect(25, 51, 6, 4, colors.outline)
  fillRect(34, 51, 6, 4, colors.outline)
  fillDiamond(32, 37, 4, palette.accent)
end

local function drawGhost(palette)
  fillEllipse(32, 30, 15, 17, colors.outline)
  fillEllipse(32, 30, 12, 14, palette.dark)
  fillEllipse(28, 28, 4, 6, palette.mid)
  fillEllipse(36, 28, 4, 6, palette.mid)
  fillPixel(scale(28), scale(27), palette.accent)
  fillPixel(scale(36), scale(27), palette.accent)
  fillRect(20, 41, 25, 5, colors.outline)
  fillRect(22, 41, 21, 3, palette.mid)
  fillDiamond(22, 48, 5, colors.outline)
  fillDiamond(32, 49, 6, colors.outline)
  fillDiamond(42, 48, 5, colors.outline)
  fillDiamond(22, 47, 3, palette.dark)
  fillDiamond(32, 48, 4, palette.dark)
  fillDiamond(42, 47, 3, palette.dark)
  fillDiamond(49, 21, 3, palette.accent)
end

local function drawPlant(palette)
  fillRect(29, 35, 7, 18, colors.outline)
  fillRect(31, 35, 3, 17, palette.dark)
  fillEllipse(22, 35, 11, 7, colors.outline)
  fillEllipse(42, 34, 12, 7, colors.outline)
  fillEllipse(22, 35, 8, 5, palette.mid)
  fillEllipse(42, 34, 9, 5, palette.mid)
  fillEllipse(32, 26, 14, 13, colors.outline)
  fillEllipse(32, 26, 11, 10, palette.light)
  fillEllipse(32, 27, 6, 5, palette.mid)
  fillPixel(scale(30), scale(25), colors.eyeHot)
  fillPixel(scale(35), scale(25), colors.eyeHot)
  fillDiamond(47, 26, 4, palette.accent)
  fillDiamond(17, 44, 3, palette.accent)
end

local function drawBeast(palette)
  fillEllipse(31, 39, 18, 10, colors.outline)
  fillEllipse(31, 39, 15, 8, palette.dark)
  fillEllipse(35, 36, 11, 6, palette.mid)
  fillEllipse(47, 34, 9, 8, colors.outline)
  fillEllipse(47, 34, 6, 5, palette.mid)
  fillDiamond(43, 27, 4, colors.outline)
  fillDiamond(52, 27, 4, colors.outline)
  fillDiamond(43, 28, 2, palette.light)
  fillDiamond(52, 28, 2, palette.light)
  fillPixel(scale(50), scale(32), colors.eye)
  fillRect(51, 35, 6, 3, colors.outline)
  fillRect(52, 36, 3, 1, palette.accent)
  fillRect(18, 47, 5, 5, colors.outline)
  fillRect(37, 47, 5, 5, colors.outline)
  fillRect(19, 48, 3, 3, palette.mid)
  fillRect(38, 48, 3, 3, palette.mid)
  drawLine(15, 40, 8, 36, 3, colors.outline)
  drawLine(14, 39, 8, 36, 1, palette.accent)
end

local region = resolveRegion(monsterKeyLower)
local motif = resolveMotif(monsterKeyLower)
local palette = palettes[region] or palettes.erebos

drawShadow()

if motif == "serpent" then
  drawSerpent(palette)
elseif motif == "orb" then
  drawOrb(palette)
elseif motif == "insect" then
  drawInsect(palette)
elseif motif == "humanoid" then
  drawHumanoid(palette)
elseif motif == "ghost" then
  drawGhost(palette)
elseif motif == "plant" then
  drawPlant(palette)
else
  drawBeast(palette)
end

if variant == "battle" then
  fillRect(5, 5, 12, 2, palette.accent)
  fillRect(5, 8, 8, 2, palette.light)
else
  fillRect(7, 7, 14, 2, palette.accent)
  fillRect(7, 11, 9, 2, palette.light)
  fillDiamond(55, 10, 2, colors.pearl)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
