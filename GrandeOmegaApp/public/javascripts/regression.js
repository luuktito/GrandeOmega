//Draw Regression for a graph, given a group, the names of the keys to be used as X and Y the max value of the x axis and the chart to add the line to
function DrawRegression(group, key1, key2, maxValue, chart, type) {
    var groupCopy = group.all();
    var lineColor = 'red';
    var labelOffset = 0;

    var XYSeriesResult = CreateXYSeries(group, key1, key2);
    var xSeries = XYSeriesResult[0];
    var ySeries = XYSeriesResult[1];
    var xDate = XYSeriesResult[2];
    var totalDays = XYSeriesResult[3];

    if (type == 'simple_linear') {
        var regressionResult = leastSquaresSimple(xSeries, ySeries);
    }
    else if (type == 'logarithmic') {
        var regressionResult = leastSquaresLogarithmic(xSeries, ySeries);
        var lineColor = 'green';
        var labelOffset = 45;
    }
    else
        return

    var left_y = regressionResult[2];
    var right_y = (xDate == true ? totalDays : maxValue) * regressionResult[1] + regressionResult[2];
    var extra_data = [];
    if (type == 'simple_linear') {
        extra_data = [{ x: chart.x().range()[0], y: chart.y()(left_y) }, { x: chart.x().range()[1], y: chart.y()(right_y) }];
    }
    else if (type == 'logarithmic') {
        for (var i = 0; i < xSeries.length; i++) {
            if (xDate == true)
                extra_data.push({ x: chart.x()(groupCopy[i]['key']), y: chart.y()(regressionResult[4][i]) });
            else
                extra_data.push({ x: chart.x()(xSeries[i]), y: chart.y()(regressionResult[4][i]) });
        }
        extra_data.sort(function (a, b) {
            return a.x - b.x;
        });
    }

    var line = d3.svg.line()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; })
        .interpolate('basis');
    var chartBody = chart.select('g.chart-body');
    var path = chartBody.selectAll().data([extra_data]);
    path.enter().append('path').attr({
        'class': 'extra',
        'stroke': lineColor,
        'stroke-width': 2,
        'fill': 'none',
        'id': 'extra-line',
        'd': line,
    });

    var text = chartBody.selectAll().data([extra_data]);
    text.enter().append('text')
        .attr({
            class: 'extra-label',
            'transform': 'translate(' + (chart.x().range()[1] * 0.85) + ',' + (10 + labelOffset) + ')',
            'text-anchor': 'left',
            'fill': lineColor
        })
        .text(regressionResult[3]);
    if (type !== 'logarithmic') {
        text.enter().append('text')
            .attr({
                class: 'extra-label',
                'transform': 'translate(' + (chart.x().range()[1] * 0.85) + ',' + (25 + labelOffset) + ')',
                'text-anchor': 'left',
                'fill': lineColor
            })
            .text('R Squared: ' + regressionResult[0].toFixed(2));
    }

}

// returns slope, intercept and r-square of the line
function leastSquaresSimple(xSeries, ySeries) {
    var reduceSumFunc = function (prev, cur) { return prev + cur; };

    var xBar = xSeries.reduce(reduceSumFunc) * 1.0 / xSeries.length;
    var yBar = ySeries.reduce(reduceSumFunc) * 1.0 / ySeries.length;

    var ssXX = xSeries.map(function (d) { return Math.pow(d - xBar, 2); })
        .reduce(reduceSumFunc);

    var ssYY = ySeries.map(function (d) { return Math.pow(d - yBar, 2); })
        .reduce(reduceSumFunc);

    var ssXY = xSeries.map(function (d, i) { return (d - xBar) * (ySeries[i] - yBar); })
        .reduce(reduceSumFunc);

    var slope = ssXY / ssXX;
    var intercept = yBar - (xBar * slope);
    var rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

    return [rSquare, slope, intercept, "y = " + slope.toFixed(2) + 'x + ' + intercept.toFixed(2)];
}

//Code adapted from the logarithmic regression from regression-js
//https://github.com/Tom-Alexander/regression-js/blob/master/src/regression.js
//Copyright (c) Tom Alexander <me@tomalexander.co.nz>
function leastSquaresLogarithmic(xSeries, ySeries) {
    var seriesLength = xSeries.length;
    var sum = [0, 0, 0, 0];
    var coeffA;
    var coeffB;
    var results;
    var regressionY = [];

    for (var i = 0; i < seriesLength; i++) {
        var tempX = (xSeries[i] !== 0) ? xSeries[i] : 1;
        sum[0] += Math.log(tempX);
        sum[1] += ySeries[i] * Math.log(tempX);
        sum[2] += ySeries[i];
        sum[3] += Math.pow(Math.log(tempX), 2);
    }

    coeffB = (seriesLength * sum[1] - sum[2] * sum[0]) / (seriesLength * sum[3] - sum[0] * sum[0]);
    coeffA = (sum[2] - coeffB * sum[0]) / seriesLength;

    for (var i = 0; i < seriesLength; i++) {
        var tempX = (xSeries[i] !== 0) ? xSeries[i] : 1;
        regressionY.push(coeffA + (Math.log(tempX) * coeffB));
    }

    results = [0, coeffA, coeffB, "y = " + coeffB.toFixed(2) + "" + "ln(x)" + " + " + coeffA.toFixed(2), regressionY];
    return results;
}