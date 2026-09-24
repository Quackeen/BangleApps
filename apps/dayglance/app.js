// Day Glance: time, date, battery and today's steps on one screen.
// Tap to toggle seconds. Use the back arrow (or the button) to exit.
{
  let showSeconds = false;
  let drawTimeout;

  let draw = function() {
    let R = Bangle.appRect;
    let x = R.x + R.w / 2;
    let d = new Date();
    let time = require("locale").time(d, 1);
    let steps = Bangle.getHealthStatus("day").steps;

    g.reset().clearRect(R);
    g.setFontAlign(0, 0);
    g.setFont("Vector", showSeconds ? 44 : 56).drawString(
      showSeconds ? time + ":" + ("0" + d.getSeconds()).substr(-2) : time,
      x, R.y + 40);
    g.setFont("6x8", 2).drawString(require("locale").date(d, 1), x, R.y + 82);
    g.setFont("6x8", 2).drawString(E.getBattery() + "%  " + steps + " steps", x, R.y + 110);

    // Redraw at the start of the next second/minute
    let period = showSeconds ? 1000 : 60000;
    if (drawTimeout) clearTimeout(drawTimeout);
    drawTimeout = setTimeout(function() {
      drawTimeout = undefined;
      draw();
    }, period - (Date.now() % period));
  };

  let onLcd = function(on) {
    if (on) {
      draw();
    } else if (drawTimeout) {
      // Don't wake the CPU while the screen is off
      clearTimeout(drawTimeout);
      drawTimeout = undefined;
    }
  };

  Bangle.on("lcdPower", onLcd);
  Bangle.setUI({
    mode: "custom",
    back: load,
    touch: function() {
      showSeconds = !showSeconds;
      draw();
    },
    remove: function() {
      if (drawTimeout) clearTimeout(drawTimeout);
      Bangle.removeListener("lcdPower", onLcd);
    }
  });

  g.clear();
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  draw();
}
