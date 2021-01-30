// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: briefcase-medical;

// credits
// Progress Circle based on: https://github.com/ThisIsBenny/iOS-Widgets/tree/main/VodafoneDE
// Configuration Inspiration: https://github.com/rphl/corona-widget

const CFG = {
    openUrl: false,
    dataUrl: "https://raw.githubusercontent.com/henrythier/vax_stats/main/data/latest.json",
    scriptRefreshInterval: 5400
};

class VaccinationWidget {
    async init() {
        this.widget = await this.createWidget();
        if (!config.runsInWidget) {
            await this.widget.presentSmall();
        }
        Script.setWidget(this.widget);
        Script.complete();
    };

    async createWidget() {
        const list = new ListWidget();
        list.backgroundColor = new Color('121212');
        list.setPadding(0,0,0,0);

        const data = await dataRequest.request(CFG.dataUrl);

        if (data !== undefined) {
            let vaccPercTotal = parseFloat(data.vaccinated_rel.Total).toFixed(2);
            let vaccAbsTotal = parseFloat(data.vaccinated_abs.Total);
            let timestamp = new Date(data.Timestamp);
            let updatedStr = timestamp.getHours() + ':' + ('' + timestamp.getMinutes()).padStart(2, '0')

            const contentStack = list.addStack();
            contentStack.addSpacer();

            if (vaccAbsTotal > 1000000) {
                contentStack.addImage(await progCircle.getDiagram(vaccPercTotal, (vaccAbsTotal / 1000000).toPrecision(3), updatedStr, "M"));
            } else if (vaccAbsTotal > 1000) {
                contentStack.addImage(await progCircle.getDiagram(vaccPercTotal, (vaccAbsTotal / 1000).toPrecision(3), updatedStr, "k"));
            } else {
                contentStack.addImage(await progCircle.getDiagram(vaccPercTotal, vaccAbsTotal.toPrecision(3)), updatedStr);
            }

            contentStack.addSpacer();
        } else {
            const errorRow = contentStack.addText("Could not load data.");
        }

        if (CFG.openUrl) list.url = CFG.openUrl;
        list.refreshAfterDate = new Date(Date.now() + (CFG.scriptRefreshInterval * 1000));
        return list;
    };
}

class DataRequest {
    async request(url) {
        let data = {};
        try {
            const resData = new Request(url);
            resData.timeoutInterval = 20;
            data = await resData.loadJSON();
        } catch (e) {
            console.warn(e);
        }
        return data;
    };
}

class ProgCircle {

    async getDiagram(percentage, absolute, timestamp, unit = "") {
        let textColor = new Color('EDEDED');
        let strokeColor = new Color('B0B0B0');
        let fillColor = new Color('04DAC6');

        function drawArc(ctr, rad, w, deg) {
            let bgx = ctr.x - rad;
            let bgy = ctr.y - rad;
            let bgd = 2 * rad;
            let bgr = new Rect(bgx, bgy, bgd, bgd);

            canvas.setFillColor(fillColor);
            canvas.setStrokeColor(strokeColor);
            canvas.setLineWidth(w);
            canvas.strokeEllipse(bgr);

            for (let t = 0; t < deg; t++) {
                let rect_x = ctr.x + rad * sinDeg(t) - w / 2;
                let rect_y = ctr.y - rad * cosDeg(t) - w / 2;
                let rect_r = new Rect(rect_x, rect_y, w, w);
                canvas.fillEllipse(rect_r);
            }
        };

        function sinDeg(deg) {
            return Math.sin((deg * Math.PI) / 180);
        };

        function cosDeg(deg) {
            return Math.cos((deg * Math.PI) / 180);
        };
        const canvas = new DrawContext();
        const canvSize = 200;
        const canvAbsTextSize = 40;
        const canvRelTextSize = 16;
        const canvUpdTextSize = 12;

        const canvWidth = 15;
        const canvRadius = 85;

        canvas.opaque = false;
        canvas.size = new Size(canvSize, canvSize);
        canvas.respectScreenScale = true;

        drawArc(
            new Point(canvSize / 2, canvSize / 2),
            canvRadius,
            canvWidth,
            Math.floor(percentage * 3.6)
        );

        const canvTextRect = new Rect(
            0,
            100 - canvAbsTextSize / 1.5,
            canvSize,
            canvAbsTextSize * 1.5
        );

        canvas.setTextAlignedCenter();
        canvas.setTextColor(textColor);
        canvas.setFont(Font.boldSystemFont(canvAbsTextSize));
        canvas.drawTextInRect(`${absolute}${unit}`, canvTextRect);

        const canvSmallTextRect = new Rect(
            0,
            100 + canvAbsTextSize / 2,
            canvSize,
            canvRelTextSize * 1.5
        );

        canvas.setTextColor(textColor);
        canvas.setFont(Font.mediumSystemFont(canvRelTextSize));
        canvas.drawTextInRect(`${percentage}% geimpft`, canvSmallTextRect);

        const canvUpdTextRect = new Rect(
            0,
            canvSize - canvUpdTextSize,
            canvSize,
            canvUpdTextSize
        );

        canvas.setTextAlignedRight();
        canvas.setTextColor(Color.gray());
        canvas.setFont(Font.regularSystemFont(canvUpdTextSize));
        canvas.drawTextInRect(`${timestamp}`, canvUpdTextRect);

        return canvas.getImage();
    };
}

const dataRequest = new DataRequest();
const progCircle = new ProgCircle();
await new VaccinationWidget().init();
