// Stardew Clock: a watch face styled on the Stardew Valley HUD.
// Artwork is in stardewclk.bg.img (full screen) and stardewclk.icons
// (13 raw 16x16 3bpp icons); see README.md for how they were made.
{
  const storage = require("Storage");
  const locale = require("locale");
  require("Font8x16").add(Graphics);

  // Layout, matching the artwork
  const PIVOT_X = 62, PIVOT_Y = 48, HAND_LEN = 36;
  const DATE_X = 116, DATE_Y = 18;
  const WEATHER_X = 67, SEASON_X = 119, LUCK_X = 148, ICON_Y = 34;
  const TIME_X0 = 64, TIME_X1 = 168, TIME_Y = 73;
  const GOLD_X = 32, GOLD_Y = 114, DIGIT_W = 17, DIGITS = 8;

  let is12Hour = (storage.readJSON("setting.json", 1) || {})["12hour"];
  let drawTimeout;

  let icon = function(n, x, y) {
    g.drawImage({
      width: 16, height: 16, bpp: 3, transparent: 5,
      buffer: E.toArrayBuffer(storage.read("stardewclk.icons", n * 96, 96))
    }, x, y);
  };

  // Icon 0-5, from an OpenWeatherMap condition code
  let weatherIcon = function(code) {
    if (code < 300) return 3; // thunderstorm
    if (code < 600) return 2; // drizzle, rain
    if (code < 700) return 4; // snow
    if (code < 800) return 5; // mist, fog...
    if (code == 800) return 0; // clear
    return 1; // clouds
  };

  // Stardew's daily luck: the same all day, different each day
  let luck = function(d) {
    let x = Math.sin(d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) * 10000;
    return Math.floor((x - Math.floor(x)) * 3);
  };

  let drawHand = function(d) {
    // 6am points straight up, the hand sweeps left and reaches the
    // bottom at 2am, then waits there until 6am
    let t = Math.min((d.getHours() * 60 + d.getMinutes() + 1080) % 1440, 1200);
    let a = Math.PI * t / 1200;
    let ux = -Math.sin(a), uy = -Math.cos(a); // along the hand
    let vx = -uy, vy = ux; // across it
    let pt = (along, across) => [PIVOT_X + ux * along + vx * across, PIVOT_Y + uy * along + vy * across];
    let poly = [].concat(
      pt(0, -2), pt(HAND_LEN - 10, -2), pt(HAND_LEN - 10, -6), pt(HAND_LEN, 0),
      pt(HAND_LEN - 10, 6), pt(HAND_LEN - 10, 2), pt(0, 2));
    g.setColor(1, 1, 0).fillPoly(poly).setColor(0, 0, 0).drawPoly(poly, true);
    g.setColor(1, 1, 0).fillCircle(PIVOT_X, PIVOT_Y, 4).setColor(0, 0, 0).drawCircle(PIVOT_X, PIVOT_Y, 4);
  };

  let draw = function() {
    let d = new Date();
    g.reset().drawImage(storage.read("stardewclk.bg.img"), 0, 0);
    drawHand(d);

    // Date
    g.setColor(0, 0, 0).setFont("8x16").setFontAlign(0, 0);
    g.drawString(locale.dow(d, 1) + " " + locale.month(d, 1) + " " + d.getDate(), DATE_X, DATE_Y);

    // Weather (from the Weather app, if installed), season, luck
    let weather = (storage.readJSON("weather.json", 1) || {}).weather;
    if (weather) {
      icon(weatherIcon(weather.code), WEATHER_X, ICON_Y + 3);
      // "22°C" -> "22", the unit won't fit
      g.setColor(1, 1, 1).setFont("8x16").setFontAlign(0, 0);
      g.drawString(locale.temp(weather.temp - 273.15).replace(/[^-\d]+$/, ""), WEATHER_X + 31, ICON_Y + 12);
    } else {
      icon(0, WEATHER_X + 13, ICON_Y + 3); // no forecast: it's sunny in the valley
    }
    let m = d.getMonth();
    icon(m >= 2 && m <= 4 ? 6 : m >= 5 && m <= 7 ? 7 : m >= 8 && m <= 10 ? 8 : 9, SEASON_X, ICON_Y + 3);
    icon(10 + luck(d), LUCK_X, ICON_Y + 3);

    // Time, with am/pm and the battery in a column on the right
    let h = d.getHours();
    let right = TIME_X1 - 16;
    if (is12Hour) {
      g.setColor(0, 0, 0).setFont("6x8").setFontAlign(0, 0);
      g.drawString(h < 12 ? "am" : "pm", right + 7, TIME_Y - 7);
      h = h % 12 || 12;
    }
    let bat = E.getBattery();
    g.setColor(0, 0, 0).drawRect(right + 1, TIME_Y + 2, right + 13, TIME_Y + 8).fillRect(right + 14, TIME_Y + 4, right + 14, TIME_Y + 6);
    g.setColor(bat > 30 ? "#0f0" : bat > 15 ? "#ff0" : "#f00").fillRect(right + 2, TIME_Y + 3, right + 2 + Math.round(bat / 10), TIME_Y + 7);
    g.setColor(0, 0, 0).setFont("8x16", 2).setFontAlign(0, 0);
    g.drawString(h + ":" + ("0" + d.getMinutes()).substr(-2), (TIME_X0 + right) / 2, TIME_Y + 1);

    // Today's steps as gold
    g.setColor(1, 1, 0).fillCircle(17, GOLD_Y - 1, 8).setColor(0, 0, 0).drawCircle(17, GOLD_Y - 1, 8);
    g.setFont("8x16").setFontAlign(0, 0).drawString("G", 17, GOLD_Y);
    let steps = String(Math.min(Bangle.getHealthStatus("day").steps, 99999999));
    g.setColor(1, 0, 0);
    for (let i = 0; i < steps.length; i++)
      g.drawString(steps[i], GOLD_X + (DIGITS - steps.length + i) * DIGIT_W + 7, GOLD_Y);

    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = setTimeout(function() {
      drawTimeout = undefined;
      draw();
    }, 60000 - (Date.now() % 60000));
  };

  let onLcd = function(on) {
    if (on) {
      draw();
    } else if (drawTimeout) {
      clearTimeout(drawTimeout);
      drawTimeout = undefined;
    }
  };

  Bangle.on("lcdPower", onLcd);
  Bangle.setUI({
    mode: "clock",
    remove: function() {
      if (drawTimeout) clearTimeout(drawTimeout);
      drawTimeout = undefined;
      Bangle.removeListener("lcdPower", onLcd);
      require("widget_utils").show();
    }
  });
  Bangle.loadWidgets();
  require("widget_utils").swipeOn();
  draw();
}
