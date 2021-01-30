// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: briefcase-medical;

// credits
// Progress Circle based on: https://github.com/ThisIsBenny/iOS-Widgets/tree/main/VodafoneDE
// Configuration Inspiration: https://github.com/rphl/corona-widget

const CFG = {
    openUrl: false,
    dataPath: "https://raw.githubusercontent.com/henrythier/vax_stats/main/data/",
    fileFirst: "latest.json",
    fileSecond: "latest_second.json",
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

        const data = await dataRequest.request(CFG.dataUrl + CFG.fileFirst);
        const dataSecond = await dataRequest.request(CFG.dataUrl + CFG.fileSecond);

        if (data !== undefined && dataSecond !== undefined) {
            const contentStack = list.addStack();
            contentStack.addSpacer();

            if (data.vaccTotal > 1000000) {
                contentStack.addImage(await progCircle.getDiagram(data.vaccTotalPerc, dataSecond.vaccTotalPerc, (data.vaccTotal / 1000000).toPrecision(3), data.updated, "M"));
            } else if (data.vaccTotal > 1000) {
                contentStack.addImage(await progCircle.getDiagram(data.vaccTotalPerc, dataSecond.vaccTotalPerc, (data.vaccTotal / 1000).toPrecision(3), data.updated, "k"));
            } else {
                contentStack.addImage(await progCircle.getDiagram(data.vaccTotalPerc, dataSecond.vaccTotalPerc, data.vaccTotal.toPrecision(3)), data.updated);
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
            dataJSON = await resData.loadJSON();

            if (dataJSON !== undefined) {
                data.vaccTotalPerc = parseFloat(data.vaccinated_rel.Total).toFixed(2);
                data.vaccTotal = parseFloat(data.vaccinated_abs.Total);
                let timestamp = new Date(data.Timestamp);
                data.updated = timestamp.getHours() + ':' + ('' + timestamp.getMinutes()).padStart(2, '0')
            }

        } catch (e) {
            console.warn(e);
        }
        return data;
    };
}

class ProgCircle {

    async getDiagram(percentageFirst, percentageSecond, absolute, timestamp, unit = "") {
        let textColor = new Color('EDEDED');
        let strokeColor = new Color('B0B0B0');
        let strokeTransparent = new Color('B0B0B0', 0);
        let fillColor = new Color('60D4DE');
        let fillColorSecondary = new Color('D13DCA');

        function drawArc(ctr, rad, w, deg, sCol = strokeColor, fCol = fillColor) {
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
            Math.floor(percentageSecond * 3.6),
            strokeColor,
            fillColor
        );

        drawArc(
            new Point(canvSize / 2, canvSize / 2),
            canvRadius,
            canvWidth,
            Math.floor(percentageFirst * 3.6),
            strokeTransparent,
            fillColorSecondary
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
        canvas.drawTextInRect(`${percentageFirst}% geimpft`, canvSmallTextRect);

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
