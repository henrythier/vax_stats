// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: briefcase-medical;

// credits
// Progress Circle based on: https://github.com/ThisIsBenny/iOS-Widgets/tree/main/VodafoneDE
// Configuration Inspiration: https://github.com/rphl/corona-widget

const CFG = {
  openUrl: false,
  dataUrl:
    "https://raw.githubusercontent.com/henrythier/vax_stats/main/data/latest.json",
  dataUrlSecond:
    "https://raw.githubusercontent.com/henrythier/vax_stats/main/data/latest_second.json",
  scriptRefreshInterval: 5400,
};

const ENV = {
  color: {
    background: new Color("181818"),
    text: new Color("e8e8e8"),
    stroke: new Color("282828"),
    strokeT: new Color("282828", 0),
    fill: new Color("00ADEF"),
    fillS: new Color("E5BB00"),
  },
  font: {
    large: 40,
    medium: 14,
    small: 12,
  },
};

class VaccinationWidget {
  async init() {
    this.widget = await this.createWidget();
    if (!config.runsInWidget) {
      await this.widget.presentSmall();
    }
    Script.setWidget(this.widget);
    Script.complete();
  }

  async createWidget() {
    const list = new ListWidget();

    list.backgroundColor = ENV.color.background;
    list.setPadding(0, 0, 0, 0);

    let data = [];
    data[0] = await dataRequest.request(CFG.dataUrl);
    data[1] = await dataRequest.request(CFG.dataUrlSecond);

    if (data[0] !== undefined && data[1] !== undefined) {
      const contentStack = list.addStack();
      contentStack.addSpacer();

      contentStack.addImage(
        await progCircle.getDiagram(
          data[0].vaccTotalPerc,
          data[1].vaccTotalPerc,
          (data[0].vaccTotal / 1000000).toPrecision(3),
          data[0].updated,
          "M"
        )
      );

      contentStack.addSpacer();
    } else {
      const errorRow = contentStack.addText("Could not load data.");
    }

    if (CFG.openUrl) list.url = CFG.openUrl;
    list.refreshAfterDate = new Date(
      Date.now() + CFG.scriptRefreshInterval * 1000
    );
    return list;
  }
}

class DataRequest {
  async request(url) {
    let data = {};
    try {
      const resData = new Request(url);
      resData.timeoutInterval = 20;
      let dataJSON = await resData.loadJSON();

      if (dataJSON !== undefined) {
        data.vaccTotalPerc = parseFloat(dataJSON.vaccinated_rel.Total).toFixed(
          2
        );
        data.vaccTotal = parseFloat(dataJSON.vaccinated_abs.Total);
        let timestamp = new Date(dataJSON.Timestamp);
        data.updated =
          timestamp.getHours() +
          ":" +
          ("" + timestamp.getMinutes()).padStart(2, "0");
      }
    } catch (e) {
      console.warn(e);
    }
    return data;
  }
}

class ProgCircle {
  async getDiagram(
    percentageFirst,
    percentageSecond,
    absolute,
    timestamp,
    unit
  ) {
    function drawArc(ctr, rad, w, deg, sCol, fCol) {
      let bgx = ctr.x - rad;
      let bgy = ctr.y - rad;
      let bgd = 2 * rad;
      let bgr = new Rect(bgx, bgy, bgd, bgd);

      canvas.setFillColor(fCol);
      canvas.setStrokeColor(sCol);
      canvas.setLineWidth(w);
      canvas.strokeEllipse(bgr);

      for (let t = 0; t < deg; t++) {
        let rect_x = ctr.x + rad * sinDeg(t) - w / 2;
        let rect_y = ctr.y - rad * cosDeg(t) - w / 2;
        let rect_r = new Rect(rect_x, rect_y, w, w);
        canvas.fillEllipse(rect_r);
      }
    }

    function sinDeg(deg) {
      return Math.sin((deg * Math.PI) / 180);
    }

    function cosDeg(deg) {
      return Math.cos((deg * Math.PI) / 180);
    }

    const canvas = new DrawContext();
    const canvasSize = 200;
    const canvasWidth = 15;
    const canvasRadius = 85;

    canvas.opaque = false;
    canvas.size = new Size(canvasSize, canvasSize);
    canvas.respectScreenScale = true;

    drawArc(
      new Point(canvasSize / 2, canvasSize / 2),
      canvasRadius,
      canvasWidth,
      Math.floor(percentageFirst * 3.6),
      ENV.color.stroke,
      ENV.color.fill
    );

    drawArc(
      new Point(canvasSize / 2, canvasSize / 2),
      canvasRadius,
      canvasWidth,
      Math.floor(percentageSecond * 3.6),
      ENV.color.strokeT,
      ENV.color.fillS
    );

    const canvasAbs = new Rect(
      0,
      100 - ENV.font.large / 1.5,
      canvasSize,
      ENV.font.large * 1.5
    );

    canvas.setTextAlignedCenter();
    canvas.setTextColor(ENV.color.text);
    canvas.setFont(Font.boldSystemFont(ENV.font.large));
    canvas.drawTextInRect(`${absolute}${unit}`, canvasAbs);

    const canvasDetail = new Rect(
      0,
      100 + ENV.font.large / 2,
      canvasSize,
      ENV.font.medium * 1.5
    );

    canvas.setTextColor(ENV.color.text);
    canvas.setFont(Font.mediumSystemFont(ENV.font.medium));
    canvas.drawTextInRect(
      `${percentageFirst}% | ${percentageSecond}%`,
      canvasDetail
    );

    const canvasTimestamp = new Rect(
      0,
      canvasSize - ENV.font.small,
      canvasSize,
      ENV.font.small
    );

    canvas.setTextAlignedRight();
    canvas.setTextColor(Color.gray());
    canvas.setFont(Font.regularSystemFont(ENV.font.small));
    canvas.drawTextInRect(`${timestamp}`, canvasTimestamp);

    return canvas.getImage();
  }
}

const dataRequest = new DataRequest();
const progCircle = new ProgCircle();
await new VaccinationWidget().init();
