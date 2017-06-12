//Draw Regression for a graph, given a group, the names of the keys to be used as X and Y the max value of the x axis and the chart to add the line to
function DrawCorrelation(group, key1, key2, chart, type) {
    var labelOffset = 0;
    var labelText = "Pearson Correlation: ";

    var XYSeriesResult = CreateXYSeries(group, key1, key2);
    var xSeries = XYSeriesResult[0];
    var ySeries = XYSeriesResult[1];
    var xDate = XYSeriesResult[2];
    var totalDays = XYSeriesResult[3];

    if (type == 'pearson')
        var correlationResult = CalculatePearsonCoefficient(xSeries, ySeries);
    else if (type == 'spearman') {
        var correlationResult = CalculateSpearmanCoefficient(xSeries, ySeries);
        labelOffset = 25;
        labelText = "Spearman Correlation: ";
    }
    else
        return

    var extra_data = [ { x: chart.x().range()[1] }];
    var chartBody = chart.select('g.chart-body');
    var text = chartBody.selectAll().data([extra_data]);
    text.enter().append('text')
        .attr({
            class: 'extra-label',
            'transform': 'translate(' + (extra_data[0].x * 0.8) + ',' + (10 + labelOffset) + ')',
            'text-anchor': 'left'
        })
        .text(labelText + correlationResult.toFixed(2));
}

// returns slope, intercept and r-square of the line
function CalculatePearsonCoefficient(xSeries, ySeries) {
    var sumX = 0;
    var sumY = 0;
    var squareSumX = 0;
    var squareSumY = 0;
    var sumTotal = 0;
    var seriesLength = xSeries.length;

    for (var i = 0; i < seriesLength; i++) {
        sumX += xSeries[i];
        sumY += ySeries[i];
        squareSumX += Math.pow(xSeries[i], 2);
        squareSumY += Math.pow(ySeries[i], 2);
        sumTotal += xSeries[i] * ySeries[i];
    }

    var cov = sumTotal - (sumX * sumY / seriesLength);
    var stdX = Math.sqrt((squareSumX - (Math.pow(sumX, 2) / seriesLength)));
    var stdY = Math.sqrt((squareSumY - (Math.pow(sumY, 2) / seriesLength)));

    return cov / (stdX * stdY);
}

function CalculateSpearmanCoefficient(xSeries, ySeries) {
    var spearmanArray = [];
    var sumRankDifference = 0;
    var seriesLength = xSeries.length;
    var duplicateRank = null;
    var duplicateRankAmount = 0;
    var duplicateRankValue = 0;

    //Push the x and y values in a new array for easier sorting and array manipulation
    for (var i = 0; i < seriesLength; i++) {
        spearmanArray.push([xSeries[i], ySeries[i]]);
    }
    //Sort by x axis
    spearmanArray.sort(function(a,b) {
        return a[0] - b[0];
    });

    //Add the ranks for the x axis
    for (var i = 0; i < seriesLength; i++) {
        if (duplicateRank !== spearmanArray[i][0]) {
            duplicateRank = spearmanArray[i][0];
            duplicateRankAmount = spearmanArray.reduce(function (acc, val) {
                return acc + (val[0] === duplicateRank);
            }, 0)
            duplicateRankValue = 0;
            for (var j = 0; j < duplicateRankAmount; j++) {
                duplicateRankValue += (i + j);
            }
            duplicateRankValue /= duplicateRankAmount;
        }
        spearmanArray[i].push(duplicateRankValue + 1);
    }

    //Sort by y axis
    spearmanArray.sort(function (a, b) {
        return a[1] - b[1];
    });

    //Add the ranks for the y axis
    for (var i = 0; i < seriesLength; i++) {
        if (duplicateRank !== spearmanArray[i][1]) {
            duplicateRank = spearmanArray[i][1];
            duplicateRankAmount = spearmanArray.reduce(function (acc, val) {
                return acc + (val[1] === duplicateRank);
            }, 0)
            duplicateRankValue = 0;
            for (var j = 0; j < duplicateRankAmount; j++) {
                duplicateRankValue += (i + j);
            }
            duplicateRankValue /= duplicateRankAmount;
        }
        spearmanArray[i].push(duplicateRankValue + 1);
    }

    var xRankMean = 0;
    var yRankMean = 0;
    var xRankStd = 0;
    var yRankStd = 0;

    //Calculate means of the ranks
    for (var i = 0; i < seriesLength; i++) {
        xRankMean += spearmanArray[i][2];
        yRankMean += spearmanArray[i][3];
    }
    xRankMean /= seriesLength;
    yRankMean /= seriesLength;
    
    //Calculate the standard devition and the sum of all rank differences of the ranks
    for (var i = 0; i < seriesLength; i++) {
        xRankStd += Math.pow((spearmanArray[i][2] - xRankMean), 2);
        yRankStd += Math.pow((spearmanArray[i][3] - yRankMean), 2);
        sumRankDifference += (spearmanArray[i][2] - xRankMean) * (spearmanArray[i][3] - yRankMean);
    }

    xRankStd = Math.sqrt(xRankStd / seriesLength);
    yRankStd = Math.sqrt(yRankStd / seriesLength);

    //divide the covariance by the standard deviations by the product of the standard deviations of the rank variables
    var cor = (sumRankDifference / seriesLength) / (xRankStd * yRankStd);
    return cor;
}