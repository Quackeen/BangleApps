(function(back) {
  const FILE = "stardewclk.json";
  const BACKGROUNDS = ["Mountains", "Farm"];
  let settings = require("Storage").readJSON(FILE, 1) || {};

  E.showMenu({
    "": { "title": "Stardew Clock" },
    "< Back": back,
    "Background": {
      value: settings.bg | 0,
      min: 0, max: BACKGROUNDS.length - 1,
      format: v => BACKGROUNDS[v],
      onchange: v => {
        settings.bg = v;
        require("Storage").writeJSON(FILE, settings);
      }
    }
  });
})
