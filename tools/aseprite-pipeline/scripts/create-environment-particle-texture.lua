local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local particleKey = app.params["particle"]
local widthParam = app.params["width"]
local heightParam = app.params["height"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if particleKey == nil or particleKey == "" then
  error("Missing required --script-param particle=<particle-key>")
end

local WIDTH = tonumber(widthParam) or 6
local HEIGHT = tonumber(heightParam) or 10

local expectedSizes = {
  particle_rain = { w = 2, h = 10 },
  particle_snow = { w = 6, h = 10 },
  particle_ether_beam = { w = 6, h = 16 },
}

local expected = expectedSizes[particleKey]
if expected == nil then
  error("Unsupported environment particle texture: " .. tostring(particleKey))
end

if WIDTH ~= expected.w or HEIGHT ~= expected.h then
  error("Unexpected size for " .. particleKey .. ": " .. tostring(widthParam) .. "x" .. tostring(heightParam))
end

local colors = {
  transparent = Color { r = 0, g = 0, b = 0, a = 0 },
  rainDim = Color { r = 75, g = 111, b = 184, a = 130 },
  rain = Color { r = 112, g = 155, b = 225, a = 190 },
  snowDim = Color { r = 195, g = 226, b = 255, a = 130 },
  snow = Color { r = 255, g = 255, b = 255, a = 220 },
  etherDim = Color { r = 24, g = 169, b = 220, a = 120 },
  ether = Color { r = 79, g = 230, b = 255, a = 210 },
  etherHot = Color { r = 218, g = 255, b = 255, a = 240 },
}

local sprite = Sprite(WIDTH, HEIGHT, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

if palettePath ~= nil and palettePath ~= "" then
  pcall(function()
    app.command.LoadPalette { filename = palettePath }
  end)
end

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, WIDTH, HEIGHT)
end)

local layer = sprite.layers[1]
layer.name = "environmentParticleTexture"

local image = Image(WIDTH, HEIGHT, ColorMode.RGB)
image:clear()

local function fillPixel(x, y, color)
  if x >= 0 and x < WIDTH and y >= 0 and y < HEIGHT then
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

local function fillCircle(cx, cy, radius, color)
  for y = -radius, radius do
    for x = -radius, radius do
      if x * x + y * y <= radius * radius then
        fillPixel(cx + x, cy + y, color)
      end
    end
  end
end

local function drawRain()
  fillPixel(0, 0, colors.rainDim)
  fillPixel(1, 1, colors.rain)
  fillPixel(0, 2, colors.rain)
  fillPixel(1, 3, colors.rain)
  fillPixel(0, 4, colors.rain)
  fillPixel(1, 5, colors.rain)
  fillPixel(0, 6, colors.rainDim)
  fillPixel(1, 7, colors.rainDim)
  fillPixel(0, 8, colors.rainDim)
end

local function drawSnow()
  fillCircle(3, 4, 2, colors.snowDim)
  fillCircle(3, 4, 1, colors.snow)
  fillPixel(1, 4, colors.snow)
  fillPixel(5, 4, colors.snow)
  fillPixel(3, 2, colors.snow)
  fillPixel(3, 6, colors.snow)
end

local function drawEtherBeam()
  fillRect(1, 0, 4, 16, colors.etherDim)
  fillRect(2, 0, 2, 16, colors.ether)
  fillRect(3, 1, 1, 14, colors.etherHot)
end

if particleKey == "particle_rain" then
  drawRain()
elseif particleKey == "particle_snow" then
  drawSnow()
elseif particleKey == "particle_ether_beam" then
  drawEtherBeam()
end

sprite.cels[1].image = image
app.command.SaveFileAs { filename = outputPath }
