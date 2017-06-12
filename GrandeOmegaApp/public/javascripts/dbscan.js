function RunDbscan(epsilon, minPoints, dataSet) {
    const UNCLASSIFIED = -1;
    const NOISE = 0;
    var C = 0;

    for (var i = dataSet.length - 1; i >= 0; i--) {
        if (dataSet[i] !== null)
            dataSet[i].cluster_id = -1;
        else
            dataSet.splice(i, 1);
    }

    var x = Object.keys(dataSet[0])[0];
    var y = Object.keys(dataSet[0])[1];

    for (var i = 0; i < dataSet.length; i++) {
        if (dataSet[i].cluster_id === UNCLASSIFIED) {
            dataSet[i].cluster_id = NOISE;
            var neighbourPoints = RegionQuery(dataSet[i], epsilon, dataSet);
            if (neighbourPoints.length < minPoints)
                dataSet[i].cluster_id = NOISE;
            else {
                C++;
                ExpandCluster(dataSet[i], neighbourPoints, C, epsilon, minPoints);         
            }
        }
    }

    return dataSet;

    function ExpandCluster(point, neighbourPoints, C, epsilon, minPoints) {
        point.cluster_id = C;
        for (var j = 0; j < neighbourPoints.length; j++) {
            if (neighbourPoints[j].cluster_id === UNCLASSIFIED) {
                neighbourPoints[j].cluster_id = NOISE;
                var neighbourPointsNew = RegionQuery(neighbourPoints[j], epsilon, dataSet);
                if (neighbourPointsNew.length >= minPoints) {
                    ExpandCluster(neighbourPoints[j], neighbourPointsNew, C, epsilon, minPoints);
                }
            }
            if (neighbourPoints[j].cluster_id === 0) {
                neighbourPoints[j].cluster_id = C;
            }
        }
    }

    //Get all neighboring points within the distance of the epsilon given.
    function RegionQuery(point, epsilon, dataSet) {
        var neighBourPoints = []
        for (var j = 0; j < dataSet.length; j++) {
            var distance = Math.sqrt(Math.pow(dataSet[j][x] - point[x], 2) +  Math.pow(dataSet[j][y] - point[y], 2));
            if (distance < epsilon) {
                neighBourPoints.push(dataSet[j]);
            }
        }
        return neighBourPoints;
    }
}