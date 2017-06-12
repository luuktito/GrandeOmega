function RunNaiveBayesClassifier(dataSet, trainingSet) {
    //Preparse the new data set
    for (var i = dataSet.length - 1; i >= 0; i--) {
        if (dataSet[i] !== null)
            dataSet[i].cluster_id = 0;
        else
            dataSet.splice(i, 1);
    }

    //Get the lengths of all dataSets and the keys for the object properties
    var dSetLength = dataSet.length;
    var tSetLength = trainingSet.length;

    var classifierKeyOld = Object.keys(trainingSet[0])[0];
    var classifierKeyNew = Object.keys(dataSet[0])[0];
    var classifiersTrainingSet = [];

    //Start calculated the amount of points in each cluster and the sum of all points
    for (var i = 0; i < tSetLength; i++) {
        if (classifiersTrainingSet[trainingSet[i].cluster_id] == null) {
            classifiersTrainingSet[trainingSet[i].cluster_id] = { clusterPointsCount: 1, classifierArray: [trainingSet[i][classifierKeyOld]], classifierSum: trainingSet[i][classifierKeyOld] };
        }
        else {
            classifiersTrainingSet[trainingSet[i].cluster_id].clusterPointsCount++;
            classifiersTrainingSet[trainingSet[i].cluster_id].classifierArray.push(trainingSet[i][classifierKeyOld]);
            classifiersTrainingSet[trainingSet[i].cluster_id].classifierSum += trainingSet[i][classifierKeyOld];
        }
    }

    //For each cluster set calculate the mean of the classifier, the prior of the cluster_id and the standard deviation of the classifier
    for (var i = 0; i < classifiersTrainingSet.length; i++) {
        var meanClassifier = classifiersTrainingSet[i].classifierSum / classifiersTrainingSet[i].clusterPointsCount;
        var prior = classifiersTrainingSet[i].clusterPointsCount / tSetLength;
        var classifierVariance = 0;

        for (var j = 0; j < classifiersTrainingSet[i].classifierArray.length; j++) {
            classifierVariance += Math.pow(classifiersTrainingSet[i].classifierArray[j] - meanClassifier, 2);
        }

        var classifierStd = Math.sqrt(classifierVariance / (classifiersTrainingSet[i].classifierArray.length - 1));
        classifiersTrainingSet[i].meanClassifier = meanClassifier;
        classifiersTrainingSet[i].prior = prior;
        classifiersTrainingSet[i].classifierStd = classifierStd;
    }

    //Go through all points 1 last time to calculate the probability that they will belong to each cluster from the training set
    for (var i = 0; i < dataSet.length; i++) {
        var indexProbabilityArray = [];

        for (var j = 0; j < classifiersTrainingSet.length; j++) {
            var probabilityResult = CalculateClassProbability(dataSet[i][classifierKeyNew],  classifiersTrainingSet[j]);
            indexProbabilityArray.push([j, probabilityResult]);
        }

        indexProbabilityArray.sort(function (a, b) {
            return b[1] - a[1];
        });

        dataSet[i].cluster_id = indexProbabilityArray[0][0];
    }

    return dataSet;

}

//Calculate the probability that a point of the new data set will have each cluster id
function CalculateClassProbability(newClassifierValue, classifierTrainingItem) {
    var meanClassifier = classifierTrainingItem.meanClassifier;
    var prior = classifierTrainingItem.prior;
    var classifierStd = classifierTrainingItem.classifierStd;

    var probability = (1 / Math.sqrt(2 * Math.PI * classifierStd)) * Math.exp((-Math.pow((newClassifierValue - meanClassifier), 2)) / (2 * Math.pow(classifierStd, 2)));
    return probability * prior;
}