function RunKNearestNeighbor(neighborAmount, dataSet, trainingSet) {
    for (var i = dataSet.length - 1; i >= 0; i--) {
        if (dataSet[i] !== null)
            dataSet[i].cluster_id = 0;
        else
            dataSet.splice(i, 1);
    }

    //Get the lengths of all dataSets and the keys for the object properties
    var dSetLength = dataSet.length;
    var tSetLength = trainingSet.length;
    var vectorLength = Object.keys(dataSet[0]).length - 1;
    var dataKeys = [];
    var trainingKeys = [];
    for (var i = 0; i < vectorLength; i++) {
        dataKeys.push(Object.keys(dataSet[0])[i]);
        trainingKeys.push(Object.keys(trainingSet[0])[i]);
    }

    //Go through each point in the new dataset
    for (var i = 0; i < dSetLength; i++) {
        var indexDistanceArray = []
        //Go through each point in the trainingSet and get the cluster id and distances to our new point
        for (var j = 0; j < tSetLength; j++) {
            var indexDistance = DistanceNeighbor(dataSet[i], trainingSet[j]);
            indexDistanceArray.push([trainingSet[j].cluster_id, indexDistance]);
        }

        //Sort the array based on the distances from highest to lowest
        indexDistanceArray.sort(function (a, b) {
            return a[1] - b[1];
        });

        var occurences = {};
        var maxOccurences = 0;
        var chosenCluster;
        //Go through the top X closest points (X being the maximum amount of neighbors)
        for (var j = 0; j < neighborAmount; j++) {
            occurences[indexDistanceArray[j][0]] = (occurences[indexDistanceArray[j][0]] || 0) + 1;
            if (occurences[indexDistanceArray[j][0]] > maxOccurences) {
                maxOccurences = occurences[indexDistanceArray[j][0]];
                chosenCluster = indexDistanceArray[j][0];
            }
        }
        //Add the cluster id of the most points that occured the most as neighbor
        dataSet[i].cluster_id = chosenCluster;
    }

    return dataSet;
   
    //Calculate the distance between two point (every key is another dimension X, Y, etc)
    function DistanceNeighbor(vector1, vector2) {
        var distance = 0.0;
        for (var i = 0; i < vectorLength; i++) {
            distance += Math.pow((vector1[dataKeys[i]] - vector2[trainingKeys[i]]), 2);
        }
        return Math.sqrt(distance);
    }
}